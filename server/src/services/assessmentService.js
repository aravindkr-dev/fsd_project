import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import Training from '../models/Training.js';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { markCompleted } from './assignmentService.js';
import { issueCertificateForAssignment } from './certificateService.js';

/** Strips answers so the client never receives the correct options. */
export function toEmployeeView(assessment) {
  const obj = assessment.toObject();
  obj.questions = obj.questions.map(({ correctOptions, ...q }) => ({
    ...q,
    multiple: correctOptions.length > 1,
  }));
  return obj;
}

const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function scoreAnswers(assessment, answers) {
  const byQ = new Map(answers.map((a) => [String(a.questionId), a.selected]));
  let earned = 0;
  let total = 0;
  for (const q of assessment.questions) {
    total += q.points;
    const selected = byQ.get(String(q._id)) ?? [];
    if (sameSet(selected, q.correctOptions)) earned += q.points;
  }
  return total ? Math.round((earned / total) * 100) : 0;
}

export async function submitAttempt(assessmentId, employee, answers) {
  const assessment = await Assessment.findById(assessmentId);
  if (!assessment) throw notFound('Assessment not found');

  const assignment = await TrainingAssignment.findOne({
    employeeId: employee._id,
    trainingId: assessment.trainingId,
  });
  if (!assignment) throw forbidden('This training is not assigned to you');

  const previous = await AssessmentAttempt.find({ employeeId: employee._id, assessmentId });
  if (previous.some((a) => a.passed)) throw badRequest('You have already passed this assessment');
  if (previous.length >= assessment.attemptLimit) throw forbidden('Attempt limit reached');

  const score = scoreAnswers(assessment, answers);
  const passed = score >= assessment.passingScore;

  const attempt = await AssessmentAttempt.create({
    employeeId: employee._id,
    assessmentId,
    trainingId: assessment.trainingId,
    attemptNumber: previous.length + 1,
    answers,
    score,
    passed,
  });

  let certificate = null;
  let certificateError;
  if (passed) {
    await markCompleted(assignment);
    const training = await Training.findById(assessment.trainingId);
    try {
      certificate = await issueCertificateForAssignment(assignment, training, { issuedBy: null });
    } catch (err) {
      // The pass is already recorded; staff can issue the certificate later.
      console.error('Certificate issuance failed after pass:', err.message);
      certificateError = 'Certificate could not be generated yet; it will be issued by staff.';
    }
  } else if (assignment.status === ASSIGNMENT_STATUS.ASSIGNED) {
    assignment.status = ASSIGNMENT_STATUS.IN_PROGRESS;
    assignment.startedAt ||= new Date();
    await assignment.save();
  }

  return {
    attempt: { score, passed, attemptNumber: attempt.attemptNumber },
    attemptsRemaining: Math.max(0, assessment.attemptLimit - attempt.attemptNumber),
    certificate,
    ...(certificateError ? { certificateError } : {}),
  };
}
