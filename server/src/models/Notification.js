import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['certificate_expiring', 'certificate_expired', 'training_due', 'training_overdue', 'general'],
      required: true,
    },
    message: { type: String, required: true },
    targetId: mongoose.Schema.Types.ObjectId, // certificate or assignment
    window: Number, // reminder window in days (dedupe key part)
    emailStatus: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
    sentAt: Date,
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
