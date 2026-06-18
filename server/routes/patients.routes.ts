import { Router } from 'express';
import { PatientRepo } from '../repositories/patient.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import { TreatmentPlanRepo } from '../repositories/clinic.repo';
import { MedicalRecordRepo } from '../repositories/medical-record.repo';
import { MedicationRepo } from '../repositories/medication.repo';
import { AppointmentRepo } from '../repositories/appointment.repo';
import { NotificationService } from '../services/notification.service';
import { logAudit } from '../utils/auditLogger';
import {
    requireAuth,
    requireRole,
    requireMedicalStaff,
    canAccessPatient,
    validatePatientAccess,
    getPatientIdFromUserId,
    USER_TYPES
} from '../middleware/auth';
import { validateBody, createPatientSchema } from '../middleware/validation';

const router = Router();

type MedicationDoseTimeInput = {
    time?: string;
    label?: string;
    instructions?: string;
};

function normalizeDateOnly(value?: string | Date) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeDoseTimes(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((dose: MedicationDoseTimeInput) => ({
            time: typeof dose?.time === 'string' ? dose.time.trim() : '',
            label: typeof dose?.label === 'string' ? dose.label.trim() : '',
            instructions: typeof dose?.instructions === 'string' ? dose.instructions.trim() : '',
        }))
        .filter(dose => /^([01]\d|2[0-3]):[0-5]\d$/.test(dose.time));
}

function buildScheduledDate(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    const scheduled = new Date(date);
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled;
}

function isMedicationActiveForDate(medication: any, date = new Date()) {
    if (medication.deletedAt) return false;
    if (medication.status && medication.status !== 'active') return false;
    if (medication.isActive === false) return false;

    const current = new Date(date);
    current.setHours(0, 0, 0, 0);
    const start = medication.startDate ? new Date(medication.startDate) : null;
    if (start) {
        start.setHours(0, 0, 0, 0);
        if (start > current) return false;
    }
    const end = medication.endDate ? new Date(medication.endDate) : null;
    if (end) {
        end.setHours(23, 59, 59, 999);
        if (end < date) return false;
    }
    return true;
}

async function buildTodayMedicationPayload(patientId: string) {
    const [medications, logs] = await Promise.all([
        MedicationRepo.findByPatientId(patientId),
        MedicationRepo.findIntakeLogsForPatientDate(patientId),
    ]);

    const now = new Date();
    const takenByKey = new Map<string, any>();
    logs.forEach((log: any) => {
        takenByKey.set(`${log.prescriptionId}:${new Date(log.scheduledFor).toISOString()}`, log);
    });

    const activeMedications = medications.filter((med: any) => isMedicationActiveForDate(med, now));
    const todayDoses = activeMedications.flatMap((med: any) => {
        const doseTimes = Array.isArray(med.doseTimes) ? med.doseTimes : [];
        return doseTimes.map((dose: any) => {
            const scheduledFor = buildScheduledDate(now, dose.time);
            const key = `${med.id}:${scheduledFor.toISOString()}`;
            const log = takenByKey.get(key);
            const isTaken = Boolean(log);
            const minutesLate = (now.getTime() - scheduledFor.getTime()) / 60000;
            const status = isTaken
                ? 'taken'
                : minutesLate < 0
                    ? 'not_due'
                    : minutesLate > 120
                        ? 'missed'
                        : 'due';

            return {
                id: key,
                prescriptionId: med.id,
                medicationName: med.name,
                dosage: med.dosage,
                scheduledTime: dose.time,
                scheduledFor: scheduledFor.toISOString(),
                label: dose.label || '',
                instructions: dose.instructions || med.instructions || '',
                doctorName: med.doctorName || '',
                status,
                takenAt: log?.takenAt || null,
            };
        });
    }).sort((a: any, b: any) => a.scheduledTime.localeCompare(b.scheduledTime));

    await Promise.all(todayDoses
        .filter((dose: any) => dose.status === 'due' || dose.status === 'missed')
        .map((dose: any) => NotificationService.onMedicationDoseDue({
            patientId,
            prescriptionId: dose.prescriptionId,
            medicationName: dose.medicationName,
            dosage: dose.dosage,
            scheduledFor: new Date(dose.scheduledFor),
            instructions: dose.instructions,
        })));

    const activeCount = activeMedications.length;
    const takenToday = todayDoses.filter((dose: any) => dose.status === 'taken').length;
    const remainingToday = todayDoses.filter((dose: any) => dose.status === 'not_due' || dose.status === 'due').length;

    return {
        medications,
        todayDoses,
        stats: {
            activeMedications: activeCount,
            todayDoses: todayDoses.length,
            takenToday,
            remainingToday,
        },
    };
}

