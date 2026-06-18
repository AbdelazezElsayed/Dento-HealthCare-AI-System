import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const ratingSchema = new Schema<IRating>({
  doctorId:      { type: String, required: true },
  patientId:     { type: String, required: true },
  appointmentId: { type: String },
  rating: {
    type: Number, required: true, min: 1, max: 5,
    validate: { validator: Number.isInteger, message: 'Rating must be integer 1-5' },
  },
  comment:   { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

ratingSchema.index({ doctorId: 1, deletedAt: 1 });
ratingSchema.index({ patientId: 1, deletedAt: 1 });
ratingSchema.index({ createdAt: -1 });

export const RatingModel = mongoose.model<IRating>('Rating', ratingSchema);
