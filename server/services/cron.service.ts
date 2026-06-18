import cron from 'node-cron';
import { AppointmentModel } from '../models/appointment.model';
import { PatientRepo } from '../repositories/patient.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import { NotificationRepo } from '../repositories/notification.repo';
import logger from '../utils/logger';

export const startCronJobs = () => {
    // Run every hour to check for upcoming appointments within the next 24 hours
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Running cron job: Checking for upcoming appointments (24h reminder)');

            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            // Find appointments scheduled for tomorrow that haven't been reminded yet.
            // BUGFIX (C4): NotificationService.create() does not exist.
            // Using NotificationRepo.create() directly with the correct 'reminder' type.
            // Added reminderSent flag check to prevent duplicate notifications.
            const upcomingAppointments = await AppointmentModel.find({
                date: tomorrowStr,
                status: 'scheduled',
                reminderSent: { $ne: true },
                deletedAt: null,
            });

            let reminderCount = 0;
            for (const appt of upcomingAppointments) {
                const patient = await PatientRepo.findById(appt.patientId);
                const doctor = await DoctorRepo.findByUserId(appt.doctorId);

                if (patient?.userId) {
                    await NotificationRepo.create({
                        userId: patient.userId,
                        type: 'reminder',
                        title: 'تذكير بموعد غداً',
                        titleEn: 'Appointment Reminder',
                        message: `نذكرك بموعدك غداً الساعة ${appt.time}${doctor ? ` مع ${doctor.fullName}` : ''}.`,
                        messageEn: `Reminder: your appointment tomorrow at ${appt.time}${doctor ? ` with ${doctor.fullName}` : ''}.`,
                        relatedEntityType: 'Appointment',
                        relatedEntityId: appt._id.toString(),
                    });

                    // Mark this appointment so we don't remind again next hour
                    await AppointmentModel.findByIdAndUpdate(appt._id, { reminderSent: true });
                    reminderCount++;
                }
            }

            if (reminderCount > 0) {
                logger.info(`Sent ${reminderCount} appointment reminders for ${tomorrowStr}.`);
            }
        } catch (error) {
            logger.error('Error running appointment reminder cron job:', error);
        }
    });
};
