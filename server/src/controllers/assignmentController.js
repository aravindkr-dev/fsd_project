import TrainingAssignment from '../models/TrainingAssignment.js';
import Training from '../models/Training.js';
import { assertCanAccessEmployee } from '../middleware/auth.js';
import { audit } from '../services/auditService.js';
import * as assignmentService from '../services/assignmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, notFound } from '../utils/errors.js';

export const createAssignments = asyncHandler(async (req, res) => {
  const result = await assignmentService.assignTraining(req.body, req.user);
  await audit(req.user, 'assignment.create', 'Training', req.body.trainingId, result);
  res.status(201).json(result);
});

export const myAssignments = asyncHandler(async (req, res) => {
  const assignments = await TrainingAssignment.find({ employeeId: req.user._id })
    .populate('trainingId', 'title category mandatory description materials')
    .sort({ dueDate: 1 });
  res.json({ assignments });
});

export const employeeAssignments = asyncHandler(async (req, res) => {
  await assertCanAccessEmployee(req.user, req.params.employeeId);
  const assignments = await TrainingAssignment.find({ employeeId: req.params.employeeId })
    .populate('trainingId', 'title category mandatory')
    .sort({ dueDate: 1 });
  res.json({ assignments });
});

export const listAssignments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.trainingId) filter.trainingId = req.query.trainingId;
  if (req.query.status) filter.status = req.query.status;
  const assignments = await TrainingAssignment.find(filter)
    .populate('employeeId', 'name email departmentId')
    .populate('trainingId', 'title')
    .sort({ dueDate: 1 })
    .limit(500);
  res.json({ assignments });
});

export const updateProgress = asyncHandler(async (req, res) => {
  const assignment = await TrainingAssignment.findById(req.params.id);
  if (!assignment) throw notFound('Assignment not found');
  // Only the assigned employee may report progress on their own assignment.
  if (String(assignment.employeeId) !== String(req.user._id)) throw forbidden();
  const training = await Training.findById(assignment.trainingId);
  const updated = await assignmentService.updateProgress(assignment, training, req.body);
  res.json({ assignment: updated });
});
