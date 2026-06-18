import { Router } from 'express';
import mongoose from 'mongoose';
import { AppointmentRepo } from '../repositories/appointment.repo';
import { PatientRepo } from '../repositories/patient.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import { ClinicRepo, ClinicPriceRepo } from '../repositories/clinic.repo';
import { VisitSessionRepo, PaymentRepo } from '../repositories/payment.repo';
import { VisitSessionModel } from '../models/visit-session.model';
import { PaymentModel } from '../models/payment.model';
import { AppointmentModel } from '../models/appointment.model';
import { NotificationService } from '../services/notification.service';
import { generateProposedTreatmentPlan } from '../services/ai-treatment.service';
import { logAudit } from '../utils/auditLogger';
import {
  requireAuth, requireRole, requireMedicalStaff,
  getPatientIdFromUserId, getDoctorIdFromUserId
} from '../middleware/auth';

const router = Router();

// ─── GET ALL (role-filtered) ───────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { userType, userId } = req.session;

    if (userType === 'patient' || userType === 'student') {
      const patient = await PatientRepo.findByUserId(userId!);
      return res.json(patient ? await AppointmentRepo.findByPatient(patient.id) : []);
    }

    if (userType === 'doctor' || userType === 'graduate') {
      const doctor = await DoctorRepo.findByUserId(userId!);
      return res.json(doctor ? await AppointmentRepo.findByDoctor(doctor.id) : []);
    }

    res.json(await AppointmentRepo.findAll());
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET BY ID ─────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const appointment = await AppointmentRepo.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'الموعد غير موجود' });

    const { userType } = req.session;
    if (userType === 'patient' || userType === 'student') {
      const patientId = await getPatientIdFromUserId(req.session.userId!);
      if (appointment.patientId !== patientId)
        return res.status(403).json({ message: 'غير مصرح لك بعرض هذا الموعد' });
    }
    if (userType === 'doctor' || userType === 'graduate') {
      const doctorId = await getDoctorIdFromUserId(req.session.userId!);
      if (appointment.doctorId !== doctorId)
        return res.status(403).json({ message: 'غير مصرح لك بعرض هذا الموعد' });
    }

    res.json(appointment);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET BY PATIENT ────────────────────────────────────────────────────────────
