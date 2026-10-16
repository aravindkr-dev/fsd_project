import mongoose from 'mongoose';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';

const assignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    dueDate: Date,
    status: {
      type: String,
      enum: Object.values(ASSIGNMENT_STATUS),
      default: ASSIGNMENT_STATUS.ASSIGNED,
      index: true,
    },
    // Material ids the employee has marked complete; progress is derived from this.
    completedMaterialIds: [{ type: mongoose.Schema.Types.ObjectId }],
    progress: { type: Number, min: 0, max: 100, default: 0 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

assignmentSchema.index({ employeeId: 1, trainingId: 1 }, { unique: true });
assignmentSchema.index({ dueDate: 1, status: 1 });

export default mongoose.model('TrainingAssignment', assignmentSchema);
