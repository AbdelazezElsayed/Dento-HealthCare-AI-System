import { Router } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { getDoctorIdFromUserId, getPatientIdFromUserId, requireAuth, requireDoctor } from '../middleware/auth';
import { validateBody, aiDiagnosisSchema } from '../middleware/validation';
import { logAudit } from '../utils/auditLogger';
import logger from '../utils/logger';
import { upload, uploadToGridFS } from '../utils/gridfsStorage';
import { DiagnosisRecordModel } from '../mongodb';
import { storage } from '../storage';
import { PatientRepo } from '../repositories/patient.repo';
import { TreatmentPlanRepo } from '../repositories/clinic.repo';
import { NotificationService } from '../services/notification.service';

const router = Router();

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// Medical disclaimer that must be included in all AI responses
const MEDICAL_DISCLAIMER = {
    ar: {
        warning: "⚠️ تنبيه طبي مهم",
        text: "هذا تقييم أولي بواسطة الذكاء الاصطناعي فقط وليس تشخيصًا طبيًا رسميًا. يجب مراجعة طبيب أسنان مرخص قبل اتخاذ أي قرارات علاجية. لا تعتمد على هذا التقييم كبديل عن الاستشارة الطبية المتخصصة.",
        requirement: "يجب على طبيب أسنان مرخص مراجعة هذا التقييم قبل أي علاج."
    },
    en: {
        warning: "⚠️ Important Medical Notice",
        text: "This is a preliminary AI-assisted assessment only and NOT an official medical diagnosis. You must consult a licensed dental professional before making any treatment decisions. Do not rely on this assessment as a substitute for professional medical advice.",
        requirement: "A licensed dental professional must review this assessment before any treatment."
    }
};

// ============================================
// SECURITY: Input Validation Constants
// ============================================
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_SYMPTOM_LENGTH = 5000;
const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_HISTORY = 10; // Limit context size
const AI_DIAGNOSIS_TIMEOUT_MS = 30_000;

const editableTreatmentProcedureSchema = z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'deferred']).optional(),
    scheduledDate: z.union([z.string(), z.date()]).optional(),
    completedDate: z.union([z.string(), z.date()]).optional(),
    clinic: z.string().max(200).optional(),
    department: z.string().max(200).optional(),
    tooth: z.string().max(100).optional(),
    toothNumber: z.string().max(100).optional(),
    condition: z.string().max(300).optional(),
    notes: z.string().max(2000).optional(),
    estimatedDuration: z.string().max(200).optional(),
    estimatedCost: z.union([z.string().max(100), z.number()]).optional(),
});

const editableTreatmentAppointmentSchema = z.object({
    type: z.string().max(100).optional(),
    clinic: z.string().max(100).optional(),
    date: z.string().max(40).optional(),
    time: z.string().max(40).optional(),
});

const treatmentPlanPatchSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    planStartDate: z.union([z.string(), z.date()]).optional(),
    estimatedDuration: z.string().max(200).optional(),
    procedures: z.array(editableTreatmentProcedureSchema).optional(),
    appointments: z.array(editableTreatmentAppointmentSchema).optional(),
    notes: z.string().max(5000).optional(),
}).strict();

function isReviewableAiDraft(plan: {
    source?: string;
    reviewStatus?: string;
    isFinal?: boolean;
} | null): boolean {
    return Boolean(
        plan &&
        plan.source === 'ai' &&
        ['pending_doctor_review', 'revision_requested'].includes(plan.reviewStatus || '') &&
        plan.isFinal !== true
    );
}

/**
 * Sanitize user input to prevent prompt injection
 */
function sanitizeInput(input: string): string {
    if (!input) return '';
    // Remove potential prompt injection patterns
    return input
        .replace(/ignore.*previous.*instructions/gi, '[filtered]')
        .replace(/disregard.*above/gi, '[filtered]')
        .replace(/system.*prompt/gi, '[filtered]')
        .replace(/```/g, '') // Remove code blocks
        .slice(0, MAX_SYMPTOM_LENGTH); // Limit length
}

/**
 * Validate and parse base64 image data
 */
function validateImage(xrayImage: string): { valid: boolean; error?: string; data?: string; mimeType?: string } {
    if (!xrayImage || !xrayImage.includes('base64,')) {
        return { valid: false, error: 'Invalid image format' };
    }

    const parts = xrayImage.split('base64,');
    if (parts.length !== 2) {
        return { valid: false, error: 'Invalid base64 format' };
    }

    const base64Data = parts[1];
    const mimeMatch = xrayImage.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : '';

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: `Invalid image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    // Validate size (base64 is ~33% larger than binary)
    const estimatedBytes = (base64Data.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
        return { valid: false, error: `Image too large (max ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB)` };
    }

    return { valid: true, data: base64Data, mimeType };
}

function extractJsonObject(text: string): string | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced?.[1]?.trim() || trimmed;

    try {
        JSON.parse(candidate);
        return candidate;
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        return candidate.slice(start, end + 1);
    }
}

class InvalidAIResponseError extends Error {
    constructor(message = 'Invalid AI diagnosis response') {
        super(message);
        this.name = 'InvalidAIResponseError';
    }
}

class AITimeoutError extends Error {
    constructor(message = 'AI diagnosis request timed out') {
        super(message);
        this.name = 'AITimeoutError';
    }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AITimeoutError()), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

type ClinicSuggestion = {
    id?: string;
    name?: string;
    nameAr?: string;
    nameEn?: string;
};

const GENERATED_DISCLAIMER_PATTERNS = [
    /هذا\s+تقييم\s+أولي/i,
    /لا\s+يعد\s+تشخيص(?:اً|ًا)?\s+نهائي(?:اً|ًا)?/i,
    /يجب\s+تأكيده\s+بالفحص\s+السريري/i,
    /يحتاج\s+تأكيد(?:اً|ًا)?\s+سريري(?:اً|ًا)?/i,
    /راجع\s+الطبيب\s+المختص/i,
    /يجب\s+مراجعة\s+الطبيب/i,
    /تأكيد(?:اً|ًا)?\s+بالفحص\s+السريري/i,
    /clinical\s+review/i,
    /clinical\s+examination/i,
    /preliminary\s+(ai[-\s]assisted\s+)?assessment/i,
    /not\s+(a\s+)?final\s+(clinical\s+)?diagnosis/i,
    /does\s+not\s+replace/i,
    /clinical\s+confirmation/i,
    /doctor\s+must\s+review/i,
    /consult\s+(a\s+)?(qualified\s+)?doctor/i,
];

