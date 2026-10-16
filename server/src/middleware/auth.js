import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ROLES } from '../utils/constants.js';

/** Verifies the Bearer token and attaches the live user record to req.user. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw unauthorized('Account not available');
  req.user = user;
  next();
});

/** Restricts a route to the given roles. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

/**
 * True when `actor` may view/act on records belonging to `employeeId`:
 * the employee themself, an admin/trainer, or the employee's direct manager.
 */
export async function canAccessEmployee(actor, employeeId) {
  if (String(actor._id) === String(employeeId)) return true;
  if (actor.role === ROLES.ADMIN || actor.role === ROLES.TRAINER) return true;
  if (actor.role === ROLES.MANAGER) {
    const emp = await User.findById(employeeId).select('managerId');
    return !!emp && String(emp.managerId) === String(actor._id);
  }
  return false;
}

export async function assertCanAccessEmployee(actor, employeeId) {
  if (!(await canAccessEmployee(actor, employeeId))) throw forbidden();
}
