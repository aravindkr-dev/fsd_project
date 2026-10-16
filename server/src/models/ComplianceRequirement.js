import mongoose from 'mongoose';
import { ROLE_LIST } from '../utils/constants.js';

const requirementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Scope: a department, a role, or both (both = intersection). At least one required.
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    role: { type: String, enum: ROLE_LIST },
    // Each required training must be completed AND hold a valid (non-expired) certificate
    // when the training issues certificates with validity.
    requiredTrainingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Training' }],
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Mongoose 9 hooks don't receive `next`; throwing fails validation.
requirementSchema.pre('validate', function () {
  if (!this.departmentId && !this.role) {
    throw new Error('A requirement must target a department or a role');
  }
});

export default mongoose.model('ComplianceRequirement', requirementSchema);
