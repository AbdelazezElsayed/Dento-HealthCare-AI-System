import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  Hospital,
  Printer,
  RefreshCcw,
  Stethoscope,
  User,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PatientTreatmentPlan,
  TreatmentPlanAppointment,
  TreatmentPlanProcedure,
} from "@/hooks/usePatientTreatmentPlan";
import { getClinicDisplayName } from "@/constants/clinics";

type Language = "ar" | "en";
type PatientPlanStatus = "proposed" | "approved" | "needs_reevaluation";

interface PlanStep {
  id: string;
  title: string;
  description?: string;
  clinic?: string;
  expectedDate?: string;
  status?: string;
  notes?: string;
  toothOrCondition?: string;
}

interface PatientTreatmentPlanViewProps {
  plan: PatientTreatmentPlan;
  language: Language;
  patientName?: string;
  onBackClick?: () => void;
}

interface PlanStateProps {
  language: Language;
  onRetry?: () => void;
  onPrimaryAction?: () => void;
  onBackClick?: () => void;
}

const unknownLabel = (language: Language) => language === "ar" ? "غير محدد" : "Not specified";

function formatDate(value?: string, language: Language = "ar") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizePlanStatus(plan: PatientTreatmentPlan): PatientPlanStatus {
  if (
    plan.reviewStatus === "revision_requested" ||
    plan.reviewStatus === "rejected" ||
    plan.status === "needs_reevaluation" ||
    plan.status === "rejected"
  ) {
    return "needs_reevaluation";
  }
  if (plan.reviewStatus === "approved" || plan.status === "final" || plan.isFinal) return "approved";
  return "proposed";
}

