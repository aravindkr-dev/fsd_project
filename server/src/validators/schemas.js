import { z } from 'zod';
import { ROLE_LIST } from '../utils/constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalId = objectId.nullish().transform((v) => v || undefined);

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ROLE_LIST).default('employee'),
  departmentId: optionalId,
  managerId: optionalId,
  jobTitle: z.string().optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1),
    role: z.enum(ROLE_LIST),
    departmentId: optionalId,
    managerId: optionalId,
    jobTitle: z.string(),
    status: z.enum(['active', 'inactive']),
    password: z.string().min(8),
  })
  .partial();

export const departmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  managerId: optionalId,
});

const numberish = z.coerce.number();

export const trainingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  // Multipart forms send "true"/"false" strings; z.coerce.boolean would treat "false" as true.
  mandatory: z.preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean()).optional(),
  deadlineDays: numberish.int().positive().optional(),
  deadlineDate: z.coerce.date().optional(),
  validityMonths: numberish.int().min(0).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});
export const trainingUpdateSchema = trainingSchema.partial();

export const assignSchema = z
  .object({
    trainingId: objectId,
    employeeIds: z.array(objectId).optional(),
    departmentId: objectId.optional(),
    role: z.enum(ROLE_LIST).optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((v) => v.employeeIds?.length || v.departmentId || v.role, {
    message: 'Provide employeeIds, departmentId or role',
  });

export const progressSchema = z.object({
  materialId: objectId.optional(),
  started: z.boolean().optional(),
});

export const assessmentSchema = z.object({
  trainingId: objectId,
  title: z.string().optional(),
  passingScore: z.number().min(1).max(100).default(70),
  attemptLimit: z.number().int().min(1).default(3),
  questions: z
    .array(
      z
        .object({
          text: z.string().min(1),
          options: z.array(z.string().min(1)).min(2),
          correctOptions: z.array(z.number().int().min(0)).min(1),
          points: z.number().int().min(1).default(1),
        })
        .refine((q) => q.correctOptions.every((i) => i < q.options.length), {
          message: 'correctOptions must reference existing options',
        })
    )
    .min(1),
});

export const attemptSchema = z.object({
  answers: z.array(z.object({ questionId: objectId, selected: z.array(z.number().int().min(0)) })),
});

export const issueCertificateSchema = z.object({
  employeeId: objectId,
  trainingId: objectId,
  renewsCertificateId: objectId.optional(),
});

export const requirementSchema = z.object({
  name: z.string().min(1),
  departmentId: optionalId,
  role: z.enum(ROLE_LIST).optional(),
  requiredTrainingIds: z.array(objectId).min(1),
  active: z.boolean().optional(),
});
