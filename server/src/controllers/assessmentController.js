import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import { audit } from '../services/auditService.js';
import * as assessmentService from '../services/assessmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { forbidden, notFound } from '../utils/errors.js';

export const createAssessment = asyncHandler(async (req, res) => {
  // One assessment per training: replace if it already exists.
  const assessment = await Assessment.findOneAndUpdate(
    { trainingId: req.body.trainingId },
    { ...req.body, createdBy: req.user._id },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await audit(req.user, 'assessment.save', 'Assessment', assessment._id);
  res.status(201).json({ assessment });
});

export const getAssessment = asyncHandler(async (req, res) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) throw notFound('Assessment not found');
  if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.TRAINER) {
    return res.json({ assessment });
  }
  const assigned = await TrainingAssignment.exists({ employeeId: req.user._id, trainingId: assessment.trainingId });
  if (!assigned) throw forbidden();
  const attempts = await AssessmentAttempt.find({ employeeId: req.user._id, assessmentId: assessment._id }).select(
    'score passed attemptNumber attemptedAt'
  );
  res.json({ assessment: assessmentService.toEmployeeView(assessment), attempts });
});

export const getAssessmentByTraining = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findOne({ trainingId: req.params.trainingId }).select('_id');
  if (!assessment) throw notFound('No assessment for this training');
  req.params.id = String(assessment._id);
  return getAssessment(req, res, next); // errors propagate through next
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const result = await assessmentService.submitAttempt(req.params.id, req.user, req.body.answers);
  res.status(201).json(result);
});