function getPlanStatusContent(status: PatientPlanStatus, language: Language) {
  const content = {
    proposed: {
      title: language === "ar" ? "خطة علاجية مقترحة" : "Proposed Treatment Plan",
      message: language === "ar"
        ? "هذه الخطة تم إنشاؤها بمساعدة الذكاء الاصطناعي، وسيتم اعتمادها بعد مراجعة الطبيب."
        : "This plan was prepared with AI assistance and will be finalized after doctor review.",
      action: language === "ar"
        ? "لا يوجد إجراء مطلوب منك الآن. هذه الخطة غير معتمدة بعد."
        : "No action is required from you now. This plan is not approved yet.",
      banner: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
    },
    approved: {
      title: language === "ar" ? "خطة علاجية معتمدة" : "Approved Treatment Plan",
      message: language === "ar"
        ? "تمت مراجعة هذه الخطة واعتمادها من الطبيب."
        : "This plan has been reviewed and approved by the doctor.",
      action: language === "ar"
        ? "يمكنك متابعة مواعيدك العلاجية القادمة."
        : "You can continue following your upcoming treatment appointments.",
      banner: "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950/25 dark:text-green-100",
      badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    needs_reevaluation: {
      title: language === "ar" ? "تحتاج الحالة إلى إعادة تقييم" : "Case Needs Re-evaluation",
      message: language === "ar"
        ? "طلب الطبيب إعادة تقييم الحالة قبل اعتماد خطة علاجية نهائية."
        : "The doctor requested case re-evaluation before approving a final treatment plan.",
      action: language === "ar"
        ? "يرجى متابعة التشخيص أو انتظار توجيه الطبيب حسب الحالة."
        : "Please follow the diagnosis flow or wait for the doctor's next instruction.",
      banner: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/25 dark:text-red-100",
      badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  return content[status];
}

function getStepStatusLabel(status: string | undefined, language: Language) {
  switch (status) {
    case "completed":
    case "done":
      return language === "ar" ? "مكتمل" : "Completed";
    case "in-progress":
    case "in_progress":
      return language === "ar" ? "قيد التنفيذ" : "In progress";
    case "deferred":
      return language === "ar" ? "مؤجل" : "Deferred";
    case "scheduled":
    case "pending":
    default:
      return language === "ar" ? "مجدول" : "Scheduled";
  }
}

function getStepStatusClass(status: string | undefined) {
  if (status === "completed" || status === "done") {
    return "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-100";
  }
  if (status === "in-progress" || status === "in_progress") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-100";
  }
  if (status === "deferred") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100";
}

function clinicDisplayName(value: string | undefined, language: Language) {
  if (!value) return "";
  return getClinicDisplayName(value, language) || value;
}

function buildPlanSteps(plan: PatientTreatmentPlan, language: Language): PlanStep[] {
  const procedures = plan.procedures || [];
  const appointments = plan.appointments || [];

  const procedureSteps = procedures.map((procedure: TreatmentPlanProcedure, index: number): PlanStep => {
    const linkedAppointment = appointments[index];
    return {
      id: `procedure-${index}`,
      title: procedure.name || procedure.title || (language === "ar" ? "إجراء علاجي" : "Treatment step"),
      description: procedure.description,
      clinic: clinicDisplayName(procedure.clinic || procedure.department || linkedAppointment?.clinic, language),
      expectedDate: procedure.scheduledDate || linkedAppointment?.date,
      status: procedure.status || "scheduled",
      notes: procedure.notes,
      toothOrCondition: procedure.tooth || procedure.toothNumber || procedure.condition,
    };
  });

  const appointmentOnlySteps = appointments
    .slice(procedures.length)
    .map((appointment: TreatmentPlanAppointment, index: number): PlanStep => ({
      id: `appointment-${index}`,
      title: appointment.type || (language === "ar" ? "موعد علاجي" : "Treatment appointment"),
      clinic: clinicDisplayName(appointment.clinic, language),
      expectedDate: appointment.date,
      status: "scheduled",
      notes: appointment.time
        ? language === "ar"
          ? `وقت الموعد: ${appointment.time}`
          : `Appointment time: ${appointment.time}`
        : undefined,
    }));

  return [...procedureSteps, ...appointmentOnlySteps];
}

function firstAppointmentDetails(plan: PatientTreatmentPlan, language: Language) {
  const appointment = plan.appointments?.find((item) => item.date || item.time || item.clinic);
  if (!appointment) return { clinic: "", dateTime: "" };

  const date = formatDate(appointment.date, language);
  const dateTime = [date, appointment.time].filter(Boolean).join(" - ");

  return {
    clinic: clinicDisplayName(appointment.clinic, language),
    dateTime,
  };
}

function getRecommendedClinic(plan: PatientTreatmentPlan, language: Language) {
  const appointmentDetails = firstAppointmentDetails(plan, language);
  if (appointmentDetails.clinic) return appointmentDetails.clinic;

  const procedureWithClinic = plan.procedures?.find((procedure) => procedure.clinic || procedure.department);
  return clinicDisplayName(procedureWithClinic?.clinic || procedureWithClinic?.department, language);
}

function getPlanToothArea(plan: PatientTreatmentPlan) {
  const procedure = plan.procedures?.find((item) => item.tooth || item.toothNumber || item.condition);
  return procedure?.tooth || procedure?.toothNumber || procedure?.condition || "";
}

function splitReadableText(value?: string) {
  if (!value) return [];
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const sentences = normalized
    .match(/[^.!؟\n]+[.!؟]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];

  if (sentences.length < 2 || normalized.length < 170) return [normalized];
  return sentences.slice(0, 5);
}

function getEmptyStagesMessage(status: PatientPlanStatus, language: Language) {
  if (status === "needs_reevaluation") {
    return {
      title: language === "ar" ? "تحتاج الحالة إلى إعادة تقييم" : "Case needs re-evaluation",
      message: language === "ar"
        ? "لا توجد مراحل علاجية حالية لأن الطبيب طلب إعادة تقييم الحالة قبل اعتماد خطة نهائية."
        : "There are no current treatment stages because the doctor requested re-evaluation before final approval.",
    };
  }

  if (status === "approved") {
    return {
      title: language === "ar" ? "لم يتم تسجيل مراحل علاجية" : "No treatment stages recorded",
      message: language === "ar"
        ? "الخطة معتمدة، لكن لم يتم إضافة مراحل علاجية مفصلة بعد."
        : "The plan is approved, but detailed treatment stages have not been added yet.",
    };
  }

  return {
    title: language === "ar" ? "لا توجد خطوات علاجية مسجلة بعد" : "No treatment steps recorded yet",
    message: language === "ar"
      ? "سيتم تحديث مراحل الخطة بعد مراجعة الطبيب."
      : "The treatment stages will be updated after doctor review.",
  };
}

function BackButton({ language, onBackClick }: { language: Language; onBackClick?: () => void }) {
  if (!onBackClick) return null;

  return (
    <Button variant="outline" onClick={onBackClick} className="gap-2" data-testid="button-back-to-home">
      {language === "ar" ? "العودة" : "Back"}
    </Button>
  );
}

export function PatientTreatmentPlanLoading({ language }: { language: Language }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
    </div>
  );
}

export function PatientTreatmentPlanError({ language, onRetry }: PlanStateProps) {
  return (
    <div className="mx-auto flex min-h-[420px] max-w-6xl items-center justify-center" dir={language === "ar" ? "rtl" : "ltr"}>
      <Card className="w-full max-w-lg border-destructive/20 shadow-sm">
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-bold">
            {language === "ar" ? "تعذر تحميل الخطة العلاجية" : "Unable to load treatment plan"}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {language === "ar" ? "حدث خطأ أثناء جلب بيانات الخطة. حاول مرة أخرى." : "Something went wrong while loading the plan. Please try again."}
          </p>
          {onRetry && (
            <Button className="mt-5 gap-2" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              {language === "ar" ? "إعادة المحاولة" : "Retry"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientTreatmentPlanEmpty({ language, onPrimaryAction, onBackClick }: PlanStateProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-bold text-foreground">
            {language === "ar" ? "الخطة العلاجية للمريض" : "Patient Treatment Plan"}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {language === "ar"
              ? "تابع خطتك العلاجية المقترحة أو المعتمدة من الطبيب."
              : "Follow your proposed or doctor-approved treatment plan."}
          </p>
        </div>
        <BackButton language={language} onBackClick={onBackClick} />
      </div>

      <Card className="border-dashed shadow-sm">
        <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">
            {language === "ar" ? "لا توجد خطة علاجية مقترحة حتى الآن" : "No proposed treatment plan yet"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-muted-foreground">
            {language === "ar"
              ? "ابدأ بالتشخيص الذكي حتى يتم تحليل حالتك وتخصيص خطة علاجية مناسبة لك بعد الحجز."
              : "Your plan will appear here once it is available from the doctor or after diagnosis and booking are complete."}
          </p>
          {onPrimaryAction && (
            <Button className="mt-6 gap-2" onClick={onPrimaryAction}>
              <Stethoscope className="h-4 w-4" />
              {language === "ar" ? "الذهاب إلى التشخيص الذكي" : "Go to AI Diagnosis"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PatientTreatmentPlanView({
  plan,
  language,
  patientName,
  onBackClick,
}: PatientTreatmentPlanViewProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);
  const status = normalizePlanStatus(plan);
  const statusContent = getPlanStatusContent(status, language);
  const steps = buildPlanSteps(plan, language);
  const clinicName = getRecommendedClinic(plan, language);
  const toothArea = getPlanToothArea(plan);
  const summaryItems = splitReadableText(plan.description);
  const hasLongSummary = summaryItems.length > 2;
  const visibleSummaryItems = hasLongSummary && !showFullSummary ? summaryItems.slice(0, 2) : summaryItems;
  const emptyStages = getEmptyStagesMessage(status, language);
  const direction = language === "ar" ? "rtl" : "ltr";
  const resolvedPatientName = patientName || plan.patientName || unknownLabel(language);
  const resolvedDoctorName = plan.doctorName || unknownLabel(language);
  const canPrint = status !== "needs_reevaluation";

  const handlePrint = () => {
    if (!canPrint) return;
    window.print();
  };

  const infoItems = [
    {
      label: language === "ar" ? "المريض" : "Patient",
      value: resolvedPatientName,
      icon: User,
      required: true,
    },
    {
      label: language === "ar" ? "الطبيب المسؤول" : "Assigned doctor",
      value: resolvedDoctorName,
      icon: Stethoscope,
      required: true,
    },
    {
      label: language === "ar" ? "السن / المنطقة" : "Tooth / area",
      value: toothArea,
      icon: CheckCircle2,
    },
    {
      label: language === "ar" ? "العيادة المقترحة" : "Recommended clinic",
      value: clinicName,
      icon: Hospital,
    },
    {
      label: language === "ar" ? "المدة المقدرة" : "Estimated duration",
      value: plan.estimatedDuration,
      icon: Clock,
    },
    {
      label: language === "ar" ? "تاريخ بدء الخطة" : "Plan start date",
      value: formatDate(plan.planStartDate, language),
      icon: Calendar,
    },
  ].filter((item) => item.required || item.value);

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir={direction}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="text-start">
          <h1 className="text-3xl font-bold text-foreground">
            {language === "ar" ? "الخطة العلاجية للمريض" : "Patient Treatment Plan"}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {language === "ar"
              ? "تابع خطتك العلاجية المقترحة أو المعتمدة من الطبيب."
              : "Follow your proposed or doctor-approved treatment plan."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={handlePrint}
            disabled={!canPrint}
            title={
              !canPrint
                ? language === "ar"
                  ? "لا يمكن طباعة خطة تحتاج إلى إعادة تقييم كخطة نهائية"
                  : "A plan that needs re-evaluation cannot be printed as final"
                : undefined
            }
          >
            <Printer className="h-4 w-4" />
            {language === "ar" ? "طباعة" : "Print"}
          </Button>
          <BackButton language={language} onBackClick={onBackClick} />
        </div>
      </div>

      <Card className={`${statusContent.banner} shadow-sm`}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2 text-start">
              <Badge className={`${statusContent.badge} w-fit`}>
                {statusContent.title}
              </Badge>
              <p className="text-base font-bold">{statusContent.message}</p>
              <p className="text-sm font-medium opacity-85">{statusContent.action}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/70">
              {status === "approved" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-5 w-5 text-primary" />
            {plan.title || (language === "ar" ? "خطة علاجية" : "Treatment plan")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {summaryItems.length > 0 && (
            <div className="rounded-lg bg-muted/35 p-4 text-start">
              <p className="mb-3 text-sm font-bold text-foreground">
                {language === "ar" ? "ملخص التشخيص" : "Diagnosis summary"}
              </p>
              {visibleSummaryItems.length === 1 ? (
                <p className="text-sm font-medium leading-7 text-foreground">{visibleSummaryItems[0]}</p>
              ) : (
                <ul className="space-y-2 text-sm font-medium leading-7 text-foreground">
                  {visibleSummaryItems.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hasLongSummary && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 gap-2 px-0 text-primary hover:bg-transparent"
                  onClick={() => setShowFullSummary((value) => !value)}
                >
                  {showFullSummary
                    ? language === "ar" ? "إخفاء التفاصيل" : "Show less"
                    : language === "ar" ? "عرض التشخيص الكامل" : "Show full diagnosis"}
                  {showFullSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border border-border/70 bg-background p-4 text-start">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <p className="font-bold text-foreground">{item.value}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5 text-primary" />
            {language === "ar" ? "مراحل الخطة العلاجية" : "Treatment plan stages"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-6 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-bold text-foreground">{emptyStages.title}</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{emptyStages.message}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="rounded-lg border border-border/70 bg-card p-4 text-start shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-primary">
                        {language === "ar" ? `مرحلة ${index + 1}` : `Stage ${index + 1}`}
                      </p>
                      <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    </div>
                    <Badge className={getStepStatusClass(step.status)}>
                      {getStepStatusLabel(step.status, language)}
                    </Badge>
                  </div>

                  {step.description && (
                    <p className="mt-3 text-sm font-medium leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {step.clinic && (
                      <p className="text-sm font-medium">
                        <span className="font-semibold text-muted-foreground">{language === "ar" ? "العيادة:" : "Clinic:"}</span>{" "}
                        {step.clinic}
                      </p>
                    )}
                    {step.expectedDate && (
                      <p className="text-sm font-medium">
                        <span className="font-semibold text-muted-foreground">{language === "ar" ? "التاريخ المتوقع:" : "Expected date:"}</span>{" "}
                        {formatDate(step.expectedDate, language)}
                      </p>
                    )}
                    {step.toothOrCondition && (
                      <p className="text-sm font-medium">
                        <span className="font-semibold text-muted-foreground">{language === "ar" ? "السن/المنطقة:" : "Tooth/area:"}</span>{" "}
                        {step.toothOrCondition}
                      </p>
                    )}
                  </div>

                  {step.notes && (
                    <div className="mt-4 rounded-md bg-muted/35 p-3 text-sm font-medium leading-6 text-muted-foreground">
                      <span className="font-semibold text-foreground">{language === "ar" ? "ملاحظات:" : "Notes:"}</span>{" "}
                      {step.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {plan.notes && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{language === "ar" ? "ملاحظات الطبيب" : "Doctor notes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-lg bg-muted/25 p-4 text-start text-sm font-medium leading-7 text-foreground">
              {plan.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
