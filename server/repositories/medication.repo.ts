import mongoose from 'mongoose';
import { MedicationIntakeLogModel, MedicationModel } from '../mongodb';

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

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export const MedicationRepo = {
  async findByPatientId(patientId: string) {
    if (!isValidId(patientId)) return [];
    return (await MedicationModel.find({ patientId, deletedAt: null }).sort({ startDate: -1 })).map(toPlain);
  },

  async findByDoctorId(doctorId: string) {
    if (!isValidId(doctorId)) return [];
    return (await MedicationModel.find({ doctorId, deletedAt: null }).sort({ startDate: -1 })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await MedicationModel.findOne({ _id: id, deletedAt: null }));
  },

  async create(data: Record<string, any>) {
    return toPlain(await MedicationModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await MedicationModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async softDelete(id: string) {
    if (!isValidId(id)) return null;
    await MedicationModel.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false });
  },

  async findIntakeLogsForPatientDate(patientId: string, date = new Date()) {
    if (!isValidId(patientId)) return [];
    return (await MedicationIntakeLogModel.find({
      patientId,
      scheduledFor: { $gte: startOfDay(date), $lte: endOfDay(date) },
    })).map(toPlain);
  },

  async findIntakeLog(prescriptionId: string, patientId: string, scheduledFor: Date) {
    if (!isValidId(prescriptionId) || !isValidId(patientId)) return null;
    return toPlain(await MedicationIntakeLogModel.findOne({
      prescriptionId,
      patientId,
      scheduledFor,
    }));
  },

  async createIntakeLog(data: {
    prescriptionId: string;
    patientId: string;
    scheduledFor: Date;
    takenAt?: Date;
    status?: 'taken' | 'missed' | 'skipped';
  }) {
    return toPlain(await MedicationIntakeLogModel.create({
      ...data,
      takenAt: data.takenAt || new Date(),
      status: data.status || 'taken',
    }));
  },
};
