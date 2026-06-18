import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bot,
  CalendarCheck,
  CheckCircle,
  Clock,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
  patient?: {
    id: string;
    fullName: string;
    phone: string;
  };
}

interface TodayAppointmentsPageProps {
  language?: "ar" | "en";
}

type TreatmentProcedureStatus = "scheduled" | "in-progress" | "completed" | "deferred";

interface TreatmentProcedure {
  name?: string;
  title?: string;
  description?: string;
  status?: TreatmentProcedureStatus | string;
  scheduledDate?: string | Date;
  completedDate?: string | Date;
  clinic?: string;
  department?: string;
  tooth?: string;
  toothNumber?: string;
  condition?: string;
  notes?: string;
  estimatedDuration?: string;
  estimatedCost?: string | number;
}

interface TreatmentAppointment {
  type?: string;
  clinic?: string;
  date?: string;
  time?: string;
}

interface AiDraftTreatmentPlan {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  title: string;
  description?: string;
  planStartDate?: string;
  estimatedDuration?: string;
  procedures?: TreatmentProcedure[] | string;
  appointments?: TreatmentAppointment[] | string;
  notes?: string;
  source?: "ai" | "doctor";
  reviewStatus?: "pending_doctor_review" | "approved" | "revision_requested" | "rejected";
  isAiDraft?: boolean;
  isFinal?: boolean;
  aiDisclaimer?: string;
  appointmentId?: string;
  diagnosisRecordId?: string;
}

interface AiDraftEditForm {
  title: string;
  description: string;
  recommendedClinic: string;
  planStartDate: string;
  estimatedDuration: string;
  procedures: TreatmentProcedure[];
  appointments: TreatmentAppointment[];
  notes: string;
}

type SaveOptions = {
  showToast?: boolean;
  requireProcedures?: boolean;
  notifyPatient?: boolean;
};

const emptyProcedure = (): TreatmentProcedure => ({
  name: "",
  description: "",
  status: "scheduled",
  scheduledDate: "",
  clinic: "",
  tooth: "",
  notes: "",
});

const parseArrayValue = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatDateForInput = (value: unknown) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "");
  return Object.fromEntries(entries) as Partial<T>;
};

const normalizeProcedureStatus = (value: unknown): TreatmentProcedureStatus => {
  if (value === "in-progress" || value === "completed" || value === "deferred" || value === "scheduled") {
    return value;
  }
  return "scheduled";
};

