import Training from '../models/Training.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import User from '../models/User.js';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { badRequest, notFound } from '../utils/errors.js';

function computeDueDate(training, from = new Date()) {
  if (training.deadlineDate) return training.deadlineDate;
  if (training.deadlineDays) {
    const d = new Date(from);
    d.setDate(d.getDate() + training.deadlineDays);
    return d;
  }
  return undefined;
}

/**
 * Resolves a target ({ employeeIds | departmentId | role }) to active employees.
 */
export async function resolveTargets({ employeeIds, departmentId, role }) {
  const filter = { status: 'active' };
  if (employeeIds?.length) filter._id = { $in: employeeIds };
  else if (departmentId || role) {
    if (departmentId) filter.departmentId = departmentId;
    if (role) filter.role = role;
  } else throw badRequest('Provide employeeIds, departmentId or role');
  return User.find(filter).select('_id');
}

/** Creates one assignment per target employee; existing ones are skipped, not duplicated. */
export async function assignTraining({ trainingId, dueDate, ...target }, actor) {
  const training = await Training.findById(trainingId);
  if (!training) throw notFound('Training not found');
  if (training.status !== 'published') throw badRequest('Only published training can be assigned');

  const users = await resolveTargets(target);
  if (!users.length) throw badRequest('No matching active employees');

  const due = dueDate ? new Date(dueDate) : computeDueDate(training);
  const ops = users.map((u) => ({
    updateOne: {
      filter: { employeeId: u._id, trainingId },
      update: {
        $setOnInsert: {
          employeeId: u._id,
          trainingId,
          assignedBy: actor._id,
          assignedAt: new Date(),
          dueDate: due,
          status: ASSIGNMENT_STATUS.ASSIGNED,
          progress: 0,
        },
      },
      upsert: true,
    },
  }));
  const res = await TrainingAssignment.bulkWrite(ops);
  return { matched: users.length, created: res.upsertedCount, skipped: users.length - res.upsertedCount };
}

/** Recomputes progress from completed materials. Only moves forward, never to "completed" (assessment does that). */
export async function updateProgress(assignment, training, { materialId, started }) {
  if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) return assignment;

  if (materialId) {
    const valid = training.materials.some((m) => String(m._id) === String(materialId));
    if (!valid) throw badRequest('Material does not belong to this training');
    if (!assignment.completedMaterialIds.some((id) => String(id) === String(materialId))) {
      assignment.completedMaterialIds.push(materialId);
    }
  }
  const total = training.materials.length;
  // Cap at 99 until the assessment (or completion rule) finishes it.
  assignment.progress = total ? Math.min(99, Math.round((assignment.completedMaterialIds.length / total) * 100)) : 0;
  if (started || materialId) {
    assignment.status = ASSIGNMENT_STATUS.IN_PROGRESS;
    assignment.startedAt ||= new Date();
  }
  await assignment.save();
  return assignment;
}

export async function markCompleted(assignment) {
  assignment.status = ASSIGNMENT_STATUS.COMPLETED;
  assignment.progress = 100;
  assignment.completedAt ||= new Date();
  assignment.startedAt ||= assignment.completedAt;
  await assignment.save();
  return assignment;
}
