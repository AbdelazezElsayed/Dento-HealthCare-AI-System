import { Router, Request, Response, NextFunction } from 'express';
import { DiagnosisRecordModel, PaymentModel, VisitSessionModel } from '../mongodb';
import { TreatmentPlanRepo } from '../repositories/clinic.repo';
import { MedicationRepo } from '../repositories/medication.repo';
import { storage } from '../storage';

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
        return res.status(401).json({ message: 'غير مسموح - يرجى تسجيل الدخول' });
    }
    next();
}

async function getPatientIdFromUserId(userId: string): Promise<string | null> {
    const patient = await storage.getPatientByUserId(userId);
    return patient?.id || null;
}

async function getDoctorIdFromUserId(userId: string): Promise<string | null> {
    const doctor = await storage.getDoctorByUserId(userId);
    return doctor?.id || null;
}

function getAppointmentDateTime(appointment: any) {
    const dateTime = new Date(`${appointment.date || ''}T${appointment.time || '00:00'}`);
    return Number.isNaN(dateTime.getTime()) ? new Date(appointment.date || 0) : dateTime;
}

function isUpcomingAppointment(appointment: any) {
    return appointment.status === 'scheduled' && getAppointmentDateTime(appointment).getTime() >= Date.now();
}

function isMedicationActiveForDate(medication: any, date = new Date()) {
    if (!medication || medication.deletedAt || medication.isActive === false || medication.status !== 'active') {
        return false;
    }

    const startDate = medication.startDate ? new Date(medication.startDate) : null;
    const endDate = medication.endDate ? new Date(medication.endDate) : null;

    if (startDate && !Number.isNaN(startDate.getTime()) && startDate.getTime() > date.getTime()) {
        return false;
    }

    if (endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() < date.getTime()) {
        return false;
    }

    return true;
}

function getDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function getMonthRange(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: 'numeric',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const year = Number(values.year);
    const month = Number(values.month);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return { start, end };
}

function isActiveAppointment(appointment: any) {
    return appointment.status !== 'cancelled' && appointment.status !== 'no-show';
}

function isWaitingAppointment(appointment: any) {
    return ['waiting', 'checked_in', 'in_progress', 'pending'].includes(appointment.status);
}

async function enrichDoctorAppointment(appointment: any) {
    const [patient, clinic] = await Promise.all([
        appointment.patientId ? storage.getPatient(appointment.patientId) : null,
        appointment.clinicId ? storage.getClinic(appointment.clinicId) : null,
    ]);

    return {
        id: appointment.id || appointment._id?.toString?.(),
        time: appointment.time,
        date: appointment.date,
        status: appointment.status,
        type: appointment.type || appointment.appointmentType || null,
        notes: appointment.notes || null,
        patientName: patient?.fullName || patient?.name || null,
        patientId: appointment.patientId || null,
        clinicName: clinic?.nameAr || clinic?.name || clinic?.nameEn || null,
    };
}

async function getDoctorRevenue(doctorId: string, startDate: string, endDate: string) {
    const sessions = await VisitSessionModel.find({
        doctorId,
        sessionDate: { $gte: startDate, $lte: endDate },
    }).select('_id');

    const sessionIds = sessions.map((session) => session._id.toString());
    if (sessionIds.length === 0) {
        return { amount: 0, available: true };
    }

    const payments = await PaymentModel.find({
        sessionId: { $in: sessionIds },
        status: 'paid',
    }).select('amount');

    return {
        amount: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        available: true,
    };
}

function normalizeSuggestedClinic(value: any) {
    if (!value) return null;
    if (typeof value === 'string') return { name: value };
    return value;
}

function formatDiagnosisRecord(record: any) {
    if (!record) return null;
    const obj = record.toObject ? record.toObject() : record;
    const primaryCondition = Array.isArray(obj.conditions) ? obj.conditions[0] : null;

    return {
        id: obj._id?.toString?.() || obj.id,
        title: primaryCondition?.name || primaryCondition?.nameEn || obj.primaryCondition || obj.primaryDiagnosis || null,
        urgency: obj.urgency || null,
        suggestedClinic: normalizeSuggestedClinic(obj.suggestedClinic || obj.recommendedClinic || null),
        createdAt: obj.createdAt || null,
    };
}

async function enrichAppointment(appointment: any) {
    if (!appointment) return null;

    const [doctor, clinic] = await Promise.all([
        appointment.doctorId ? storage.getDoctor(appointment.doctorId) : null,
        appointment.clinicId ? storage.getClinic(appointment.clinicId) : null,
    ]);

    return {
        id: appointment.id || appointment._id?.toString?.(),
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        doctorName: doctor?.fullName || doctor?.name || appointment.doctorName || null,
        clinicName: clinic?.nameAr || clinic?.name || clinic?.nameEn || appointment.clinicName || null,
    };
}

