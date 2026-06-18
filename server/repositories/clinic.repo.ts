import mongoose from 'mongoose';
import { ClinicModel } from '../models/clinic.model';
import { ClinicPriceModel } from '../models/clinic-price.model';
import { TreatmentPlanModel } from '../models/treatment-plan.model';

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

export const ClinicRepo = {
  async findAll() {
    return (await ClinicModel.find({ deletedAt: null })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await ClinicModel.findOne({ _id: id, deletedAt: null }));
  },

  async create(data: Record<string, any>) {
    return toPlain(await ClinicModel.create(data));
  },
};

export const ClinicPriceRepo = {
  async findAll() {
    return (await ClinicPriceModel.find()).map(toPlain);
  },

  async findByClinic(clinicId: string) {
    return toPlain(await ClinicPriceModel.findOne({ clinicId }));
  },

  async upsert(clinicId: string, sessionPrice: number, updatedBy: string) {
    return toPlain(await ClinicPriceModel.findOneAndUpdate(
      { clinicId },
      { clinicId, sessionPrice, updatedBy, updatedAt: new Date() },
      { upsert: true, new: true }
    ));
  },
};

export const TreatmentPlanRepo = {
  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await TreatmentPlanModel.findById(id));
  },

  async findByPatient(patientId: string) {
    return toPlain(await TreatmentPlanModel.findOne({
      patientId,
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 }));
  },

  async findByAppointment(appointmentId: string) {
    return toPlain(await TreatmentPlanModel.findOne({
      appointmentId,
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 }));
  },

  async findPendingAiDraftsByDoctor(doctorId: string) {
    return (await TreatmentPlanModel.find({
      doctorId,
      source: 'ai',
      reviewStatus: { $in: ['pending_doctor_review', 'revision_requested'] },
      isAiDraft: true,
      isFinal: { $ne: true },
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 })).map(toPlain);
  },

  async create(data: Record<string, any>) {
    return toPlain(await TreatmentPlanModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await TreatmentPlanModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedAt: new Date() } },
      { new: true }
    ));
  },
};