const ACTION_PHRASE_PATTERNS = [
    /احجز/i,
    /حجز\s+موعد/i,
    /موعد/i,
    /راجع\s+الطبيب/i,
    /مراجعة\s+(?:ال)?طبيب/i,
    /طبيب\s+الأسنان/i,
    /الفحص\s+السريري/i,
    /زيارة\s+الطبيب/i,
    /زيارة\s+العيادة/i,
    /book/i,
    /appointment/i,
    /dentist/i,
    /visit\s+(the\s+)?(doctor|clinic|dentist)/i,
    /see\s+(a\s+)?(doctor|dentist)/i,
];

function normalizeSentence(value: string): string {
    return value
        .toLowerCase()
        .replace(/[.,!?؟؛:;'"`،()[\]{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitGeneratedSentences(value: string): string[] {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) return [];
    return trimmed
        .split(/(?<=[.!؟])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

function repeatsRecommendedAction(sentence: string, recommendedAction: string): boolean {
    const normalizedSentence = normalizeSentence(sentence);
    const normalizedAction = normalizeSentence(recommendedAction);
    if (!normalizedSentence || !normalizedAction) return false;
    return normalizedSentence === normalizedAction ||
        normalizedAction.includes(normalizedSentence) ||
        normalizedSentence.includes(normalizedAction);
}

function cleanGeneratedText(
    value: unknown,
    recommendedAction = '',
    options: { allowAction?: boolean } = {}
): string {
    if (typeof value !== 'string') return '';

    const seen = new Set<string>();
    const cleaned = splitGeneratedSentences(value)
        .filter(sentence => !GENERATED_DISCLAIMER_PATTERNS.some(pattern => pattern.test(sentence)))
        .filter(sentence => options.allowAction || !ACTION_PHRASE_PATTERNS.some(pattern => pattern.test(sentence)))
        .filter(sentence => options.allowAction || !repeatsRecommendedAction(sentence, recommendedAction))
        .filter(sentence => {
            const normalized = normalizeSentence(sentence);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });

    return cleaned.join(' ').trim();
}

function cleanGeneratedList(values: unknown, recommendedAction = ''): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    return values
        .map(value => cleanGeneratedText(value, recommendedAction))
        .filter(value => {
            const normalized = normalizeSentence(value);
            if (!normalized || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
}

function normalizeClinicSuggestion(
    rawClinic: string | ClinicSuggestion,
    clinics: ClinicSuggestion[],
    language: 'ar' | 'en'
): ClinicSuggestion {
    if (typeof rawClinic === 'object' && rawClinic?.id && rawClinic?.name) {
        return rawClinic;
    }

    const rawText = typeof rawClinic === 'string'
        ? rawClinic
        : rawClinic?.id || rawClinic?.name || rawClinic?.nameAr || rawClinic?.nameEn || '';
    const normalizedText = normalizeSentence(rawText);

    const matchedClinic = clinics.find(clinic => {
        const candidates = [clinic.id, clinic.name, clinic.nameAr, clinic.nameEn]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map(normalizeSentence);
        return candidates.some(candidate =>
            candidate === normalizedText ||
            candidate.includes(normalizedText) ||
            normalizedText.includes(candidate)
        );
    });

    if (matchedClinic) {
        return {
            id: matchedClinic.id,
            name: language === 'ar'
                ? matchedClinic.nameAr || matchedClinic.name || matchedClinic.nameEn
                : matchedClinic.nameEn || matchedClinic.name || matchedClinic.nameAr,
            nameAr: matchedClinic.nameAr,
            nameEn: matchedClinic.nameEn,
        };
    }

    return rawText ? { name: rawText } : {};
}

// ============================================
// GENERAL CHAT ENDPOINT (New)
// ============================================

const chatSchema = z.object({
    message: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'bot']),
        content: z.string()
    })).max(MAX_CONVERSATION_HISTORY).optional(),
    language: z.enum(['ar', 'en']).default('ar'),
    image: z.string().optional().nullable(),
});

// SECURITY FIX (H3): requireAuth added.
// Previously POST /chat had no authentication — any anonymous user could
// consume the Gemini API budget with zero accountability or rate-limit traceability.
router.post('/chat', requireAuth, validateBody(chatSchema), async (req, res) => {

    const startTime = Date.now();

    try {
        const { message, conversationHistory = [], language = 'ar', image } = req.body;
        const userId = req.session?.userId || null; // Optional - works for both logged-in and anonymous users

        // Log chat request (userId can be null for anonymous users)
        if (userId) {
            await logAudit({
                userId,
                action: 'AI_CHAT_REQUEST',
                entityType: 'AIChat',
                entityId: null,
                newData: {
                    hasImage: !!image,
                    language,
                    historyLength: conversationHistory.length
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] as string,
            });
        }

        if (!genAI) {
            logger.warn('AI chat requested but GEMINI_API_KEY not configured');
            return res.status(503).json({
                success: false,
                message: 'خدمة الذكاء الاصطناعي غير متاحة حالياً',
                messageEn: 'AI service not available. Please configure GEMINI_API_KEY.',
            });
        }

        // Sanitize input
        const sanitizedMessage = sanitizeInput(message);

        // Validate image if provided
        let validatedImage: { data: string; mimeType: string } | null = null;
        if (image) {
            const imageValidation = validateImage(image);
            if (!imageValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: imageValidation.error,
                    messageEn: imageValidation.error,
                });
            }
            validatedImage = { data: imageValidation.data!, mimeType: imageValidation.mimeType! };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build conversation context
        const contextMessages = conversationHistory
            .slice(-MAX_CONVERSATION_HISTORY)
            .map((msg: { role: string; content: string }) => `${msg.role === 'user' ? 'المريض' : 'المساعد'}: ${msg.content}`)
            .join('\n');

        const systemPrompt = `أنت مساعد طبي ذكي لعيادة أسنان جامعة الدلتا للعلوم والتكنولوجيا.
        
مهامك:
1. الإجابة على أسئلة المرضى حول خدمات العيادة، المواعيد، الأسعار، والأطباء
2. تقييم الأعراض وتوجيه المريض للعيادة المناسبة
3. تقديم نصائح صحية عامة للعناية بالأسنان
4. التحدث بلغة ${language === 'ar' ? 'عربية' : 'إنجليزية'} واضحة ومهنية

العيادات المتاحة:
- التشخيص وعلاج اللثة: للفحص الشامل وتشخيص الحالات وعلاج أمراض اللثة
- العلاج التحفظي: للحشوات وعلاج التسوس
- طب وجراحة الجذور: لعلاج جذور الأسنان ومشاكل العصب
- جراحة الوجه والفكين: لجراحات الوجه والفكين المتقدمة
- جراحة الفم: للخلع والجراحات الفموية
- تقويم الأسنان: لتصحيح اعوجاج الأسنان
- زراعة الأسنان: لتعويض الأسنان المفقودة
- تجميل الأسنان: للتبييض وتحسين المظهر
- أسنان الأطفال والاحتياجات الخاصة: للأطفال وذوي الاحتياجات الخاصة
- التركيبات الثابتة: للتيجان والجسور
- التركيبات المتحركة: لأطقم الأسنان

معلومات مهمة:
- ساعات العمل: 8 صباحاً - 8 مساءً (السبت-الخميس)
- رسوم الفحص الأساسي: 500 جنيه مصري
- يمكن حجز المواعيد من خلال التطبيق
- نقبل معظم شركات التأمين الطبي

تعليمات الرد:
- كن مفيداً ومهنياً
- إذا سأل عن أعراض، قيّمها واقترح العيادة المناسبة
- إذا كانت حالة طارئة، انصحه بالذهاب فوراً
- لا تقدم تشخيصاً طبياً نهائياً، فقط توجيه أولي
- اقترح دائماً زيارة الطبيب للفحص الدقيق

${contextMessages ? `المحادثة السابقة:\n${contextMessages}\n` : ''}

المريض الآن: ${sanitizedMessage}

قدم رد مفيد ومهني. إذا كانت الأعراض تحتاج عيادة معينة، اذكرها بوضوح.`;

        let result;
        if (validatedImage) {
            const imagePart = {
                inlineData: {
                    data: validatedImage.data,
                    mimeType: validatedImage.mimeType
                }
            };
            result = await model.generateContent([systemPrompt, imagePart]);
        } else {
            result = await model.generateContent(systemPrompt);
        }

        const responseText = result.response.text();

        // Extract suggested clinic if mentioned
        const clinicKeywords: Record<string, string> = {
            'تشخيص': 'التشخيص وعلاج اللثة',
            'أشعة': 'التشخيص وعلاج اللثة',
            'تحفظي': 'العلاج التحفظي',
            'حشو': 'العلاج التحفظي',
            'تسوس': 'العلاج التحفظي',
            'عصب': 'طب وجراحة الجذور',
            'جذور': 'طب وجراحة الجذور',
            'وجه': 'جراحة الوجه والفكين',
            'فكين': 'جراحة الوجه والفكين',
            'جراحة': 'جراحة الفم',
            'خلع': 'جراحة الفم',
            'تقويم': 'تقويم الأسنان',
            'زراعة': 'زراعة الأسنان',
            'تجميل': 'تجميل الأسنان',
            'تبييض': 'تجميل الأسنان',
            'أطفال': 'أسنان الأطفال والاحتياجات الخاصة',
            'لثة': 'التشخيص وعلاج اللثة',
            'تركيبات ثابتة': 'التركيبات الثابتة',
            'تركيبات متحركة': 'التركيبات المتحركة',
        };

        let suggestedClinic: string | null = null;
        const lowerResponse = responseText.toLowerCase();
        for (const [keyword, clinic] of Object.entries(clinicKeywords)) {
            if (lowerResponse.includes(keyword)) {
                suggestedClinic = clinic;
                break;
            }
        }

        const responseData = {
            message: responseText,
            suggestedClinic,
            language,
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
        };

        // Log successful chat (only if user is logged in)
        if (userId) {
            await logAudit({
                userId,
                action: 'AI_CHAT_COMPLETE',
                entityType: 'AIChat',
                entityId: null,
                newData: {
                    hasSuggestion: !!suggestedClinic,
                    processingTimeMs: Date.now() - startTime
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] as string,
            });
        }

        res.json(responseData);
    } catch (err: any) {
        logger.error('AI Chat error:', err);

        const language = req.body?.language || 'ar';
        res.status(500).json({
            success: false,
            message: language === 'ar' ? 'حدث خطأ في معالجة الرسالة' : 'Error processing message',
            messageEn: err.message,
        });
    }
});

