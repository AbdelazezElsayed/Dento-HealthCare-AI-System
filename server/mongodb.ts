/**
 * mongodb.ts — Legacy compatibility re-exports
 *
 * This file previously contained all schemas + the connect function.
 * Now it simply re-exports from the new modular structure so that
 * any routes still importing from here continue to work during migration.
 *
 * The connect function has moved to: server/db/connection.ts
 * All models have moved to: server/models/
 */

export { connectMongoDB } from './db/connection';

export { UserModel }            from './models/user.model';
export { PatientModel }         from './models/patient.model';
export { DoctorModel }          from './models/doctor.model';
export { ClinicModel }          from './models/clinic.model';
export { AppointmentModel }     from './models/appointment.model';
export { VisitSessionModel }    from './models/visit-session.model';
export { PaymentModel }         from './models/payment.model';
export { NotificationModel }    from './models/notification.model';
export { RatingModel }          from './models/rating.model';
export { ClinicPriceModel }     from './models/clinic-price.model';
export { TreatmentPlanModel }   from './models/treatment-plan.model';
export { AuditLogModel }        from './models/audit-log.model';
export { DiagnosisRecordModel } from './models/diagnosis-record.model';
export { MedicalRecordModel }   from './models/medical-record.model';
export { MedicationModel, MedicationIntakeLogModel } from './models/medication.model';
// TreatmentModel and ReportModel — kept as inline schemas for backward compatibility
// since they are not used by any active route yet
import mongoose from 'mongoose';

const treatmentSchema = new mongoose.Schema({
  patientId:   { type: String, required: true },
  doctorId:    { type: String, required: true },
  clinicId:    { type: String },
  description: { type: String, required: true },
  date:        { type: String, required: true },
  cost:        { type: Number, min: 0 },
  status:      { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  notes:       { type: String },
  createdAt:   { type: Date, default: Date.now },
});

const reportSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId:  { type: String, required: true },
  type:      { type: String, required: true },
  content:   { type: String },
  date:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const TreatmentModel = mongoose.models['Treatment'] || mongoose.model('Treatment', treatmentSchema);
export const ReportModel    = mongoose.models['Report']    || mongoose.model('Report', reportSchema);
