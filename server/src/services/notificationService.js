import nodemailer from 'nodemailer';
import Certificate from '../models/Certificate.js';
import Notification from '../models/Notification.js';
import TrainingAssignment from '../models/TrainingAssignment.js';
import { env } from '../config/env.js';
import { ASSIGNMENT_STATUS, CERT_STATUS } from '../utils/constants.js';
import { expireCertificates } from './certificateService.js';

let transporter;
function getTransporter() {
  if (!env.smtp.host) return null; // email disabled: in-app notifications only
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

/**
 * Creates the notification once per dedupeKey (unique index), then emails it.
 * Re-running the job for the same reminder window is a no-op.
 */
export async function notifyOnce({ user, type, message, targetId, window, subject }) {
  const dedupeKey = `${type}:${targetId}:${window ?? 'x'}`;
  let notification;
  try {
    notification = await Notification.create({ employeeId: user._id, type, message, targetId, window, dedupeKey });
  } catch (err) {
    if (err.code === 11000) return null; // already sent for this window
    throw err;
  }

  const t = getTransporter();
  if (!t) {
    notification.emailStatus = 'skipped';
  } else {
    try {
      await t.sendMail({ from: env.smtp.from, to: user.email, subject, text: message });
      notification.emailStatus = 'sent';
      notification.sentAt = new Date();
    } catch (err) {
      console.error('Email failed:', err.message);
      notification.emailStatus = 'failed';
    }
  }
  await notification.save();
  return notification;
}

/** One pass of the reminder job. `now` is injectable for tests. */
export async function runReminderJob(now = new Date()) {
  const stats = { expired: 0, sent: 0 };
  const day = 86400000;

  // 1. Expiry sweep, then notify the newly expired.
  const expiredBefore = await Certificate.find({ status: CERT_STATUS.ACTIVE, expiryDate: { $lte: now } }).populate('employeeId trainingId');
  stats.expired = await expireCertificates(now);
  for (const c of expiredBefore) {
    if (!c.employeeId || !c.trainingId) continue;
    const n = await notifyOnce({
      user: c.employeeId, type: 'certificate_expired', targetId: c._id, window: 0,
      subject: 'Certificate expired',
      message: `Your certificate for "${c.trainingId.title}" expired on ${c.expiryDate.toISOString().slice(0, 10)}. Please renew it.`,
    });
    if (n) stats.sent += 1;
  }

  // 2. Expiring-soon reminders. Each employee gets only the tightest window reached.
  const windows = [...env.reminderWindows].sort((a, b) => a - b);
  const widest = windows[windows.length - 1] ?? 0;
  const expiring = await Certificate.find({
    status: CERT_STATUS.ACTIVE,
    expiryDate: { $gt: now, $lte: new Date(now.getTime() + widest * day) },
  }).populate('employeeId trainingId');
  for (const c of expiring) {
    if (!c.employeeId || !c.trainingId) continue;
    const daysLeft = Math.ceil((c.expiryDate - now) / day);
    const window = windows.find((w) => daysLeft <= w);
    const n = await notifyOnce({
      user: c.employeeId, type: 'certificate_expiring', targetId: c._id, window,
      subject: `Certificate expires in ${daysLeft} day(s)`,
      message: `Your certificate for "${c.trainingId.title}" expires on ${c.expiryDate.toISOString().slice(0, 10)}.`,
    });
    if (n) stats.sent += 1;
  }

  // 3. Overdue training (one reminder per assignment).
  const overdue = await TrainingAssignment.find({
    status: { $ne: ASSIGNMENT_STATUS.COMPLETED },
    dueDate: { $lt: now },
  }).populate('employeeId trainingId');
  for (const a of overdue) {
    if (!a.employeeId || !a.trainingId) continue;
    const n = await notifyOnce({
      user: a.employeeId, type: 'training_overdue', targetId: a._id, window: 0,
      subject: 'Training overdue',
      message: `Your training "${a.trainingId.title}" was due on ${a.dueDate.toISOString().slice(0, 10)}.`,
    });
    if (n) stats.sent += 1;
  }
  return stats;
}
