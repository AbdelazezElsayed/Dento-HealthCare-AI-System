import mongoose, { Document, Schema } from 'mongoose';

export interface ITreatmentPlan extends Document {
  patientId: string;
  doctorId: string;
  doctorName?: string;
  title: string;
  description?: string;
  planStartDate?: Date;
  estimatedDuration?: string;
  procedures: Array<{
    name: string;
    description?: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'deferred';
    scheduledDate?: Date;
    completedDate?: Date;
    clinic?: string;
    department?: string;
    tooth?: string;
    toothNumber?: string;
    condition?: string;
    notes?: string;
    estimatedDuration?: string;
    estimatedCost?: string | number;
  }>;
  appointments: Array<{
    type?: string;
    clinic?: string;
    date?: string;
    time?: string;
  }>;
  notes?: string;
  source?: 'ai' | 'doctor';
  reviewStatus?: 'pending_doctor_review' | 'approved' | 'revision_requested';
  isAiDraft?: boolean;
  isFinal?: boolean;
  diagnosisRecordId?: string;
  appointmentId?: string;
  aiDisclaimer?: string;
  approvedBy?: string;
  approvedAt?: Date;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const treatmentPlanSchema = new Schema<ITreatmentPlan>({
  patientId:         { type: String, required: true },
  doctorId:          { type: String, required: true },
  doctorName:        { type: String },
  title:             { type: String, required: true },
  description:       { type: String },
  planStartDate:     { type: Date },
  estimatedDuration: { type: String },
  procedures: [{
    name:          { type: String, required: true },
    description:   { type: String },
    status:        { type: String, enum: ['scheduled', 'in-progress', 'completed', 'deferred'], default: 'scheduled' },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    clinic:        { type: String },
    department:    { type: String },
    tooth:         { type: String },
    toothNumber:   { type: String },
    condition:     { type: String },
    notes:         { type: String },
    estimatedDuration: { type: String },
    estimatedCost: { type: Schema.Types.Mixed },
  }],
  appointments: [{
    type:   { type: String },
    clinic: { type: String },
    date:   { type: String },
    time:   { type: String },
  }],
  notes:             { type: String },
  source:            { type: String, enum: ['ai', 'doctor'], default: 'doctor' },
  reviewStatus:      { type: String, enum: ['pending_doctor_review', 'approved', 'revision_requested'] },
  isAiDraft:         { type: Boolean, default: false },
  isFinal:           { type: Boolean, default: false },
  diagnosisRecordId: { type: String },
  appointmentId:     { type: String },
  aiDisclaimer:      { type: String },
  approvedBy:        { type: String },
  approvedAt:        { type: Date },
  status:            { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  createdAt:         { type: Date, default: Date.now },
  updatedAt:         { type: Date, default: Date.now },
});

treatmentPlanSchema.index({ patientId: 1, status: 1 });
treatmentPlanSchema.index({ doctorId: 1, reviewStatus: 1 });
treatmentPlanSchema.index({ diagnosisRecordId: 1 });

export const TreatmentPlanModel = mongoose.model<ITreatmentPlan>('TreatmentPlan', treatmentPlanSchema);
