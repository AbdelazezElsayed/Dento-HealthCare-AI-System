import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  patientId: string;
  sessionId?: string;   // Link to VisitSession (for auto-created payments)
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentDate: string;
  status: 'pending' | 'paid';
  notes?: string;
  createdBy?: string;
  createdAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  patientId:     { type: String, required: true },
  sessionId:     { type: String },
  amount:        { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
  paymentDate:   { type: String, required: true },
  status:        { type: String, enum: ['pending', 'paid'], default: 'pending' },
  notes:         { type: String },
  createdBy:     { type: String },
  createdAt:     { type: Date, default: Date.now },
});

paymentSchema.index({ patientId: 1 });
paymentSchema.index({ sessionId: 1 });
paymentSchema.index({ status: 1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema);
