import Training from '../models/Training.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import { audit } from '../services/auditService.js';
import { deleteFile, uploadBuffer } from '../services/fileService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { forbidden, notFound } from '../utils/errors.js';

const isStaff = (u) => u.role === ROLES.ADMIN || u.role === ROLES.TRAINER;

export const listTrainings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.mandatory) filter.mandatory = req.query.mandatory === 'true';
  if (!isStaff(req.user)) {
    // Non-staff only see published training they're assigned to (managers: their own assignments too).
    const ids = await TrainingAssignment.find({ employeeId: req.user._id }).distinct('trainingId');
    filter._id = { $in: ids };
    filter.status = 'published';
  } else if (req.query.status) filter.status = req.query.status;
  res.json({ trainings: await Training.find(filter).sort({ createdAt: -1 }) });
});

export const getTraining = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw notFound('Training not found');
  if (!isStaff(req.user)) {
    const assigned = await TrainingAssignment.exists({ employeeId: req.user._id, trainingId: training._id });
    if (!assigned) throw forbidden();
  }
  res.json({ training });
});

async function attachFiles(training, files = []) {
  // Upload all files first; only mutate the document once every upload succeeded.
  const uploaded = [];
  try {
    for (const f of files) {
      const res = await uploadBuffer(f.buffer, { folder: 'training', resourceType: 'auto' });
      uploaded.push({ title: f.originalname, mimeType: f.mimetype, ...res });
    }
  } catch (err) {
    await Promise.all(uploaded.map((u) => deleteFile(u.publicId, u.resourceType)));
    throw err;
  }
  training.materials.push(...uploaded);
}

export const createTraining = asyncHandler(async (req, res) => {
  const training = new Training({ ...req.body, createdBy: req.user._id });
  await attachFiles(training, req.files);
  await training.save();
  await audit(req.user, 'training.create', 'Training', training._id);
  res.status(201).json({ training });
});

export const updateTraining = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw notFound('Training not found');
  training.set(req.body);
  await attachFiles(training, req.files);
  await training.save();
  await audit(req.user, 'training.update', 'Training', training._id);
  res.json({ training });
});

export const removeMaterial = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw notFound('Training not found');
  const material = training.materials.id(req.params.materialId);
  if (!material) throw notFound('Material not found');
  const { publicId, resourceType } = material;
  material.deleteOne();
  await training.save();
  if (publicId) await deleteFile(publicId, resourceType);
  res.json({ training });
});
