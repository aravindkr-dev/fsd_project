import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Certificate from '../models/Certificate.js';
import ComplianceRequirement from '../models/ComplianceRequirement.js';
import ComplianceStatusHistory from '../models/ComplianceStatusHistory.js';
import Training from '../models/Training.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import User from '../models/User.js';
import { ASSIGNMENT_STATUS, CERT_STATUS, COMPLIANCE_STATUS, ROLES } from '../utils/constants.js';
import { notFound } from '../utils/errors.js';

const EXPIRING_SOON_DAYS = 30;
const BLOCKING = new Set(['missing_training', 'overdue_training', 'failed_assessment', 'expired_certificate', 'missing_certificate']);

/** Pure-ish evaluation: reads records, returns status + gaps. Does not write. */
export async function evaluateEmployee(employee, now = new Date()) {
  const requirements = await ComplianceRequirement.find({
    active: true,
    $and: [
      {
        $or: employee.departmentId
          ? [{ departmentId: null }, { departmentId: employee.departmentId }]
          : [{ departmentId: null }],
      },
      { $or: [{ role: null }, { role: employee.role }] },
    ],
  });

  const requiredIds = [...new Set(requirements.flatMap((r) => r.requiredTrainingIds.map(String)))];
  if (!requiredIds.length) {
    return { status: COMPLIANCE_STATUS.COMPLIANT, gaps: [], requiredCount: 0 };
  }

  const [trainings, assignments, assessments, certs] = await Promise.all([
    Training.find({ _id: { $in: requiredIds } }).select('title validityMonths'),
    TrainingAssignment.find({ employeeId: employee._id, trainingId: { $in: requiredIds } }),
    Assessment.find({ trainingId: { $in: requiredIds } }),
    Certificate.find({ employeeId: employee._id, trainingId: { $in: requiredIds } }).sort({ issueDate: -1 }),
  ]);
  const attempts = assessments.length
    ? await AssessmentAttempt.find({ employeeId: employee._id, assessmentId: { $in: assessments.map((a) => a._id) } })
    : [];

  const gaps = [];
  const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 86400000);

  for (const t of trainings) {
    const tid = String(t._id);
    const assignment = assignments.find((a) => String(a.trainingId) === tid);
    const add = (type, detail) => gaps.push({ type, trainingId: t._id, detail: `${t.title}: ${detail}` });

    if (!assignment) {
      add('missing_training', 'not assigned or started');
      continue;
    }

    if (assignment.status !== ASSIGNMENT_STATUS.COMPLETED) {
      const assessment = assessments.find((a) => String(a.trainingId) === tid);
      const own = assessment ? attempts.filter((a) => String(a.assessmentId) === String(assessment._id)) : [];
      if (assessment && own.length >= assessment.attemptLimit && !own.some((a) => a.passed)) {
        add('failed_assessment', 'attempt limit reached without passing');
      } else if (assignment.dueDate && assignment.dueDate < now) {
        add('overdue_training', `due ${assignment.dueDate.toISOString().slice(0, 10)}`);
      } else {
        add('pending_training', 'in progress');
      }
      continue;
    }

    if (t.validityMonths) {
      const latest = certs.find((c) => String(c.trainingId) === tid && c.status !== CERT_STATUS.REVOKED);
      const valid = latest && latest.status === CERT_STATUS.ACTIVE && (!latest.expiryDate || latest.expiryDate > now);
      if (!latest) add('missing_certificate', 'completed but no certificate on record');
      else if (!valid) add('expired_certificate', `expired ${latest.expiryDate?.toISOString().slice(0, 10)}`);
      else if (latest.expiryDate && latest.expiryDate <= soon) {
        add('expiring_certificate', `expires ${latest.expiryDate.toISOString().slice(0, 10)}`);
      }
    }
  }

  let status = COMPLIANCE_STATUS.COMPLIANT;
  if (gaps.some((g) => BLOCKING.has(g.type))) status = COMPLIANCE_STATUS.NON_COMPLIANT;
  else if (gaps.length) status = COMPLIANCE_STATUS.AT_RISK;

  return { status, gaps, requiredCount: requiredIds.length };
}

/** Evaluates and records a history row only when the status changed. */
export async function evaluateAndRecord(employee, now = new Date()) {
  const result = await evaluateEmployee(employee, now);
  const last = await ComplianceStatusHistory.findOne({ employeeId: employee._id }).sort({ changedAt: -1 });
  if (!last || last.status !== result.status) {
    await ComplianceStatusHistory.create({
      employeeId: employee._id,
      status: result.status,
      previousStatus: last?.status ?? null,
      gaps: result.gaps.filter((g) => g.type !== 'pending_training'),
    });
  }
  return result;
}

export async function getEmployeeCompliance(employeeId) {
  const employee = await User.findById(employeeId);
  if (!employee) throw notFound('Employee not found');
  const result = await evaluateAndRecord(employee);
  const history = await ComplianceStatusHistory.find({ employeeId }).sort({ changedAt: -1 }).limit(20);
  return { employee: { _id: employee._id, name: employee.name, departmentId: employee.departmentId }, ...result, history };
}

/** Summary across employees visible to the actor. `scope` is a User filter. */
export async function getSummary(scope = {}) {
  const employees = await User.find({ role: ROLES.EMPLOYEE, status: 'active', ...scope }).populate('departmentId', 'name');
  const rows = [];
  for (const e of employees) {
    const r = await evaluateAndRecord(e);
    rows.push({
      employeeId: e._id,
      name: e.name,
      department: e.departmentId?.name ?? 'Unassigned',
      departmentId: e.departmentId?._id,
      status: r.status,
      gapCount: r.gaps.length,
    });
  }

  const totals = { total: rows.length, compliant: 0, at_risk: 0, non_compliant: 0 };
  const byDept = new Map();
  for (const r of rows) {
    totals[r.status] += 1;
    const d = byDept.get(r.department) ?? { department: r.department, total: 0, compliant: 0, at_risk: 0, non_compliant: 0 };
    d.total += 1;
    d[r.status] += 1;
    byDept.set(r.department, d);
  }
  const pct = (c, t) => (t ? Math.round((c / t) * 100) : 100);
  return {
    totals: { ...totals, complianceRate: pct(totals.compliant, totals.total) },
    departments: [...byDept.values()].map((d) => ({ ...d, complianceRate: pct(d.compliant, d.total) })),
    employees: rows,
  };
}
