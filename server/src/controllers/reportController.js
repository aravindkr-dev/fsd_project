import Certificate from '../models/Certificate.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import User from '../models/User.js';
import * as complianceService from '../services/complianceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ASSIGNMENT_STATUS, ROLES } from '../utils/constants.js';

const csvCell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralize spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

/** Limits employee scope: managers see direct reports; optional department filter. */
async function employeeScope(req) {
  const filter = { role: ROLES.EMPLOYEE };
  if (req.query.departmentId) filter.departmentId = req.query.departmentId;
  if (req.user.role === ROLES.MANAGER) filter.managerId = req.user._id;
  return User.find(filter).select('_id name email departmentId').populate('departmentId', 'name');
}

export const trainingReport = asyncHandler(async (req, res) => {
  const employees = await employeeScope(req);
  const byId = new Map(employees.map((e) => [String(e._id), e]));
  const assignments = await TrainingAssignment.find({ employeeId: { $in: [...byId.keys()] } }).populate('trainingId', 'title');
  const now = new Date();

  const rows = assignments.map((a) => {
    const e = byId.get(String(a.employeeId));
    return {
      employee: e.name, email: e.email, department: e.departmentId?.name ?? '',
      training: a.trainingId?.title ?? '', status: a.status, progress: a.progress,
      dueDate: a.dueDate, completedAt: a.completedAt,
      overdue: a.status !== ASSIGNMENT_STATUS.COMPLETED && !!a.dueDate && a.dueDate < now,
    };
  });
  const completed = rows.filter((r) => r.status === ASSIGNMENT_STATUS.COMPLETED).length;
  const summary = {
    total: rows.length, completed, overdue: rows.filter((r) => r.overdue).length,
    completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
  };

  if (req.query.format === 'csv') {
    res.type('text/csv').attachment('training-report.csv');
    return res.send(toCsv([
      ['Employee', 'Email', 'Department', 'Training', 'Status', 'Progress %', 'Due', 'Completed', 'Overdue'],
      ...rows.map((r) => [r.employee, r.email, r.department, r.training, r.status, r.progress,
        r.dueDate?.toISOString().slice(0, 10), r.completedAt?.toISOString().slice(0, 10), r.overdue ? 'yes' : 'no']),
    ]));
  }
  res.json({ summary, rows });
});

export const complianceReport = asyncHandler(async (req, res) => {
  const scope = {};
  if (req.query.departmentId) scope.departmentId = req.query.departmentId;
  if (req.user.role === ROLES.MANAGER) scope.managerId = req.user._id;
  const data = await complianceService.getSummary(scope);

  if (req.query.format === 'csv') {
    res.type('text/csv').attachment('compliance-report.csv');
    return res.send(toCsv([
      ['Employee', 'Department', 'Status', 'Open gaps'],
      ...data.employees.map((e) => [e.name, e.department, e.status, e.gapCount]),
    ]));
  }
  res.json(data);
});

export const expiringCertificates = asyncHandler(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 60, 365);
  const employees = await employeeScope(req);
  const byId = new Map(employees.map((e) => [String(e._id), e]));
  const certs = await Certificate.find({
    employeeId: { $in: [...byId.keys()] },
    status: 'active',
    expiryDate: { $lte: new Date(Date.now() + days * 86400000) },
  }).populate('trainingId', 'title').sort({ expiryDate: 1 });

  res.json({
    certificates: certs.map((c) => ({
      _id: c._id, employee: byId.get(String(c.employeeId))?.name, training: c.trainingId?.title,
      expiryDate: c.expiryDate, certificateNumber: c.certificateNumber,
    })),
  });
});