// ============================================
// GET DIAGNOSIS RECORDS FOR A PATIENT (Doctors/Graduates/Admin only + relationship check)
// ============================================
router.get('/diagnosis/patient/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId   = req.session.userId!;
        const currentUserType = req.session.userType!;

        // SECURITY FIX (C2): Students are denied completely — they have no clinical
        // relationship requirement and should not read AI diagnosis records.
        // Doctors/graduates must have an appointment with this patient (relationship check).
        // Admins retain unrestricted access.
        if (!['doctor', 'graduate', 'admin'].includes(currentUserType)) {
            return res.status(403).json({
                message: 'غير مصرح لك بالوصول لهذه البيانات',
                messageEn: 'Access denied'
            });
        }

        // Resolve the target user → patient profile → then check relationship
        if (currentUserType !== 'admin') {
            const targetPatient = await PatientRepo.findByUserId(userId);
            if (!targetPatient) {
                return res.status(404).json({ message: 'المريض غير موجود', messageEn: 'Patient not found' });
            }
            const { canAccessPatient } = await import('../middleware/auth');
            const hasAccess = await canAccessPatient(currentUserId, currentUserType, targetPatient.id);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'لا تملك صلاحية الوصول لبيانات هذا المريض',
                    messageEn: 'You do not have a clinical relationship with this patient'
                });
            }
        }

        // Fetch all diagnosis records for this patient
        const records = await DiagnosisRecordModel.find({
            userId: userId,
            deletedAt: null
        }).sort({ createdAt: -1 });

        res.json(records);
    } catch (error: any) {
        logger.error('Error fetching patient diagnosis records:', error);
        res.status(500).json({
            message: 'حدث خطأ في تحميل السجلات',
            messageEn: 'Error loading records'
        });
    }
});


