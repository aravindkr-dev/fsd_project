import Department from '../models/Department.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/errors.js';
import { audit } from '../services/auditService.js';

export const listDepartments = asyncHandler(async (_req, res) => {
  res.json({ departments: await Department.find().populate('managerId', 'name').sort({ name: 1 }) });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  await audit(req.user, 'department.create', 'Department', department._id);
  res.status(201).json({ department });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!department) throw notFound('Department not found');
  await audit(req.user, 'department.update', 'Department', department._id);
  res.json({ department });
});