function getAppointmentDateTime(appointment: any) {
    const dateTime = new Date(`${appointment.date || ''}T${appointment.time || '00:00'}`);
    return Number.isNaN(dateTime.getTime()) ? new Date(appointment.date || 0) : dateTime;
}

function getLatestCompletedAppointment(appointments: any[]) {
    return appointments
        .filter((appointment) => appointment.status === 'completed')
        .sort((a, b) => getAppointmentDateTime(b).getTime() - getAppointmentDateTime(a).getTime())[0];
}

function getNextScheduledAppointment(appointments: any[]) {
    const now = new Date();
    return appointments
        .filter((appointment) => appointment.status === 'scheduled' && getAppointmentDateTime(appointment) >= now)
        .sort((a, b) => getAppointmentDateTime(a).getTime() - getAppointmentDateTime(b).getTime())[0];
}

async function buildPatientsForDoctor(userId: string) {
    const doctor = await DoctorRepo.findByUserId(userId);
    if (!doctor?.id) return [];

    const doctorAppointments = await AppointmentRepo.findByDoctor(doctor.id);
    const legacyDoctorAppointments = doctor.id === userId ? [] : await AppointmentRepo.findByDoctor(userId);
    const appointmentsById = new Map<string, any>();

    [...doctorAppointments, ...legacyDoctorAppointments].forEach((appointment) => {
        const appointmentId = appointment.id || appointment._id;
        if (appointmentId) appointmentsById.set(String(appointmentId), appointment);
    });

    const meaningfulAppointments = Array.from(appointmentsById.values()).filter((appointment) =>
        appointment.patientId && ['scheduled', 'completed'].includes(appointment.status)
    );

    const appointmentsByPatient = new Map<string, any[]>();
    meaningfulAppointments.forEach((appointment) => {
        const patientId = String(appointment.patientId);
        const existing = appointmentsByPatient.get(patientId) || [];
        existing.push(appointment);
        appointmentsByPatient.set(patientId, existing);
    });

    const patients = await Promise.all(
        Array.from(appointmentsByPatient.entries()).map(async ([patientId, appointments]) => {
            const patient = await PatientRepo.findById(patientId);
            if (!patient) return null;

            const latestCompleted = getLatestCompletedAppointment(appointments);
            const nextScheduled = getNextScheduledAppointment(appointments);

            return {
                ...patient,
                patientId: patient.id,
                lastVisit: latestCompleted?.date || null,
                lastVisitDate: latestCompleted?.date || null,
                nextAppointmentDate: nextScheduled?.date || null,
                totalAppointmentsWithDoctor: appointments.length,
                status: nextScheduled ? 'active' : latestCompleted ? 'completed' : 'pending',
            };
        })
    );

    return patients.filter(Boolean);
}

function sanitizeMedicationInput(body: any) {
    const doseTimes = normalizeDoseTimes(body.doseTimes);
    return {
        name: String(body.name || body.medicationName || '').trim(),
        dosage: String(body.dosage || '').trim(),
        frequency: String(body.frequency || '').trim(),
        duration: String(body.duration || '').trim(),
        instructions: String(body.instructions || '').trim(),
        reason: String(body.reason || '').trim(),
        notes: String(body.notes || '').trim(),
        startDate: normalizeDateOnly(body.startDate) || new Date(),
        endDate: normalizeDateOnly(body.endDate),
        doseTimes,
        status: body.status === 'completed' || body.status === 'stopped' ? body.status : 'active',
        isActive: body.status !== 'completed' && body.status !== 'stopped',
        linkedAppointmentId: body.linkedAppointmentId,
        linkedTreatmentPlanId: body.linkedTreatmentPlanId,
    };
}