// AI Diagnosis - NOW PROTECTED WITH AUTH
router.post('/diagnosis', requireAuth, validateBody(aiDiagnosisSchema), async (req, res) => {
    const startTime = Date.now();

    try {
        const { answers, symptomSummary, xrayImage, language = 'ar', patientId } = req.body;
        let xrayFileId: string | null = null;
        let storedXrayFilename: string | null = null;
        const userId = req.session.userId!;
        const resolvedPatientId = patientId || await getPatientIdFromUserId(userId);

        // Log the AI request (without sensitive image data)
        await logAudit({
            userId,
            action: 'AI_DIAGNOSIS_REQUEST',
            entityType: 'AIDiagnosis',
            entityId: null,
            newData: {
                hasImage: !!xrayImage,
                language,
                answersCount: Object.keys(answers || {}).length,
                hasSummary: !!symptomSummary
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        if (!genAI) {
            logger.warn('AI diagnosis requested but GEMINI_API_KEY not configured');
            return res.status(503).json({
                success: false,
                message: 'AI service not available. Please configure GEMINI_API_KEY.',
                messageEn: 'AI service not available. Please configure GEMINI_API_KEY.',
                fallback: true,
                disclaimer: MEDICAL_DISCLAIMER[language as 'ar' | 'en'] || MEDICAL_DISCLAIMER.en
            });
        }

        // SECURITY: Validate image if provided
        let validatedImage: { data: string; mimeType: string } | null = null;
        if (xrayImage) {
            const imageValidation = validateImage(xrayImage);
            if (!imageValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: imageValidation.error,
                    messageEn: imageValidation.error,
                });
            }
            validatedImage = { data: imageValidation.data!, mimeType: imageValidation.mimeType! };

            // BUGFIX (H10): Upload the validated X-ray to GridFS for persistent storage.
            // Previously xrayFileId was declared but uploadToGridFS() was never called,
            // so every diagnosis record had xrayFileId: null and X-ray history was lost.
            try {
                const imageBuffer = Buffer.from(imageValidation.data!, 'base64');
                const ext = imageValidation.mimeType!.split('/')[1] || 'jpg';
                const filename = `xray_${userId}_${Date.now()}.${ext}`;
                xrayFileId = await uploadToGridFS(imageBuffer, filename, {
                    userId,
                    patientId: resolvedPatientId || null,
                    mimeType: imageValidation.mimeType,
                    uploadedAt: new Date(),
                });
                storedXrayFilename = filename;
                logger.info(`X-ray uploaded to GridFS: ${xrayFileId} (${filename})`);
            } catch (gridfsErr) {
                // Non-fatal: log and continue — diagnosis still proceeds without stored image
                logger.warn('GridFS X-ray upload failed (non-critical):', gridfsErr);
            }
        }


        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const clinics = await storage.getClinics();
        let clinicMappings = clinics.map(c => `- ${c.id} (${c.nameEn || c.name} / ${c.nameAr || c.name})`).join('\n        ');
        if (!clinicMappings) {
            clinicMappings = `
        - oral-diagnosis-periodontology (Oral Diagnosis and Periodontology / التشخيص وعلاج اللثة)
        - conservative-dentistry (Conservative Dentistry / العلاج التحفظي)
        - endodontics (Endodontics / طب وجراحة الجذور)
        - oral-maxillofacial-surgery (Oral and Maxillofacial Surgery / جراحة الوجه والفكين)
        - oral-surgery (Oral Surgery / جراحة الفم)
        - removable-prosthodontics (Removable Prosthodontics / التركيبات المتحركة)
        - fixed-prosthodontics (Fixed Prosthodontics / التركيبات الثابتة)
        - cosmetic-dentistry (Cosmetic Dentistry / تجميل الأسنان)
        - implant-dentistry (Implant Dentistry / زراعة الأسنان)
        - orthodontics (Orthodontics / تقويم الأسنان)
        - pediatric-special-care-dentistry (Pediatric and Special Care Dentistry / أسنان الأطفال والاحتياجات الخاصة)
            `.trim();
        }

        // BUGFIX (C3): Build a structured patient description from the actual request data.
        // Previously `description` was never defined and the template literal used escaped
        // backslashes (\${...}), so Gemini received the literal strings "${clinicMappings}"
        // and "${description}" instead of the real patient information.
        const answerLines = answers && typeof answers === 'object'
            ? Object.entries(answers)
                .map(([question, answer]) => `  - ${question}: ${answer}`)
                .join('\n')
            : '  (no structured answers provided)';

        const description = [
            symptomSummary ? `Chief Complaint / Summary:\n  ${symptomSummary}` : '',
            `Patient Answers to Symptom Questions:\n${answerLines}`,
        ].filter(Boolean).join('\n\n');

        const prompt = `You are a professional dental diagnosis assistant powered by Google Gemini.
        Analyze the actual patient case data: symptoms, answers, X-ray if provided, affected tooth/location, diagnosis, urgency, and suggested clinic.

        CRITICAL INSTRUCTIONS:
        1. Language: Write all patient-facing values in ${language === 'ar' ? 'natural Arabic for patients' : 'clear patient-friendly English'} only.
        2. No FAQ style: Do not generate question-style headings or headings such as "ماذا تعني هذه النتيجة؟", "لماذا ظهرت هذه النتيجة؟", "ماذا يجب أن تفعل الآن؟", "لماذا هذا التقييم؟", "What does this mean?", "Why was this suggested?", or "What should you do next?".
        3. Field responsibility:
           - patientExplanation: Explain what the main condition means for the patient. Do not mention booking, doctor visit, suggested clinic, AI, initial assessment, final diagnosis, or disclaimer.
           - analysisIndicators: List only case-specific signs that supported the result. Use symptoms, X-ray findings, tooth number, pain type, and location if available. Do not repeat the full diagnosis. Do not mention booking or doctor visit.
           - recommendedAction: Give the next action only. This is the only field allowed to mention booking, visit, appointment, seeing the doctor, or seeing the dentist.
           - suggestedClinicReason: Explain why the selected clinic is suitable. Do not repeat recommendedAction.
           - urgencyReason: Explain why the urgency level was selected. Do not repeat patientExplanation.
           - otherFindings: Explain only secondary findings. Do not repeat the primary diagnosis and do not repeat recommendedAction.
           - doctorReviewNote: Internal clinical note for the doctor. Do not use it as the main patient explanation.
        4. No repetition: Each idea must appear only once across the whole response. If two sentences mean the same thing, keep it only in the most relevant field.
        5. Strict repetition rules:
           - Mention doctor visit only in recommendedAction.
           - Mention booking only in recommendedAction.
           - Mention suggested clinic only in suggestedClinicReason or recommendedAction.
           - Mention AI/initial assessment/final diagnosis only in the UI disclaimer, not in Gemini fields.
           - Do not repeat "needs clinical confirmation" in generated patient fields.
           - Do not repeat "symptoms and X-ray support this" in multiple places.
        6. Length limits:
           - patientExplanation: maximum 2 short sentences.
           - analysisIndicators: 2 to 4 bullet items, each item maximum 1 short sentence.
           - recommendedAction: maximum 1 sentence.
           - urgencyReason: maximum 1 sentence.
           - suggestedClinicReason: maximum 1 sentence.
           - each otherFinding explanation: maximum 2 short sentences.
           - each otherFinding recommendedAction: maximum 1 short sentence.
        7. Tone: Use confident but medically safe wording. Prefer "تشير النتيجة إلى...", "تُظهر البيانات...", "تم رصد علامات...", "الأعراض وصورة الأشعة تدعم...", "التحليل يربط بين..." / "The result indicates...", "The data shows...", "Signs were detected...", "The symptoms and X-ray support...".
        8. Avoid overusing weak words: "قد", "ربما", "احتمال", "قد يكون", "قد يظهر", "maybe", "possibly", "might".
        9. Never say: "التشخيص مؤكد", "أنت مصاب بشكل نهائي", "لا تحتاج طبيب", "العلاج الوحيد هو...", "confirmed diagnosis", "you definitely have", "you do not need a doctor", or "the only treatment is".
        10. Patient-friendly wording: Use simple everyday language. If using terms like "لب السن" or "عصب السن", explain them briefly.
        11. No percentages: Do not include percentages in any patient-facing text field. Numeric probability/confidence fields are internal only and should be numbers from 0 to 100.
        12. Do not estimate or mention treatment duration, treatment time, number of sessions, or appointment length for the patient.
        13. SPATIAL DESCRIPTION (Segmentation Alternative): Since you cannot draw on the image, provide spatial descriptions in each condition.description when X-ray evidence is visible. State Jaw (Upper/Lower), Quadrant (Right/Left), and Tooth Number when identifiable.
        14. Schema: You MUST respond with a valid JSON object matching the following structure exactly:
        {
          "primaryCondition": "string",
          "affectedTooth": "string",
          "patientExplanation": "string",
          "analysisIndicators": [
            "string"
          ],
          "recommendedAction": "string",
          "urgencyReason": "string",
          "suggestedClinic": "clinic_id_or_clinic_name_string",
          "suggestedClinicReason": "string",
          "otherFindings": [
            {
              "condition": "string",
              "explanation": "string",
              "relationToCase": "string",
              "recommendedAction": "string"
            }
          ],
          "doctorReviewNote": "string",
          "conditions": [
            {
              "name": "Human readable name",
              "nameEn": "English name",
              "conditionKey": "one_of_the_keys_below",
              "probability": 0,
              "description": "Short explanation of the condition and why you diagnosed it"
            }
          ],
          "recommendations": ["Actionable advice 1", "Actionable advice 2"],
          "urgency": "high",
          "confidence": 0
        }

        Arabic output style example:
        primaryCondition: "تسوس عميق مع التهاب في لب السن"
        affectedTooth: "الضرس العلوي الأيمن الأول، رقم 16"
        patientExplanation: "تشير النتيجة إلى وجود تسوس عميق في الضرس العلوي الأيمن الأول رقم 16، مع علامات التهاب في الجزء الداخلي من السن. هذا يعني أن التلف وصل إلى طبقات عميقة وأصبح قريبًا من عصب السن أو مؤثرًا عليه."
        analysisIndicators: [
          "الألم الحاد والحساسية المستمرة يدعمان وجود التهاب داخل السن.",
          "صورة الأشعة أظهرت علامات مرتبطة بتلف عميق في الضرس رقم 16.",
          "مكان الشكوى يتوافق مع الضرس العلوي الأيمن الأول."
        ]
        recommendedAction: "احجز موعدًا في العيادة المقترحة لتقييم الضرس وتحديد العلاج المناسب."
        suggestedClinicReason: "عيادة طب وجراحة الجذور مناسبة لأنها تختص بحالات التهاب عصب السن والتسوس العميق القريب من الجذور."
        urgencyReason: "الحالة تحتاج اهتمامًا عاليًا لأن الألم والحساسية يشيران إلى مشكلة داخلية في السن."

        ALLOWED conditionKeys: dental_caries, gingivitis, tooth_sensitivity, root_canal, extraction, orthodontic, cosmetic, implant, pediatric, periodontitis, dentures, crowns

        CLINIC MAPPING (Return suggestedClinic as one clinic_id or clinic name string from this list):
        ${clinicMappings}

        Patient Information:
        ${description}

        Please provide a detailed and professional analysis.`;


        let result;
        if (validatedImage) {
            // Use pre-validated image data
            const imagePart = {
                inlineData: {
                    data: validatedImage.data,
                    mimeType: validatedImage.mimeType
                }
            };

            result = await withTimeout(
                model.generateContent([prompt, imagePart]),
                AI_DIAGNOSIS_TIMEOUT_MS
            );
        } else {
            result = await withTimeout(
                model.generateContent(prompt),
                AI_DIAGNOSIS_TIMEOUT_MS
            );
        }

        const responseText = result.response.text();
        const extractedJson = extractJsonObject(responseText);

        // Zod schema for validating AI response structure
        const clinicSuggestionSchema = z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            nameAr: z.string().optional(),
            nameEn: z.string().optional()
        });

        const conditionSchema = z.object({
            name: z.string().min(1),
            nameEn: z.string().optional(),
            conditionKey: z.string().optional(),
            probability: z.number().min(0).max(100).optional(),
            description: z.string().optional()
        });

        const diagnosisResponseSchema = z.object({
            primaryCondition: z.string().min(1),
            affectedTooth: z.string().optional().default(''),
            patientExplanation: z.string().min(1),
            analysisIndicators: z.array(z.string().min(1)).min(1),
            recommendedAction: z.string().min(1),
            suggestedClinic: z.union([z.string().min(1), clinicSuggestionSchema]),
            urgencyReason: z.string().optional().default(''),
            conditions: z.array(conditionSchema).optional().default([]),
            recommendations: z.array(z.string().min(1)).optional().default([]),
            urgency: z.enum(['high', 'medium', 'low']).optional().default('medium'),
            confidence: z.number().min(0).max(100).optional().default(50),
            suggestedClinicReason: z.string().optional().default(''),
            estimatedTreatmentTime: z.string().optional(),
            otherFindings: z.array(z.object({
                condition: z.string().min(1),
                explanation: z.string().optional().default(''),
                relationToCase: z.string().optional().default(''),
                recommendedAction: z.string().optional().default('')
            })).optional().default([]),
            doctorReviewNote: z.string().optional().default('')
        });

        try {
            if (!extractedJson) {
                throw new InvalidAIResponseError('AI response did not contain a JSON object');
            }

            const parsed = JSON.parse(extractedJson);

            // Validate AI response before persisting diagnosis history.
            const validationResult = diagnosisResponseSchema.safeParse(parsed);
            if (!validationResult.success) {
                logger.warn('AI diagnosis response validation failed:', validationResult.error);
                throw new InvalidAIResponseError('AI response schema validation failed');
            }

            const parsedDiagnosis = validationResult.data;
            const cleanedRecommendedAction = cleanGeneratedText(
                parsedDiagnosis.recommendedAction,
                '',
                { allowAction: true }
            );
            const cleanedPatientExplanation = cleanGeneratedText(
                parsedDiagnosis.patientExplanation,
                cleanedRecommendedAction
            );
            const cleanedAnalysisIndicators = cleanGeneratedList(
                parsedDiagnosis.analysisIndicators,
                cleanedRecommendedAction
            );

            if (!cleanedPatientExplanation || !cleanedRecommendedAction || cleanedAnalysisIndicators.length === 0) {
                logger.warn('AI diagnosis response missing required cleaned patient content:', {
                    hasPatientExplanation: !!cleanedPatientExplanation,
                    hasRecommendedAction: !!cleanedRecommendedAction,
                    analysisIndicatorsCount: cleanedAnalysisIndicators.length,
                });
                throw new InvalidAIResponseError('AI response missing required patient content');
            }

            const normalizedSuggestedClinic = normalizeClinicSuggestion(
                parsedDiagnosis.suggestedClinic,
                clinics,
                language as 'ar' | 'en'
            );

            if (!normalizedSuggestedClinic.name && !normalizedSuggestedClinic.id) {
                logger.warn('AI diagnosis response missing required clinic suggestion');
                throw new InvalidAIResponseError('AI response missing required clinic suggestion');
            }

            const cleanedOtherFindings = parsedDiagnosis.otherFindings
                .map(finding => ({
                    condition: cleanGeneratedText(finding.condition, cleanedRecommendedAction),
                    explanation: cleanGeneratedText(finding.explanation, cleanedRecommendedAction),
                    relationToCase: cleanGeneratedText(finding.relationToCase, cleanedRecommendedAction),
                    recommendedAction: cleanGeneratedText(
                        repeatsRecommendedAction(finding.recommendedAction, cleanedRecommendedAction)
                            ? ''
                            : finding.recommendedAction,
                        '',
                        { allowAction: true }
                    ),
                }))
                .filter(finding => finding.condition && (finding.explanation || finding.relationToCase || finding.recommendedAction));

            const diagnosis = {
                ...parsedDiagnosis,
                primaryCondition: cleanGeneratedText(parsedDiagnosis.primaryCondition, cleanedRecommendedAction),
                affectedTooth: cleanGeneratedText(parsedDiagnosis.affectedTooth, cleanedRecommendedAction),
                patientExplanation: cleanedPatientExplanation,
                analysisIndicators: cleanedAnalysisIndicators.slice(0, 4),
                recommendedAction: cleanedRecommendedAction,
                urgencyReason: cleanGeneratedText(parsedDiagnosis.urgencyReason, cleanedRecommendedAction),
                suggestedClinic: normalizedSuggestedClinic,
                suggestedClinicReason: cleanGeneratedText(parsedDiagnosis.suggestedClinicReason, cleanedRecommendedAction),
                conditions: parsedDiagnosis.conditions,
                recommendations: parsedDiagnosis.recommendations,
                otherFindings: cleanedOtherFindings,
                doctorReviewNote: undefined,
                estimatedTreatmentTime: undefined,
            };

            if (!diagnosis.primaryCondition) {
                throw new InvalidAIResponseError('AI response missing required primary condition');
            }

            // Add medical disclaimer to response
            const disclaimer = MEDICAL_DISCLAIMER[language as 'ar' | 'en'] || MEDICAL_DISCLAIMER.en;

            // Flag for human review if confidence is low or urgency is high
            const requiresHumanReview = diagnosis.confidence < 70 || diagnosis.urgency === 'high';

            const responseData = {
                ...diagnosis,
                disclaimer,
                requiresHumanReview,
                generatedAt: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime
            };

            // Log successful diagnosis (without PII)
            await logAudit({
                userId,
                action: 'AI_DIAGNOSIS_COMPLETE',
                entityType: 'AIDiagnosis',
                entityId: null,
                newData: {
                    confidence: diagnosis.confidence,
                    urgency: diagnosis.urgency,
                    conditionsCount: diagnosis.conditions?.length || 0,
                    requiresHumanReview,
                    processingTimeMs: Date.now() - startTime
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] as string,
            });

            // Save diagnosis record to database for historical tracking
            try {
                const diagnosisRecord = await DiagnosisRecordModel.create({
                    userId,
                    patientId: resolvedPatientId || null, // Link to patient record if available
                    answers: answers,
                    conditions: diagnosis.conditions,
                    recommendations: diagnosis.recommendations,
                    urgency: diagnosis.urgency,
                    confidence: diagnosis.confidence,
                    suggestedClinic: diagnosis.suggestedClinic,
                    xrayFileId: xrayFileId ?? undefined,
                    xrayFilename: storedXrayFilename ?? undefined,
                    createdAt: new Date()
                });

                logger.info(`Diagnosis record saved: ${diagnosisRecord._id} for user ${userId}`);

                // Add record ID to response for reference
                (responseData as any).diagnosisRecordId = diagnosisRecord._id.toString();
            } catch (dbError) {
                // Don't fail the request if database save fails, just log it
                logger.error('Failed to save diagnosis record to database:', dbError);
                // Continue and send response anyway
            }

            res.json(responseData);
        } catch (parseError: any) {
            logger.error('Failed to process Gemini diagnosis response:', {
                errorName: parseError?.name,
                errorMessage: parseError?.message,
                responseLength: responseText.length,
            });

            await logAudit({
                userId,
                action: 'AI_DIAGNOSIS_PARSE_ERROR',
                entityType: 'AIDiagnosis',
                entityId: null,
                newData: { error: 'Failed to parse AI response' },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] as string,
            });

            throw parseError instanceof InvalidAIResponseError
                ? parseError
                : new InvalidAIResponseError();
        }
    } catch (err: any) {
        logger.error('AI Diagnosis error:', err);

        const language = req.body?.language || 'ar';
        if (err instanceof AITimeoutError) {
            logger.warn('AI diagnosis Gemini request timed out:', {
                timeoutMs: AI_DIAGNOSIS_TIMEOUT_MS,
                processingTimeMs: Date.now() - startTime,
            });

            return res.status(504).json({
                success: false,
                message: language === 'ar'
                    ? 'استغرقت خدمة الذكاء الاصطناعي وقتاً طويلاً. يرجى المحاولة مرة أخرى.'
                    : 'The AI service took too long to respond. Please try again.',
                messageEn: 'The AI service took too long to respond. Please try again.',
                code: 'AI_TIMEOUT',
                disclaimer: MEDICAL_DISCLAIMER[language as 'ar' | 'en'] || MEDICAL_DISCLAIMER.en
            });
        }

        if (err instanceof InvalidAIResponseError) {
            return res.status(502).json({
                success: false,
                message: language === 'ar'
                    ? 'تعذر قراءة نتيجة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
                    : 'The AI response could not be read. Please try again.',
                messageEn: 'The AI response could not be read. Please try again.',
                code: 'INVALID_AI_RESPONSE',
                disclaimer: MEDICAL_DISCLAIMER[language as 'ar' | 'en'] || MEDICAL_DISCLAIMER.en
            });
        }

        res.status(500).json({
            success: false,
            message: language === 'ar' ? 'حدث خطأ في معالجة التشخيص' : 'Error processing diagnosis',
            messageEn: 'Error processing diagnosis',
            disclaimer: MEDICAL_DISCLAIMER[language as 'ar' | 'en'] || MEDICAL_DISCLAIMER.en
        });
    }
});

