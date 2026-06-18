import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  patientId: string;
  doctorId: string;
  clinicId?: string;
  date: string;
  time: string;
  duration?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  deletedAt: Date | null;
  createdAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  patientId: { type: String, required: true },
  doctorId:  { type: String, required: true },
  clinicId:  { type: String },
  date:      { type: String, required: true },
  time:      { type: String, required: true },
  duration:  { type: Number, default: 30 },
  status:    { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
  notes:     { type: String },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.index({ doctorId: 1, date: 1, time: 1, status: 1 });
appointmentSchema.index({ patientId: 1, date: 1 });
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ deletedAt: 1 });

// Unique constraint to prevent double-booking (only for scheduled, non-deleted)
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled', deletedAt: null } }
);

export const AppointmentModel = mongoose.model<IAppointment>('Appointment', appointmentSchema);
