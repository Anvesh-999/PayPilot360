const { z } = require('zod');

const employeeBaseSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^[0-9+\-\s]{7,20}$/, 'Invalid phone format').optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  jobPositionId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  workingScheduleId: z.string().uuid().optional().nullable(),
  joiningDate: z.coerce.date(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).default('ACTIVE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).default('FULL_TIME'),
  bankAccountName: z.string().max(100).optional().nullable(),
  bankAccountNumber: z.string().regex(/^[0-9]{9,18}$/, 'Bank account must be 9-18 digits').optional().nullable(),
  bankIfsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional().nullable(),
  profilePhotoUrl: z.string().url().optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.string().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

const employeeCreateSchema = employeeBaseSchema.refine(
  (data) => !data.managerId || data.managerId !== data.id,
  { message: 'Manager cannot be self', path: ['managerId'] }
);

const employeeUpdateSchema = employeeBaseSchema.partial();

const employeeQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']).optional(),
  sort: z.string().optional().default('firstName'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

module.exports = { employeeCreateSchema, employeeUpdateSchema, employeeQuerySchema };
