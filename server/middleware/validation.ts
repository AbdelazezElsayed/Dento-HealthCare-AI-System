import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));

                console.log('❌ Validation failed for:', req.path);
                console.log('Body received:', JSON.stringify(req.body, null, 2));
                console.log('Errors:', JSON.stringify(errors, null, 2));

                return res.status(400).json({
                    success: false,
                    message: 'Invalid body',
                    messageEn: 'Invalid body',
                    errors,
                });
            }

            req.body = result.data;
            next();
        } catch (error) {
            console.error('❌ Validation exception:', error);
            return res.status(400).json({
                success: false,
                message: 'Invalid request body',
                messageEn: 'Invalid request body',
            });
        }
    };
}

/**
 * Validate request params
 */
export function validateParams<T extends ZodSchema>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.params);

            if (!result.success) {
                return res.status(400).json({
                    message: 'Invalid parameters',
                    errors: result.error.errors,
                });
            }

            next();
        } catch (error) {
            return res.status(400).json({
                message: 'Invalid parameters',
            });
        }
    };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Auth schemas
export const loginSchema = z.object({
    identifier: z.string().min(1, 'Email or username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    userType: z.enum(['patient', 'doctor', 'student', 'graduate', 'admin']).optional(),
});

export const registerSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    userType: z.enum(['patient', 'doctor', 'student', 'graduate', 'admin']),
    specialization: z.string().optional(),
    clinicId: z.string().optional().nullable(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Patient schema
export const createPatientSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    age: z.number().optional(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    clinicId: z.string().optional().nullable(),
    assignedToUserId: z.string().optional().nullable(),
});

// Appointment schema
export const createAppointmentSchema = z.object({
    patientId: z.string().optional(),
    doctorId: z.string(),
    clinicId: z.string().optional().nullable(),
    date: z.string(),
    time: z.string(),
    notes: z.string().optional().nullable(),
});

export const updateAppointmentSchema = z.object({
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
    notes: z.string().optional().nullable(),
    date: z.string().optional(),
    time: z.string().optional(),
});

// Payment schema
export const createPaymentSchema = z.object({
    patientId: z.string(),
    amount: z.string().or(z.number()),
    paymentMethod: z.enum(['cash', 'card', 'transfer']).default('cash'),
    notes: z.string().optional().nullable(),
});

// Visit session schema
export const createVisitSessionSchema = z.object({
    appointmentId: z.string().optional(),
    patientId: z.string(),
    doctorId: z.string(),
    clinicId: z.string(),
    sessionDate: z.string(),
    attendanceStatus: z.enum(['pending', 'attended', 'missed']).default('pending'),
    price: z.string().or(z.number()).default('500'),
    notes: z.string().optional().nullable(),
});

// AI Diagnosis schema
export const aiDiagnosisSchema = z.object({
    answers: z.record(z.string()),
    symptomSummary: z.string().max(5000).optional().nullable(),
    xrayImage: z.string().optional().nullable(),
    language: z.enum(['ar', 'en']).default('ar'),
    patientId: z.string().optional().nullable(),
});

// Clinic price schema
export const clinicPriceSchema = z.object({
    sessionPrice: z.string().or(z.number()),
});

// ID parameter schema
export const idParamSchema = z.object({
    id: z.string().min(1, 'ID is required'),
});