async function formatTreatmentPlan(plan: any) {
    if (!plan) return null;

    const procedures = Array.isArray(plan.procedures) ? plan.procedures : [];
    const doctor = plan.doctorName ? null : await storage.getDoctor(plan.doctorId);

    return {
        id: plan.id || plan._id?.toString?.(),
        title: plan.title,
        description: plan.description || null,
        status: plan.status,
        reviewStatus: plan.reviewStatus || null,
        isAiDraft: Boolean(plan.isAiDraft),
        isFinal: Boolean(plan.isFinal),
        doctorName: plan.doctorName || doctor?.fullName || doctor?.name || null,
        updatedAt: plan.updatedAt || plan.createdAt || null,
        procedures: procedures.map((procedure: any, index: number) => ({
            id: procedure?.id || procedure?._id?.toString?.() || String(index + 1),
            name: typeof procedure === 'string' ? procedure : procedure?.name || procedure?.title || `مرحلة ${index + 1}`,
            status: typeof procedure === 'string' ? 'scheduled' : procedure?.status || 'scheduled',
        })),
    };
}

// Patient dashboard summary - current user's own real data only
router.get('/patient-summary', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId!;
        const userType = req.session.userType;

        if (userType !== 'patient') {
            return res.status(403).json({
                message: 'هذه البيانات متاحة للمرضى فقط',
                messageEn: 'Patient dashboard data is available to patients only',
            });
        }

        const patient = await storage.getPatientByUserId(userId);
        if (!patient?.id) {
            return res.status(404).json({
                message: 'لم يتم العثور على ملف المريض',
                messageEn: 'Patient profile not found',
            });
        }

        const patientId = patient.id;
        const [appointments, balanceResult, treatmentPlan, latestDiagnosis, medications, unreadNotifications] = await Promise.all([
            storage.getAppointmentsByPatient(patientId),
            storage.getPatientBalance(patientId),
            TreatmentPlanRepo.findByPatient(patientId),
            DiagnosisRecordModel.findOne({
                $or: [{ patientId }, { userId }],
                deletedAt: null,
            }).sort({ createdAt: -1 }),
            MedicationRepo.findByPatientId(patientId),
            storage.getUnreadNotificationCount(userId),
        ]);

        const upcomingAppointments = appointments
            .filter(isUpcomingAppointment)
            .sort((a, b) => getAppointmentDateTime(a).getTime() - getAppointmentDateTime(b).getTime());

        const activeMedications = medications.filter((medication: any) => isMedicationActiveForDate(medication));
        const todayDosesCount = activeMedications.reduce((count: number, medication: any) => {
            return count + (Array.isArray(medication.doseTimes) ? medication.doseTimes.length : 0);
        }, 0);

        const completedAppointments = appointments.filter((appointment: any) => appointment.status === 'completed').length;
        const balance = balanceResult || { totalDue: 0, totalPaid: 0, balance: 0 };

        res.json({
            patient: {
                id: patientId,
                fullName: patient.fullName || patient.name || null,
            },
            nextAppointment: await enrichAppointment(upcomingAppointments[0] || null),
            latestDiagnosis: formatDiagnosisRecord(latestDiagnosis),
            treatmentPlan: await formatTreatmentPlan(treatmentPlan),
            medications: {
                activeCount: activeMedications.length,
                todayDosesCount,
            },
            notifications: {
                unreadCount: unreadNotifications,
            },
            balance,
            appointmentStats: {
                upcomingCount: upcomingAppointments.length,
                completedCount: completedAppointments,
            },
        });
    } catch (err: any) {
        console.error('Patient dashboard summary error:', err);
        res.status(500).json({
            message: 'تعذر تحميل بيانات لوحة التحكم',
            messageEn: 'Unable to load patient dashboard data',
        });
    }
});

// Doctor dashboard summary - current doctor's own data only
router.get('/doctor-summary', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId!;
        const userType = req.session.userType;

        if (userType !== 'doctor' && userType !== 'graduate') {
            return res.status(403).json({
                message: 'هذه البيانات متاحة للأطباء فقط',
                messageEn: 'Doctor dashboard data is available to doctors only',
            });
        }

        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor?.id) {
            return res.status(404).json({
                message: 'لم يتم العثور على ملف الطبيب',
                messageEn: 'Doctor profile not found',
            });
        }

        const today = getDateKey();
        const monthRange = getMonthRange();
        const [todayAppointmentsRaw, notifications, unreadNotifications, todayRevenue, monthRevenue] = await Promise.all([
            storage.getAppointmentsByDoctorAndDate(doctor.id, today),
            storage.getNotifications(userId),
            storage.getUnreadNotificationCount(userId),
            getDoctorRevenue(doctor.id, today, today),
            getDoctorRevenue(doctor.id, monthRange.start, monthRange.end),
        ]);

        const activeTodayAppointments = todayAppointmentsRaw.filter(isActiveAppointment);
        const uniquePatientIds = new Set(
            activeTodayAppointments
                .map((appointment: any) => appointment.patientId)
                .filter(Boolean)
        );
        const waitingCount = activeTodayAppointments.filter(isWaitingAppointment).length;
        const todayAppointments = await Promise.all(
            activeTodayAppointments
                .sort((a: any, b: any) => String(a.time || '').localeCompare(String(b.time || '')))
                .map(enrichDoctorAppointment)
        );

        res.json({
            doctor: {
                id: doctor.id,
                fullName: doctor.fullName || doctor.name || null,
                specialization: doctor.specialization || null,
                clinicId: doctor.clinicId || null,
            },
            summary: {
                todayPatientsCount: uniquePatientIds.size,
                todayAppointmentsCount: activeTodayAppointments.length,
                waitingCount,
                todayRevenue: todayRevenue.amount,
                todayRevenueAvailable: todayRevenue.available,
                monthRevenue: monthRevenue.amount,
                monthRevenueAvailable: monthRevenue.available,
                unreadNotificationsCount: unreadNotifications,
            },
            todayAppointments,
            notifications: notifications.slice(0, 5).map((notification: any) => ({
                id: notification.id || notification._id?.toString?.(),
                title: notification.title,
                message: notification.message,
                titleEn: notification.titleEn || null,
                messageEn: notification.messageEn || null,
                type: notification.type,
                read: notification.read,
                createdAt: notification.createdAt,
            })),
        });
    } catch (err: any) {
        console.error('Doctor dashboard summary error:', err);
        res.status(500).json({
            message: 'تعذر تحميل بيانات لوحة الطبيب',
            messageEn: 'Unable to load doctor dashboard data',
        });
    }
});

