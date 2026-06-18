import mongoose from 'mongoose';
import { RatingModel } from '../models/rating.model';

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

export const RatingRepo = {
  async findAll() {
    return (await RatingModel.find({ deletedAt: null }).sort({ createdAt: -1 })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await RatingModel.findOne({ _id: id, deletedAt: null }));
  },

  async findByDoctor(doctorId: string) {
    return (await RatingModel.find({ doctorId, deletedAt: null }).sort({ createdAt: -1 })).map(toPlain);
  },

  async findByPatient(patientId: string) {
    return (await RatingModel.find({ patientId, deletedAt: null }).sort({ createdAt: -1 })).map(toPlain);
  },

  async create(data: Record<string, any>) {
    return toPlain(await RatingModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await RatingModel.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }));
  },

  async softDelete(id: string) {
    if (!isValidId(id)) return;
    await RatingModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  },

  /** Calculates avg rating and count for a doctor (used to update Doctor.rating) */
  async getDoctorStats(doctorId: string): Promise<{ avgRating: number; count: number }> {
    const ratings = await RatingModel.find({ doctorId, deletedAt: null }).select('rating');
    const count = ratings.length;
    const avgRating = count > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    return { avgRating: Math.round(avgRating * 10) / 10, count };
  },
};
