import mongoose from 'mongoose';
import { AppointmentModel } from '../models/appointment.model';

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

export const AppointmentRepo = {
  async findAll() {
    return (await AppointmentModel.find({ deletedAt: null })).map(toPlain);
  },

  async findById(id: string) {
    if (!isValidId(id)) return null;
    return toPlain(await AppointmentModel.findOne({ _id: id, deletedAt: null }));
  },

  async findByPatient(patientId: string) {
    return (await AppointmentModel.find({ patientId, deletedAt: null })
      .sort({ date: -1 })).map(toPlain);
  },

  async findByDoctor(doctorId: string) {
    return (await AppointmentModel.find({ doctorId, deletedAt: null })
      .sort({ date: -1 })).map(toPlain);
  },

  async findByDoctorAndDate(doctorId: string, date: string) {
    return (await AppointmentModel.find({ doctorId, date, deletedAt: null })
      .sort({ time: 1 })).map(toPlain);
  },

  async checkConflict(
    doctorId: string,
    date: string,
    time: string,
    patientId?: string,
    excludeId?: string,
    durationMinutes: number = 30
  ): Promise<boolean> {
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (!time) return false;
    const newStart = parseTime(time);
    const newEnd = newStart + durationMinutes;

    const doctorQuery: any = { doctorId, date, status: 'scheduled', deletedAt: null };
    if (excludeId) doctorQuery._id = { $ne: excludeId };
    
    const existingDoctorAppts = await AppointmentModel.find(doctorQuery);
    for (const appt of existingDoctorAppts) {
      if (!appt.time) continue;
      const apptStart = parseTime(appt.time);
      const apptEnd = apptStart + (appt.duration || 30);
      
      // Check overlap: (StartA < EndB) and (EndA > StartB)
      if (newStart < apptEnd && newEnd > apptStart) {
        return true;
      }
    }

    if (patientId) {
      const patientQuery: any = { patientId, date, status: 'scheduled', deletedAt: null };
      if (excludeId) patientQuery._id = { $ne: excludeId };
      const existingPatientAppts = await AppointmentModel.find(patientQuery);
      for (const appt of existingPatientAppts) {
        if (!appt.time) continue;
        const apptStart = parseTime(appt.time);
        const apptEnd = apptStart + (appt.duration || 30);
        if (newStart < apptEnd && newEnd > apptStart) {
          return true;
        }
      }
    }

    return false;
  },

  async suggestAlternativeSlot(
    doctorId: string,
    date: string,
    time: string,
    durationMinutes: number = 30
  ): Promise<string | null> {
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    if (!time) return null;
    const requestedStart = parseTime(time);
    const doctorQuery: any = { doctorId, date, status: 'scheduled', deletedAt: null };
    const existingAppts = await AppointmentModel.find(doctorQuery);
    
    const slots = existingAppts
      .filter(a => a.time)
      .map(appt => {
        const start = parseTime(appt.time!);
        return { start, end: start + (appt.duration || 30) };
      }).sort((a, b) => a.start - b.start);

    let currentStart = requestedStart;
    const MAX_TIME = 20 * 60; // 8:00 PM max limit
    
    while (currentStart + durationMinutes <= MAX_TIME) {
      const currentEnd = currentStart + durationMinutes;
      const overlap = slots.find(s => currentStart < s.end && currentEnd > s.start);
      if (!overlap) {
        return formatTime(currentStart);
      }
      currentStart = overlap.end;
    }
    
    return null;
  },

  async create(data: Record<string, any>) {
    return toPlain(await AppointmentModel.create(data));
  },

  async update(id: string, data: Record<string, any>) {
    if (!isValidId(id)) return null;
    return toPlain(await AppointmentModel.findByIdAndUpdate(id, data, { new: true }));
  },

  async softDelete(id: string) {
    await AppointmentModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  },
};
