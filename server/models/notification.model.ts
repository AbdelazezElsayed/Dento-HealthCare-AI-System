import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  titleEn?: string;
  messageEn?: string;
  type: 'appointment' | 'payment' | 'system' | 'reminder' | 'alert';
  relatedEntityType?: string;
  relatedEntityId?: string;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

const notificationSchema = new Schema<INotification>({
  userId:            { type: String, required: true },
  title:             { type: String, required: true },
  message:           { type: String, required: true },
  titleEn:           { type: String },
  messageEn:         { type: String },
  type:              { type: String, enum: ['appointment', 'payment', 'system', 'reminder', 'alert'], default: 'system' },
  relatedEntityType: { type: String },
  relatedEntityId:   { type: String },
  read:              { type: Boolean, default: false },
  createdAt:         { type: Date, default: Date.now },
  expiresAt:         { type: Date },
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

export const NotificationModel = mongoose.model<INotification>('Notification', notificationSchema);
