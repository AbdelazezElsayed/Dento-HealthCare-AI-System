import mongoose, { Document, Schema } from 'mongoose';

export interface IVisitSession extends Document {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  sessionDate: string;
  attendanceStatus: 'pending' | 'attended' | 'missed';
  price: number;
  notes?: string;
  createdAt: Date;
}

const visitSessionSchema = new Schema<IVisitSession>({
  appointmentId:    { type: String, required: true },
  patientId:        { type: String, required: true },
  doctorId:         { type: String, required: true },
  clinicId:         { type: String, required: true },
  sessionDate:      { type: String, required: true },
  attendanceStatus: { type: String, enum: ['pending', 'attended', 'missed'], default: 'pending' },
  price:            { type: Number, default: 500, min: 0 },
  notes:            { type: String },
  createdAt:        { type: Date, default: Date.now },
});

visitSessionSchema.index({ patientId: 1, attendanceStatus: 1 });
visitSessionSchema.index({ doctorId: 1, sessionDate: 1 });

export const VisitSessionModel = mongoose.model<IVisitSession>('VisitSession', visitSessionSchema);
