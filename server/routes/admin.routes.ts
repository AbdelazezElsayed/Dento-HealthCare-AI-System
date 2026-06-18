import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validateBody, validateParams, registerSchema, idParamSchema } from '../middleware/validation';
import { logAudit } from '../utils/auditLogger';
import logger from '../utils/logger';
import { UserModel, DoctorModel, PatientModel, ClinicModel } from '../mongodb';

const router = Router();

// ============================================
// ADMIN DASHBOARD STATS
// ============================================
router.get('/stats', requireAdmin, async (_req, res) => {
    try {
        const [users, patients, doctors, clinics, appointments] = await Promise.all([
            UserModel.countDocuments({ deletedAt: null }),
            PatientModel.countDocuments({ deletedAt: null }),
            DoctorModel.countDocuments({ deletedAt: null }),
            ClinicModel.countDocuments({ deletedAt: null }),
            storage.getAppointments()
        ]);

        const appointmentStats = appointments.reduce((acc, apt) => {
            acc.total++;
            if (apt.status === 'scheduled') acc.scheduled++;
            if (apt.status === 'completed') acc.completed++;
            if (apt.status === 'cancelled') acc.cancelled++;
            return acc;
        }, { total: 0, scheduled: 0, completed: 0, cancelled: 0 });

        res.json({
            users,
            patients,
            doctors,
            clinics,
            appointments: appointmentStats
        });
    } catch (err: any) {
        logger.error('Admin stats error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await UserModel.find({ deletedAt: null }).select('-password');
        res.json(users.map(u => ({
            id: u._id.toString(),
            username: u.username,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            userType: u.userType,
            isActive: u.isActive,
            createdAt: u.createdAt
        })));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Get single user
router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id).select('-password');
        if (!user || user.deletedAt) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            id: user._id.toString(),
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            isActive: user.isActive,
            createdAt: user.createdAt
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Create user (admin only)
router.post('/users', requireAdmin, validateBody(registerSchema), async (req, res) => {
    try {
        const { username, password, fullName, email, phone, userType, specialization, clinicId } = req.body;

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await storage.createUser({
            username,
            password: hashedPassword,
            fullName,
            email: email || null,
            phone: phone || null,
            userType,
            isActive: true
        });

        // Create related records
        if (userType === 'doctor' || userType === 'graduate') {
            await storage.createDoctor({
                userId: newUser.id,
                fullName,
                specialization: specialization || 'General Dentistry',
                clinicId: clinicId || null,
                rating: 0,
                reviewCount: 0,
                isAvailable: true,
            });
        } else if (userType === 'patient' || userType === 'student') {
            await storage.createPatient({
                assignedToUserId: newUser.id,
                fullName,
                phone: phone || null,
                clinicId: clinicId || null,
            });
        }

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_CREATE_USER',
            entityType: 'User',
            entityId: newUser.id,
            newData: { username, fullName, userType },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Update user (admin only)
router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, userType, isActive } = req.body;

        const user = await UserModel.findById(req.params.id);
        if (!user || user.deletedAt) {
            return res.status(404).json({ message: 'User not found' });
        }

        const previousData = {
            fullName: user.fullName,
            email: user.email,
            userType: user.userType,
            isActive: user.isActive
        };

        if (fullName) user.fullName = fullName;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (userType) user.userType = userType;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_UPDATE_USER',
            entityType: 'User',
            entityId: req.params.id,
            previousData,
            newData: { fullName, email, userType, isActive },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({
            id: user._id.toString(),
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            userType: user.userType,
            isActive: user.isActive
        });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Soft delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await UserModel.findById(req.params.id);
        if (!user || user.deletedAt) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting yourself
        if (user._id.toString() === req.session.userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        user.deletedAt = new Date();
        await user.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_DELETE_USER',
            entityType: 'User',
            entityId: req.params.id,
            previousData: { username: user.username, fullName: user.fullName },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Reset user password (admin only)
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        // FIX (M2): Minimum raised from 6 → 8. Also require at least one non-space character.
        if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters', messageAr: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' });
        }

        const user = await UserModel.findById(req.params.id);
        if (!user || user.deletedAt) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_RESET_PASSWORD',
            entityType: 'User',
            entityId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({ message: 'Password reset successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================
// DOCTOR MANAGEMENT
// ============================================

// Get all doctors with details
router.get('/doctors', requireAdmin, async (_req, res) => {
    try {
        const doctors = await DoctorModel.find({ deletedAt: null });
        res.json(doctors.map(d => ({
            id: d._id.toString(),
            fullName: d.fullName,
            specialization: d.specialization,
            clinicId: d.clinicId,
            userId: d.userId,
            rating: d.rating,
            reviewCount: d.reviewCount,
            isAvailable: d.isAvailable,
            createdAt: d.createdAt
        })));
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// Toggle doctor availability
router.patch('/doctors/:id/availability', requireAdmin, async (req, res) => {
    try {
        const doctor = await DoctorModel.findById(req.params.id);
        if (!doctor || doctor.deletedAt) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        doctor.isAvailable = !doctor.isAvailable;
        await doctor.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_TOGGLE_DOCTOR_AVAILABILITY',
            entityType: 'Doctor',
            entityId: req.params.id,
            newData: { isAvailable: doctor.isAvailable },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({ id: doctor._id.toString(), isAvailable: doctor.isAvailable });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================
// CLINIC MANAGEMENT
// ============================================

// Create clinic
router.post('/clinics', requireAdmin, async (req, res) => {
    try {
        const { name, nameAr, description, color, icon } = req.body;

        const clinic = await storage.createClinic({
            name,
            nameAr,
            description,
            color,
            icon
        });

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_CREATE_CLINIC',
            entityType: 'Clinic',
            entityId: clinic.id,
            newData: { name, nameAr },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.status(201).json(clinic);
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Update clinic
router.put('/clinics/:id', requireAdmin, async (req, res) => {
    try {
        const { name, nameAr, description, color, icon } = req.body;

        const clinic = await ClinicModel.findById(req.params.id);
        if (!clinic || clinic.deletedAt) {
            return res.status(404).json({ message: 'Clinic not found' });
        }

        if (name) clinic.name = name;
        if (nameAr) clinic.nameAr = nameAr;
        if (description !== undefined) clinic.description = description;
        if (color) clinic.color = color;
        if (icon) clinic.icon = icon;

        await clinic.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_UPDATE_CLINIC',
            entityType: 'Clinic',
            entityId: req.params.id,
            newData: { name, nameAr },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({
            id: clinic._id.toString(),
            name: clinic.name,
            nameAr: clinic.nameAr,
            description: clinic.description,
            color: clinic.color,
            icon: clinic.icon
        });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

// Delete clinic (soft delete)
router.delete('/clinics/:id', requireAdmin, async (req, res) => {
    try {
        const clinic = await ClinicModel.findById(req.params.id);
        if (!clinic || clinic.deletedAt) {
            return res.status(404).json({ message: 'Clinic not found' });
        }

        clinic.deletedAt = new Date();
        await clinic.save();

        await logAudit({
            userId: req.session.userId!,
            action: 'ADMIN_DELETE_CLINIC',
            entityType: 'Clinic',
            entityId: req.params.id,
            previousData: { name: clinic.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        res.json({ message: 'Clinic deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================
// AUDIT LOGS (Admin viewing)
// ============================================
router.get('/audit-logs', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action, entityType } = req.query;

        const query: any = {};
        if (userId) query.userId = userId;
        if (action) query.action = action;
        if (entityType) query.entityType = entityType;

        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            (await import('../mongodb')).AuditLogModel
                .find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(Number(limit)),
            (await import('../mongodb')).AuditLogModel.countDocuments(query)
        ]);

        res.json({
            logs: logs.map(l => ({
                id: l._id.toString(),
                userId: l.userId,
                action: l.action,
                entityType: l.entityType,
                entityId: l.entityId,
                timestamp: l.timestamp,
                ipAddress: l.ipAddress
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
