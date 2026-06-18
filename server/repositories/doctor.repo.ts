import mongoose from 'mongoose';
import { DoctorModel } from '../models/doctor.model';

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

export const DoctorRepo = {
  async findAll() {
    return (await DoctorModel.find({ deletedAt: null })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await DoctorModel.findOne({ _id: id, deletedAt: null }));
  },

  async findByUserId(userId: string) {
    return toPlain(await DoctorModel.findOne({ userId, deletedAt: null }));
  },

  async create(data: Record<string, any>) {
    return toPlain(await DoctorModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await DoctorModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async toggleAvailability(id: string, isAvailable: boolean) {
    return toPlain(await DoctorModel.findByIdAndUpdate(id, { isAvailable }, { new: true }));
  },

  async softDelete(id: string) {
    await DoctorModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  },

  /** Returns the userId linked to this doctor (for notification targeting) */
  async getLinkedUserId(doctorId: string): Promise<string | null> {
    if (!isValidId(doctorId)) return null;
    const doctor = await DoctorModel.findById(doctorId).select('userId');
    if (!doctor) return null;
    return (doctor as any).userId?.toString() ?? null;
  },

  async updateRatingStats(doctorId: string, newAvgRating: number, reviewCount: number) {
    await DoctorModel.findByIdAndUpdate(doctorId, { rating: newAvgRating, reviewCount });
  },
};
