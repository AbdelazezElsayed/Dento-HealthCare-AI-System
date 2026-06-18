import { NotificationRepo } from '../repositories/notification.repo';
import { PatientRepo } from '../repositories/patient.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import logger from '../utils/logger';

// FIX (H5): Push a saved notification to the user's live WebSocket connection.
// global.websocketServer is set in server/index.ts after Socket.IO is initialized.
// Safe optional-chain means this never throws if WS is unavailable (e.g. during tests).
function pushLive(userId: string, notification: any) {
  try {
    (global as any).websocketServer?.emitNotification(userId, notification);
  } catch (err) {
    logger.warn('WebSocket push failed (non-critical):', err);
  }
}

/**
 * NotificationService — Central hub for ALL system notifications.
 * Routes call these methods instead of creating notifications inline.
 * Never throws — notification failure must never block a business operation.
 */
export const NotificationService = {

  // ─── APPOINTMENT EVENTS ─────────────────────────────────────────────────

  /** Patient books appointment → notify BOTH patient and doctor */
  async onAppointmentBooked(appointment: {
    id: string;
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
  }) {
    try {
      const [patientUserId, doctorUserId] = await Promise.all([
        PatientRepo.getLinkedUserId(appointment.patientId),
        DoctorRepo.getLinkedUserId(appointment.doctorId),
      ]);

      const promises = [];

      if (patientUserId) {
        promises.push(
          NotificationRepo.create({
            userId: patientUserId,
            type: 'appointment',
            title: 'تم حجز موعدك',
            message: `تم تأكيد حجز موعدك بتاريخ ${appointment.date} الساعة ${appointment.time}`,
            titleEn: 'Appointment Booked',
            messageEn: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed`,
            relatedEntityType: 'Appointment',
            relatedEntityId: appointment.id,
          }).then(n => { pushLive(patientUserId, n); return n; })
        );
      }

      if (doctorUserId) {
        promises.push(
          NotificationRepo.create({
            userId: doctorUserId,
            type: 'appointment',
            title: 'حجز موعد جديد',
            message: `تم حجز موعد جديد معك بتاريخ ${appointment.date} الساعة ${appointment.time}`,
            titleEn: 'New Appointment Booked',
            messageEn: `A new appointment has been booked with you on ${appointment.date} at ${appointment.time}`,
            relatedEntityType: 'Appointment',
            relatedEntityId: appointment.id,
          }).then(n => { pushLive(doctorUserId, n); return n; })
        );
      }

      await Promise.all(promises);
    } catch (err) {
      logger.warn('NotificationService.onAppointmentBooked failed (non-critical):', err);
    }
  },

  /** Appointment status changes → notify patient */
  async onAppointmentStatusChanged(appointment: {
    id: string;
    patientId: string;
    date: string;
    time: string;
    newStatus: string;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(appointment.patientId);
      if (!patientUserId) return;

      const isConfirmed = appointment.newStatus === 'scheduled' || appointment.newStatus === 'confirmed';
      const isCancelled = appointment.newStatus === 'cancelled';

      if (isConfirmed) {
        const n = await NotificationRepo.create({
          userId: patientUserId,
          type: 'appointment',
          title: 'تم تأكيد موعدك',
          message: `تم تأكيد موعدك بتاريخ ${appointment.date} الساعة ${appointment.time}`,
          titleEn: 'Appointment Confirmed',
          messageEn: `Your appointment on ${appointment.date} at ${appointment.time} has been confirmed`,
          relatedEntityType: 'Appointment',
          relatedEntityId: appointment.id,
        });
        pushLive(patientUserId, n);
      } else if (isCancelled) {
        const n = await NotificationRepo.create({
          userId: patientUserId,
          type: 'appointment',
          title: 'تم إلغاء موعدك',
          message: `تم إلغاء موعدك بتاريخ ${appointment.date} الساعة ${appointment.time}`,
          titleEn: 'Appointment Cancelled',
          messageEn: `Your appointment on ${appointment.date} at ${appointment.time} has been cancelled`,
          relatedEntityType: 'Appointment',
          relatedEntityId: appointment.id,
        });
        pushLive(patientUserId, n);
      }
    } catch (err) {
      logger.warn('NotificationService.onAppointmentStatusChanged failed (non-critical):', err);
    }
  },

  /** Doctor marks patient as attended → notify patient with amount due */
  async onVisitCompleted(data: {
    appointmentId: string;
    patientId: string;
    sessionDate: string;
    price: number;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(data.patientId);
      if (!patientUserId) return;

      const n = await NotificationRepo.create({
        userId: patientUserId,
        type: 'payment',
        title: 'تمت زيارتك بنجاح',
        message: `تمت زيارتك بتاريخ ${data.sessionDate}. المبلغ المستحق: ${data.price} جنيه`,
        titleEn: 'Visit Completed',
        messageEn: `Your visit on ${data.sessionDate} is complete. Amount due: ${data.price} EGP`,
        relatedEntityType: 'Appointment',
        relatedEntityId: data.appointmentId,
      });
      pushLive(patientUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onVisitCompleted failed (non-critical):', err);
    }
  },

  // ─── TREATMENT PLAN EVENTS ───────────────────────────────────────────────

  /** Doctor updates treatment plan → notify patient */
  async onTreatmentPlanUpdated(data: {
    patientId: string;
    doctorName: string;
    planId: string;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(data.patientId);
      if (!patientUserId) return;

      const n = await NotificationRepo.create({
        userId: patientUserId,
        type: 'system',
        title: 'تم تحديث خطتك العلاجية',
        message: `قام ${data.doctorName} بتحديث خطتك العلاجية. يرجى مراجعتها.`,
        titleEn: 'Treatment Plan Updated',
        messageEn: `${data.doctorName} has updated your treatment plan. Please review it.`,
        relatedEntityType: 'TreatmentPlan',
        relatedEntityId: data.planId,
      });
      pushLive(patientUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onTreatmentPlanUpdated failed (non-critical):', err);
    }
  },

  /** Doctor approves AI draft treatment plan → notify patient */
  async onTreatmentPlanApproved(data: {
    patientId: string;
    doctorName: string;
    planId: string;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(data.patientId);
      if (!patientUserId) return;

      const n = await NotificationRepo.create({
        userId: patientUserId,
        type: 'system',
        title: 'تم اعتماد خطتك العلاجية',
        message: `قام ${data.doctorName} باعتماد خطتك العلاجية النهائية.`,
        titleEn: 'Treatment Plan Approved',
        messageEn: `${data.doctorName} approved your final treatment plan.`,
        relatedEntityType: 'TreatmentPlan',
        relatedEntityId: data.planId,
      });
      pushLive(patientUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onTreatmentPlanApproved failed (non-critical):', err);
    }
  },

  /** Doctor requests AI treatment plan re-evaluation → notify patient */
  async onTreatmentPlanRevisionRequested(data: {
    patientId: string;
    doctorName: string;
    planId: string;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(data.patientId);
      if (!patientUserId) return;

      const n = await NotificationRepo.create({
        userId: patientUserId,
        type: 'system',
        title: 'تحتاج خطتك العلاجية إلى إعادة مراجعة',
        message: `طلب ${data.doctorName} إعادة تقييم خطتك العلاجية قبل اعتمادها.`,
        titleEn: 'Treatment Plan Needs Review',
        messageEn: `${data.doctorName} requested a re-evaluation of your treatment plan before approval.`,
        relatedEntityType: 'TreatmentPlan',
        relatedEntityId: data.planId,
      });
      pushLive(patientUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onTreatmentPlanRevisionRequested failed (non-critical):', err);
    }
  },

  // ─── MEDICATION EVENTS ──────────────────────────────────────────────────

  /** Medication dose is due → notify patient once per prescription + scheduled dose */
  async onMedicationDoseDue(data: {
    patientId: string;
    prescriptionId: string;
    medicationName: string;
    dosage: string;
    scheduledFor: Date;
    instructions?: string;
  }) {
    try {
      const patientUserId = await PatientRepo.getLinkedUserId(data.patientId);
      if (!patientUserId) return;

      const reminderKey = `${data.prescriptionId}:${data.scheduledFor.toISOString()}`;
      const existing = await NotificationRepo.findByRelated(patientUserId, 'MedicationDose', reminderKey);
      if (existing) return;

      const doseTime = data.scheduledFor.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const n = await NotificationRepo.create({
        userId: patientUserId,
        type: 'reminder',
        title: 'حان موعد تناول الدواء',
        message: `حان موعد جرعة: ${data.medicationName}. الجرعة: ${data.dosage}. الموعد: ${doseTime}${data.instructions ? `. التعليمات: ${data.instructions}` : ''}`,
        titleEn: 'Medication Dose Due',
        messageEn: `It is time for ${data.medicationName}. Dose: ${data.dosage}. Time: ${doseTime}${data.instructions ? `. Instructions: ${data.instructions}` : ''}`,
        relatedEntityType: 'MedicationDose',
        relatedEntityId: reminderKey,
      });
      pushLive(patientUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onMedicationDoseDue failed (non-critical):', err);
    }
  },

  // ─── RATING EVENTS ──────────────────────────────────────────────────────

  /** Patient submits rating → notify doctor */
  async onRatingSubmitted(data: {
    doctorId: string;
    rating: number;
    comment: string;
    ratingId: string;
  }) {
    try {
      const doctorUserId = await DoctorRepo.getLinkedUserId(data.doctorId);
      if (!doctorUserId) return;

      const stars = '⭐'.repeat(data.rating);
      const n = await NotificationRepo.create({
        userId: doctorUserId,
        type: 'system',
        title: 'تقييم جديد',
        message: `حصلت على تقييم جديد ${stars} — "${data.comment.slice(0, 80)}${data.comment.length > 80 ? '...' : ''}"`,
        titleEn: 'New Rating Received',
        messageEn: `You received a new rating ${stars} — "${data.comment.slice(0, 80)}${data.comment.length > 80 ? '...' : ''}"`,
        relatedEntityType: 'Rating',
        relatedEntityId: data.ratingId,
      });
      pushLive(doctorUserId, n);
    } catch (err) {
      logger.warn('NotificationService.onRatingSubmitted failed (non-critical):', err);
    }
  },
};
