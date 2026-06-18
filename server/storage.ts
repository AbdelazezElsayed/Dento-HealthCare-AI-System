import mongoose from 'mongoose';
import {
  UserModel, PatientModel, DoctorModel, ClinicModel, AppointmentModel,
  TreatmentModel, TreatmentPlanModel, ReportModel, VisitSessionModel,
  PaymentModel, ClinicPriceModel, RatingModel, NotificationModel
} from "./mongodb";

/**
 * Check if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

function toPlainObject(doc: any): any {
  if (!doc) return undefined;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id?.toString() || obj.id;
  delete obj._id;
  delete obj.__v;

  // Fallback: map legacy 'name' field to 'fullName' for backward compatibility
  if (!obj.fullName && obj.name) {
    obj.fullName = obj.name;
  }

  return obj;
}

export interface IStorage {
  getUser(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  getPatients(): Promise<any[]>;
  getPatient(id: string): Promise<any>;
  getPatientByUserId(userId: string): Promise<any>;
  createPatient(patient: any): Promise<any>;
  getDoctors(): Promise<any[]>;
  getDoctor(id: string): Promise<any>;
  getDoctorByUserId(userId: string): Promise<any>;
  createDoctor(doctor: any): Promise<any>;
  getClinics(): Promise<any[]>;
  getClinic(id: string): Promise<any>;
  createClinic(clinic: any): Promise<any>;
  getAppointments(): Promise<any[]>;
  getAppointment(id: string): Promise<any>;
  getAppointmentsByPatient(patientId: string): Promise<any[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<any[]>;
  getAppointmentsByDoctorAndDate(doctorId: string, date: string): Promise<any[]>;
  checkAppointmentConflict(doctorId: string, date: string, time: string): Promise<boolean>;
  createAppointment(appointment: any): Promise<any>;
  updateAppointment(id: string, data: any): Promise<any>;
  getVisitSessions(): Promise<any[]>;
  getVisitSession(id: string): Promise<any>;
  getVisitSessionsByPatient(patientId: string): Promise<any[]>;
  createVisitSession(session: any): Promise<any>;
  updateVisitSession(id: string, data: any): Promise<any>;
  getPayments(): Promise<any[]>;
  getPayment(id: string): Promise<any | null>;
  getPaymentsByPatient(patientId: string): Promise<any[]>;
  createPayment(payment: any): Promise<any>;
  updatePayment(id: string, data: Partial<any>): Promise<any>;
  getPatientBalance(patientId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }>;
  getClinicPrices(): Promise<any[]>;
  getClinicPrice(clinicId: string): Promise<any>;
  upsertClinicPrice(price: any): Promise<any>;
  // Rating methods
  getRatings(): Promise<any[]>;
  getRatingById(id: string): Promise<any | null>;
  createRating(rating: any): Promise<any>;
  updateRating(id: string, data: any): Promise<any>;
  deleteRating(id: string): Promise<void>;
  getRatingsByDoctor(doctorId: string): Promise<any[]>;
  getRatingsByPatient(patientId: string): Promise<any[]>;
  // Notification methods
  getNotifications(userId: string, unreadOnly?: boolean): Promise<any[]>;
  getNotificationById(id: string): Promise<any | null>;
  createNotification(notification: any): Promise<any>;
  markNotificationAsRead(id: string): Promise<any>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  // Helper
  getPatientUserId(patientId: string): Promise<string | null>;
}

export class MongoStorage implements IStorage {
  async getUser(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const user = await UserModel.findById(id);
    return toPlainObject(user);
  }

  async getUserByUsername(username: string): Promise<any> {
    const user = await UserModel.findOne({ username, deletedAt: null });
    return toPlainObject(user);
  }

  async getUserByEmail(email: string): Promise<any> {
    const user = await UserModel.findOne({ email, deletedAt: null });
    return toPlainObject(user);
  }

  async createUser(insertUser: any): Promise<any> {
    const user = await UserModel.create(insertUser);
    return toPlainObject(user);
  }

  async getPatients(): Promise<any[]> {
    const patients = await PatientModel.find({ deletedAt: null });
    return patients.map(toPlainObject);
  }

  async getPatient(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const patient = await PatientModel.findOne({ _id: id, deletedAt: null });
    return toPlainObject(patient);
  }

  async getPatientByUserId(userId: string): Promise<any> {
    const patient = await PatientModel.findOne({ assignedToUserId: userId, deletedAt: null });
    return toPlainObject(patient);
  }

  async createPatient(insertPatient: any): Promise<any> {
    const patient = await PatientModel.create(insertPatient);
    return toPlainObject(patient);
  }

  async getDoctors(): Promise<any[]> {
    const doctors = await DoctorModel.find({ deletedAt: null });
    return doctors.map(toPlainObject);
  }

  async getDoctor(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const doctor = await DoctorModel.findOne({ _id: id, deletedAt: null });
    return toPlainObject(doctor);
  }

  async getDoctorByUserId(userId: string): Promise<any> {
    const doctor = await DoctorModel.findOne({ userId, deletedAt: null });
    return toPlainObject(doctor);
  }

  async createDoctor(insertDoctor: any): Promise<any> {
    const doctor = await DoctorModel.create(insertDoctor);
    return toPlainObject(doctor);
  }

  async getClinics(): Promise<any[]> {
    const clinics = await ClinicModel.find({ deletedAt: null });
    return clinics.map(toPlainObject);
  }

  async getClinic(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const clinic = await ClinicModel.findOne({ _id: id, deletedAt: null });
    return toPlainObject(clinic);
  }

  async createClinic(insertClinic: any): Promise<any> {
    const clinic = await ClinicModel.create(insertClinic);
    return toPlainObject(clinic);
  }

  async getAppointments(): Promise<any[]> {
    const appointments = await AppointmentModel.find({ deletedAt: null });
    return appointments.map(toPlainObject);
  }

  async getAppointment(id: string): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const appointment = await AppointmentModel.findOne({ _id: id, deletedAt: null });
    return toPlainObject(appointment);
  }

  async getAppointmentsByPatient(patientId: string): Promise<any[]> {
    const appointments = await AppointmentModel.find({ patientId, deletedAt: null });
    return appointments.map(toPlainObject);
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<any[]> {
    const appointments = await AppointmentModel.find({ doctorId });
    return appointments.map(toPlainObject);
  }

  async getAppointmentsByDoctorAndDate(doctorId: string, date: string): Promise<any[]> {
    const appointments = await AppointmentModel.find({ doctorId, date, deletedAt: null });
    return appointments.map(toPlainObject);
  }

  async checkAppointmentConflict(doctorId: string, date: string, time: string, patientId?: string, excludeId?: string): Promise<boolean> {
    // Check if doctor has a conflict (doctor already booked at this time)
    const doctorConflictQuery: any = {
      doctorId,
      date,
      time,
      status: 'scheduled',
      deletedAt: null
    };

    if (excludeId) {
      doctorConflictQuery._id = { $ne: excludeId };
    }

    const doctorConflict = await AppointmentModel.findOne(doctorConflictQuery);
    if (doctorConflict) {
      return true; // Doctor is already booked
    }

    // Check if patient has a conflict (patient already has appointment at this time)
    if (patientId) {
      const patientConflictQuery: any = {
        patientId,
        date,
        time,
        status: 'scheduled',
        deletedAt: null
      };

      if (excludeId) {
        patientConflictQuery._id = { $ne: excludeId };
      }

      const patientConflict = await AppointmentModel.findOne(patientConflictQuery);
      if (patientConflict) {
        return true; // Patient already has an appointment at this time
      }
    }

    return false; // No conflicts
  }

  async createAppointment(insertAppointment: any): Promise<any> {
    const appointment = await AppointmentModel.create(insertAppointment);
    return toPlainObject(appointment);
  }

  async updateAppointment(id: string, data: any): Promise<any> {
    const appointment = await AppointmentModel.findByIdAndUpdate(id, data, { new: true });
    return toPlainObject(appointment);
  }

  async getVisitSessions(): Promise<any[]> {
    const sessions = await VisitSessionModel.find({ deletedAt: null });
    return sessions.map(toPlainObject);
  }

  async getVisitSession(id: string): Promise<any> {
    const session = await VisitSessionModel.findById(id);
    return toPlainObject(session);
  }

  async getVisitSessionsByPatient(patientId: string): Promise<any[]> {
    const sessions = await VisitSessionModel.find({ patientId, deletedAt: null });
    return sessions.map(toPlainObject);
  }

  async createVisitSession(insertSession: any): Promise<any> {
    const session = await VisitSessionModel.create(insertSession);
    return toPlainObject(session);
  }

  async updateVisitSession(id: string, data: any): Promise<any> {
    const session = await VisitSessionModel.findByIdAndUpdate(id, data, { new: true });
    return toPlainObject(session);
  }

  async getPayments(): Promise<any[]> {
    const payments = await PaymentModel.find({ deletedAt: null });
    return payments.map(toPlainObject);
  }

  async getPaymentsByPatient(patientId: string): Promise<any[]> {
    const payments = await PaymentModel.find({ patientId, deletedAt: null });
    return payments.map(toPlainObject);
  }

  async getPayment(id: string): Promise<any | null> {
    const payment = await PaymentModel.findById(id);
    return payment ? toPlainObject(payment) : null;
  }

  async createPayment(insertPayment: any): Promise<any> {
    const payment = await PaymentModel.create(insertPayment);
    return toPlainObject(payment);
  }

  async updatePayment(id: string, data: Partial<any>): Promise<any> {
    const payment = await PaymentModel.findByIdAndUpdate(id, data, { new: true });
    if (!payment) throw new Error('Payment not found');
    return toPlainObject(payment);
  }

  async getPatientBalance(patientId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
    const attendedSessions = await VisitSessionModel.find({
      patientId,
      attendanceStatus: "attended"
    });

    // Now price is a Number, so direct sum works
    const totalDue = attendedSessions.reduce((sum, session) => sum + (session.price || 0), 0);

    // BUGFIX (H2): Only count payments with status 'paid'.
    // Previously ALL payments were summed regardless of status, so pending/cancelled
    // payments were incorrectly counted as paid, producing wrong balances.
    const patientPayments = await PaymentModel.find({ patientId, status: "paid" });
    const totalPaid = patientPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }


  async getClinicPrices(): Promise<any[]> {
    const prices = await ClinicPriceModel.find();
    return prices.map(toPlainObject);
  }

  async getClinicPrice(clinicId: string): Promise<any> {
    const price = await ClinicPriceModel.findOne({ clinicId });
    return toPlainObject(price);
  }

  async upsertClinicPrice(insertPrice: any): Promise<any> {
    const price = await ClinicPriceModel.findOneAndUpdate(
      { clinicId: insertPrice.clinicId },
      { ...insertPrice, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return toPlainObject(price);
  }

  // ======================
  // RATING METHODS
  // ======================
  async getRatings(): Promise<any[]> {
    const ratings = await RatingModel.find({ deletedAt: null }).sort({ createdAt: -1 });
    return ratings.map(toPlainObject);
  }

  async getRatingById(id: string): Promise<any | null> {
    if (!isValidObjectId(id)) return null;
    const rating = await RatingModel.findOne({ _id: id, deletedAt: null });
    return toPlainObject(rating);
  }

  async createRating(data: any): Promise<any> {
    const rating = await RatingModel.create(data);
    return toPlainObject(rating);
  }

  async updateRating(id: string, data: any): Promise<any> {
    if (!isValidObjectId(id)) throw new Error('Invalid rating ID');
    const rating = await RatingModel.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );
    return toPlainObject(rating);
  }

  async deleteRating(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new Error('Invalid rating ID');
    await RatingModel.findByIdAndUpdate(id, { deletedAt: new Date() });
  }

  async getRatingsByDoctor(doctorId: string): Promise<any[]> {
    const ratings = await RatingModel.find({ doctorId, deletedAt: null }).sort({ createdAt: -1 });
    return ratings.map(toPlainObject);
  }

  async getRatingsByPatient(patientId: string): Promise<any[]> {
    const ratings = await RatingModel.find({ patientId, deletedAt: null }).sort({ createdAt: -1 });
    return ratings.map(toPlainObject);
  }

  // ======================
  // NOTIFICATION METHODS
  // ======================
  async getNotifications(userId: string, unreadOnly?: boolean): Promise<any[]> {
    const query: any = { userId };
    if (unreadOnly) {
      query.read = false;
    }
    const notifications = await NotificationModel.find(query).sort({ createdAt: -1 });
    return notifications.map(toPlainObject);
  }

  async getNotificationById(id: string): Promise<any | null> {
    if (!isValidObjectId(id)) return null;
    const notification = await NotificationModel.findById(id);
    return toPlainObject(notification);
  }

  async createNotification(data: any): Promise<any> {
    const notification = await NotificationModel.create(data);
    return toPlainObject(notification);
  }

  async markNotificationAsRead(id: string): Promise<any> {
    if (!isValidObjectId(id)) throw new Error('Invalid notification ID');
    const notification = await NotificationModel.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    return toPlainObject(notification);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { userId, read: false },
      { read: true }
    );
  }

  async deleteNotification(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new Error('Invalid notification ID');
    await NotificationModel.findByIdAndDelete(id);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return await NotificationModel.countDocuments({ userId, read: false });
  }

  // Returns the userId linked to a patient record (for notification targeting)
  async getPatientUserId(patientId: string): Promise<string | null> {
    if (!isValidObjectId(patientId)) return null;
    const patient = await PatientModel.findById(patientId).select('assignedToUserId userId');
    if (!patient) return null;
    const uid = (patient as any).assignedToUserId || (patient as any).userId;
    return uid ? uid.toString() : null;
  }

  // ===========================================
  // TREATMENT PLAN METHODS  
  // ============================================

  async getTreatmentPlanByPatientId(patientId: string): Promise<any> {
    const plan = await TreatmentPlanModel.findOne({
      patientId,
      status: { $ne: 'cancelled' }
    }).sort({ createdAt: -1 });
    return toPlainObject(plan);
  }

  async createTreatmentPlan(insertPlan: any): Promise<any> {
    const plan = await TreatmentPlanModel.create(insertPlan);
    return toPlainObject(plan);
  }

  async updateTreatmentPlan(id: string, updateData: any): Promise<any> {
    if (!isValidObjectId(id)) return undefined;
    const plan = await TreatmentPlanModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    return toPlainObject(plan);
  }
}

export const storage = new MongoStorage();