// ============================================
// SERVE X-RAY IMAGE FROM GRIDFS
// ============================================
router.get('/xray/:fileId', requireAuth, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { downloadFromGridFS } = await import('../utils/gridfsStorage');

        const { buffer, metadata, filename } = await downloadFromGridFS(fileId);

        // Security: Verify user owns this X-ray
        if (metadata?.userId !== req.session.userId && req.session.userType !== 'admin') {
            return res.status(403).json({
                message: 'غير مصرح لك بالوصول لهذه الصورة',
                messageEn: 'Access denied'
            });
        }

        res.setHeader('Content-Type', metadata?.mimeType || 'image/jpeg');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.send(buffer);
    } catch (error: any) {
        logger.error('Error serving X-ray:', error);
        res.status(404).json({
            message: 'الصورة غير موجودة',
            messageEn: 'Image not found'
        });
    }
});

// ============================================
// GET AI DIAGNOSIS HISTORY
// ============================================
router.get('/history', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const records = await DiagnosisRecordModel.find({ userId }).sort({ createdAt: -1 });
        
        // Transform ObjectIds to strings
        const formattedRecords = records.map(record => {
            const obj = record.toObject() as Record<string, any>;
            obj.id = obj._id?.toString();
            delete obj._id;
            delete obj.__v;
            return obj;
        });

        res.json(formattedRecords);
    } catch (error: any) {
        logger.error('Error fetching diagnosis history:', error);
        res.status(500).json({
            message: 'حدث خطأ أثناء جلب سجل التشخيص',
            messageEn: 'Error fetching diagnosis history'
        });
    }
});