router.get('/patient/:patientId', requireAuth, async (req, res) => {
  try {
    const { userType } = req.session;
    if (userType === 'patient' || userType === 'student') {
      const myId = await getPatientIdFromUserId(req.session.userId!);
      if (req.params.patientId !== myId)
        return res.status(403).json({ message: 'غير مصرح لك بعرض مواعيد مريض آخر' });
    }
    res.json(await AppointmentRepo.findByPatient(req.params.patientId));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET BY DOCTOR ─────────────────────────────────────────────────────────────
router.get('/doctor/:doctorId', requireRole('doctor', 'student', 'graduate'), async (req, res) => {
  try {
    const myDoctorId = await getDoctorIdFromUserId(req.session.userId!);
    if (req.params.doctorId !== myDoctorId)
      return res.status(403).json({ message: 'غير مصرح لك بعرض مواعيد طبيب آخر' });
    res.json(await AppointmentRepo.findByDoctor(req.params.doctorId));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET TODAY (doctor) ─────────────────────────────────────────────────────────
router.get('/doctor/today', requireRole('doctor', 'student', 'graduate'), async (req, res) => {
  try {
    const doctor = await DoctorRepo.findByUserId(req.session.userId!);
    if (!doctor) return res.json([]);
    const today = new Date().toISOString().split('T')[0];
    res.json(await AppointmentRepo.findByDoctorAndDate(doctor.id, today));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = { ...req.body };
    const { userType, userId } = req.session;

    // Derive patientId for patients
    if (userType === 'patient' || userType === 'student') {
      let patientId = await getPatientIdFromUserId(userId!);
      if (!patientId) {
        const user = await (await import('../repositories/user.repo')).UserRepo.findById(userId!);
        if (user) {
          const p = await PatientRepo.create({ assignedToUserId: user.id, fullName: user.fullName, phone: user.phone || null, clinicId: null });
          patientId = p.id;
        }
      }
      if (!patientId) return res.status(400).json({ message: 'لم يتم العثور على سجل المريض' });
      data.patientId = patientId;
    }

    // Derive doctorId for doctors
    if ((userType === 'doctor' || userType === 'graduate') && !data.doctorId) {
      const doctorId = await getDoctorIdFromUserId(userId!);
      if (doctorId) data.doctorId = doctorId;
    }

    // Conflict check
    if (data.doctorId && data.date && data.time) {
      const conflict = await AppointmentRepo.checkConflict(data.doctorId, data.date, data.time, data.patientId);
      if (conflict) return res.status(409).json({ message: 'الموعد محجوز بالفعل. يرجى اختيار وقت آخر', messageEn: 'Time slot already booked.' });
    }

    // Validate doctor and patient exist
    if (data.doctorId && !await DoctorRepo.findById(data.doctorId))
      return res.status(400).json({ message: 'الطبيب المحدد غير موجود' });
    if (data.patientId && !await PatientRepo.findById(data.patientId))
      return res.status(400).json({ message: 'المريض المحدد غير موجود' });

    const appointment = await AppointmentRepo.create(data);

    // ✅ Notify BOTH patient and doctor
    await NotificationService.onAppointmentBooked(appointment);

    await logAudit({ userId: userId!, action: 'CREATE_APPOINTMENT', entityType: 'Appointment', entityId: appointment.id, newData: appointment, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string });

    res.status(201).json(appointment);

    // ✅ Asynchronously generate an AI proposed treatment plan based on diagnosis
    if (appointment.patientId && appointment.doctorId) {
      generateProposedTreatmentPlan(appointment.patientId, appointment.doctorId, appointment.id).catch(e => {
        console.error('Failed to run background AI treatment plan generation:', e);
      });
    }
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── UPDATE ────────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await AppointmentRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'الموعد غير موجود' });

    const { userType, userId } = req.session;
    if (userType === 'patient' || userType === 'student') {
      const patientId = await getPatientIdFromUserId(userId!);
      if (existing.patientId !== patientId) return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا الموعد' });
    }
    if (userType === 'doctor' || userType === 'graduate') {
      const doctorId = await getDoctorIdFromUserId(userId!);
      if (existing.doctorId !== doctorId) return res.status(403).json({ message: 'غير مصرح لك بتعديل هذا الموعد' });
    }

    const updateData = req.body;
    if ((updateData.date || updateData.time || updateData.doctorId) &&
        (updateData.status === 'scheduled' || (!updateData.status && existing.status === 'scheduled'))) {
      const conflict = await AppointmentRepo.checkConflict(
        updateData.doctorId || existing.doctorId,
        updateData.date || existing.date,
        updateData.time || existing.time,
        existing.patientId,
        req.params.id
      );
      if (conflict) return res.status(409).json({ message: 'الموعد محجوز بالفعل. يرجى اختيار وقت آخر' });
    }

    const appointment = await AppointmentRepo.update(req.params.id, updateData);

    // ✅ Notify patient if status changed
    if (updateData.status && updateData.status !== existing.status) {
      await NotificationService.onAppointmentStatusChanged({
        id: existing.id, patientId: existing.patientId,
        date: existing.date, time: existing.time,
        newStatus: updateData.status,
      });
    }

    await logAudit({ userId: userId!, action: 'UPDATE_APPOINTMENT', entityType: 'Appointment', entityId: existing.id, previousData: existing, newData: appointment, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string });

    res.json(appointment);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── MARK ATTENDED ─────────────────────────────────────────────────────────────
router.post('/:id/mark-attended', requireRole('doctor', 'graduate'), async (req, res) => {
  // FIX (H1): Entire operation (session creation + payment creation + appointment update)
  // is now wrapped in a MongoDB transaction. If any step fails the whole operation rolls
  // back, preventing the "attended but no payment record" or "double payment" race condition.
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();
  try {
    const appointment = await AppointmentRepo.findById(req.params.id);
    if (!appointment) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(404).json({ message: 'الموعد غير موجود' });
    }

    const myDoctorId = await getDoctorIdFromUserId(req.session.userId!);
    if (appointment.doctorId !== myDoctorId) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(403).json({ message: 'غير مصرح لك بتأكيد حضور هذا الموعد' });
    }

    if (appointment.status === 'completed') {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(400).json({ message: 'تم تأكيد حضور هذا الموعد مسبقاً' });
    }

    const clinicId = req.body.clinicId;
    if (!clinicId) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(400).json({ message: 'يرجى تحديد العيادة' });
    }

    const clinic = await ClinicRepo.findById(clinicId);
    if (!clinic) {
      await mongoSession.abortTransaction();
      mongoSession.endSession();
      return res.status(400).json({ message: 'العيادة المحددة غير موجودة' });
    }

    const clinicPrice = await ClinicPriceRepo.findByClinic(clinicId);
    const sessionPrice = clinicPrice?.sessionPrice ?? 500;

    // Idempotency: if a session already exists for this appointment, don't create another
    const existingSession = await VisitSessionModel.findOne(
      { appointmentId: appointment.id },
      null,
      { session: mongoSession }
    );

    let session;
    if (existingSession) {
      session = existingSession;
    } else {
      session = await VisitSessionModel.create([{
        appointmentId:    appointment.id,
        patientId:        appointment.patientId,
        doctorId:         appointment.doctorId,
        clinicId,
        sessionDate:      appointment.date,
        attendanceStatus: 'attended',
        price:            sessionPrice,
        notes:            req.body.notes || null,
      }], { session: mongoSession });
      session = session[0];
    }

    // Idempotency: only create payment if none exists for this session
    const existingPayment = await PaymentModel.findOne(
      { sessionId: session._id?.toString() || session.id },
      null,
      { session: mongoSession }
    );
    if (!existingPayment) {
      await PaymentModel.create([{
        patientId:     appointment.patientId,
        sessionId:     session._id?.toString() || session.id,
        amount:        sessionPrice,
        paymentMethod: 'cash',
        paymentDate:   appointment.date,
        status:        'pending',
        createdBy:     req.session.userId!,
      }], { session: mongoSession });
    }

    await AppointmentModel.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    // Post-transaction: notifications and audit log (non-critical, outside transaction)
    await NotificationService.onVisitCompleted({
      appointmentId: appointment.id,
      patientId:     appointment.patientId,
      sessionDate:   appointment.date,
      price:         sessionPrice,
    });

    await logAudit({
      userId: req.session.userId!,
      action: 'MARK_ATTENDED',
      entityType: 'Appointment',
      entityId: appointment.id,
      newData: { status: 'completed', sessionId: session._id?.toString() || session.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    res.json({ appointment, session });
  } catch (err: any) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    res.status(400).json({ message: err.message });
  }
});


export default router;
