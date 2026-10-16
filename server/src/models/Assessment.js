import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: [(v) => v.length >= 2, 'A question needs at least two options'],
  },
  // Indexes of correct options. Never serialized to employees.
  correctOptions: {
    type: [Number],
    required: true,
    validate: [(v) => v.length >= 1, 'At least one correct option is required'],
  },
  points: { type: Number, default: 1, min: 1 },
});

const assessmentSchema = new mongoose.Schema(
  {
    trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true, unique: true },
    title: { type: String, trim: true },
    questions: [questionSchema],
    passingScore: { type: Number, required: true, min: 1, max: 100, default: 70 }, // percent
    attemptLimit: { type: Number, min: 1, default: 3 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Assessment', assessmentSchema);