// Dashboard stats - returns counts based on user role
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId!;
        const userType = req.session.userType;

        const stats: Record<string, any> = {
            appointmentsCount: 0,
            upcomingAppointments: 0,
            completedAppointments: 0,
            totalPaid: 0,
            balance: 0,
            treatmentProgress: 0,
        };

        if (userType === 'patient' || userType === 'student') {
            const patientId = await getPatientIdFromUserId(userId);

            if (patientId) {
                const appointments = await storage.getAppointmentsByPatient(patientId);
                stats.appointmentsCount = appointments.length;
                stats.upcomingAppointments = appointments.filter(a => a.status === 'scheduled').length;
                stats.completedAppointments = appointments.filter(a => a.status === 'completed').length;

                const balance = await storage.getPatientBalance(patientId);
                stats.totalPaid = balance.totalPaid;
                stats.balance = balance.balance;
                stats.totalDue = balance.totalDue;

                if (stats.appointmentsCount > 0) {
                    stats.treatmentProgress = Math.round((stats.completedAppointments / stats.appointmentsCount) * 100);
                }
            }
        } else if (userType === 'doctor' || userType === 'graduate') {
            const doctorId = await getDoctorIdFromUserId(userId);

            if (doctorId) {
                const appointments = await storage.getAppointmentsByDoctor(doctorId);
                stats.appointmentsCount = appointments.length;
                stats.upcomingAppointments = appointments.filter(a => a.status === 'scheduled').length;
                stats.completedAppointments = appointments.filter(a => a.status === 'completed').length;

                const today = new Date().toISOString().split('T')[0];
                const todayAppointments = await storage.getAppointmentsByDoctorAndDate(doctorId, today);
                stats.todayAppointments = todayAppointments.length;

                const patients = await storage.getPatients();
                stats.patientsCount = patients.length;
            }
        } else {
            const [appointments, patients, doctors, clinics] = await Promise.all([
                storage.getAppointments(),
                storage.getPatients(),
                storage.getDoctors(),
                storage.getClinics(),
            ]);

            stats.appointmentsCount = appointments.length;
            stats.patientsCount = patients.length;
            stats.doctorsCount = doctors.length;
            stats.clinicsCount = clinics.length;
            stats.upcomingAppointments = appointments.filter(a => a.status === 'scheduled').length;
            stats.completedAppointments = appointments.filter(a => a.status === 'completed').length;
        }

        res.json(stats);
    } catch (err: any) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get next appointment for patient
router.get('/next-appointment', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId!;
        const userType = req.session.userType;

        let appointments: any[] = [];

        if (userType === 'patient' || userType === 'student') {
            const patientId = await getPatientIdFromUserId(userId);
            if (patientId) {
                appointments = await storage.getAppointmentsByPatient(patientId);
            }
        } else if (userType === 'doctor' || userType === 'graduate') {
            const doctorId = await getDoctorIdFromUserId(userId);
            if (doctorId) {
                appointments = await storage.getAppointmentsByDoctor(doctorId);
            }
        }

        const upcoming = appointments
            .filter(a => a.status === 'scheduled')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (upcoming.length > 0) {
            const nextAppointment = upcoming[0];

            let doctorName = null;
            if (nextAppointment.doctorId) {
                const doctor = await storage.getDoctor(nextAppointment.doctorId);
                doctorName = doctor?.fullName || doctor?.name;
            }

            let clinicName = null;
            if (nextAppointment.clinicId) {
                const clinic = await storage.getClinic(nextAppointment.clinicId);
                clinicName = clinic?.name || clinic?.nameAr;
            }

            res.json({
                ...nextAppointment,
                doctorName,
                clinicName,
            });
        } else {
            res.json(null);
        }
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
