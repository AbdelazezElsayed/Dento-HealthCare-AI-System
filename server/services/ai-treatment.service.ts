import { GoogleGenerativeAI } from "@google/generative-ai";
import { DiagnosisRecordModel } from '../mongodb';
import { TreatmentPlanRepo } from '../repositories/clinic.repo';
import { DoctorRepo } from '../repositories/doctor.repo';
import { PatientRepo } from '../repositories/patient.repo';
import { NotificationRepo } from '../repositories/notification.repo';
import logger from '../utils/logger';

interface GeneratedProcedure {
    name: string;
    description?: string;
    status: 'scheduled';
}

interface GeneratedTreatmentPlanData {
    title: string;
    description?: string;
    estimatedDuration?: string;
    procedures: GeneratedProcedure[];
    notes?: string;
}

const AI_DRAFT_DISCLAIMER = 'AI-generated draft only. Pending doctor review and approval. Not final medical advice.';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeGeneratedPlan(value: unknown): GeneratedTreatmentPlanData {
    if (!isRecord(value)) {
        throw new Error('AI treatment plan response must be an object');
    }

    const procedures = Array.isArray(value.procedures)
        ? value.procedures
            .filter(isRecord)
            .map((procedure): GeneratedProcedure => ({
                name: typeof procedure.name === 'string' && procedure.name.trim()
                    ? procedure.name
                    : 'إجراء مقترح',
                description: typeof procedure.description === 'string'
                    ? procedure.description
                    : undefined,
                status: 'scheduled',
            }))
        : [];

    return {
        title: typeof value.title === 'string' && value.title.trim()
            ? value.title
            : 'خطة علاجية مقترحة بالذكاء الاصطناعي',
        description: typeof value.description === 'string'
            ? value.description
            : undefined,
        estimatedDuration: typeof value.estimatedDuration === 'string'
            ? value.estimatedDuration
            : undefined,
        procedures,
        notes: typeof value.notes === 'string'
            ? value.notes
            : undefined,
    };
}

export async function generateProposedTreatmentPlan(patientId: string, doctorId: string, appointmentId?: string) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            logger.warn('Gemini API key is not configured. Cannot auto-generate treatment plan.');
            return;
        }

        if (appointmentId) {
            const existingDraft = await TreatmentPlanRepo.findByAppointment(appointmentId);
            if (existingDraft?.source === 'ai' && existingDraft?.reviewStatus === 'pending_doctor_review') {
                logger.info(`AI draft treatment plan already exists for appointment ${appointmentId}`);
                return existingDraft;
            }
        }

        // Fetch recent AI diagnosis records for this patient
        // We use patientId here because the diagnosis was linked to the patientId
        const records = await DiagnosisRecordModel.find({ patientId }).sort({ createdAt: -1 }).limit(1);
        if (!records || records.length === 0) {
            logger.info('No AI diagnosis records found to base a treatment plan on.');
            return;
        }

        // Get the latest diagnosis.
        const latestDiagnosis = records[0];
        const diagnosisContext = {
            conditions: latestDiagnosis.conditions,
            recommendations: latestDiagnosis.recommendations,
            urgency: latestDiagnosis.urgency,
            confidence: latestDiagnosis.confidence,
            suggestedClinic: latestDiagnosis.suggestedClinic,
            estimatedTreatmentTime: latestDiagnosis.estimatedTreatmentTime,
        };

        const patient = await PatientRepo.findById(patientId);
        const doctor = await DoctorRepo.findById(doctorId);

        if (!patient || !doctor) return;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a professional AI Dental Assistant.
        A patient just booked an appointment based on a recent diagnosis.
        Your task is to generate a proposed "Treatment Plan" (JSON format) based on their diagnosis.
        
        Diagnosis Information:
        ${JSON.stringify(diagnosisContext)}
        
        Patient Name: ${patient.fullName}
        Doctor Name: ${doctor.fullName}

        INSTRUCTIONS:
        1. Output ONLY valid JSON, do not wrap it in markdown code blocks.
        2. The JSON must exactly match this structure:
        {
          "title": "A short Arabic title for the plan",
          "description": "A professional summary of the proposed plan in Arabic, citing specific teeth and quadrant if applicable.",
          "estimatedDuration": "e.g., 2 weeks, 1 month",
          "procedures": [
            {
              "name": "Procedure name (Arabic)",
              "description": "Procedure details (Arabic)",
              "status": "scheduled"
            }
          ],
          "notes": "AI-generated draft only. Pending doctor review and approval. Not final medical advice."
        }`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

        const parsedPlan: unknown = JSON.parse(responseText);
        const planData = normalizeGeneratedPlan(parsedPlan);

        // Save the plan
        const newPlan = await TreatmentPlanRepo.create({
            patientId,
            doctorId,
            doctorName: doctor.fullName,
            title: planData.title,
            description: planData.description,
            planStartDate: new Date(),
            estimatedDuration: planData.estimatedDuration,
            procedures: planData.procedures,
            appointments: [],
            notes: planData.notes || AI_DRAFT_DISCLAIMER,
            source: 'ai',
            reviewStatus: 'pending_doctor_review',
            isAiDraft: true,
            isFinal: false,
            diagnosisRecordId: latestDiagnosis._id.toString(),
            appointmentId,
            aiDisclaimer: AI_DRAFT_DISCLAIMER,
            status: 'active'
        });

        // Notify the doctor
        if (doctor.userId) {
            await NotificationRepo.create({
                userId: doctor.userId,
                title: 'خطة علاجية مقترحة جديدة',
                message: `تم اقتراح خطة علاجية بالذكاء الاصطناعي للمريض ${patient.fullName} بناءً على التشخيص الأخير. يرجى مراجعتها.`,
                titleEn: 'New AI draft treatment plan',
                messageEn: `An AI draft treatment plan was generated for ${patient.fullName}. Please review it before it is considered final.`,
                type: 'system',
                relatedEntityType: 'TreatmentPlan',
                relatedEntityId: newPlan.id
            });
        }

        logger.info(`Successfully generated AI Treatment Plan for patient ${patientId}`);

    } catch (error) {
        logger.error('Error generating AI treatment plan:', error);
    }
}
