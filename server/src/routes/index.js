import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { ROLES } from '../utils/constants.js';
import * as s from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as depts from '../controllers/departmentController.js';
import * as trainings from '../controllers/trainingController.js';
import * as assignments from '../controllers/assignmentController.js';
import * as assessments from '../controllers/assessmentController.js';
import * as certs from '../controllers/certificateController.js';
import * as compliance from '../controllers/complianceController.js';
import * as notifications from '../controllers/notificationController.js';
import * as reports from '../controllers/reportController.js';

const { ADMIN, TRAINER, MANAGER } = ROLES;
const router = Router();

// --- Auth ---
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
router.post('/auth/login', loginLimiter, validate(s.loginSchema), auth.login);
router.post('/auth/refresh', validate(s.refreshSchema), auth.refresh);

// Everything below requires a valid token.
router.use(authenticate);
router.get('/auth/me', auth.me);

// --- Users & departments ---
router.get('/users', authorize(ADMIN, TRAINER, MANAGER), users.listUsers);
router.post('/users', authorize(ADMIN), validate(s.createUserSchema), users.createUser);
router.get('/users/:id', users.getUser);
router.patch('/users/:id', authorize(ADMIN), validate(s.updateUserSchema), users.updateUser);

router.get('/departments', depts.listDepartments);
router.post('/departments', authorize(ADMIN), validate(s.departmentSchema), depts.createDepartment);
router.patch('/departments/:id', authorize(ADMIN), validate(s.departmentSchema.partial()), depts.updateDepartment);

// --- Training ---
router.get('/trainings', trainings.listTrainings);
router.get('/trainings/:id', trainings.getTraining);
router.post('/trainings', authorize(ADMIN, TRAINER), upload.array('files', 10), validate(s.trainingSchema), trainings.createTraining);
router.patch('/trainings/:id', authorize(ADMIN, TRAINER), upload.array('files', 10), validate(s.trainingUpdateSchema), trainings.updateTraining);
router.delete('/trainings/:id/materials/:materialId', authorize(ADMIN, TRAINER), trainings.removeMaterial);

// --- Assignments & progress ---
router.post('/assignments', authorize(ADMIN, TRAINER), validate(s.assignSchema), assignments.createAssignments);
router.get('/assignments', authorize(ADMIN, TRAINER), assignments.listAssignments);
router.get('/assignments/me', assignments.myAssignments);
router.get('/assignments/employee/:employeeId', assignments.employeeAssignments);
router.patch('/assignments/:id/progress', validate(s.progressSchema), assignments.updateProgress);

// --- Assessments ---
router.post('/assessments', authorize(ADMIN, TRAINER), validate(s.assessmentSchema), assessments.createAssessment);
router.get('/assessments/by-training/:trainingId', assessments.getAssessmentByTraining);
router.get('/assessments/:id', assessments.getAssessment);
router.post('/assessments/:id/attempts', validate(s.attemptSchema), assessments.submitAttempt);

// --- Certificates ---
router.get('/certificates/me', certs.myCertificates);
router.get('/certificates', authorize(ADMIN, TRAINER), certs.listCertificates);
router.get('/certificates/employee/:employeeId', certs.employeeCertificates);
router.post('/certificates', authorize(ADMIN, TRAINER), validate(s.issueCertificateSchema), certs.issueCertificate);
router.patch('/certificates/:id/revoke', authorize(ADMIN), certs.revokeCertificate);

// --- Compliance ---
router.get('/compliance/me', compliance.myCompliance);
router.get('/compliance/summary', authorize(ADMIN, MANAGER), compliance.summary);
router.get('/compliance/employees/:id', compliance.employeeCompliance);
router.get('/compliance/requirements', authorize(ADMIN, TRAINER, MANAGER), compliance.listRequirements);
router.post('/compliance/requirements', authorize(ADMIN), validate(s.requirementSchema), compliance.createRequirement);
router.patch('/compliance/requirements/:id', authorize(ADMIN), validate(s.requirementSchema.partial()), compliance.updateRequirement);

// --- Notifications & reports ---
router.get('/notifications/me', notifications.myNotifications);
router.patch('/notifications/:id/read', notifications.markRead);
router.get('/reports/training', authorize(ADMIN, MANAGER), reports.trainingReport);
router.get('/reports/compliance', authorize(ADMIN, MANAGER), reports.complianceReport);
router.get('/reports/expiring-certificates', authorize(ADMIN, MANAGER), reports.expiringCertificates);

export default router;
