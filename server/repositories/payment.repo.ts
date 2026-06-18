import mongoose from 'mongoose';
import { VisitSessionModel } from '../models/visit-session.model';
import { PaymentModel } from '../models/payment.model';

function toPlain(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export const VisitSessionRepo = {
  async findAll() {
    return (await VisitSessionModel.find()).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await VisitSessionModel.findById(id));
  },

  async findByPatient(patientId: string) {
    return (await VisitSessionModel.find({ patientId }).sort({ createdAt: -1 })).map(toPlain);
  },

  async create(data: Record<string, any>) {
    return toPlain(await VisitSessionModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await VisitSessionModel.findByIdAndUpdate(id, data, { new: true }));
  },
};

export const PaymentRepo = {
  async findAll() {
    return (await PaymentModel.find()).map(toPlain);
  },

  async findByPatient(patientId: string) {
    return (await PaymentModel.find({ patientId }).sort({ createdAt: -1 })).map(toPlain);
  },

  async create(data: Record<string, any>) {
    return toPlain(await PaymentModel.create(data));
  },

  /**
   * Auto-creates a pending payment immediately after a visit session is marked attended.
   * This is the fix for the missing auto-payment-creation gap.
   */
  async createFromSession(session: {
    id: string;
    patientId: string;
    price: number;
    sessionDate: string;
    doctorId: string;
  }, createdBy: string) {
    return toPlain(await PaymentModel.create({
      patientId:     session.patientId,
      sessionId:     session.id,
      amount:        session.price,
      paymentMethod: 'cash',
      paymentDate:   session.sessionDate,
      status:        'pending',
      createdBy,
    }));
  },

  async getPatientBalance(patientId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
    const sessions = await VisitSessionModel.find({ patientId, attendanceStatus: 'attended' });
    const totalDue = sessions.reduce((sum, s) => sum + (s.price || 0), 0);

    // BUGFIX (H2): Only count payments with status 'paid'.
    // Previously ALL payments were summed regardless of status, so pending/cancelled
    // payments were incorrectly counted as paid, producing wrong balances.
    const payments = await PaymentModel.find({ patientId, status: 'paid' });
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  },
};
