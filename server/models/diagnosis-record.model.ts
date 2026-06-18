import mongoose, { Document, Schema } from 'mongoose';

export interface IDiagnosisRecord extends Document {
  userId: string;
  patientId?: string;
  answers?: Record<string, any>;
  conditions: Array<{
    name?: string;
    nameEn?: string;
    conditionKey?: string;
    probability?: number;
    description?: string;
  }>;
  recommendations: string[];
  urgency?: 'low' | 'medium' | 'high';
  confidence?: number;
  suggestedClinic?: {
    id?: string;
    name?: string;
    nameAr?: string;
    nameEn?: string;
  };
  xrayFileId?: string;
  xrayFilename?: string;
  estimatedTreatmentTime?: string;
  createdAt: Date;
  deletedAt: Date | null;
}

const diagnosisRecordSchema = new Schema<IDiagnosisRecord>({
  userId:    { type: String, required: true },
  patientId: { type: String },
  answers:   { type: Schema.Types.Mixed },
  conditions: [{
    name:         { type: String },
    nameEn:       { type: String },
    conditionKey: { type: String },
    probability:  { type: Number },
    description:  { type: String },
  }],
  recommendations:        [{ type: String }],
  urgency:                { type: String, enum: ['low', 'medium', 'high'] },
  confidence:             { type: Number, min: 0, max: 100 },
  suggestedClinic: {
    id:     { type: String },
    name:   { type: String },
    nameAr: { type: String },
    nameEn: { type: String },
  },
  xrayFileId:              { type: String },
  xrayFilename:            { type: String },
  estimatedTreatmentTime:  { type: String },
  createdAt:               { type: Date, default: Date.now },
  deletedAt:               { type: Date, default: null },
});

diagnosisRecordSchema.index({ userId: 1, createdAt: -1 });
diagnosisRecordSchema.index({ patientId: 1, createdAt: -1 });
diagnosisRecordSchema.index({ deletedAt: 1 });

export const DiagnosisRecordModel = mongoose.model<IDiagnosisRecord>('DiagnosisRecord', diagnosisRecordSchema);
