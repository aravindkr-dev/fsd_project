import ComplianceRequirement from '../models/ComplianceRequirement.js';
import { assertCanAccessEmployee } from '../middleware/auth.js';
import { audit } from '../services/auditService.js';
import * as complianceService from '../services/complianceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { notFound } from '../utils/errors.js';

export const summary = asyncHandler(async (req, res) => {
  const scope = {};
  if (req.query.departmentId) scope.departmentId = req.query.departmentId;
  if (req.user.role === ROLES.MANAGER) scope.managerId = req.user._id; // managers: direct reports only
  res.json(await complianceService.getSummary(scope));
});

export const employeeCompliance = asyncHandler(async (req, res) => {
  await assertCanAccessEmployee(req.user, req.params.id);
  res.json(await complianceService.getEmployeeCompliance(req.params.id));
});

export const myCompliance = asyncHandler(async (req, res) => {
  res.json(await complianceService.getEmployeeCompliance(req.user._id));
});

export const listRequirements = asyncHandler(async (_req, res) => {
  const requirements = await ComplianceRequirement.find()
    .populate('departmentId', 'name')
    .populate('requiredTrainingIds', 'title')
    .sort({ createdAt: -1 });
  res.json({ requirements });
});

export const createRequirement = asyncHandler(async (req, res) => {
  const requirement = await ComplianceRequirement.create({ ...req.body, createdBy: req.user._id });
  await audit(req.user, 'requirement.create', 'ComplianceRequirement', requirement._id);
  res.status(201).json({ requirement });
});

export const updateRequirement = asyncHandler(async (req, res) => {
  const requirement = await ComplianceRequirement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!requirement) throw notFound('Requirement not found');
  await audit(req.user, 'requirement.update', 'ComplianceRequirement', requirement._id);
  res.json({ requirement });
});
