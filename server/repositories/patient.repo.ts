import mongoose from 'mongoose';
import { PatientModel } from '../models/patient.model';

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

export const PatientRepo = {
  async findAll() {
    return (await PatientModel.find({ deletedAt: null })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await PatientModel.findOne({ _id: id, deletedAt: null }));
  },

  async findByUserId(userId: string) {
    return toPlain(await PatientModel.findOne({ assignedToUserId: userId, deletedAt: null }));
  },

  async create(data: Record<string, any>) {
    return toPlain(await PatientModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await PatientModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async softDelete(id: string) {
    await PatientModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  },

  /** Returns the userId linked to this patient (for notification targeting) */
  async getLinkedUserId(patientId: string): Promise<string | null> {
    if (!isValidId(patientId)) return null;
    const patient = await PatientModel.findById(patientId).select('assignedToUserId');
    if (!patient) return null;
    return (patient as any).assignedToUserId?.toString() ?? null;
  },
};
