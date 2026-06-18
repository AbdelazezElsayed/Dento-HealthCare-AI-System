import mongoose, { Document, Schema } from 'mongoose';

export interface IClinic extends Document {
  name: string;
  nameAr?: string;
  description?: string;
  color?: string;
  icon?: string;
  deletedAt: Date | null;
  createdAt: Date;
}

const clinicSchema = new Schema<IClinic>({
  name:        { type: String, required: true, trim: true },
  nameAr:      { type: String, trim: true },
  description: { type: String },
  color:       { type: String },
  icon:        { type: String },
  deletedAt:   { type: Date, default: null },
  createdAt:   { type: Date, default: Date.now },
});

clinicSchema.index({ deletedAt: 1 });

export const ClinicModel = mongoose.model<IClinic>('Clinic', clinicSchema);