export default function TodayAppointmentsPage({ language = "ar" }: TodayAppointmentsPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingPlans, setPendingPlans] = useState<AiDraftTreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPlansLoading, setPendingPlansLoading] = useState(true);
  const [pendingPlansError, setPendingPlansError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<AiDraftTreatmentPlan | null>(null);
  const [editForm, setEditForm] = useState<AiDraftEditForm | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [approvingPlan, setApprovingPlan] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);
  const { toast } = useToast();

  const translations = {
    ar: {
      title: "مواعيد اليوم",
      pendingAiPlans: "خطط العلاج بالذكاء الاصطناعي قيد المراجعة",
      noPendingAiPlans: "لا توجد خطط علاج بالذكاء الاصطناعي قيد المراجعة",
      aiDraft: "خطة مقترحة بالذكاء الاصطناعي",
      pendingDoctorReview: "قيد مراجعة الطبيب",
      reviewPlan: "مراجعة الخطة العلاجية",
      reviewPlanDescription: "هذا نموذج مراجعة سريري للطبيب، وليس واجهة تحرير للمريض.",
      aiWarning: "هذه خطة علاجية مقترحة بواسطة الذكاء الاصطناعي ويجب مراجعتها وتعديلها قبل اعتمادها.",
      notFinalAdvice: "هذه المسودة ليست نصيحة طبية نهائية حتى يتم اعتمادها من الطبيب.",
      saveChanges: "حفظ التعديلات",
      approvePlan: "اعتماد الخطة",
      requestReevaluation: "طلب إعادة تقييم",
      planTitle: "عنوان الخطة",
      description: "التشخيص الرئيسي / الملخص السريري",
      recommendedClinic: "العيادة / القسم المقترح",
      planStartDate: "تاريخ بدء الخطة",
      estimatedDuration: "المدة المتوقعة",
      procedures: "مراحل الخطة العلاجية",
      appointments: "المواعيد المرتبطة",
      readOnlyAppointments: "تُعرض المواعيد المرتبطة للقراءة فقط. تعديل المواعيد يتم من نظام المواعيد.",
      noLinkedAppointments: "لا توجد مواعيد مرتبطة بهذه الخطة.",
      notes: "ملاحظات الطبيب",
      patient: "المريض",
      patientId: "رقم المريض",
      relatedDiagnosis: "ملخص التشخيص المرتبط",
      status: "الحالة",
      stage: "مرحلة",
      addStage: "إضافة مرحلة",
      deleteStage: "حذف المرحلة",
      stageTitle: "عنوان المرحلة",
      stageDescription: "وصف المرحلة",
      clinicDepartment: "العيادة / القسم",
      toothArea: "السن / المنطقة",
      expectedDate: "التاريخ المتوقع",
      stageStatus: "حالة المرحلة",
      stageNotes: "ملاحظات المرحلة",
      scheduled: "مجدول",
      inProgress: "قيد التنفيذ",
      completed: "مكتمل",
      deferred: "مؤجل",
      planSaved: "تم حفظ تعديلات الخطة",
      planApproved: "تم اعتماد الخطة العلاجية",
      reevaluationRequested: "تم وضع الخطة كحالة تحتاج إلى إعادة تقييم",
      validationTitleRequired: "عنوان الخطة مطلوب",
      validationStageRequired: "يجب إضافة مرحلة علاجية واحدة على الأقل قبل اعتماد الخطة",
      validationStageFields: "كل مرحلة علاجية يجب أن تحتوي على عنوان ووصف",
      loadPendingError: "تعذر تحميل خطط العلاج المعلقة",
      noAppointments: "لا توجد مواعيد اليوم",
      time: "الوقت",
      markAttended: "تأكيد الحضور",
      markMissed: "لم يحضر",
      missed: "لم يحضر",
      loading: "جاري التحميل...",
      attendanceConfirmed: "تم تأكيد حضور المريض",
      error: "حدث خطأ",
    },
    en: {
      title: "Today's Appointments",
      pendingAiPlans: "Pending AI Treatment Plans",
      noPendingAiPlans: "No pending AI treatment plans",
      aiDraft: "AI proposed plan",
      pendingDoctorReview: "Pending doctor review",
      reviewPlan: "Treatment Plan Review",
      reviewPlanDescription: "This is a clinical review form for the doctor, not a patient UI editor.",
      aiWarning: "This treatment plan was proposed by AI and must be reviewed and edited before approval.",
      notFinalAdvice: "This draft is not final medical advice until approved by the doctor.",
      saveChanges: "Save Changes",
      approvePlan: "Approve Plan",
      requestReevaluation: "Request Re-evaluation",
      planTitle: "Plan Title",
      description: "Main Diagnosis / Clinical Summary",
      recommendedClinic: "Recommended Clinic / Department",
      planStartDate: "Plan Start Date",
      estimatedDuration: "Expected Duration",
      procedures: "Treatment Stages",
      appointments: "Linked Appointments",
      readOnlyAppointments: "Linked appointments are read-only here. Appointment changes should be made from scheduling.",
      noLinkedAppointments: "No linked appointments for this plan.",
      notes: "Doctor Notes",
      patient: "Patient",
      patientId: "Patient ID",
      relatedDiagnosis: "Related Diagnosis Summary",
      status: "Status",
      stage: "Stage",
      addStage: "Add Stage",
      deleteStage: "Delete Stage",
      stageTitle: "Stage Title",
      stageDescription: "Stage Description",
      clinicDepartment: "Clinic / Department",
      toothArea: "Tooth / Area",
      expectedDate: "Expected Date",
      stageStatus: "Stage Status",
      stageNotes: "Stage Notes",
      scheduled: "Scheduled",
      inProgress: "In Progress",
      completed: "Completed",
      deferred: "Deferred",
      planSaved: "Treatment plan changes saved",
      planApproved: "Treatment plan approved",
      reevaluationRequested: "Plan marked as needing re-evaluation",
      validationTitleRequired: "Plan title is required",
      validationStageRequired: "At least one treatment stage is required before approval",
      validationStageFields: "Every treatment stage must have a title and description",
      loadPendingError: "Unable to load pending treatment plans",
      noAppointments: "No appointments today",
      time: "Time",
      markAttended: "Confirm Attendance",
      markMissed: "Mark as Missed",
      missed: "Missed",
      loading: "Loading...",
      attendanceConfirmed: "Patient attendance confirmed",
      error: "An error occurred",
    },
  };

  const t = translations[language];
  const isBusy = savingPlan || approvingPlan || requestingRevision;

  useEffect(() => {
    fetchTodayAppointments();
    fetchPendingTreatmentPlans();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctor/today-appointments`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTreatmentPlans = async () => {
    try {
      setPendingPlansLoading(true);
      setPendingPlansError("");
      const response = await fetch("/api/v1/ai/treatment-plan/pending");
      if (!response.ok) throw new Error("Failed to load pending AI treatment plans");
      const data = await response.json();
      setPendingPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching pending AI treatment plans:", error);
      setPendingPlansError(t.loadPendingError);
    } finally {
      setPendingPlansLoading(false);
    }
  };

  const getPlanProcedures = (plan: AiDraftTreatmentPlan) =>
    parseArrayValue<TreatmentProcedure>(plan.procedures).map((procedure) => ({
      ...emptyProcedure(),
      ...procedure,
      name: procedure.name || procedure.title || "",
      status: normalizeProcedureStatus(procedure.status),
      scheduledDate: formatDateForInput(procedure.scheduledDate),
    }));

  const getPlanAppointments = (plan: AiDraftTreatmentPlan) =>
    parseArrayValue<TreatmentAppointment>(plan.appointments);

  const getRecommendedClinic = (plan: AiDraftTreatmentPlan) => {
    const procedures = getPlanProcedures(plan);
    const appointments = getPlanAppointments(plan);
    const procedureClinic = procedures.find((procedure) => procedure.clinic || procedure.department);
    const appointmentClinic = appointments.find((appointment) => appointment.clinic);
    return procedureClinic?.clinic || procedureClinic?.department || appointmentClinic?.clinic || "";
  };

  const createEditForm = (plan: AiDraftTreatmentPlan): AiDraftEditForm => ({
    title: plan.title || "",
    description: plan.description || "",
    recommendedClinic: getRecommendedClinic(plan),
    planStartDate: formatDateForInput(plan.planStartDate),
    estimatedDuration: plan.estimatedDuration || "",
    procedures: getPlanProcedures(plan),
    appointments: getPlanAppointments(plan),
    notes: plan.notes || "",
  });

  const openPlanReview = (plan: AiDraftTreatmentPlan) => {
    setSelectedPlan(plan);
    setEditForm(createEditForm(plan));
    setReviewDialogOpen(true);
  };

  const updateForm = (updates: Partial<AiDraftEditForm>) => {
    if (!editForm) return;
    setEditForm({ ...editForm, ...updates });
  };

  const updateProcedure = (index: number, updates: Partial<TreatmentProcedure>) => {
    if (!editForm) return;
    const procedures = [...editForm.procedures];
    procedures[index] = { ...procedures[index], ...updates };
    updateForm({ procedures });
  };

  const addProcedure = () => {
    if (!editForm) return;
    updateForm({ procedures: [...editForm.procedures, emptyProcedure()] });
  };

  const removeProcedure = (index: number) => {
    if (!editForm) return;
    updateForm({ procedures: editForm.procedures.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveProcedure = (index: number, direction: -1 | 1) => {
    if (!editForm) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editForm.procedures.length) return;
    const procedures = [...editForm.procedures];
    [procedures[index], procedures[nextIndex]] = [procedures[nextIndex], procedures[index]];
    updateForm({ procedures });
  };

  const validatePlanForm = (requireProcedures: boolean) => {
    if (!editForm?.title.trim()) {
      toast({ title: t.validationTitleRequired, variant: "destructive" });
      return false;
    }

    if (requireProcedures && editForm.procedures.length === 0) {
      toast({ title: t.validationStageRequired, variant: "destructive" });
      return false;
    }

    const invalidStage = editForm.procedures.some(
      (procedure) => !(procedure.name || procedure.title || "").trim() || !(procedure.description || "").trim(),
    );

    if (invalidStage) {
      toast({ title: t.validationStageFields, variant: "destructive" });
      return false;
    }

    return true;
  };

  const buildPatchPayload = () => {
    if (!editForm) return {};

    const procedures = editForm.procedures.map((procedure) => compactObject({
      name: (procedure.name || procedure.title || "").trim(),
      description: (procedure.description || "").trim(),
      status: normalizeProcedureStatus(procedure.status),
      scheduledDate: formatDateForInput(procedure.scheduledDate) || undefined,
      completedDate: formatDateForInput(procedure.completedDate) || undefined,
      clinic: (procedure.clinic || editForm.recommendedClinic || "").trim(),
      department: (procedure.department || "").trim(),
      tooth: (procedure.tooth || "").trim(),
      toothNumber: (procedure.toothNumber || "").trim(),
      condition: (procedure.condition || "").trim(),
      notes: (procedure.notes || "").trim(),
      estimatedDuration: (procedure.estimatedDuration || "").trim(),
      estimatedCost: procedure.estimatedCost,
    }));

    const appointments = editForm.appointments.map((appointment) => compactObject({
      type: (appointment.type || "").trim(),
      clinic: (appointment.clinic || "").trim(),
      date: appointment.date || undefined,
      time: appointment.time || undefined,
    }));

    return compactObject({
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      planStartDate: editForm.planStartDate || undefined,
      estimatedDuration: editForm.estimatedDuration.trim(),
      procedures,
      appointments,
      notes: editForm.notes.trim(),
    });
  };

  const savePlanUpdates = async ({ showToast = true, requireProcedures = false, notifyPatient = true }: SaveOptions = {}) => {
    if (!selectedPlan || !editForm) return false;
    if (!validatePlanForm(requireProcedures)) return false;

    try {
      setSavingPlan(true);
      const notifyQuery = notifyPatient ? "" : "?notifyPatient=false";
      const response = await fetch(`/api/v1/ai/treatment-plan/${selectedPlan.id}${notifyQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatchPayload()),
      });

      if (!response.ok) throw new Error("Failed to update AI draft treatment plan");
      const updatedPlan = await response.json();
      setSelectedPlan(updatedPlan);
      setEditForm(createEditForm(updatedPlan));
      await fetchPendingTreatmentPlans();
      if (showToast) toast({ title: t.planSaved });
      return true;
    } catch (error) {
      toast({ title: t.error, variant: "destructive" });
      return false;
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSavePlan = async () => {
    await savePlanUpdates();
  };

  const handleApprovePlan = async () => {
    if (!selectedPlan) return;

    const saved = await savePlanUpdates({ showToast: false, requireProcedures: true, notifyPatient: false });
    if (!saved) return;

    try {
      setApprovingPlan(true);
      const response = await fetch(`/api/v1/ai/treatment-plan/${selectedPlan.id}/approve`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to approve AI draft treatment plan");
      await fetchPendingTreatmentPlans();
      setReviewDialogOpen(false);
      setSelectedPlan(null);
      setEditForm(null);
      toast({ title: t.planApproved });
    } catch (error) {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setApprovingPlan(false);
    }
  };

  const handleRequestReevaluation = async () => {
    if (!selectedPlan) return;

    const saved = await savePlanUpdates({ showToast: false, notifyPatient: false });
    if (!saved) return;

    try {
      setRequestingRevision(true);
      const response = await fetch(`/api/v1/ai/treatment-plan/${selectedPlan.id}/revision-requested`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to request treatment plan re-evaluation");
      await fetchPendingTreatmentPlans();
      setReviewDialogOpen(false);
      setSelectedPlan(null);
      setEditForm(null);
      toast({ title: t.reevaluationRequested });
    } catch (error) {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleMarkAttended = async (appointmentId: string, clinicId: string = "default") => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/mark-attended`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId }),
      });

      if (response.ok) {
        toast({
          title: t.attendanceConfirmed,
          description: language === "ar" ? "تم إضافة سعر الجلسة للرصيد المستحق" : "Session price added to balance due",
        });
        fetchTodayAppointments();
      }
    } catch (error) {
      toast({
        title: t.error,
        variant: "destructive",
      });
    }
  };

  const handleMarkMissed = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "missed" }),
      });

      if (response.ok) {
        fetchTodayAppointments();
      }
    } catch (error) {
      toast({
        title: t.error,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">{t.completed}</Badge>;
      case "missed":
        return <Badge variant="destructive">{t.missed}</Badge>;
      default:
        return <Badge variant="secondary">{t.scheduled}</Badge>;
    }
  };

  const getStageStatusLabel = (status: string | undefined) => {
    switch (status) {
      case "in-progress":
        return t.inProgress;
      case "completed":
        return t.completed;
      case "deferred":
        return t.deferred;
      default:
        return t.scheduled;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
          <CalendarCheck className="h-8 w-8 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-600" />
            {t.pendingAiPlans}
          </h2>
          <Badge variant="outline">{pendingPlans.length}</Badge>
        </div>

        {pendingPlansLoading ? (
          <Card className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          </Card>
        ) : pendingPlansError ? (
          <Card className="border-red-200">
            <CardContent className="p-6 text-red-600">{pendingPlansError}</CardContent>
          </Card>
        ) : pendingPlans.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-slate-500">{t.noPendingAiPlans}</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pendingPlans.map((plan) => (
              <Card key={plan.id} className="border-amber-200 dark:border-amber-900">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-white">{plan.title}</h3>
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">{t.aiDraft}</Badge>
                        <Badge variant="outline">{t.pendingDoctorReview}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {t.patient}: {plan.patientName || `${t.patientId}: ${plan.patientId.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {plan.aiDisclaimer || t.notFinalAdvice}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => openPlanReview(plan)} className="gap-2">
                      <Pencil className="h-4 w-4" />
                      {t.reviewPlan}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {appointments.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-xl text-slate-500">{t.noAppointments}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                        {appointment.patient?.fullName || `${t.patient} #${appointment.patientId.slice(0, 8)}`}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>{appointment.time}</span>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-slate-400 mt-1">{appointment.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(appointment.status)}

                    {appointment.status === "scheduled" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleMarkAttended(appointment.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 ms-2" />
                          {t.markAttended}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleMarkMissed(appointment.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 ms-2" />
                          {t.markMissed}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Bot className="h-5 w-5 text-amber-600" />
              {t.reviewPlan}
            </DialogTitle>
            <DialogDescription>{t.reviewPlanDescription}</DialogDescription>
          </DialogHeader>

          {selectedPlan && editForm && (
            <div className="space-y-5">
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">{t.aiDraft}</Badge>
                    <Badge variant="outline">{t.pendingDoctorReview}</Badge>
                  </div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">{t.aiWarning}</p>
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                    {selectedPlan.aiDisclaimer || t.notFinalAdvice}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-background/70 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.patient}</p>
                      <p className="mt-1 font-bold">{selectedPlan.patientName || selectedPlan.patientId}</p>
                    </div>
                    <div className="rounded-md bg-background/70 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.relatedDiagnosis}</p>
                      <p className="mt-1 line-clamp-2 font-medium">{selectedPlan.description || selectedPlan.diagnosisRecordId || "-"}</p>
                    </div>
                    <div className="rounded-md bg-background/70 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.recommendedClinic}</p>
                      <p className="mt-1 font-medium">{editForm.recommendedClinic || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ai-plan-title">{t.planTitle}</Label>
                      <Input
                        id="ai-plan-title"
                        value={editForm.title}
                        onChange={(event) => updateForm({ title: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ai-plan-description">{t.description}</Label>
                      <Textarea
                        id="ai-plan-description"
                        className="min-h-24"
                        value={editForm.description}
                        onChange={(event) => updateForm({ description: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-plan-clinic">{t.recommendedClinic}</Label>
                      <Input
                        id="ai-plan-clinic"
                        value={editForm.recommendedClinic}
                        onChange={(event) => updateForm({ recommendedClinic: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-plan-duration">{t.estimatedDuration}</Label>
                      <Input
                        id="ai-plan-duration"
                        value={editForm.estimatedDuration}
                        onChange={(event) => updateForm({ estimatedDuration: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-plan-start">{t.planStartDate}</Label>
                      <Input
                        id="ai-plan-start"
                        type="date"
                        value={editForm.planStartDate}
                        onChange={(event) => updateForm({ planStartDate: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ai-plan-notes">{t.notes}</Label>
                      <Textarea
                        id="ai-plan-notes"
                        className="min-h-24"
                        value={editForm.notes}
                        onChange={(event) => updateForm({ notes: event.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{t.procedures}</h3>
                      <p className="text-sm text-muted-foreground">{language === "ar" ? "عدّل مراحل العلاج كحقول سريرية واضحة." : "Edit treatment stages using clear clinical fields."}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addProcedure} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t.addStage}
                    </Button>
                  </div>

                  {editForm.procedures.map((procedure, index) => (
                    <Card key={index} className="border-dashed">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t.stage} {index + 1}</Badge>
                            <Badge variant="secondary">{getStageStatusLabel(procedure.status)}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveProcedure(index, -1)} disabled={index === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => moveProcedure(index, 1)} disabled={index === editForm.procedures.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" onClick={() => removeProcedure(index)} title={t.deleteStage}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t.stageTitle}</Label>
                            <Input
                              value={procedure.name || procedure.title || ""}
                              onChange={(event) => updateProcedure(index, { name: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.stageStatus}</Label>
                            <Select
                              value={normalizeProcedureStatus(procedure.status)}
                              onValueChange={(value) => updateProcedure(index, { status: value as TreatmentProcedureStatus })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                                <SelectItem value="in-progress">{t.inProgress}</SelectItem>
                                <SelectItem value="completed">{t.completed}</SelectItem>
                                <SelectItem value="deferred">{t.deferred}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t.stageDescription}</Label>
                            <Textarea
                              className="min-h-20"
                              value={procedure.description || ""}
                              onChange={(event) => updateProcedure(index, { description: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.clinicDepartment}</Label>
                            <Input
                              value={procedure.clinic || procedure.department || ""}
                              onChange={(event) => updateProcedure(index, { clinic: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.toothArea}</Label>
                            <Input
                              value={procedure.tooth || procedure.toothNumber || procedure.condition || ""}
                              onChange={(event) => updateProcedure(index, { tooth: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.expectedDate}</Label>
                            <Input
                              type="date"
                              value={formatDateForInput(procedure.scheduledDate)}
                              onChange={(event) => updateProcedure(index, { scheduledDate: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t.estimatedDuration}</Label>
                            <Input
                              value={procedure.estimatedDuration || ""}
                              onChange={(event) => updateProcedure(index, { estimatedDuration: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t.stageNotes}</Label>
                            <Textarea
                              value={procedure.notes || ""}
                              onChange={(event) => updateProcedure(index, { notes: event.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <h3 className="text-lg font-bold">{t.appointments}</h3>
                    <p className="text-sm text-muted-foreground">{t.readOnlyAppointments}</p>
                  </div>
                  {editForm.appointments.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      {t.noLinkedAppointments}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {editForm.appointments.map((appointment, index) => (
                        <div key={index} className="rounded-lg border bg-muted/30 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <p className="font-semibold">{appointment.type || `${t.appointments} ${index + 1}`}</p>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {appointment.clinic && <p>{t.recommendedClinic}: {appointment.clinic}</p>}
                            {appointment.date && <p>{t.expectedDate}: {appointment.date}</p>}
                            {appointment.time && <p>{t.time}: {appointment.time}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={handleRequestReevaluation} disabled={isBusy} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {requestingRevision ? t.loading : t.requestReevaluation}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleSavePlan} disabled={isBusy} className="gap-2">
                <Save className="h-4 w-4" />
                {savingPlan ? t.loading : t.saveChanges}
              </Button>
              <Button onClick={handleApprovePlan} disabled={isBusy || selectedPlan?.isFinal === true} className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4" />
                {approvingPlan ? t.loading : t.approvePlan}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