// Get all patients - restricted by role
router.get('/', requireAuth, async (req, res) => {
    try {
        const { userType, userId } = req.session;

        if (userType === USER_TYPES.PATIENT || userType === USER_TYPES.STUDENT) {
            const patient = await PatientRepo.findByUserId(userId!);
            return res.json(patient ? [patient] : []);
        }

        if (userType === USER_TYPES.DOCTOR || userType === USER_TYPES.GRADUATE) {
            return res.json(await buildPatientsForDoctor(userId!));
        }

        res.json(await PatientRepo.findAll());
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Get patient by ID - with access control
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const patient = await PatientRepo.findById(req.params.id);
        if (!patient) return res.status(404).json({ message: 'المريض غير موجود', messageEn: 'Patient not found' });

        const hasAccess = await canAccessPatient(req.session.userId!, req.session.userType!, req.params.id);
        if (!hasAccess) return res.status(403).json({ message: 'غير مصرح لك بالوصول لبيانات هذا المريض' });

        res.json(patient);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Get patient by user ID - with access control
router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const { userType, userId: currentUserId } = req.session;
        const { userId: requestedUserId } = req.params;

        if ((userType === USER_TYPES.PATIENT || userType === USER_TYPES.STUDENT) && currentUserId !== requestedUserId)
            return res.status(403).json({ message: 'غير مصرح لك بالوصول لبيانات مريض آخر' });

        const patient = await PatientRepo.findByUserId(requestedUserId);
        if (!patient) return res.status(404).json({ message: 'المريض غير موجود' });

        if (userType !== USER_TYPES.ADMIN) {
            const hasAccess = await canAccessPatient(currentUserId!, userType!, patient.id);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'غير مصرح لك بالوصول لبيانات هذا المريض',
                    messageEn: 'You are not authorized to access this patient',
                });
            }
        }

        res.json(patient);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Create patient - medical staff only