// ============================================
// AI TREATMENT PLAN DOCTOR REVIEW WORKFLOW
// ============================================

router.get('/treatment-plan/pending', requireDoctor, async (req, res) => {
    try {
        const doctor = await storage.getDoctorByUserId(req.session.userId!);
        const doctorId = doctor?.id || null;
        if (!doctorId) {
            return res.status(403).json({
                message: 'لم يتم العثور على ملف الطبيب',
                messageEn: 'Doctor profile not found'
            });
        }

        const plans = await TreatmentPlanRepo.findPendingAiDraftsByDoctor(doctorId);
        const plansWithPatientNames = await Promise.all(plans.map(async (plan: any) => {
            const patient = await PatientRepo.findById(plan.patientId);
            return {
                ...plan,
                patientName: patient?.fullName || patient?.name,
            };
        }));
        res.json(plansWithPatientNames);
    } catch (error: any) {
        logger.error('Error fetching pending AI treatment plans:', error);
        res.status(500).json({
            message: 'حدث خطأ أثناء جلب خطط العلاج المعلقة',
            messageEn: 'Error fetching pending treatment plans'
        });
    }
});

router.patch('/treatment-plan/:id', requireDoctor, async (req, res) => {
    try {
        const parsedBody = treatmentPlanPatchSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                message: 'بيانات خطة العلاج غير صالحة',
                messageEn: 'Invalid treatment plan data'
            });
        }
        if (Object.keys(parsedBody.data).length === 0) {
            return res.status(400).json({
                message: 'لم يتم إرسال أي تعديلات',
                messageEn: 'No treatment plan changes were provided'
            });
        }

        const doctor = await storage.getDoctorByUserId(req.session.userId!);
        const doctorId = doctor?.id || null;
        if (!doctorId) {
            return res.status(403).json({
                message: 'لم يتم العثور على ملف الطبيب',
                messageEn: 'Doctor profile not found'
            });
        }

        const plan = await TreatmentPlanRepo.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                message: 'لم يتم العثور على خطة العلاج',
                messageEn: 'Treatment plan not found'
            });
        }

        if (String(plan.doctorId) !== doctorId) {
            return res.status(403).json({
                message: 'غير مصرح لك بتعديل هذه الخطة',
                messageEn: 'You are not allowed to edit this treatment plan'
            });
        }

        if (!isReviewableAiDraft(plan)) {
            return res.status(409).json({
                message: 'لا يمكن تعديل هذه الخطة في حالتها الحالية',
                messageEn: 'This treatment plan cannot be edited in its current state'
            });
        }

        const updatedPlan = await TreatmentPlanRepo.update(req.params.id, parsedBody.data);

        if (req.query.notifyPatient !== 'false') {
            await NotificationService.onTreatmentPlanUpdated({
                patientId: plan.patientId,
                doctorName: doctor.fullName || 'Doctor',
                planId: req.params.id,
            });
        }

        await logAudit({
            userId: req.session.userId!,
            action: 'UPDATE_AI_DRAFT_TREATMENT_PLAN',
            entityType: 'TreatmentPlan',
            entityId: req.params.id
        });

        res.json(updatedPlan);
    } catch (error: any) {
        logger.error('Error updating AI draft treatment plan:', error);
        res.status(500).json({
            message: 'حدث خطأ أثناء تحديث خطة العلاج',
            messageEn: 'Error updating treatment plan'
        });
    }
});

