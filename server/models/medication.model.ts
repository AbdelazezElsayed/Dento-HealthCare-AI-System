import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicationDoseTime {
  time: string;
  label?: string;
  instructions?: string;
}

export interface IMedication extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId | string;
  clinicId?: mongoose.Types.ObjectId;
  medicalRecordId?: mongoose.Types.ObjectId;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  reason?: string;
  notes?: string;
  doctorName?: string;
  status: 'active' | 'completed' | 'stopped';
  doseTimes: IMedicationDoseTime[];
  linkedAppointmentId?: mongoose.Types.ObjectId;
  linkedTreatmentPlanId?: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicationIntakeLog extends Document {
  prescriptionId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  scheduledFor: Date;
  takenAt: Date;
  status: 'taken' | 'missed' | 'skipped';
  createdAt: Date;
  updatedAt: Date;
}

const doseTimeSchema = new Schema<IMedicationDoseTime>({
  time:         { type: String, required: true, trim: true },
  label:        { type: String, trim: true },
  instructions: { type: String, trim: true },
}, { _id: false });

const medicationSchema = new Schema<IMedication>({
  patientId:       { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId:        { type: Schema.Types.Mixed, required: true },
  clinicId:        { type: Schema.Types.ObjectId, ref: 'Clinic' },
  medicalRecordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
  name:            { type: String, required: true, trim: true },
  dosage:          { type: String, required: true, trim: true },
  frequency:       { type: String, required: true, trim: true },
  duration:        { type: String, default: '', trim: true },
  instructions:    { type: String, trim: true },
  reason:          { type: String, trim: true },
  notes:           { type: String, trim: true },
  doctorName:      { type: String, trim: true },
  status:          { type: String, enum: ['active', 'completed', 'stopped'], default: 'active' },
  doseTimes:       { type: [doseTimeSchema], default: [] },
  linkedAppointmentId:   { type: Schema.Types.ObjectId, ref: 'Appointment' },
  linkedTreatmentPlanId: { type: Schema.Types.ObjectId, ref: 'TreatmentPlan' },
  startDate:       { type: Date, default: Date.now },
  endDate:         { type: Date },
  isActive:        { type: Boolean, default: true },
  deletedAt:       { type: Date, default: null },
}, { timestamps: true });

medicationSchema.index({ patientId: 1, isActive: 1 });
medicationSchema.index({ patientId: 1, status: 1 });
medicationSchema.index({ doctorId: 1 });
medicationSchema.index({ deletedAt: 1 });

const medicationIntakeLogSchema = new Schema<IMedicationIntakeLog>({
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  patientId:      { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  scheduledFor:   { type: Date, required: true },
  takenAt:        { type: Date, default: Date.now },
  status:         { type: String, enum: ['taken', 'missed', 'skipped'], default: 'taken' },
}, { timestamps: true });

medicationIntakeLogSchema.index(
  { prescriptionId: 1, patientId: 1, scheduledFor: 1 },
  { unique: true }
);
medicationIntakeLogSchema.index({ patientId: 1, scheduledFor: -1 });

export const MedicationModel = mongoose.model<IMedication>('Medication', medicationSchema);
export const MedicationIntakeLogModel = mongoose.model<IMedicationIntakeLog>('MedicationIntakeLog', medicationIntakeLogSchema);
