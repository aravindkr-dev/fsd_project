import User from '../models/User.js';
import { audit } from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { forbidden, notFound } from '../utils/errors.js';
import { assertCanAccessEmployee } from '../middleware/auth.js';

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const { role, departmentId, status, q } = req.query;
  if (role) filter.role = role;
  if (departmentId) filter.departmentId = departmentId;
  if (status) filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(String(q), 'i') }, { email: new RegExp(String(q), 'i') }];

  // Managers only see their direct reports.
  if (req.user.role === ROLES.MANAGER) filter.managerId = req.user._id;

  const users = await User.find(filter).populate('departmentId', 'name').sort({ name: 1 });
  res.json({ users });
});

export const getUser = asyncHandler(async (req, res) => {
  await assertCanAccessEmployee(req.user, req.params.id);
  const user = await User.findById(req.params.id).populate('departmentId', 'name');
  if (!user) throw notFound('User not found');
  res.json({ user });
});

export const createUser = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await User.create({ ...rest, passwordHash: await User.hashPassword(password) });
  await audit(req.user, 'user.create', 'User', user._id, { role: user.role });
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...rest } = req.body;
  if (String(req.params.id) === String(req.user._id) && (rest.role || rest.status)) {
    throw forbidden('You cannot change your own role or status');
  }
  const update = { ...rest };
  if (password) update.passwordHash = await User.hashPassword(password);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) throw notFound('User not found');
  await audit(req.user, 'user.update', 'User', user._id, { fields: Object.keys(rest) });
  res.json({ user });
});