router.post('/treatment-plan/:id/approve', requireDoctor, async (req, res) => {
    try {
        const doctor = await storage.getDoctorByUserId(req.session.userId!);
        const doctorId = doctor?.id || null;
        if (!doctorId) {
            return res.status(403).json({
                message: 'لم يتم العثور على ملف الطبيب',
                messageEn: 'Doctor profile not found'
            });
        }

        const plan = await TreatmentPlanRepo.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                message: 'لم يتم العثور على خطة العلاج',
                messageEn: 'Treatment plan not found'
            });
        }

        if (String(plan.doctorId) !== doctorId) {
            return res.status(403).json({
                message: 'غير مصرح لك باعتماد هذه الخطة',
                messageEn: 'You are not allowed to approve this treatment plan'
            });
        }

        if (!isReviewableAiDraft(plan)) {
            return res.status(409).json({
                message: 'لا يمكن اعتماد هذه الخطة في حالتها الحالية',
                messageEn: 'This treatment plan cannot be approved in its current state'
            });
        }

        const approvedPlan = await TreatmentPlanRepo.update(req.params.id, {
            reviewStatus: 'approved',
            isAiDraft: false,
            isFinal: true,
            approvedBy: doctorId,
            approvedAt: new Date(),
        });

        await NotificationService.onTreatmentPlanApproved({
            patientId: plan.patientId,
            doctorName: doctor.fullName || 'Doctor',
            planId: req.params.id,
        });

        await logAudit({
            userId: req.session.userId!,
            action: 'APPROVE_AI_DRAFT_TREATMENT_PLAN',
            entityType: 'TreatmentPlan',
            entityId: req.params.id
        });

        res.json(approvedPlan);
    } catch (error: any) {
        logger.error('Error approving AI draft treatment plan:', error);
        res.status(500).json({
            message: 'حدث خطأ أثناء اعتماد خطة العلاج',
            messageEn: 'Error approving treatment plan'
        });
    }
});

