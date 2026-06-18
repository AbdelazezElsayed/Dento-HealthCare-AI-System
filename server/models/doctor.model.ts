import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctor extends Document {
  fullName: string;
  specialization?: string;
  phone?: string;
  email?: string;
  clinicId?: string;
  userId?: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

const doctorSchema = new Schema<IDoctor>({
  fullName:       { type: String, required: true, trim: true },
  specialization: { type: String, trim: true },
  phone:          { type: String, trim: true },
  email:          { type: String, trim: true, lowercase: true },
  clinicId:       { type: String },
  userId:         { type: String },
  rating:         { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:    { type: Number, default: 0, min: 0 },
  isAvailable:    { type: Boolean, default: true },
  deletedAt:      { type: Date, default: null },
  createdAt:      { type: Date, default: Date.now },
});

doctorSchema.index({ userId: 1 });
doctorSchema.index({ clinicId: 1 });
doctorSchema.index({ deletedAt: 1 });
doctorSchema.index({ isAvailable: 1 });

export const DoctorModel = mongoose.model<IDoctor>('Doctor', doctorSchema);
