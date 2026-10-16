import AuditLog from '../models/AuditLog.js';

/** Fire-and-forget: an audit failure must never break the main operation. */
export async function audit(actor, action, targetType, targetId, meta) {
  try {
    await AuditLog.create({ actorId: actor?._id ?? actor, action, targetType, targetId, meta });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}