router.post('/treatment-plan/:id/revision-requested', requireDoctor, async (req, res) => {
    try {
        const doctor = await storage.getDoctorByUserId(req.session.userId!);
        const doctorId = doctor?.id || null;
        if (!doctorId) {
            return res.status(403).json({
                message: 'لم يتم العثور على ملف الطبيب',
                messageEn: 'Doctor profile not found'
            });
        }

        const plan = await TreatmentPlanRepo.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                message: 'لم يتم العثور على خطة العلاج',
                messageEn: 'Treatment plan not found'
            });
        }

        if (String(plan.doctorId) !== doctorId) {
            return res.status(403).json({
                message: 'غير مصرح لك بتعديل هذه الخطة',
                messageEn: 'You are not allowed to update this treatment plan'
            });
        }

        if (!isReviewableAiDraft(plan)) {
            return res.status(409).json({
                message: 'لا يمكن طلب إعادة تقييم لهذه الخطة في حالتها الحالية',
                messageEn: 'This treatment plan cannot be marked for re-evaluation in its current state'
            });
        }

        const updatedPlan = await TreatmentPlanRepo.update(req.params.id, {
            reviewStatus: 'revision_requested',
            isAiDraft: true,
            isFinal: false,
        });

        await NotificationService.onTreatmentPlanRevisionRequested({
            patientId: plan.patientId,
            doctorName: doctor.fullName || 'Doctor',
            planId: req.params.id,
        });

        await logAudit({
            userId: req.session.userId!,
            action: 'REQUEST_AI_DRAFT_TREATMENT_PLAN_REVISION',
            entityType: 'TreatmentPlan',
            entityId: req.params.id
        });

        res.json(updatedPlan);
    } catch (error: any) {
        logger.error('Error requesting AI draft treatment plan revision:', error);
        res.status(500).json({
            message: 'حدث خطأ أثناء طلب إعادة تقييم خطة العلاج',
            messageEn: 'Error requesting treatment plan re-evaluation'
        });
    }
});

export default router;
