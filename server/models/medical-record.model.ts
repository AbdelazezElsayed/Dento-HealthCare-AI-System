import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicalRecord extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  clinicId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  date: Date;
  chiefComplaint: string;
  diagnosis: string;
  treatmentProvided: string;
  notes?: string;
  nextStep?: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>({
  patientId:         { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId:          { type: Schema.Types.ObjectId, ref: 'Clinic' },
  appointmentId:     { type: Schema.Types.ObjectId, ref: 'Appointment' },
  date:              { type: Date, default: Date.now },
  chiefComplaint:    { type: String, required: true, trim: true },
  diagnosis:         { type: String, required: true, trim: true },
  treatmentProvided: { type: String, required: true, trim: true },
  notes:             { type: String, trim: true },
  nextStep:          { type: String, trim: true },
  deletedAt:         { type: Date, default: null },
}, { timestamps: true });

medicalRecordSchema.index({ patientId: 1, date: -1 });
medicalRecordSchema.index({ doctorId: 1 });
medicalRecordSchema.index({ deletedAt: 1 });

export const MedicalRecordModel = mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