router.post('/', requireMedicalStaff, validateBody(createPatientSchema), async (req, res) => {
    try {
        const patient = await PatientRepo.create(req.body);

        await logAudit({ userId: req.session.userId!, action: 'CREATE_PATIENT', entityType: 'Patient', entityId: patient.id, newData: { fullName: patient.fullName }, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string });

        res.status(201).json(patient);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Update patient - with access control
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const patient = await PatientRepo.findById(req.params.id);
        if (!patient) return res.status(404).json({ message: 'المريض غير موجود' });

        const hasAccess = await canAccessPatient(req.session.userId!, req.session.userType!, req.params.id);
        if (!hasAccess) return res.status(403).json({ message: 'غير مصرح لك بتعديل بيانات هذا المريض' });

        const { userType } = req.session;
        // Patients can only update limited fields
        const updateData = (userType === USER_TYPES.PATIENT || userType === USER_TYPES.STUDENT)
            ? { phone: req.body.phone, email: req.body.email, address: req.body.address }
            : req.body;

        // ✅ Uses PatientRepo.update() — no more direct Mongoose import in route
        const updatedPatient = await PatientRepo.update(req.params.id, updateData);

        await logAudit({ userId: req.session.userId!, action: 'UPDATE_PATIENT', entityType: 'Patient', entityId: req.params.id, previousData: patient, newData: updateData, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string });

        res.json(updatedPatient);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// ============================================
// TREATMENT PLAN ENDPOINTS
// ============================================

// Get treatment plan for a specific patient
router.get('/:patientId/treatment-plan', requireAuth, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { userId, userType } = req.session;

        const patient = await PatientRepo.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'المريض غير موجود', messageEn: 'Patient not found' });
        }

        const hasAccess = await canAccessPatient(userId!, userType!, patientId);
        if (!hasAccess) {
            return res.status(403).json({
                message: 'غير مصرح لك بالوصول لخطة هذا المريض',
                messageEn: 'You are not authorized to access this patient treatment plan',
            });
        }

        const treatmentPlan = await TreatmentPlanRepo.findByPatient(patientId);
        if (!treatmentPlan) return res.status(404).json({ message: 'لم يتم العثور على خطة علاجية' });

        res.json(treatmentPlan);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Update treatment plan for a patient (doctors/admin clinical users only)
router.put(
    '/:patientId/treatment-plan',
    requireRole(USER_TYPES.DOCTOR, USER_TYPES.GRADUATE, USER_TYPES.ADMIN),
    validatePatientAccess('patientId'),
    async (req, res) => {
    try {
        const { patientId } = req.params;
        const { userId } = req.session;
        const { title, description, planStartDate, estimatedDuration, procedures, appointments, notes, status } = req.body;

        const patient = await PatientRepo.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'المريض غير موجود' });

        const doctor = await DoctorRepo.findByUserId(userId!);
        const doctorName = doctor?.fullName || '';
        // BUGFIX (M1): Guard added — if no doctor profile, conflict detection
        // and appointment creation would silently use the wrong ID (userId vs doctor.id).
        if (!doctor) {
            return res.status(403).json({ message: 'لم يتم العثور على ملف الطبيب', messageEn: 'Doctor profile not found' });
        }

        const existingPlan = await TreatmentPlanRepo.findByPatient(patientId);
        let treatmentPlan;

        const appointmentsToCreate = [];
        if (procedures && Array.isArray(procedures)) {
            for (const proc of procedures) {
                if (proc.scheduledDate && proc.scheduledTime && proc.status === 'scheduled') {
                    // BUGFIX (M1): was passing userId! (session user account ID) but the
                    // Appointment model stores doctorId as the doctor profile ID.
                    const existingAppts = await AppointmentRepo.findByDoctorAndDate(doctor.id, proc.scheduledDate);
                    const alreadyExists = existingAppts.find((a: any) => a.time === proc.scheduledTime && (a.patientId === patientId || String(a.patientId) === patientId));

                    if (!alreadyExists) {
                        const isConflict = await AppointmentRepo.checkConflict(
                            doctor.id,
                            proc.scheduledDate,
                            proc.scheduledTime,
                            patientId,
                            undefined,
                            30
                        );

                        if (isConflict) {
                            const alternative = await AppointmentRepo.suggestAlternativeSlot(
                                doctor.id,
                                proc.scheduledDate,
                                proc.scheduledTime,
                                30
                            );
                            return res.status(409).json({
                                success: false,
                                message: `هناك تضارب في المواعيد للإجراء "${proc.name}" يوم ${proc.scheduledDate} الساعة ${proc.scheduledTime}.` + 
                                         (alternative ? ` أقرب وقت متاح هو ${alternative}.` : ' لا يوجد وقت متاح في هذا اليوم.')
                            });
                        }
                        
                        appointmentsToCreate.push({
                            patientId,
                            doctorId: doctor.id, // BUGFIX (M1): was userId! (wrong ID type)
                            clinicId: 'general',
                            date: proc.scheduledDate,
                            time: proc.scheduledTime,
                            duration: 30,
                            status: 'scheduled',
                            notes: `موعد لعلاج: ${proc.name} (خطة علاجية)`,
                            price: 0,
                            paymentStatus: 'pending'
                        });
                    }
                }
            }
        }

        for (const apptData of appointmentsToCreate) {
            await AppointmentRepo.create(apptData);
        }

        if (existingPlan) {
            treatmentPlan = await TreatmentPlanRepo.update(existingPlan.id || existingPlan._id, {
                title, description, planStartDate, estimatedDuration,
                procedures: procedures || [], appointments: appointments || [],
                notes, status: status || 'active', doctorName,
            });
            await logAudit({ userId: userId!, action: 'UPDATE_TREATMENT_PLAN', entityType: 'TreatmentPlan', entityId: existingPlan.id });
        } else {
            treatmentPlan = await TreatmentPlanRepo.create({
                patientId, doctorId: userId, doctorName, title, description, planStartDate,
                estimatedDuration, procedures: procedures || [], appointments: appointments || [],
                notes, status: status || 'active',
            });
            await logAudit({ userId: userId!, action: 'CREATE_TREATMENT_PLAN', entityType: 'TreatmentPlan', entityId: treatmentPlan.id });
        }

        // ✅ Notify patient that treatment plan was updated
        await NotificationService.onTreatmentPlanUpdated({
            patientId,
            doctorName,
            planId: treatmentPlan.id || treatmentPlan._id,
        });

        res.json({ success: true, message: 'تم حفظ الخطة العلاجية بنجاح', data: treatmentPlan });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================
// MEDICAL RECORDS ENDPOINTS
// ============================================

// ============================================
// CURRENT PATIENT MEDICATIONS ENDPOINTS
// ============================================
router.get('/me/medications', requireRole(USER_TYPES.PATIENT), async (req, res) => {
    try {
        const patientId = await getPatientIdFromUserId(req.session.userId!);
        if (!patientId) return res.status(404).json({ message: 'لم يتم العثور على ملف المريض', messageEn: 'Patient profile not found' });

        res.json(await buildTodayMedicationPayload(patientId));
    } catch (err: any) {
        res.status(500).json({ message: 'تعذر تحميل الأدوية', messageEn: 'Unable to load medications' });
    }
});

router.get('/me/medications/today', requireRole(USER_TYPES.PATIENT), async (req, res) => {
    try {
        const patientId = await getPatientIdFromUserId(req.session.userId!);
        if (!patientId) return res.status(404).json({ message: 'لم يتم العثور على ملف المريض', messageEn: 'Patient profile not found' });

        const payload = await buildTodayMedicationPayload(patientId);
        res.json({ todayDoses: payload.todayDoses, stats: payload.stats });
    } catch (err: any) {
        res.status(500).json({ message: 'تعذر تحميل جرعات اليوم', messageEn: 'Unable to load today doses' });
    }
});

router.post('/me/medications/:medicationId/intake', requireRole(USER_TYPES.PATIENT), async (req, res) => {
    try {
        const patientId = await getPatientIdFromUserId(req.session.userId!);
        if (!patientId) return res.status(404).json({ message: 'لم يتم العثور على ملف المريض', messageEn: 'Patient profile not found' });

        const medication = await MedicationRepo.findById(req.params.medicationId);
        if (!medication || String(medication.patientId) !== patientId) {
            return res.status(404).json({ message: 'لم يتم العثور على الدواء', messageEn: 'Medication not found' });
        }

        const scheduledFor = new Date(req.body.scheduledFor);
        if (Number.isNaN(scheduledFor.getTime())) {
            return res.status(400).json({ message: 'موعد الجرعة غير صالح', messageEn: 'Invalid dose time' });
        }

        const existing = await MedicationRepo.findIntakeLog(medication.id, patientId, scheduledFor);
        if (existing) {
            return res.status(409).json({
                message: 'تم تأكيد هذه الجرعة من قبل',
                messageEn: 'This dose has already been confirmed',
                data: existing,
            });
        }

        const log = await MedicationRepo.createIntakeLog({
            prescriptionId: medication.id,
            patientId,
            scheduledFor,
            status: 'taken',
        });

        res.status(201).json({ success: true, message: 'تم تسجيل تناول الجرعة', data: log });
    } catch (err: any) {
        if (err?.code === 11000) {
            return res.status(409).json({ message: 'تم تأكيد هذه الجرعة من قبل', messageEn: 'This dose has already been confirmed' });
        }
        res.status(500).json({ message: 'تعذر تسجيل الجرعة', messageEn: 'Unable to confirm dose' });
    }
});

// GET /:id/medical-records — SECURITY FIX (C1): added validatePatientAccess.
// Previously any authenticated user could read ANY patient's medical records by ID.
router.get('/:id/medical-records', requireAuth, validatePatientAccess('id'), async (req, res) => {
    try {
        const records = await MedicalRecordRepo.findByPatientId(req.params.id);
        res.json(records);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/medical-records', requireMedicalStaff, async (req, res) => {
    try {
        const data = { ...req.body, patientId: req.params.id, doctorId: req.session.userId };
        const record = await MedicalRecordRepo.create(data);
        res.status(201).json(record);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// ============================================
// MEDICATIONS ENDPOINTS
// ============================================
// GET /:id/medications — SECURITY FIX (C1): added validatePatientAccess.
// Previously any authenticated user could read ANY patient's medication list by ID.
router.get('/:id/medications', requireAuth, validatePatientAccess('id'), async (req, res) => {
    try {
        const medications = await MedicationRepo.findByPatientId(req.params.id);
        res.json(medications);
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

router.post(
    '/:id/medications',
    requireRole(USER_TYPES.DOCTOR, USER_TYPES.GRADUATE, USER_TYPES.ADMIN),
    validatePatientAccess('id'),
    async (req, res) => {
    try {
        const data = sanitizeMedicationInput(req.body);
        if (!data.name || !data.dosage || !data.frequency) {
            return res.status(400).json({
                message: 'اسم الدواء والجرعة والتكرار مطلوبة',
                messageEn: 'Medication name, dosage, and frequency are required',
            });
        }

        if (data.doseTimes.length === 0) {
            return res.status(400).json({
                message: 'يجب تحديد موعد جرعة واحد على الأقل',
                messageEn: 'At least one dose time is required',
            });
        }

        const doctor = await DoctorRepo.findByUserId(req.session.userId!);
        const medicationData = {
            ...data,
            patientId: req.params.id,
            doctorId: req.session.userId,
            doctorName: doctor?.fullName || req.session.userId,
        };

        const medication = await MedicationRepo.create(medicationData);
        res.status(201).json(medication);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

router.put(
    '/:id/medications/:medicationId',
    requireRole(USER_TYPES.DOCTOR, USER_TYPES.GRADUATE, USER_TYPES.ADMIN),
    validatePatientAccess('id'),
    async (req, res) => {
    try {
        const medication = await MedicationRepo.findById(req.params.medicationId);
        if (!medication || String(medication.patientId) !== req.params.id) {
            return res.status(404).json({ message: 'لم يتم العثور على الدواء', messageEn: 'Medication not found' });
        }

        const data = sanitizeMedicationInput(req.body);
        if (!data.name || !data.dosage || !data.frequency) {
            return res.status(400).json({
                message: 'اسم الدواء والجرعة والتكرار مطلوبة',
                messageEn: 'Medication name, dosage, and frequency are required',
            });
        }
        if (data.doseTimes.length === 0) {
            return res.status(400).json({
                message: 'يجب تحديد موعد جرعة واحد على الأقل',
                messageEn: 'At least one dose time is required',
            });
        }

        const updated = await MedicationRepo.update(req.params.medicationId, data);
        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

router.put(
    '/:id/medications/:medicationId/stop',
    requireRole(USER_TYPES.DOCTOR, USER_TYPES.GRADUATE, USER_TYPES.ADMIN),
    validatePatientAccess('id'),
    async (req, res) => {
    try {
        const medication = await MedicationRepo.findById(req.params.medicationId);
        if (!medication || String(medication.patientId) !== req.params.id) {
            return res.status(404).json({ message: 'لم يتم العثور على الدواء', messageEn: 'Medication not found' });
        }

        const updated = await MedicationRepo.update(req.params.medicationId, {
            status: 'stopped',
            isActive: false,
            endDate: new Date(),
        });
        res.json(updated);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

export default router;
