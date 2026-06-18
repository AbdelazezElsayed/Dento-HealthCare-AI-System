import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId:       { type: String, required: true },
  action:       { type: String, required: true },
  entityType:   { type: String, required: true },
  entityId:     { type: String },
  previousData: { type: Schema.Types.Mixed },
  newData:      { type: Schema.Types.Mixed },
  ipAddress:    { type: String },
  userAgent:    { type: String },
  timestamp:    { type: Date, default: Date.now },
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });
// Auto-delete after 90 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
