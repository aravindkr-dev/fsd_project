import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
    attemptNumber: { type: Number, required: true },
    answers: [{ questionId: mongoose.Schema.Types.ObjectId, selected: [Number] }],
    score: { type: Number, required: true }, // percent, computed server-side
    passed: { type: Boolean, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attemptSchema.index({ employeeId: 1, assessmentId: 1, attemptNumber: 1 }, { unique: true });

export default mongoose.model('AssessmentAttempt', attemptSchema);
