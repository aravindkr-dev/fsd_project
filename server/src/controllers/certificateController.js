import Certificate from '../models/Certificate.js';
import Training from '../models/Training.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import { assertCanAccessEmployee } from '../middleware/auth.js';
import { audit } from '../services/auditService.js';
import { issueCertificateForAssignment } from '../services/certificateService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CERT_STATUS } from '../utils/constants.js';
import { badRequest, notFound } from '../utils/errors.js';

export const myCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({ employeeId: req.user._id })
    .populate('trainingId', 'title')
    .sort({ issueDate: -1 });
  res.json({ certificates });
});

export const employeeCertificates = asyncHandler(async (req, res) => {
  await assertCanAccessEmployee(req.user, req.params.employeeId);
  const certificates = await Certificate.find({ employeeId: req.params.employeeId })
    .populate('trainingId', 'title')
    .sort({ issueDate: -1 });
  res.json({ certificates });
});

export const listCertificates = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const certificates = await Certificate.find(filter)
    .populate('employeeId', 'name email departmentId')
    .populate('trainingId', 'title')
    .sort({ expiryDate: 1 })
    .limit(500);
  res.json({ certificates });
});

/** Staff-issued certificate (also used for renewals). Requirements are re-checked server-side. */
export const issueCertificate = asyncHandler(async (req, res) => {
  const { employeeId, trainingId, renewsCertificateId } = req.body;
  const training = await Training.findById(trainingId);
  if (!training) throw notFound('Training not found');
  const assignment = await TrainingAssignment.findOne({ employeeId, trainingId });
  if (!assignment) throw badRequest('Training is not assigned to this employee');
  const certificate = await issueCertificateForAssignment(assignment, training, {
    issuedBy: req.user._id,
    renewsCertificateId,
  });
  await audit(req.user, 'certificate.issue', 'Certificate', certificate._id);
  res.status(201).json({ certificate });
});

export const revokeCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findByIdAndUpdate(
    req.params.id,
    { status: CERT_STATUS.REVOKED },
    { new: true }
  );
  if (!certificate) throw notFound('Certificate not found');
  await audit(req.user, 'certificate.revoke', 'Certificate', certificate._id);
  res.json({ certificate });
});
