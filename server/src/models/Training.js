import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    url: { type: String, required: true },
    publicId: String,
    resourceType: String, // image | video | raw (Cloudinary)
    mimeType: String,
  },
  { _id: true }
);

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    mandatory: { type: Boolean, default: false },
    materials: [materialSchema],
    // Deadline is either relative to assignment or an absolute date.
    deadlineDays: { type: Number, min: 1 },
    deadlineDate: Date,
    // Months a certificate stays valid after issue; 0/undefined = never expires.
    validityMonths: { type: Number, min: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Training', trainingSchema);
