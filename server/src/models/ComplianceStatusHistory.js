import mongoose from 'mongoose';
import { COMPLIANCE_STATUS } from '../utils/constants.js';

const schema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: Object.values(COMPLIANCE_STATUS), required: true },
    previousStatus: { type: String, enum: [...Object.values(COMPLIANCE_STATUS), null] },
    gaps: [{ type: { type: String }, trainingId: mongoose.Schema.Types.ObjectId, detail: String }],
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

schema.index({ employeeId: 1, changedAt: -1 });

export default mongoose.model('ComplianceStatusHistory', schema);
