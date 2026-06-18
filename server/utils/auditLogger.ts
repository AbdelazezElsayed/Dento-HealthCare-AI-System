import { AuditLogModel } from '../mongodb';
import logger from './logger';

export interface AuditLogParams {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    previousData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
}

// FIX (M3): Redact PHI fields before persisting to the audit log.
// Without this, every CREATE_PATIENT / UPDATE_PATIENT log entry stored full names,
// phone numbers, addresses, medical notes, and hashed passwords in plaintext.
const PHI_FIELDS = [
    'fullName', 'phone', 'email', 'address', 'notes', 'password',
    'conditions', 'recommendations', 'symptoms', 'medicalHistory',
    'allergies', 'nationalId', 'bloodType',
];

function redactPHI(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const out: Record<string, any> = { ...data };
    for (const field of PHI_FIELDS) {
        if (field in out) out[field] = '[REDACTED]';
    }
    return out;
}

/**
 * Logs a sensitive action to the database.
 * PHI fields in previousData/newData are automatically redacted.
 */
export async function logAudit(params: AuditLogParams) {
    try {
        await AuditLogModel.create({
            userId:       params.userId,
            action:       params.action,
            entityType:   params.entityType,
            entityId:     params.entityId ?? undefined,   // model expects string | undefined, not null
            previousData: redactPHI(params.previousData),
            newData:      redactPHI(params.newData),
            ipAddress:    params.ipAddress,
            userAgent:    params.userAgent,
            timestamp:    new Date(),
        });
    } catch (err) {
        logger.error('Failed to create audit log:', err);
        // We don't throw here to avoid breaking the main operation if logging fails
    }
}



