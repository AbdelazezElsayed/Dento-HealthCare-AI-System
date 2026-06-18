import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { UserRepo } from '../repositories/user.repo';
import { UserModel } from '../models/user.model';
import { DoctorRepo } from '../repositories/doctor.repo';
import { PatientRepo } from '../repositories/patient.repo';
import { requireAuth } from '../middleware/auth';
import { validateBody, loginSchema, registerSchema, changePasswordSchema } from '../middleware/validation';
import { logAudit } from '../utils/auditLogger';

const router = Router();

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userType?: string;
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { username, password, fullName, email, phone, userType, specialization, clinicId } = req.body;

    // SECURITY: Prevent self-registration as admin
    if (userType === 'admin') {
      return res.status(403).json({
        message: 'لا يمكن التسجيل كمسؤول. يرجى التواصل مع إدارة النظام.',
        messageEn: 'Admin registration is not allowed.',
      });
    }

    // Check username uniqueness
    if (await UserRepo.findByUsername(username)) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل', messageEn: 'Username already taken' });
    }

    // Check email uniqueness if provided
    if (email && await UserRepo.findByEmail(email)) {
      return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل', messageEn: 'Email already in use' });
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const newUser = await UserRepo.create({
      username,
      password: hashedPassword,
      fullName,
      email:    email || undefined,
      phone:    phone || undefined,
      userType: userType || 'patient',
    });

    // Create linked profile
    if (userType === 'doctor' || userType === 'graduate') {
      await DoctorRepo.create({
        userId:         newUser.id,
        fullName,
        specialization: specialization || 'General Dentistry',
        clinicId:       clinicId || null,
        rating:         0,
        reviewCount:    0,
        isAvailable:    true,
      });
    } else if (userType === 'patient' || userType === 'student') {
      await PatientRepo.create({
        assignedToUserId: newUser.id,
        fullName,
        phone:   phone || null,
        clinicId: clinicId || null,
      });
    }

    req.session.userId   = newUser.id;
    req.session.userType = newUser.userType;

    await logAudit({
      userId: newUser.id, action: 'REGISTER',
      entityType: 'User', entityId: newUser.id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] as string,
    });

    res.status(201).json(AuthService.sanitize(newUser));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// ─── LOGIN (email OR username) ─────────────────────────────────────────────────
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { identifier, password, userType } = req.body;

    const user = await AuthService.findUserByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({
        message: 'البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة',
        messageEn: 'Invalid credentials',
      });
    }

    // SECURITY FIX (C5): Reject deactivated accounts.
    // Previously isActive was set by admin but never checked at login,
    // so suspended users could still authenticate successfully.
    if (!user.isActive) {
      return res.status(401).json({
        message: 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة.',
        messageEn: 'This account has been deactivated. Please contact administration.',
      });
    }

    // Validate role match if provided — admins always bypass this check
    if (userType && user.userType !== userType && user.userType !== 'admin') {
      return res.status(401).json({
        message: 'نوع المستخدم المختار لا يتطابق مع الحساب المسجل',
        messageEn: 'Selected user type does not match the registered account',
      });
    }

    const isValid = await AuthService.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        message: 'البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة',
        messageEn: 'Invalid credentials',
      });
    }

    if (AuthService.needsPasswordRehash(user.password)) {
      const upgradedPassword = await AuthService.hashPassword(password);
      await UserModel.findByIdAndUpdate(user.id, { password: upgradedPassword });
    }

    // SECURITY: Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: 'خطأ في إنشاء الجلسة' });

      req.session.userId   = user.id;
      req.session.userType = user.userType;

      logAudit({
        userId: user.id, action: 'LOGIN',
        entityType: 'User', entityId: user.id,
        ipAddress: req.ip, userAgent: req.headers['user-agent'] as string,
      }).catch(() => {});

      req.session.save(() => res.json(AuthService.sanitize(user)));
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const userId = req.session.userId;

  if (userId) {
    await logAudit({
      userId, action: 'LOGOUT',
      entityType: 'User', entityId: userId,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] as string,
    });
  }

  req.session.regenerate((err) => {
    if (err) {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'تم تسجيل الخروج بنجاح' });
      });
    } else {
      res.clearCookie('connect.sid');
      res.json({ message: 'تم تسجيل الخروج بنجاح' });
    }
  });
});

// ─── CHANGE PASSWORD (current user only) ───────────────────────────────────────
router.put('/password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { currentPassword, newPassword } = req.body;

    const user = await UserRepo.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        messageEn: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
        messageEn: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    const isSamePassword = await AuthService.verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية',
        messageEn: 'New password must be different from the current password',
        code: 'PASSWORD_REUSED',
      });
    }

    const hashedPassword = await AuthService.hashPassword(newPassword);
    await UserModel.findByIdAndUpdate(userId, { password: hashedPassword });

    await logAudit({
      userId,
      action: 'CHANGE_PASSWORD',
      entityType: 'User',
      entityId: userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      messageEn: 'Password changed successfully',
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تغيير كلمة المرور',
      messageEn: 'Error changing password',
      code: 'PASSWORD_CHANGE_FAILED',
    });
  }
});

// ─── GET CURRENT USER ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'غير مسجل الدخول' });
  }
  const user = await UserRepo.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
  res.json(AuthService.sanitize(user));
});

export default router;
