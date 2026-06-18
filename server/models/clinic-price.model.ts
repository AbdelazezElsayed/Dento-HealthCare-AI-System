import mongoose, { Document, Schema } from 'mongoose';

export interface IClinicPrice extends Document {
  clinicId: string;
  sessionPrice: number;
  updatedBy?: string;
  updatedAt: Date;
}

const clinicPriceSchema = new Schema<IClinicPrice>({
  clinicId:     { type: String, required: true, unique: true },
  sessionPrice: { type: Number, default: 500, min: 0 },
  updatedBy:    { type: String },
  updatedAt:    { type: Date, default: Date.now },
});

export const ClinicPriceModel = mongoose.model<IClinicPrice>('ClinicPrice', clinicPriceSchema);
