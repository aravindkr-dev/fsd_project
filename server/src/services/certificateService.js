import crypto from 'node:crypto';
import Certificate from '../models/Certificate.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Assessment from '../models/Assessment.js';
import User from '../models/User.js';
import { ASSIGNMENT_STATUS, CERT_STATUS } from '../utils/constants.js';
import { badRequest } from '../utils/errors.js';
import { uploadBuffer } from './fileService.js';

const newCertNumber = () => `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// Loaded lazily: pdfkit reads import.meta.url at load time, which breaks the CJS Netlify bundle.
async function renderPdf({ employee, training, certificateNumber, issueDate, expiryDate }) {
  const { default: PDFDocument } = await import('pdfkit');
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fmt = (d) => d.toISOString().slice(0, 10);
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();
    doc.fontSize(32).text('Certificate of Completion', { align: 'center' }).moveDown(1.5);
    doc.fontSize(14).text('This certifies that', { align: 'center' }).moveDown(0.5);
    doc.fontSize(26).text(employee.name, { align: 'center' }).moveDown(0.5);
    doc.fontSize(14).text('has successfully completed', { align: 'center' }).moveDown(0.5);
    doc.fontSize(22).text(training.title, { align: 'center' }).moveDown(2);
    doc.fontSize(12).text(`Issued: ${fmt(issueDate)}`, { align: 'center' });
    doc.text(expiryDate ? `Valid until: ${fmt(expiryDate)}` : 'Does not expire', { align: 'center' });
    doc.moveDown().fontSize(10).text(`Certificate No. ${certificateNumber}`, { align: 'center' });
    doc.end();
  });
}

/**
 * Issues a certificate only if the employee completed the training and, when an
 * assessment exists, has a passing attempt. The DB record is created only after the
 * Cloudinary upload succeeds, so there are never certificates without a file.
 */
export async function issueCertificateForAssignment(assignment, training, { issuedBy, renewsCertificateId } = {}) {
  if (assignment.status !== ASSIGNMENT_STATUS.COMPLETED) {
    throw badRequest('Training is not completed');
  }
  const assessment = await Assessment.findOne({ trainingId: training._id });
  if (assessment) {
    const passed = await AssessmentAttempt.exists({
      employeeId: assignment.employeeId,
      assessmentId: assessment._id,
      passed: true,
    });
    if (!passed) throw badRequest('Assessment has not been passed');
  }

  // Don't issue a second active certificate for the same training unless renewing.
  const existing = await Certificate.findOne({
    employeeId: assignment.employeeId,
    trainingId: training._id,
    status: CERT_STATUS.ACTIVE,
  });
  if (existing && !renewsCertificateId) return existing;

  const employee = await User.findById(assignment.employeeId);
  const issueDate = new Date();
  let expiryDate;
  if (training.validityMonths) {
    expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + training.validityMonths);
  }
  const certificateNumber = newCertNumber();

  const pdf = await renderPdf({ employee, training, certificateNumber, issueDate, expiryDate });
  const file = await uploadBuffer(pdf, {
    folder: 'certificates',
    resourceType: 'raw',
    filename: `${certificateNumber}.pdf`,
  });

  const cert = await Certificate.create({
    employeeId: assignment.employeeId,
    trainingId: training._id,
    certificateNumber,
    issueDate,
    expiryDate,
    fileUrl: file.url,
    filePublicId: file.publicId,
    issuedBy,
    renewsCertificateId,
  });

  if (renewsCertificateId) {
    await Certificate.updateOne({ _id: renewsCertificateId }, { status: CERT_STATUS.RENEWED });
  }
  return cert;
}

/** Marks active certificates past their expiry date as expired. Returns the count. */
export async function expireCertificates(now = new Date()) {
  const res = await Certificate.updateMany(
    { status: CERT_STATUS.ACTIVE, expiryDate: { $lte: now } },
    { status: CERT_STATUS.EXPIRED }
  );
  return res.modifiedCount;
}
