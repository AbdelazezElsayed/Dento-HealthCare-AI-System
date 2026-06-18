import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Centralized Authentication & Authorization Middleware
 * =====================================================
 * This module provides reusable middleware for all routes
 */

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        userType?: string;
    }
}

// User type constants
export const USER_TYPES = {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    STUDENT: 'student',
    GRADUATE: 'graduate',
    ADMIN: 'admin',
} as const;

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];

/**
 * Require authentication - blocks unauthenticated requests
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            message: 'غير مسموح - يرجى تسجيل الدخول',
            messageEn: 'Unauthorized - Please log in',
            code: 'UNAUTHORIZED'
        });
    }
    next();
}

/**
 * Require specific role(s) - blocks users without required role
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                message: 'غير مسموح - يرجى تسجيل الدخول',
                messageEn: 'Unauthorized - Please log in',
                code: 'UNAUTHORIZED'
            });
        }
        if (!roles.includes(req.session.userType || '')) {
            return res.status(403).json({
                success: false,
                message: 'لا تملك صلاحية للوصول لهذه الصفحة',
                messageEn: 'You do not have permission to access this resource',
                code: 'FORBIDDEN'
            });
        }
        next();
    };
}

/**
 * Require admin role only
 */
export const requireAdmin = requireRole(USER_TYPES.ADMIN);

/**
 * Require doctor role (includes doctor and graduate)
 */
export const requireDoctor = requireRole(USER_TYPES.DOCTOR, USER_TYPES.GRADUATE);

/**
 * Require medical staff (doctor, graduate, or student)
 */
export const requireMedicalStaff = requireRole(
    USER_TYPES.DOCTOR,
    USER_TYPES.GRADUATE,
    USER_TYPES.STUDENT
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get patient ID from session user ID
 */
export async function getPatientIdFromUserId(userId: string): Promise<string | null> {
    const patient = await storage.getPatientByUserId(userId);
    return patient?.id || null;
}

/**
 * Get doctor ID from session user ID
 */
export async function getDoctorIdFromUserId(userId: string): Promise<string | null> {
    const doctor = await storage.getDoctorByUserId(userId);
    return doctor?.id || null;
}

/**
 * Check if user can access a specific patient's data
 * - Admins can access all
 * - Patients can only access their own data
 * - Doctors can access patients they have appointments with
 */
export async function canAccessPatient(
    userId: string,
    userType: string,
    targetPatientId: string
): Promise<boolean> {
    const sameId = (left?: unknown, right?: unknown) => {
        if (left === undefined || left === null || right === undefined || right === null) {
            return false;
        }
        return String(left) === String(right);
    };

    // Admins can access all
    if (userType === USER_TYPES.ADMIN) {
        return true;
    }

    // Patients/students can only access their own data
    if (userType === USER_TYPES.PATIENT || userType === USER_TYPES.STUDENT) {
        const myPatientId = await getPatientIdFromUserId(userId);
        return sameId(myPatientId, targetPatientId);
    }

    // Doctors can access patients they have appointments with
    if (userType === USER_TYPES.DOCTOR || userType === USER_TYPES.GRADUATE) {
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) return false;

        // Check if doctor has any appointments with this patient
        const appointments = await storage.getAppointmentsByDoctor(doctorId);
        if (appointments.some(apt => sameId(apt.patientId, targetPatientId))) {
            return true;
        }

        // Backward compatibility for older appointment rows that stored the
        // doctor's user id instead of the doctor profile id.
        const legacyAppointments = await storage.getAppointmentsByDoctor(userId);
        return legacyAppointments.some(apt => sameId(apt.patientId, targetPatientId));
    }

    return false;
}

/**
 * Middleware to validate patient access
 * Expects patientId in req.params.patientId or req.body.patientId
 */
export function validatePatientAccess(paramName: string = 'patientId') {
    return async (req: Request, res: Response, next: NextFunction) => {
        const patientId = req.params[paramName] || req.body[paramName];

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المريض مطلوب',
                messageEn: 'Patient ID is required',
                code: 'MISSING_PATIENT_ID'
            });
        }

        const hasAccess = await canAccessPatient(
            req.session.userId!,
            req.session.userType!,
            patientId
        );

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول لبيانات هذا المريض',
                messageEn: 'You are not authorized to access this patient\'s data',
                code: 'PATIENT_ACCESS_DENIED'
            });
        }

        next();
    };
}
