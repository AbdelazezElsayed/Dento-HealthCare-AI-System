import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Upload,
  Image as ImageIcon,
  FileX,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  Thermometer,
  Clock,
  Calendar,
  Activity,
  MessageSquare,
  Sparkles,
  X,
  Download,
  Share2,
  Printer,
  FileText,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiPost } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getClinicBySlug, resolveClinicSlug } from "@/constants/clinics";

interface Question {
  id: string;
  question: string;
  questionEn: string;
  type: "radio" | "text" | "scale";
  options?: { value: string; label: string; labelEn: string }[];
}

interface DiagnosisCondition {
  name: string;
  nameEn?: string;
  conditionKey?: string;
  probability: number;
  description?: string;
}

interface DiagnosisOtherFinding {
  condition: string;
  explanation?: string;
  relationToCase?: string;
  recommendedAction?: string;
}

interface DiagnosisResult {
  primaryCondition?: string;
  affectedTooth?: string;
  patientExplanation?: string;
  analysisIndicators?: string[];
  recommendedAction?: string;
  urgencyReason?: string;
  conditions: DiagnosisCondition[];
  recommendations: string[];
  urgency: "high" | "medium" | "low";
  confidence: number;
  suggestedClinic?: {
    id?: string;
    name?: string;
    nameAr?: string;
    nameEn?: string;
  };
  suggestedClinicReason?: string;
  otherFindings?: DiagnosisOtherFinding[];
  disclaimer?: {
    text?: string;
  };
  isLocalFallback?: boolean;
}

const clinicInfo = (slug: string) => {
  const clinic = getClinicBySlug(slug);
  return {
    clinicId: clinic?.id || slug,
    clinicName: clinic?.nameAr || "",
    clinicNameEn: clinic?.nameEn || "",
  };
};

const clinicConditionMapping: Record<string, { clinicId: string; clinicName: string; clinicNameEn: string }> = {
  dental_caries: clinicInfo("conservative-dentistry"),
  gingivitis: clinicInfo("oral-diagnosis-periodontology"),
  tooth_sensitivity: clinicInfo("conservative-dentistry"),
  root_canal: clinicInfo("endodontics"),
  extraction: clinicInfo("oral-surgery"),
  orthodontic: clinicInfo("orthodontics"),
  cosmetic: clinicInfo("cosmetic-dentistry"),
  implant: clinicInfo("implant-dentistry"),
  pediatric: clinicInfo("pediatric-special-care-dentistry"),
  periodontitis: clinicInfo("oral-diagnosis-periodontology"),
  dentures: clinicInfo("removable-prosthodontics"),
  crowns: clinicInfo("fixed-prosthodontics"),
};

const normalizePercentScore = (value: unknown, fallback = 0): number => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;

  const percentage = numericValue > 0 && numericValue <= 1
    ? numericValue * 100
    : numericValue;

  return Math.max(0, Math.min(100, Math.round(percentage)));
};

const getClinicName = (
  clinic: { id?: string; name?: string; nameAr?: string; nameEn?: string } | undefined,
  language: "ar" | "en",
) => {
  if (!clinic) return "";
  const resolvedSlug = resolveClinicSlug(clinic.id || clinic.nameAr || clinic.nameEn || clinic.name);
  const canonicalClinic = typeof resolvedSlug === "string" ? getClinicBySlug(resolvedSlug) : undefined;
  if (canonicalClinic) {
    return language === "ar" ? canonicalClinic.nameAr : canonicalClinic.nameEn;
  }
  return language === "ar"
    ? clinic.nameAr || clinic.name || clinic.nameEn || ""
    : clinic.nameEn || clinic.name || clinic.nameAr || "";
};

const buildBookingUrl = (
  clinic: { id?: string; name?: string; nameAr?: string; nameEn?: string } | undefined,
  language: "ar" | "en",
) => {
  const params = new URLSearchParams();
  const resolvedSlug = resolveClinicSlug(clinic?.id || clinic?.nameAr || clinic?.nameEn || clinic?.name);
  const canonicalClinic = typeof resolvedSlug === "string" ? getClinicBySlug(resolvedSlug) : undefined;
  if (canonicalClinic?.id) params.set("clinicId", canonicalClinic.id);
  const displayName = canonicalClinic
    ? (language === "ar" ? canonicalClinic.nameAr : canonicalClinic.nameEn)
    : getClinicName(clinic, language);
  if (displayName) params.set("clinicName", displayName);
  return params.toString() ? `/appointments?${params.toString()}` : "/appointments";
};

const normalizeDiagnosisResultScores = (result: DiagnosisResult | null): DiagnosisResult | null => {
  if (!result) return result;
  return {
    ...result,
    confidence: normalizePercentScore(result.confidence),
    conditions: Array.isArray(result.conditions)
      ? result.conditions.map((condition: DiagnosisCondition) => ({
          ...condition,
          probability: normalizePercentScore(condition.probability),
        }))
      : result.conditions,
  };
};

