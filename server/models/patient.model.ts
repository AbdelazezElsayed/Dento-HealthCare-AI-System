import mongoose, { Document, Schema } from 'mongoose';

export interface IPatient extends Document {
  fullName: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  medicalHistory?: string;
  clinicId?: string;
  assignedToUserId?: string;
  deletedAt: Date | null;
  createdAt: Date;
}

const patientSchema = new Schema<IPatient>({
  fullName:         { type: String, required: true, trim: true },
  age:              { type: Number, min: 0, max: 150 },
  gender:           { type: String, enum: ['male', 'female', 'other'] },
  phone:            { type: String, trim: true },
  email:            { type: String, trim: true, lowercase: true },
  address:          { type: String },
  medicalHistory:   { type: String },
  clinicId:         { type: String },
  assignedToUserId: { type: String },
  deletedAt:        { type: Date, default: null },
  createdAt:        { type: Date, default: Date.now },
});

patientSchema.index({ assignedToUserId: 1 });
patientSchema.index({ deletedAt: 1 });
patientSchema.index({ fullName: 'text' });

export const PatientModel = mongoose.model<IPatient>('Patient', patientSchema);
