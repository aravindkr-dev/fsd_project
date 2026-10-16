import mongoose from 'mongoose';
import { CERT_STATUS } from '../utils/constants.js';

const certificateSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true, index: true },
    certificateNumber: { type: String, required: true, unique: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, index: true }, // undefined = does not expire
    fileUrl: { type: String, required: true },
    filePublicId: String,
    status: { type: String, enum: Object.values(CERT_STATUS), default: CERT_STATUS.ACTIVE, index: true },
    renewsCertificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', certificateSchema);