const getConditionIdentity = (condition: DiagnosisCondition) =>
  (condition.conditionKey || condition.nameEn || condition.name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getUniqueConditions = (conditions: DiagnosisCondition[]) => {
  const seen = new Set<string>();
  return conditions.filter((condition) => {
    const identity = getConditionIdentity(condition);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

const getUrgencyInfo = (urgency: DiagnosisResult["urgency"], language: "ar" | "en") => {
  const labels = {
    high: {
      label: language === "ar" ? "درجة استعجال عالية" : "High urgency",
      className: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200 border-red-200 dark:border-red-900",
    },
    medium: {
      label: language === "ar" ? "درجة استعجال متوسطة" : "Medium urgency",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-900",
    },
    low: {
      label: language === "ar" ? "درجة استعجال منخفضة" : "Low urgency",
      className: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200 border-green-200 dark:border-green-900",
    },
  };

  return labels[urgency];
};

const getConfidenceLabel = (confidence: number, language: "ar" | "en") => {
  if (confidence >= 85) return language === "ar" ? "مرجح جدًا" : "Very likely";
  if (confidence >= 70) return language === "ar" ? "مرجح" : "Likely";
  if (confidence >= 50) return language === "ar" ? "محتمل" : "Possible";
  return language === "ar" ? "يحتاج تأكيد سريري" : "Needs clinical confirmation";
};

const getConditionName = (condition: DiagnosisCondition | undefined, language: "ar" | "en") => {
  if (!condition) return "";
  return language === "ar" ? condition.name : condition.nameEn || condition.name;
};

const cleanGeneratedText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const cleanGeneratedList = (values: unknown) =>
  Array.isArray(values)
    ? values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

type PatientExplanation = {
  meaning: string;
  why: string;
  nextStep: string;
  evidence: string;
};

const conditionExplanationMap: Record<string, { ar: PatientExplanation; en: PatientExplanation }> = {
  dental_caries: {
    ar: {
      meaning: "تلف في طبقة السن بسبب البكتيريا، وقد يسبب ألمًا أو حساسية إذا وصل إلى طبقات أعمق.",
      why: "قد يظهر هذا التقييم عند وجود ألم مع الأكل أو حساسية أو وصف يشير إلى وجود تسوس.",
      nextStep: "احجز كشفًا في عيادة العلاج التحفظي ليحدد الطبيب هل تحتاج حشوًا أو علاجًا آخر.",
      evidence: "الأعراض المذكورة تتوافق مع مشاكل التسوس أو تآكل طبقة السن.",
    },
    en: {
      meaning: "Damage in the tooth surface caused by bacteria, which may lead to pain or sensitivity if it reaches deeper layers.",
      why: "This may be suggested when pain with eating, sensitivity, or decay-like symptoms are reported.",
      nextStep: "Book a visit with the conservative dentistry clinic so the doctor can decide whether a filling or another treatment is needed.",
      evidence: "The reported symptoms fit a tooth decay or enamel damage pattern.",
    },
  },
  gingivitis: {
    ar: {
      meaning: "تهيج في اللثة قد يظهر مع نزيف أو احمرار أو ألم بسيط حول الأسنان.",
      why: "قد يظهر هذا التقييم عند وجود نزيف أو تورم أو عناية فموية غير منتظمة.",
      nextStep: "راجع عيادة التشخيص وعلاج اللثة للفحص والتنظيف وتحديد سبب الالتهاب.",
      evidence: "الأعراض المذكورة تدعم احتمال وجود التهاب أو تهيج في اللثة.",
    },
    en: {
      meaning: "Gum irritation that may appear with bleeding, redness, or mild pain around the teeth.",
      why: "This may be suggested when bleeding, swelling, or irregular oral hygiene is reported.",
      nextStep: "Visit the oral diagnosis and periodontology clinic for examination, cleaning, and confirmation of the cause.",
      evidence: "The reported symptoms support possible gum inflammation or irritation.",
    },
  },
  periodontitis: {
    ar: {
      meaning: "التهاب أعمق في أنسجة اللثة المحيطة بالأسنان، وقد يؤثر في ثبات السن إذا لم يعالج.",
      why: "قد يظهر عند وجود نزيف متكرر أو حركة في الأسنان أو علامات التهاب مستمرة.",
      nextStep: "احجز مراجعة في عيادة التشخيص وعلاج اللثة لتقييم مستوى الالتهاب ووضع خطة علاج مناسبة.",
      evidence: "وجود أعراض لثوية مستمرة يجعل مراجعة الطبيب مهمة للتأكد من الحالة.",
    },
    en: {
      meaning: "A deeper inflammation around the teeth that can affect tooth support if it is not treated.",
      why: "This may be suggested with repeated bleeding, loose teeth, or ongoing gum inflammation signs.",
      nextStep: "Book with the oral diagnosis and periodontology clinic to assess inflammation level and choose the right treatment plan.",
      evidence: "Ongoing gum symptoms make clinical confirmation important.",
    },
  },
  root_canal: {
    ar: {
      meaning: "قد يكون الألم مرتبطًا بتهيج أو التهاب في عصب السن، وهو ما قد يحتاج تقييمًا سريعًا.",
      why: "يظهر هذا التقييم عادة مع ألم شديد أو مستمر أو ألم يزداد مع الحرارة أو البرودة.",
      nextStep: "احجز في عيادة طب وجراحة الجذور لتحديد هل يحتاج السن علاج عصب.",
      evidence: "طبيعة الألم الموصوفة قد تكون مرتبطة بعصب السن.",
    },
    en: {
      meaning: "The pain may be related to irritation or inflammation of the tooth nerve and may need prompt assessment.",
      why: "This is often suggested with severe, persistent, or temperature-triggered tooth pain.",
      nextStep: "Book with the endodontics clinic to check whether root canal treatment is needed.",
      evidence: "The pain pattern may be linked to the tooth nerve.",
    },
  },
  pulpitis: {
    ar: {
      meaning: "تهيج أو التهاب في عصب السن، وقد يسبب ألمًا شديدًا أو مستمرًا ويحتاج تقييمًا سريعًا.",
      why: "قد يظهر مع ألم نابض أو ألم يستمر بعد زوال المؤثر مثل البرودة أو الحرارة.",
      nextStep: "راجع طبيب الأسنان قريبًا لتحديد سبب التهاب العصب وخطة العلاج المناسبة.",
      evidence: "الأعراض المذكورة تتشابه مع علامات تهيج عصب السن.",
    },
    en: {
      meaning: "Irritation or inflammation of the tooth nerve that can cause severe or persistent pain and needs prompt evaluation.",
      why: "This may appear with throbbing pain or pain that continues after cold or heat is removed.",
      nextStep: "See a dentist soon to confirm the nerve condition and choose the right treatment.",
      evidence: "The reported symptoms resemble tooth nerve irritation signs.",
    },
  },
  abscess: {
    ar: {
      meaning: "تجمع صديد مرتبط بعدوى، ويحتاج مراجعة عاجلة لتجنب انتشار الالتهاب.",
      why: "قد يظهر عند وجود تورم أو ألم شديد أو علامات عدوى حول السن أو اللثة.",
      nextStep: "احجز موعدًا عاجلًا، وإذا كان هناك تورم شديد أو حرارة أو صعوبة بلع فاطلب رعاية طارئة.",
      evidence: "وجود ألم مع تورم أو علامات عدوى يجعل التقييم العاجل ضروريًا.",
    },
    en: {
      meaning: "A pocket of pus related to infection that needs urgent review to prevent spread.",
      why: "This may be suggested with swelling, severe pain, or infection signs around a tooth or gum.",
      nextStep: "Book urgent care; if swelling is severe or you have fever or swallowing difficulty, seek emergency care.",
      evidence: "Pain with swelling or infection signs makes urgent assessment important.",
    },
  },
  impacted_wisdom_tooth: {
    ar: {
      meaning: "سن لم يخرج بشكل طبيعي وقد يسبب ألمًا أو ضغطًا أو التهابًا حوله.",
      why: "قد يظهر هذا التقييم عند وجود ألم خلفي في الفك أو ضغط أو التهاب حول ضرس العقل.",
      nextStep: "راجع عيادة جراحة الفم لتقييم الضرس وصورة الأشعة إن لزم الأمر.",
      evidence: "مكان الألم ووصفه قد يتوافقان مع مشكلة في ضرس العقل.",
    },
    en: {
      meaning: "A tooth that has not erupted normally and may cause pain, pressure, or inflammation around it.",
      why: "This may be suggested with back-jaw pain, pressure, or inflammation around a wisdom tooth.",
      nextStep: "Visit oral surgery for examination and X-ray review if needed.",
      evidence: "The pain location and description may fit a wisdom tooth problem.",
    },
  },
  extraction: {
    ar: {
      meaning: "قد تكون هناك مشكلة متقدمة في السن تجعل الطبيب يقيّم هل يمكن علاجه أو يحتاج خلعًا.",
      why: "يظهر هذا الاحتمال عندما تكون الأعراض شديدة أو عندما تبدو حالة السن بحاجة لتدخل أكبر.",
      nextStep: "لا تفترض أن الخلع مؤكد؛ احجز فحصًا ليقرر الطبيب أفضل خيار آمن.",
      evidence: "التقييم يشير إلى احتمال يحتاج قرارًا سريريًا بعد الفحص.",
    },
    en: {
      meaning: "There may be an advanced tooth problem, so the doctor needs to decide whether it can be treated or may need removal.",
      why: "This may appear when symptoms are severe or the tooth may need a more involved intervention.",
      nextStep: "Do not assume extraction is final; book an exam so the doctor can choose the safest option.",
      evidence: "This finding needs a clinical decision after examination.",
    },
  },
  tooth_sensitivity: {
    ar: {
      meaning: "حساسية في السن قد تظهر مع البارد أو الساخن أو الحلويات، وقد تكون بسبب تآكل أو تسوس أو انكشاف جزء من السن.",
      why: "قد يظهر هذا التقييم عندما تكون الشكوى مرتبطة بالحساسية أكثر من الألم المستمر.",
      nextStep: "راجع الطبيب لتحديد السبب وتجنب استخدام علاجات عشوائية قبل الفحص.",
      evidence: "وصف الحساسية يدعم احتمال وجود تهيج أو انكشاف في السن.",
    },
    en: {
      meaning: "Tooth sensitivity can appear with cold, heat, or sweets and may be caused by wear, decay, or exposed tooth surfaces.",
      why: "This may be suggested when the complaint is sensitivity rather than continuous pain.",
      nextStep: "See a dentist to identify the cause before using random treatments.",
      evidence: "The sensitivity pattern supports possible tooth surface irritation or exposure.",
    },
  },
};

const conditionAliasMap: Record<string, string> = {
  caries: "dental_caries",
  cavity: "dental_caries",
  decay: "dental_caries",
  "تسوس": "dental_caries",
  gingivitis: "gingivitis",
  gum: "gingivitis",
  "التهاب اللثة": "gingivitis",
  periodontitis: "periodontitis",
  pulpitis: "pulpitis",
  nerve: "pulpitis",
  "عصب": "root_canal",
  root_canal: "root_canal",
  endodontic: "root_canal",
  abscess: "abscess",
  infection: "abscess",
  "خراج": "abscess",
  impacted: "impacted_wisdom_tooth",
  wisdom: "impacted_wisdom_tooth",
  "ضرس العقل": "impacted_wisdom_tooth",
  extraction: "extraction",
  "خلع": "extraction",
  sensitivity: "tooth_sensitivity",
  "حساسية": "tooth_sensitivity",
};

const resolveExplanationKey = (condition: DiagnosisCondition | undefined) => {
  if (!condition) return "";
  const identity = `${condition.conditionKey || ""} ${condition.name || ""} ${condition.nameEn || ""}`.toLowerCase();
  if (condition.conditionKey && conditionExplanationMap[condition.conditionKey]) return condition.conditionKey;
  const match = Object.entries(conditionAliasMap).find(([alias]) => identity.includes(alias.toLowerCase()));
  return match?.[1] || "";
};

const getPatientExplanation = (
  condition: DiagnosisCondition | undefined,
  language: "ar" | "en",
): PatientExplanation => {
  const key = resolveExplanationKey(condition);
  const mapped = key ? conditionExplanationMap[key]?.[language] : undefined;
  if (mapped) return mapped;

  const cleanDescription = condition?.description ? truncateClinicalText(condition.description, 150) : "";

  return language === "ar"
    ? {
        meaning: "هذه إشارة أولية إلى مشكلة في الأسنان أو اللثة تحتاج فحصًا مباشرًا للتأكد منها.",
        why: cleanDescription || "ظهر هذا التقييم بناءً على الأعراض والمعلومات التي أدخلتها.",
        nextStep: "احجز موعدًا مع العيادة المقترحة ليؤكد الطبيب الحالة ويشرح خيارات العلاج.",
        evidence: cleanDescription || "الأعراض الحالية تحتاج مراجعة سريرية قبل اعتبارها تشخيصًا نهائيًا.",
      }
    : {
        meaning: "This is an initial sign of a tooth or gum problem that needs direct examination to confirm.",
        why: cleanDescription || "This was suggested from the symptoms and information you entered.",
        nextStep: "Book with the recommended clinic so the doctor can confirm the case and explain treatment options.",
        evidence: cleanDescription || "The current symptoms need clinical review before they can be treated as a final diagnosis.",
      };
};

const truncateClinicalText = (text: string, maxLength = 230) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const firstSentence = clean.match(/^(.+?[.!؟。])\s/)?.[1];
  if (firstSentence && firstSentence.length <= maxLength) return firstSentence;
  return `${clean.slice(0, maxLength).trim()}...`;
};

const extractAffectedTooth = (conditions: DiagnosisCondition[]) => {
  const text = conditions
    .map((condition) => `${condition.name} ${condition.nameEn || ""} ${condition.description || ""}`)
    .join(" ");
  const match = text.match(/(?:tooth|teeth|سن|السن|رقم)\s*(?:number|no\.?|#|رقم)?\s*[:#-]?\s*(\d{1,2})/i);
  return match?.[1] || null;
};

const toothLabelByNumber: Record<string, { ar: string; en: string }> = {
  "16": {
    ar: "الضرس العلوي الأيمن الأول — رقم 16",
    en: "Upper right first molar — tooth 16",
  },
};

const formatAffectedTooth = (value: string | null | undefined, language: "ar" | "en") => {
  const cleaned = cleanGeneratedText(value);
  if (!cleaned) return "";

  const toothNumber = cleaned.match(/\d{1,2}/)?.[0] || "";
  const mapped = toothNumber ? toothLabelByNumber[toothNumber]?.[language] : "";
  if (mapped) return mapped;

  if (language === "ar") {
    if (/^\d{1,2}$/.test(cleaned)) return `السن المتأثر — رقم ${cleaned}`;
    return cleaned.replace(/\s*[،,]\s*رقم\s*/g, " — رقم ");
  }

  if (/^\d{1,2}$/.test(cleaned)) return `Tooth ${cleaned}`;
  return cleaned.replace(/#\s*(\d{1,2})/g, "tooth $1");
};

const getGeneratedFindingIdentity = (finding: DiagnosisOtherFinding) =>
  cleanGeneratedText(finding.condition).toLowerCase().replace(/\s+/g, " ").trim();

const buildSupportingFindings = (
  result: DiagnosisResult,
  primaryCondition: DiagnosisCondition | undefined,
  language: "ar" | "en",
) => {
  const affectedTooth = extractAffectedTooth(result.conditions);
  const combinedText = result.conditions
    .map((condition) => `${condition.description || ""} ${condition.name} ${condition.nameEn || ""}`)
    .join(" ")
    .toLowerCase();
  const hasRadiographicFinding = /x-ray|xray|radiograph|radiographic|شعاع|أشعة|اشعة|صورة/.test(combinedText);
  const affectedToothLabel = formatAffectedTooth(affectedTooth, language);

  const findings = [
    result.urgency === "high"
      ? (language === "ar" ? "أعراض تستدعي مراجعة عاجلة" : "Symptoms require urgent dental review")
      : (language === "ar" ? "مؤشرات تحتاج تقييمًا سريريًا" : "Findings require clinical assessment"),
    affectedToothLabel
      ? (language === "ar" ? `السن المتأثر: ${affectedToothLabel}` : `Affected tooth: ${affectedToothLabel}`)
      : null,
    hasRadiographicFinding
      ? (language === "ar" ? "علامات شعاعية داعمة" : "Supporting radiographic signs")
      : (language === "ar" ? "البيانات الحالية تدعم التقييم الأولي" : "Current information supports the preliminary assessment"),
    primaryCondition?.conditionKey
      ? (language === "ar" ? "مرتبط بالشكوى الأساسية للمريض" : "Aligned with the patient's main complaint")
      : null,
    language === "ar"
      ? "توجد بيانات كافية لتوجيه الحالة للعيادة المناسبة"
      : "There is enough information to guide the case to the appropriate clinic",
  ].filter((item): item is string => !!item?.trim());

  return Array.from(new Set(findings.map((item) => item.trim()))).slice(0, 4);
};

const diagnosisQuestions: Question[] = [
  {
    id: "pain_location",
    question: "أين تشعر بالألم؟",
    questionEn: "Where do you feel the pain?",
    type: "radio",
    options: [
      { value: "upper_right", label: "الفك العلوي الأيمن", labelEn: "Upper Right Jaw" },
      { value: "upper_left", label: "الفك العلوي الأيسر", labelEn: "Upper Left Jaw" },
      { value: "lower_right", label: "الفك السفلي الأيمن", labelEn: "Lower Right Jaw" },
      { value: "lower_left", label: "الفك السفلي الأيسر", labelEn: "Lower Left Jaw" },
      { value: "all", label: "الفم بالكامل", labelEn: "Entire Mouth" },
      { value: "gums", label: "اللثة فقط", labelEn: "Gums Only" },
      { value: "none", label: "لا يوجد ألم", labelEn: "No Pain" },
    ],
  },
  {
    id: "pain_type",
    question: "ما نوع الألم الذي تشعر به؟",
    questionEn: "What type of pain do you feel?",
    type: "radio",
    options: [
      { value: "sharp", label: "ألم حاد ومفاجئ", labelEn: "Sharp and Sudden" },
      { value: "dull", label: "ألم خفيف ومستمر", labelEn: "Dull and Continuous" },
      { value: "throbbing", label: "ألم نابض", labelEn: "Throbbing Pain" },
      { value: "sensitivity", label: "حساسية للبرودة/الحرارة", labelEn: "Cold/Heat Sensitivity" },
      { value: "pressure", label: "ألم عند الضغط أو المضغ", labelEn: "Pain When Pressing/Chewing" },
      { value: "night_pain", label: "ألم يزداد ليلاً", labelEn: "Pain Worsens at Night" },
    ],
  },
  {
    id: "pain_duration",
    question: "منذ متى وأنت تعاني من هذا الألم؟",
    questionEn: "How long have you been experiencing this pain?",
    type: "radio",
    options: [
      { value: "today", label: "اليوم فقط", labelEn: "Today Only" },
      { value: "days", label: "منذ عدة أيام", labelEn: "Several Days" },
      { value: "week", label: "منذ أسبوع", labelEn: "One Week" },
      { value: "weeks", label: "منذ عدة أسابيع", labelEn: "Several Weeks" },
      { value: "months", label: "منذ شهر أو أكثر", labelEn: "One Month or More" },
    ],
  },
  {
    id: "pain_intensity",
    question: "ما شدة الألم من 1 إلى 10؟",
    questionEn: "What is the pain intensity from 1 to 10?",
    type: "scale",
  },
  {
    id: "symptoms",
    question: "هل تعاني من أي من الأعراض التالية؟",
    questionEn: "Do you experience any of the following symptoms?",
    type: "radio",
    options: [
      { value: "bleeding", label: "نزيف في اللثة", labelEn: "Gum Bleeding" },
      { value: "swelling", label: "تورم في الوجه أو اللثة", labelEn: "Face or Gum Swelling" },
      { value: "bad_breath", label: "رائحة فم كريهة", labelEn: "Bad Breath" },
      { value: "loose_tooth", label: "أسنان متحركة", labelEn: "Loose Teeth" },
      { value: "discoloration", label: "تغير لون السن", labelEn: "Tooth Discoloration" },
      { value: "pus", label: "خراج أو صديد", labelEn: "Abscess or Pus" },
      { value: "none", label: "لا شيء مما سبق", labelEn: "None of the Above" },
    ],
  },
  {
    id: "oral_hygiene",
    question: "كم مرة تنظف أسنانك يومياً؟",
    questionEn: "How many times do you brush your teeth daily?",
    type: "radio",
    options: [
      { value: "rarely", label: "نادراً", labelEn: "Rarely" },
      { value: "once", label: "مرة واحدة", labelEn: "Once" },
      { value: "twice", label: "مرتين", labelEn: "Twice" },
      { value: "three_plus", label: "ثلاث مرات أو أكثر", labelEn: "Three or More" },
    ],
  },
  {
    id: "bruxism",
    question: "هل تصرّ على أسنانك أثناء النوم أو خلال اليوم؟",
    questionEn: "Do you grind your teeth while sleeping or during the day?",
    type: "radio",
    options: [
      { value: "yes_sleep", label: "نعم، أثناء النوم", labelEn: "Yes, While Sleeping" },
      { value: "yes_day", label: "نعم، خلال اليوم", labelEn: "Yes, During the Day" },
      { value: "yes_both", label: "نعم، كلاهما", labelEn: "Yes, Both" },
      { value: "no", label: "لا", labelEn: "No" },
      { value: "not_sure", label: "لست متأكداً", labelEn: "Not Sure" },
    ],
  },
  {
    id: "previous_treatment",
    question: "هل تلقيت علاج أسنان سابق؟",
    questionEn: "Have you received previous dental treatment?",
    type: "radio",
    options: [
      { value: "filling", label: "حشوات", labelEn: "Fillings" },
      { value: "extraction", label: "خلع أسنان", labelEn: "Tooth Extraction" },
      { value: "root_canal", label: "علاج عصب", labelEn: "Root Canal" },
      { value: "orthodontics", label: "تقويم أسنان", labelEn: "Orthodontics" },
      { value: "cleaning", label: "تنظيف أسنان", labelEn: "Teeth Cleaning" },
      { value: "none", label: "لم أتلق علاج سابق", labelEn: "No Previous Treatment" },
    ],
  },
  {
    id: "age_group",
    question: "ما فئتك العمرية؟",
    questionEn: "What is your age group?",
    type: "radio",
    options: [
      { value: "child", label: "أقل من 12 سنة", labelEn: "Under 12 Years" },
      { value: "teen", label: "12-18 سنة", labelEn: "12-18 Years" },
      { value: "adult", label: "19-40 سنة", labelEn: "19-40 Years" },
      { value: "middle", label: "41-60 سنة", labelEn: "41-60 Years" },
      { value: "senior", label: "أكثر من 60 سنة", labelEn: "Over 60 Years" },
    ],
  },
  {
    id: "smoking",
    question: "هل تدخن أو تستخدم التبغ؟",
    questionEn: "Do you smoke or use tobacco?",
    type: "radio",
    options: [
      { value: "yes_cigarettes", label: "نعم، سجائر", labelEn: "Yes, Cigarettes" },
      { value: "yes_shisha", label: "نعم، شيشة", labelEn: "Yes, Shisha" },
      { value: "yes_both", label: "نعم، كلاهما", labelEn: "Yes, Both" },
      { value: "former", label: "مدخن سابق", labelEn: "Former Smoker" },
      { value: "no", label: "لا أدخن", labelEn: "Non-Smoker" },
    ],
  },
  {
    id: "medical_history",
    question: "هل لديك أي حالات طبية سابقة؟",
    questionEn: "Do you have any previous medical conditions?",
    type: "radio",
    options: [
      { value: "diabetes", label: "مرض السكري", labelEn: "Diabetes" },
      { value: "heart", label: "أمراض القلب", labelEn: "Heart Disease" },
      { value: "blood_pressure", label: "ضغط الدم", labelEn: "Blood Pressure" },
      { value: "allergy", label: "حساسية من الأدوية", labelEn: "Drug Allergy" },
      { value: "pregnancy", label: "حمل", labelEn: "Pregnancy" },
      { value: "none", label: "لا توجد حالات سابقة", labelEn: "No Previous Conditions" },
    ],
  },
  {
    id: "concern_type",
    question: "ما هو الهدف الرئيسي من زيارتك؟",
    questionEn: "What is the main purpose of your visit?",
    type: "radio",
    options: [
      { value: "pain_relief", label: "التخلص من الألم", labelEn: "Pain Relief" },
      { value: "cosmetic", label: "تحسين المظهر الجمالي", labelEn: "Cosmetic Improvement" },
      { value: "checkup", label: "فحص روتيني", labelEn: "Routine Checkup" },
      { value: "replacement", label: "تعويض أسنان مفقودة", labelEn: "Replace Missing Teeth" },
      { value: "alignment", label: "تقويم الأسنان", labelEn: "Teeth Alignment" },
      { value: "cleaning", label: "تنظيف الأسنان", labelEn: "Teeth Cleaning" },
    ],
  },
  {
    id: "additional_notes",
    question: "هل هناك أي معلومات إضافية تريد إضافتها؟",
    questionEn: "Is there any additional information you would like to add?",
    type: "text",
  },
];

export default function AIDiagnosisPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem("ai_diagnosis_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const saved = sessionStorage.getItem("ai_diagnosis_answers");
    return saved ? JSON.parse(saved) : {};
  });
  const [xrayImage, setXrayImage] = useState<File | null>(null);
  const [xrayPreview, setXrayPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(() => {
    const saved = sessionStorage.getItem("ai_diagnosis_result");
    return saved ? normalizeDiagnosisResultScores(JSON.parse(saved)) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem("ai_diagnosis_result");
    return saved ? "result" : "questions";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sessionStorage.setItem("ai_diagnosis_step", currentStep.toString());
  }, [currentStep]);

  useEffect(() => {
    sessionStorage.setItem("ai_diagnosis_answers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    if (diagnosisResult) {
      sessionStorage.setItem("ai_diagnosis_result", JSON.stringify(diagnosisResult));
    } else {
      sessionStorage.removeItem("ai_diagnosis_result");
    }
  }, [diagnosisResult]);

  const startNewDiagnosis = () => {
    sessionStorage.removeItem("ai_diagnosis_step");
    sessionStorage.removeItem("ai_diagnosis_answers");
    sessionStorage.removeItem("ai_diagnosis_result");
    setCurrentStep(0);
    setAnswers({});
    setDiagnosisResult(null);
    setXrayImage(null);
    setXrayPreview(null);
    setActiveTab("questions");
  };

  const translations = {
    ar: {
      title: "التشخيص الذكي بالذكاء الاصطناعي",
      subtitle: "أجب على الأسئلة وارفع صورة الأشعة للحصول على تشخيص مبدئي",
      questionsTab: "الأسئلة",
      xrayTab: "صورة الأشعة",
      resultTab: "النتيجة",
      next: "التالي",
      previous: "السابق",
      analyze: "تحليل بالذكاء الاصطناعي",
      analyzing: "جاري التحليل...",
      uploadXray: "رفع صورة الأشعة",
      dragDrop: "اسحب وأفلت الصورة هنا أو اضغط للاختيار",
      supportedFormats: "الصيغ المدعومة: JPG, PNG, DICOM",
      maxSize: "الحجم الأقصى: 10 ميجابايت",
      removeImage: "إزالة الصورة",
      progress: "التقدم",
      questionOf: "السؤال",
      of: "من",
      diagnosisResult: "نتيجة التشخيص",
      possibleConditions: "الحالات المحتملة",
      recommendations: "التوصيات",
      urgency: "درجة الاستعجال",
      confidence: "نسبة الثقة",
      disclaimer: "تنويه: هذا التشخيص مبدئي ولا يغني عن استشارة الطبيب المختص",
      bookAppointment: "حجز موعد",
      downloadReport: "تحميل التقرير",
      shareResult: "مشاركة النتيجة",
      printResult: "طباعة",
      startOver: "بدء من جديد",
      high: "عالية",
      medium: "متوسطة",
      low: "منخفضة",
      enterAnswer: "أدخل إجابتك هنا...",
      painScale: "مقياس الألم",
      noPain: "لا ألم",
      severePain: "ألم شديد",
      suggestedClinicTitle: "العيادة المقترحة",
      bookAtClinic: "احجز موعد في هذه العيادة",
      basedOnDiagnosis: "بناءً على التشخيص، ننصحك بزيارة:",
    },
    en: {
      title: "AI-Powered Diagnosis",
      subtitle: "Answer the questions and upload your X-ray for a preliminary diagnosis",
      questionsTab: "Questions",
      xrayTab: "X-Ray Image",
      resultTab: "Result",
      next: "Next",
      previous: "Previous",
      analyze: "Analyze with AI",
      analyzing: "Analyzing...",
      uploadXray: "Upload X-Ray",
      dragDrop: "Drag and drop image here or click to select",
      supportedFormats: "Supported formats: JPG, PNG, DICOM",
      maxSize: "Maximum size: 10MB",
      removeImage: "Remove Image",
      progress: "Progress",
      questionOf: "Question",
      of: "of",
      diagnosisResult: "Diagnosis Result",
      possibleConditions: "Possible Conditions",
      recommendations: "Recommendations",
      urgency: "Urgency Level",
      confidence: "Confidence",
      disclaimer: "Disclaimer: This is a preliminary diagnosis and does not replace professional medical advice",
      bookAppointment: "Book Appointment",
      downloadReport: "Download Report",
      shareResult: "Share Result",
      printResult: "Print",
      startOver: "Start Over",
      high: "High",
      medium: "Medium",
      low: "Low",
      enterAnswer: "Enter your answer here...",
      painScale: "Pain Scale",
      noPain: "No Pain",
      severePain: "Severe Pain",
      suggestedClinicTitle: "Suggested Clinic",
      bookAtClinic: "Book Appointment at This Clinic",
      basedOnDiagnosis: "Based on the diagnosis, we recommend visiting:",
    },
  };

  const t = translations[language];

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert(language === "ar" ? "الملف كبير جداً. الحد الأقصى 10 ميجابايت" : "File too large. Maximum 10MB");
        return;
      }
      setXrayImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setXrayPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.name.endsWith(".dcm"))) {
      setXrayImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setXrayPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setXrayImage(null);
    setXrayPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatSymptomsForAI = () => {
    let summary = "";
    diagnosisQuestions.forEach(q => {
      const answer = answers[q.id];
      if (answer) {
        const questionText = language === "ar" ? q.question : q.questionEn;
        let answerText = answer;

        if (q.options) {
          const option = q.options.find(o => o.value === answer);
          if (option) {
            answerText = language === "ar" ? option.label : option.labelEn;
          }
        }

        summary += `${questionText}: ${answerText}\n`;
      }
    });
    return summary;
  };

  const analyzeDiagnosis = (userAnswers: Record<string, string>) => {
    const conditionScores: Record<string, number> = {
      dental_caries: 0,
      gingivitis: 0,
      tooth_sensitivity: 0,
      root_canal: 0,
      extraction: 0,
      orthodontic: 0,
      cosmetic: 0,
      implant: 0,
      pediatric: 0,
      periodontitis: 0,
      dentures: 0,
      crowns: 0,
    };

    if (userAnswers.pain_type === "sharp" || userAnswers.pain_type === "throbbing") {
      conditionScores.dental_caries += 30;
      conditionScores.root_canal += 25;
    }
    if (userAnswers.pain_type === "sensitivity") {
      conditionScores.tooth_sensitivity += 40;
      conditionScores.dental_caries += 15;
    }
    if (userAnswers.pain_type === "night_pain") {
      conditionScores.root_canal += 35;
    }

    if (userAnswers.symptoms === "bleeding") {
      conditionScores.gingivitis += 40;
      conditionScores.periodontitis += 30;
    }
    if (userAnswers.symptoms === "swelling" || userAnswers.symptoms === "pus") {
      conditionScores.root_canal += 30;
      conditionScores.extraction += 25;
    }
    if (userAnswers.symptoms === "loose_tooth") {
      conditionScores.periodontitis += 35;
      conditionScores.extraction += 20;
    }
    if (userAnswers.symptoms === "discoloration") {
      conditionScores.dental_caries += 25;
      conditionScores.cosmetic += 20;
    }

    if (userAnswers.pain_location === "gums") {
      conditionScores.gingivitis += 25;
      conditionScores.periodontitis += 20;
    }

    const painIntensity = parseInt(userAnswers.pain_intensity || "0");
    if (painIntensity >= 8) {
      conditionScores.root_canal += 20;
      conditionScores.extraction += 15;
    }

    if (userAnswers.pain_duration === "months") {
      conditionScores.periodontitis += 15;
      conditionScores.root_canal += 10;
    }

    if (userAnswers.concern_type === "cosmetic") {
      conditionScores.cosmetic += 50;
    }
    if (userAnswers.concern_type === "alignment") {
      conditionScores.orthodontic += 50;
    }
    if (userAnswers.concern_type === "replacement") {
      conditionScores.implant += 30;
      conditionScores.dentures += 25;
      conditionScores.crowns += 20;
    }
    if (userAnswers.concern_type === "cleaning") {
      conditionScores.gingivitis += 20;
    }

    if (userAnswers.age_group === "child") {
      conditionScores.pediatric += 40;
    }
    if (userAnswers.age_group === "senior") {
      conditionScores.dentures += 15;
      conditionScores.periodontitis += 10;
    }

    if (userAnswers.smoking === "yes_cigarettes" || userAnswers.smoking === "yes_shisha" || userAnswers.smoking === "yes_both") {
      conditionScores.periodontitis += 15;
      conditionScores.cosmetic += 10;
    }

    if (userAnswers.oral_hygiene === "rarely") {
      conditionScores.dental_caries += 20;
      conditionScores.gingivitis += 15;
    }

    if (userAnswers.bruxism === "yes_sleep" || userAnswers.bruxism === "yes_day" || userAnswers.bruxism === "yes_both") {
      conditionScores.tooth_sensitivity += 20;
      conditionScores.crowns += 15;
    }

    if (userAnswers.previous_treatment === "root_canal") {
      conditionScores.crowns += 20;
    }
    if (userAnswers.previous_treatment === "extraction") {
      conditionScores.implant += 25;
      conditionScores.dentures += 20;
    }

    const sortedConditions = Object.entries(conditionScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const maxScore = Math.max(...Object.values(conditionScores), 1);

    return sortedConditions.map(([key, score]) => ({
      conditionKey: key,
      probability: Math.min(Math.round((score / maxScore) * 100), 95),
    }));
  };

  const getConditionDetails = (conditionKey: string) => {
    const conditions: Record<string, { nameAr: string; nameEn: string; descAr: string; descEn: string }> = {
      dental_caries: { nameAr: "تسوس الأسنان", nameEn: "Dental Caries", descAr: "تسوس يحتاج إلى حشو أو علاج تحفظي", descEn: "Cavity requiring filling or conservative treatment" },
      gingivitis: { nameAr: "التهاب اللثة", nameEn: "Gingivitis", descAr: "التهاب في اللثة يمكن علاجه بالتنظيف", descEn: "Gum inflammation treatable with cleaning" },
      tooth_sensitivity: { nameAr: "حساسية الأسنان", nameEn: "Tooth Sensitivity", descAr: "حساسية للبرودة والحرارة", descEn: "Sensitivity to cold and heat" },
      root_canal: { nameAr: "علاج العصب", nameEn: "Root Canal", descAr: "يحتاج إلى علاج عصب السن", descEn: "Requires root canal treatment" },
      extraction: { nameAr: "خلع الأسنان", nameEn: "Tooth Extraction", descAr: "قد يحتاج السن إلى الخلع", descEn: "Tooth may need extraction" },
      orthodontic: { nameAr: "تقويم الأسنان", nameEn: "Orthodontics", descAr: "يحتاج إلى تقويم لترتيب الأسنان", descEn: "Needs braces for teeth alignment" },
      cosmetic: { nameAr: "تجميل الأسنان", nameEn: "Cosmetic Dentistry", descAr: "إجراءات تجميلية لتحسين المظهر", descEn: "Cosmetic procedures to improve appearance" },
      implant: { nameAr: "زراعة الأسنان", nameEn: "Dental Implant", descAr: "زراعة لتعويض الأسنان المفقودة", descEn: "Implant to replace missing teeth" },
      pediatric: { nameAr: "أسنان الأطفال والاحتياجات الخاصة", nameEn: "Pediatric and Special Care Dentistry", descAr: "رعاية أسنان خاصة بالأطفال وذوي الاحتياجات الخاصة", descEn: "Special dental care for children and special care patients" },
      periodontitis: { nameAr: "أمراض اللثة المتقدمة", nameEn: "Periodontitis", descAr: "التهاب متقدم في اللثة يحتاج علاج متخصص", descEn: "Advanced gum disease requiring specialized treatment" },
      dentures: { nameAr: "أطقم الأسنان", nameEn: "Dentures", descAr: "تركيبات متحركة لتعويض الأسنان", descEn: "Removable prosthetics to replace teeth" },
      crowns: { nameAr: "التيجان", nameEn: "Crowns", descAr: "تيجان ثابتة لحماية الأسنان", descEn: "Fixed crowns to protect teeth" },
    };
    return conditions[conditionKey] || conditions.dental_caries;
  };

  const getRecommendations = (primaryCondition: string, userAnswers: Record<string, string>) => {
    const baseRecs = {
      ar: ["زيارة طبيب الأسنان في أقرب وقت ممكن"],
      en: ["Visit a dentist as soon as possible"],
    };

    if (userAnswers.oral_hygiene === "rarely" || userAnswers.oral_hygiene === "once") {
      baseRecs.ar.push("تنظيف الأسنان مرتين يومياً على الأقل");
      baseRecs.en.push("Brush your teeth at least twice daily");
    }

    if (primaryCondition === "gingivitis" || primaryCondition === "periodontitis") {
      baseRecs.ar.push("استخدام غسول الفم المطهر", "المضمضة بالماء المالح");
      baseRecs.en.push("Use antiseptic mouthwash", "Rinse with salt water");
    }

    if (primaryCondition === "tooth_sensitivity") {
      baseRecs.ar.push("استخدام معجون أسنان للحساسية", "تجنب الأطعمة شديدة البرودة أو الحرارة");
      baseRecs.en.push("Use sensitivity toothpaste", "Avoid very cold or hot foods");
    }

    if (userAnswers.smoking && userAnswers.smoking !== "no") {
      baseRecs.ar.push("الإقلاع عن التدخين لتحسين صحة الفم");
      baseRecs.en.push("Quit smoking to improve oral health");
    }

    return language === "ar" ? baseRecs.ar : baseRecs.en;
  };

  const getUrgency = (conditions: { conditionKey: string; probability: number }[], painIntensity: number): DiagnosisResult["urgency"] => {
    const urgentConditions = ["root_canal", "extraction", "periodontitis"];
    const primaryCondition = conditions[0]?.conditionKey;

    if (painIntensity >= 8 || urgentConditions.includes(primaryCondition)) {
      return "high";
    }
    if (painIntensity >= 5 || conditions[0]?.probability >= 70) {
      return "medium";
    }
    return "low";
  };

  const runDiagnosis = async () => {
    setIsAnalyzing(true);
    setActiveTab("result");

    try {
      const response = await apiPost<any>('/v1/ai/diagnosis', {
        answers,
        symptomSummary: formatSymptomsForAI(),
        xrayImage: xrayPreview,
        language,
      });

      if (!response.success) {
        throw new Error('Failed to get diagnosis');
      }

      const aiResult = response.data;
      
      // Invalidate history query so it fetches the new record
      queryClient.invalidateQueries({ queryKey: ["diagnosisHistory"] });

      if ((Array.isArray(aiResult.conditions) && aiResult.conditions.length > 0) || aiResult.primaryCondition) {
        const aiConditions = Array.isArray(aiResult.conditions) ? aiResult.conditions : [];
        const primaryConditionKey = aiConditions[0]?.conditionKey || "dental_caries";
        const suggestedClinicInfo = clinicConditionMapping[primaryConditionKey] || clinicConditionMapping.dental_caries;

        const result = {
          primaryCondition: cleanGeneratedText(aiResult.primaryCondition),
          affectedTooth: cleanGeneratedText(aiResult.affectedTooth),
          patientExplanation: cleanGeneratedText(aiResult.patientExplanation),
          analysisIndicators: cleanGeneratedList(aiResult.analysisIndicators),
          recommendedAction: cleanGeneratedText(aiResult.recommendedAction),
          urgencyReason: cleanGeneratedText(aiResult.urgencyReason),
          conditions: aiConditions.map((cond: any) => ({
            name: cond.name,
            nameEn: cond.nameEn,
            conditionKey: cond.conditionKey,
            probability: normalizePercentScore(cond.probability),
            description: cond.description,
          })),
          recommendations: aiResult.recommendations || [],
          urgency: aiResult.urgency || "medium",
          confidence: normalizePercentScore(aiResult.confidence, 70),
          suggestedClinic: (() => {
            const rawSuggestedClinic = typeof aiResult.suggestedClinic === "string"
              ? aiResult.suggestedClinic
              : aiResult.suggestedClinic?.id ||
                aiResult.suggestedClinic?.nameAr ||
                aiResult.suggestedClinic?.nameEn ||
                aiResult.suggestedClinic?.name;
            const resolvedClinicSlug = resolveClinicSlug(rawSuggestedClinic);
            const canonicalClinic = typeof resolvedClinicSlug === "string"
              ? getClinicBySlug(resolvedClinicSlug)
              : undefined;

            if (canonicalClinic) {
              return {
                id: canonicalClinic.id,
                name: language === "ar" ? canonicalClinic.nameAr : canonicalClinic.nameEn,
                nameAr: canonicalClinic.nameAr,
                nameEn: canonicalClinic.nameEn,
              };
            }

            return {
              id: suggestedClinicInfo.clinicId,
              name: language === "ar" ? suggestedClinicInfo.clinicName : suggestedClinicInfo.clinicNameEn,
              nameAr: suggestedClinicInfo.clinicName,
              nameEn: suggestedClinicInfo.clinicNameEn,
            };
          })(),
          suggestedClinicReason: cleanGeneratedText(aiResult.suggestedClinicReason),
          otherFindings: Array.isArray(aiResult.otherFindings)
            ? aiResult.otherFindings
                .map((finding: DiagnosisOtherFinding) => ({
                  condition: cleanGeneratedText(finding.condition),
                  explanation: cleanGeneratedText(finding.explanation),
                  relationToCase: cleanGeneratedText(finding.relationToCase),
                  recommendedAction: cleanGeneratedText(finding.recommendedAction),
                }))
                .filter((finding: DiagnosisOtherFinding) => finding.condition)
            : [],
        };
        setDiagnosisResult(result);
      } else {
        throw new Error('No valid diagnosis returned from AI');
      }
    } catch (error) {
      console.error('AI Diagnosis error:', error);
      // Only use local fallback if specifically desired, for now let's show an error or a clearer fallback
      const analyzedConditions = analyzeDiagnosis(answers);
      const primaryCondition = analyzedConditions[0]?.conditionKey || "dental_caries";
      const suggestedClinicInfo = clinicConditionMapping[primaryCondition] || clinicConditionMapping.dental_caries;
      const painIntensity = parseInt(answers.pain_intensity || "0");

      const result = {
        conditions: analyzedConditions.map((cond) => {
          const details = getConditionDetails(cond.conditionKey);
          return {
            name: (language === "ar" ? details.nameAr : details.nameEn) + " (تحليل محلي)",
            nameEn: details.nameEn + " (Local Analysis)",
            conditionKey: cond.conditionKey,
            probability: normalizePercentScore(cond.probability),
            description: (language === "ar" ? details.descAr : details.descEn) + " - نعتذر، خدمة الذكاء الاصطناعي غير متوفرة حالياً.",
          };
        }),
        recommendations: getRecommendations(primaryCondition, answers),
        urgency: getUrgency(analyzedConditions, painIntensity),
        confidence: 0, // Mark as 0 to indicate it's not a real AI confidence
        suggestedClinic: {
          id: suggestedClinicInfo.clinicId,
          name: language === "ar" ? suggestedClinicInfo.clinicName : suggestedClinicInfo.clinicNameEn,
          nameAr: suggestedClinicInfo.clinicName,
          nameEn: suggestedClinicInfo.clinicNameEn,
        },
        isLocalFallback: true
      };
      setDiagnosisResult(result);
    }

    setIsAnalyzing(false);
  };

  const handleDownloadPDF = () => {
    if (!diagnosisResult) return;

    const reportContent = `
DENTO HEALTHCARE - AI DIAGNOSIS REPORT
${'='.repeat(50)}

Generated: ${new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
Patient: ${user?.fullName || user?.email || 'Unknown'}

DIAGNOSIS RESULTS
${'-'.repeat(50)}

Urgency Level: ${diagnosisResult.urgency.toUpperCase()}
Assessment Confidence: ${getConfidenceLabel(diagnosisResult.confidence, language)}

CONDITIONS DETECTED:
${diagnosisResult.conditions.map((c: DiagnosisCondition, i: number) => `
${i + 1}. ${language === 'ar' ? c.name : c.nameEn || c.name}
   ${c.description || ''}`).join('\n')}

RECOMMENDATIONS:
${diagnosisResult.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

${diagnosisResult.suggestedClinic ? `\nSUGGESTED CLINIC:\n${language === 'ar' ? diagnosisResult.suggestedClinic.nameAr : diagnosisResult.suggestedClinic.nameEn || diagnosisResult.suggestedClinic.name}\n` : ''}
DISCLAIMER:
${'-'.repeat(50)}
${diagnosisResult.disclaimer?.text || ''}

This is a preliminary AI-assisted assessment. Please consult
a licensed dental professional for proper medical advice.

${'='.repeat(50)}
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnosis-report-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!diagnosisResult) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(language === 'ar' ? 'الرجاء السماح بالنوافذ المنبثقة' : 'Please allow popups');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>AI Diagnosis Report</title>
        <style>
          @media print {
            body { margin: 0; padding: 20mm; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #0891b2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #0891b2;
            margin: 0 0 10px 0;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0891b2;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #e5e7eb;
          }
          .condition {
            background: #f3f4f6;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-${language === 'ar' ? 'right' : 'left'}: 4px solid #0891b2;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .recommendation {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .disclaimer {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
            font-size: 14px;
          }
          .urgency {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .urgency-high { background: #fee2e2; color: #991b1b; }
          .urgency-medium { background: #fef3c7; color: #92400e; }
          .urgency-low { background: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'تقرير التشخيص الذكي' : 'AI Diagnosis Report'}</h1>
          <p>${language === 'ar' ? 'نظام دينتو للرعاية الصحية' : 'Dento Healthcare System'}</p>
        </div>

        <div class="meta">
          <div><strong>${language === 'ar' ? 'التاريخ' : 'Date'}:</strong> ${new Date().toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</div>
          <div><strong>${language === 'ar' ? 'المريض' : 'Patient'}:</strong> ${user?.fullName || user?.email || 'Unknown'}</div>
        </div>

        <div class="section">
          <div class="section-title">${language === 'ar' ? 'ملخص النتائج' : 'Results Summary'}</div>
          <p>
            <strong>${language === 'ar' ? 'مستوى الأهمية' : 'Urgency'}:</strong> 
            <span class="urgency urgency-${diagnosisResult.urgency}">${diagnosisResult.urgency}</span>
          </p>
          <p><strong>${language === 'ar' ? 'مستوى الترجيح' : 'Assessment confidence'}:</strong> ${getConfidenceLabel(diagnosisResult.confidence, language)}</p>
        </div>

        <div class="section">
          <div class="section-title">${language === 'ar' ? 'الحالات المكتشفة' : 'Detected Conditions'}</div>
          ${diagnosisResult.conditions.map((c: DiagnosisCondition) => `
            <div class="condition">
              <strong>${language === 'ar' ? c.name : c.nameEn || c.name}</strong>
              ${c.description ? `<p>${c.description}</p>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <div class="section-title">${language === 'ar' ? 'التوصيات' : 'Recommendations'}</div>
          ${diagnosisResult.recommendations.map((r: string, i: number) => `
            <div class="recommendation">${i + 1}. ${r}</div>
          `).join('')}
        </div>

        ${diagnosisResult.suggestedClinic ? `
          <div class="section">
            <div class="section-title">${language === 'ar' ? 'العيادة المقترحة' : 'Suggested Clinic'}</div>
            <p>${language === 'ar' ? diagnosisResult.suggestedClinic.nameAr : diagnosisResult.suggestedClinic.nameEn || diagnosisResult.suggestedClinic.name}</p>
          </div>
        ` : ''}

        <div class="disclaimer">
          <strong>⚠️ ${language === 'ar' ? 'إخلاء مسؤولية هام' : 'Important Disclaimer'}:</strong>
          <p>${diagnosisResult.disclaimer?.text || (language === 'ar' ? 'هذا تقييم أولي بواسطة الذكاء الاصطناعي. يجب استشارة طبيب مرخص.' : 'This is a preliminary AI assessment. Please consult a licensed professional.')}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const currentQuestion = diagnosisQuestions[currentStep];
  const progress = ((currentStep + 1) / diagnosisQuestions.length) * 100;

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const questionText = language === "ar" ? currentQuestion.question : currentQuestion.questionEn;

    return (
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-sm">
            {t.questionOf} {currentStep + 1} {t.of} {diagnosisQuestions.length}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.progress}</span>
            <Progress value={progress} className="w-32 h-2" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-start">{questionText}</h3>

        {currentQuestion.type === "radio" && currentQuestion.options && (
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
            className="space-y-3"
          >
            {currentQuestion.options.map((option) => (
              <motion.div
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Label
                  htmlFor={option.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${answers[currentQuestion.id] === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                    }`}
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <span className="flex-1 text-start">
                    {language === "ar" ? option.label : option.labelEn}
                  </span>
                </Label>
              </motion.div>
            ))}
          </RadioGroup>
        )}

        {currentQuestion.type === "scale" && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t.noPain}</span>
              <span>{t.severePain}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <motion.button
                  key={num}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAnswer(currentQuestion.id, num.toString())}
                  className={`w-10 h-10 rounded-full font-bold transition-all ${answers[currentQuestion.id] === num.toString()
                    ? num <= 3
                      ? "bg-green-500 text-white"
                      : num <= 6
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    : "bg-muted hover:bg-muted/80"
                    }`}
                >
                  {num}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {currentQuestion.type === "text" && (
          <Textarea
            placeholder={t.enterAnswer}
            value={answers[currentQuestion.id] || ""}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            className="min-h-[120px]"
            data-testid="textarea-additional-notes"
          />
        )}
      </motion.div>
    );
  };

  const renderXrayUpload = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
          <ImageIcon className="w-6 h-6 text-primary" />
          {t.uploadXray}
        </h3>
        <p className="text-muted-foreground">{t.dragDrop}</p>
      </div>

      {!xrayPreview ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">{t.supportedFormats}</p>
          <p className="text-sm text-muted-foreground">{t.maxSize}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.dcm"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="input-xray-upload"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-xl overflow-hidden border-2 border-primary"
        >
          <img
            src={xrayPreview}
            alt="X-Ray"
            className="w-full h-64 object-contain bg-black"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 end-2"
            onClick={removeImage}
            data-testid="button-remove-xray"
          >
            <X className="w-4 h-4 me-1" />
            {t.removeImage}
          </Button>
          <div className="absolute bottom-2 start-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {xrayImage?.name}
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderResult = () => (
    <div className="space-y-6">
      {isAnalyzing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-6"
          >
            <Brain className="w-20 h-20 text-primary" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">{t.analyzing}</h3>
          <p className="text-muted-foreground">جاري تحليل البيانات والصورة بالذكاء الاصطناعي...</p>
          <Progress value={66} className="w-48 mx-auto mt-4" />
        </motion.div>
      ) : diagnosisResult ? (() => {
        const uniqueConditions = getUniqueConditions(diagnosisResult.conditions);
        const primaryCondition = uniqueConditions[0];
        const additionalConditions = uniqueConditions.slice(1);
        const urgencyInfo = getUrgencyInfo(diagnosisResult.urgency, language);
        const primaryConditionName = cleanGeneratedText(diagnosisResult.primaryCondition) || getConditionName(primaryCondition, language);
        const generatedIndicators = cleanGeneratedList(diagnosisResult.analysisIndicators);
        const supportingFindings = generatedIndicators.length > 0
          ? Array.from(new Set(generatedIndicators)).slice(0, 4)
          : buildSupportingFindings(diagnosisResult, primaryCondition, language);
        const clinicName = getClinicName(diagnosisResult.suggestedClinic, language);
        const fallbackPrimaryExplanation = getPatientExplanation(primaryCondition, language);
        const patientExplanation = cleanGeneratedText(diagnosisResult.patientExplanation) || fallbackPrimaryExplanation.meaning;
        const whySuggested = cleanGeneratedText(diagnosisResult.urgencyReason) || fallbackPrimaryExplanation.why;
        const recommendedAction = cleanGeneratedText(diagnosisResult.recommendedAction) || fallbackPrimaryExplanation.nextStep;
        const clinicReason = cleanGeneratedText(diagnosisResult.suggestedClinicReason);
        const affectedTooth = cleanGeneratedText(diagnosisResult.affectedTooth) || extractAffectedTooth(diagnosisResult.conditions);
        const affectedToothDisplay = formatAffectedTooth(affectedTooth, language);
        const primaryConditionIdentity = primaryConditionName.toLowerCase().replace(/\s+/g, " ").trim();
        const seenGeneratedFindings = new Set<string>();
        const generatedOtherFindings = Array.isArray(diagnosisResult.otherFindings)
          ? diagnosisResult.otherFindings
              .map((finding) => ({
                condition: cleanGeneratedText(finding.condition),
                explanation: cleanGeneratedText(finding.explanation),
                relationToCase: cleanGeneratedText(finding.relationToCase),
                recommendedAction: cleanGeneratedText(finding.recommendedAction),
              }))
              .filter((finding) => {
                const identity = getGeneratedFindingIdentity(finding);
                if (!identity || identity === primaryConditionIdentity || seenGeneratedFindings.has(identity)) return false;
                seenGeneratedFindings.add(identity);
                return true;
              })
          : [];
        const clinicSecondaryName = language === "ar"
          ? diagnosisResult.suggestedClinic?.nameEn || diagnosisResult.suggestedClinic?.name || ""
          : diagnosisResult.suggestedClinic?.nameAr || diagnosisResult.suggestedClinic?.name || "";

        return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white via-primary/5 to-sky-50 dark:from-card dark:via-primary/10 dark:to-slate-900">
            <CardContent className="p-6 md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {language === "ar" ? "تقرير تقييم سريري" : "Clinical Assessment Report"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {language === "ar" ? "نتيجة التشخيص الذكي" : "AI Diagnostic Assessment"}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-foreground/75">
                      {language === "ar"
                        ? "تقرير مبسط يوضح الحالة والمؤشرات والخطوة المناسبة"
                        : "A concise report showing the condition, indicators, and next step"}
                    </p>
                  </div>
                </div>
                <Button onClick={startNewDiagnosis} variant="outline" className="shrink-0 text-primary border-primary">
                  {language === "ar" ? "ابدأ تشخيص جديد" : "Start New Diagnosis"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-lg shadow-primary/10">
            <CardContent className="p-0">
              <div className="clinical-report-grid">
                <div className="clinical-report-primary space-y-5 p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1">
                      {language === "ar" ? "التقييم الأولي" : "Primary assessment"}
                    </Badge>
                    <Badge variant="outline" className={urgencyInfo.className}>
                      <AlertCircle className="h-3.5 w-3.5" />
                      {urgencyInfo.label}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
                      {primaryConditionName || (language === "ar" ? "نتيجة التشخيص" : "Diagnosis Result")}
                    </h2>
                    <p className="max-w-3xl text-base font-medium leading-7 text-foreground/80">
                      {language === "ar"
                        ? "يعرض هذا التقرير أهم ما ظهر في التحليل بطريقة مختصرة وواضحة."
                        : "This report summarizes the key assessment points in a clear, concise way."}
                    </p>
                    {whySuggested && (
                      <p className="max-w-3xl text-sm font-medium leading-6 text-foreground/75">
                        {whySuggested}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {affectedToothDisplay && (
                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold text-foreground/70">
                          {language === "ar" ? "السن المتأثر" : "Affected tooth"}
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground">
                          {affectedToothDisplay}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="clinical-report-clinic flex flex-col justify-between bg-primary/5 p-6 md:p-8 dark:bg-primary/10">
                  <div className="space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {language === "ar" ? "العيادة المقترحة" : "Recommended clinic"}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {clinicName || (language === "ar" ? "العيادة المختصة" : "Specialized clinic")}
                      </p>
                      {clinicSecondaryName && (
                        <p className="mt-1 text-sm font-medium text-foreground/75">{clinicSecondaryName}</p>
                      )}
                      {clinicReason && (
                        <p className="mt-4 text-sm font-medium leading-6 text-foreground/80">
                          {clinicReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    className="mt-6 w-full bg-primary hover:bg-primary/90"
                    onClick={() => setLocation(buildBookingUrl(diagnosisResult.suggestedClinic, language))}
                    data-testid="button-book-at-clinic"
                  >
                    <Calendar className="h-4 w-4 me-2" />
                    {t.bookAtClinic}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    {language === "ar" ? "شرح الحالة" : "Condition Explanation"}
                  </h3>
                </div>
                <p className="max-w-4xl font-medium leading-7 text-foreground/75">
                  {language === "ar"
                    ? "شرح مختصر للحالة الأساسية والمؤشرات المرتبطة بها."
                    : "A short explanation of the main condition and its related indicators."}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-sm font-medium leading-6 text-foreground/85">
                  {patientExplanation}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">
                    {language === "ar" ? "مؤشرات التحليل" : "Assessment Indicators"}
                  </h3>
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {supportingFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span className="text-sm font-medium leading-6 text-foreground/85">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">
                    {language === "ar" ? "الإجراء الموصى به" : "Recommended Action"}
                  </h3>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <p className="text-sm font-medium leading-6 text-foreground/85">
                    {recommendedAction}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(generatedOtherFindings.length > 0 || additionalConditions.length > 0) && (
            <Card className="border-0 bg-muted/25 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {language === "ar" ? "مشكلات إضافية ظهرت في التحليل" : "Additional Findings from the Analysis"}
                </CardTitle>
                <CardDescription className="font-medium text-foreground/70">
                  {language === "ar"
                    ? "نتائج ثانوية ظهرت بجانب النتيجة الأساسية."
                    : "Secondary findings that appeared alongside the main result."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedOtherFindings.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {generatedOtherFindings.map((finding) => (
                        <div
                          key={finding.condition}
                          className="rounded-xl border border-border/70 bg-background p-4"
                        >
                          <h4 className="font-semibold">{finding.condition}</h4>
                          {finding.explanation && (
                            <p className="mt-2 text-sm font-medium leading-6 text-foreground/80">
                              {finding.explanation}
                            </p>
                          )}
                          {finding.relationToCase && (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-medium leading-6 text-foreground/80 dark:bg-slate-900/60">
                              <span className="font-medium text-foreground">
                                {language === "ar" ? "ارتباطها بالحالة: " : "Relation to this case: "}
                              </span>
                              {finding.relationToCase}
                            </div>
                          )}
                          {finding.recommendedAction && (
                            <p className="mt-3 text-sm font-medium leading-6 text-foreground/80">
                              <span className="font-medium text-foreground">
                                {language === "ar" ? "الخطوة المناسبة: " : "Recommended action: "}
                              </span>
                              {finding.recommendedAction}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {additionalConditions.map((condition) => {
                      const explanation = getPatientExplanation(condition, language);
                      return (
                        <div
                          key={getConditionIdentity(condition)}
                          className="rounded-xl border border-border/70 bg-background p-4"
                        >
                          <h4 className="font-semibold">{getConditionName(condition, language)}</h4>
                          <p className="mt-2 text-sm font-medium leading-6 text-foreground/80">
                            {explanation.meaning}
                          </p>
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-medium leading-6 text-foreground/80 dark:bg-slate-900/60">
                            <span className="font-medium text-foreground">
                              {language === "ar" ? "سبب محتمل: " : "Possible reason: "}
                            </span>
                            {explanation.evidence}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="space-y-1 text-sm leading-6 text-amber-900 dark:text-amber-100">
                <p className="font-semibold">
                  {language === "ar" ? "تنبيه طبي" : "Medical Notice"}
                </p>
                <p>
                  {language === "ar"
                    ? "هذا تقييم أولي مدعوم بالذكاء الاصطناعي ولا يُعد تشخيصًا نهائيًا. يجب مراجعة الطبيب المختص لتأكيد الحالة."
                    : "This is an AI-assisted preliminary assessment and does not replace a final clinical diagnosis. A qualified doctor must review and confirm the case."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-3">
            <Button variant="outline" onClick={handleDownloadPDF} data-testid="button-download-report">
              <Download className="w-4 h-4 me-2" />
              {t.downloadReport}
            </Button>
            <Button variant="outline" data-testid="button-share-result">
              <Share2 className="w-4 h-4 me-2" />
              {t.shareResult}
            </Button>
            <Button variant="outline" onClick={handlePrint} data-testid="button-print-result">
              <Printer className="w-4 h-4 me-2" />
              {t.printResult}
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setDiagnosisResult(null);
              setAnswers({});
              setXrayImage(null);
              setXrayPreview(null);
              setCurrentStep(0);
              setActiveTab("questions");
            }}
            data-testid="button-start-over"
          >
            {t.startOver}
          </Button>
        </motion.div>
        );
      })() : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>أجب على الأسئلة وارفع صورة الأشعة للحصول على التشخيص</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
        <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2">
          <Zap className="w-4 h-4 me-2" />
          AI Powered
        </Badge>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="questions" className="flex items-center gap-2" data-testid="tab-questions">
                <MessageSquare className="w-4 h-4" />
                {t.questionsTab}
              </TabsTrigger>
              <TabsTrigger value="xray" className="flex items-center gap-2" data-testid="tab-xray">
                <ImageIcon className="w-4 h-4" />
                {t.xrayTab}
              </TabsTrigger>
              <TabsTrigger value="result" className="flex items-center gap-2" data-testid="tab-result">
                <Sparkles className="w-4 h-4" />
                {t.resultTab}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-0">
              <AnimatePresence mode="wait">
                {renderQuestion()}
              </AnimatePresence>

              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  data-testid="button-previous"
                >
                  <ArrowRight className="w-4 h-4 ms-2" />
                  {t.previous}
                </Button>

                {currentStep < diagnosisQuestions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!answers[currentQuestion?.id]}
                    data-testid="button-next"
                  >
                    {t.next}
                    <ArrowLeft className="w-4 h-4 me-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setActiveTab("xray")}
                    className="bg-primary"
                    data-testid="button-go-to-xray"
                  >
                    {t.uploadXray}
                    <ArrowLeft className="w-4 h-4 me-2" />
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="xray" className="mt-0">
              {renderXrayUpload()}

              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("questions")}
                  data-testid="button-back-to-questions"
                >
                  <ArrowRight className="w-4 h-4 ms-2" />
                  {t.previous}
                </Button>

                <Button
                  onClick={runDiagnosis}
                  disabled={Object.keys(answers).length < 3}
                  className="bg-gradient-to-r from-primary to-blue-600"
                  data-testid="button-analyze"
                >
                  <Brain className="w-4 h-4 me-2" />
                  {t.analyze}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="result" className="mt-0">
              {renderResult()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
