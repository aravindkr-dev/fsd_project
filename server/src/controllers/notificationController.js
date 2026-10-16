import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/errors.js';

export const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ employeeId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
});

export const markRead = asyncHandler(async (req, res) => {
  // Scoped to the owner so one user can't mark another's notifications.
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, employeeId: req.user._id }, { read: true }, { new: true });
  if (!n) throw notFound('Notification not found');
  res.json({ notification: n });
});
