import mongoose from 'mongoose';
import { MedicalRecordModel } from '../mongodb';

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

export const MedicalRecordRepo = {
  async findByPatientId(patientId: string) {
    if (!isValidId(patientId)) return [];
    return (await MedicalRecordModel.find({ patientId, deletedAt: null }).sort({ date: -1 })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await MedicalRecordModel.findOne({ _id: id, deletedAt: null }));
  },

  async create(data: Record<string, any>) {
    return toPlain(await MedicalRecordModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await MedicalRecordModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async softDelete(id: string) {
    if (!isValidId(id)) return null;
    await MedicalRecordModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  },
};
