import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import MedicalStaffDashboard from "@/components/MedicalStaffDashboard";
import { apiGet } from "@/services/api";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  Brain,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquare,
  Pill,
  RefreshCw,
  Smile,
  TrendingUp,
} from "lucide-react";

interface HomePageProps {
  userName: string;
  userType: string;
  userId?: string;
  onNavigate?: (page: string) => void;
  language?: "ar" | "en";
}

interface DashboardAppointment {
  id?: string;
  date?: string;
  time?: string;
  status?: string;
  doctorName?: string | null;
  clinicName?: string | null;
}

interface DashboardDiagnosis {
  id?: string;
  title?: string | null;
  urgency?: string | null;
  suggestedClinic?: {
    name?: string;
    nameAr?: string;
    nameEn?: string;
  } | null;
  createdAt?: string | null;
}

interface DashboardTreatmentPlan {
  id?: string;
  title?: string;
  description?: string | null;
  status?: string;
  reviewStatus?: string | null;
  isAiDraft?: boolean;
  isFinal?: boolean;
  doctorName?: string | null;
  updatedAt?: string | null;
  procedures?: Array<{
    id?: string;
    name: string;
    status: string;
  }>;
}

interface PatientDashboardSummary {
  patient?: {
    id: string;
    fullName?: string | null;
  };
  nextAppointment: DashboardAppointment | null;
  latestDiagnosis: DashboardDiagnosis | null;
  treatmentPlan: DashboardTreatmentPlan | null;
  medications: {
    activeCount: number;
    todayDosesCount: number;
  };
  notifications: {
    unreadCount: number;
  };
  balance: {
    totalDue: number;
    totalPaid: number;
    balance: number;
  };
  appointmentStats: {
    upcomingCount: number;
    completedCount: number;
  };
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  scheduled: { ar: "مجدول", en: "Scheduled" },
  "in-progress": { ar: "قيد التنفيذ", en: "In progress" },
  completed: { ar: "مكتمل", en: "Completed" },
  deferred: { ar: "مؤجل", en: "Deferred" },
  pending: { ar: "قيد الانتظار", en: "Pending" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  "no-show": { ar: "لم يحضر", en: "No show" },
  pending_doctor_review: {
    ar: "قيد مراجعة الطبيب",
    en: "Pending doctor review",
  },
  approved: { ar: "معتمدة", en: "Approved" },
  revision_requested: { ar: "تحتاج إعادة تقييم", en: "Needs re-evaluation" },
};

function formatDate(value: string | null | undefined, language: "ar" | "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number | undefined, language: "ar" | "en") {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusLabel(
  status: string | null | undefined,
  language: "ar" | "en",
) {
  if (!status) return "";
  return STATUS_LABELS[status]?.[language] || status;
}

function getTreatmentStatus(
  plan: DashboardTreatmentPlan | null,
  language: "ar" | "en",
) {
  if (!plan) return "";
  if (plan.isFinal || plan.reviewStatus === "approved") {
    return language === "ar" ? "خطة معتمدة" : "Approved plan";
  }
  if (plan.isAiDraft || plan.reviewStatus === "pending_doctor_review") {
    return language === "ar" ? "قيد مراجعة الطبيب" : "Pending doctor review";
  }
  return getStatusLabel(plan.reviewStatus || plan.status, language);
}

function isCompletedStage(status: string | undefined) {
  return status === "completed";
}

function isCurrentStage(status: string | undefined) {
  return status === "in-progress";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-32 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800"
          />
        ))}
      </div>
      <div className="h-44 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
      <div className="h-36 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
    </div>
  );
}

interface KpiCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  title: string;
  detail: string;
  accent: string;
  value?: ReactNode;
  empty?: boolean;
  onClick?: () => void;
}

function KpiCard({
  icon: Icon,
  label,
  title,
  detail,
  accent,
  value,
  empty,
  onClick,
}: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-start">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <h3
            className={`mt-4 text-lg font-bold leading-snug ${empty ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}
          >
            {title}
          </h3>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="min-h-10 text-start text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {detail}
        </p>
        {value}
      </div>
    </>
  );

  const className =
    "rounded-xl border border-slate-100 bg-white p-5 text-start shadow-md transition-all dark:border-slate-700 dark:bg-slate-800";

  if (onClick) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={`${className} hover:border-teal-200 hover:shadow-lg dark:hover:border-teal-700`}
      >
        {body}
      </motion.button>
    );
  }

  return <div className={className}>{body}</div>;
}

function ProgressRing({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-slate-100 p-1 dark:bg-slate-700"
      style={{
        background: `conic-gradient(#14b8a6 ${progress * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white text-center dark:bg-slate-800">
        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
          {progress}%
        </span>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  page: string;
  color: string;
  badge?: ReactNode;
  onNavigate?: (page: string) => void;
}

function QuickAction({
  icon: Icon,
  label,
  page,
  color,
  badge,
  onNavigate,
}: QuickActionProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onNavigate?.(page)}
      className="group relative flex min-h-24 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700"
    >
      {badge ? (
        <span className="absolute end-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
          {badge}
        </span>
      ) : null}
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:-translate-y-1 ${color}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </motion.button>
  );
}

function StageTimeline({
  procedures,
  language,
}: {
  procedures: NonNullable<DashboardTreatmentPlan["procedures"]>;
  language: "ar" | "en";
}) {
  if (procedures.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-start dark:border-slate-700 dark:bg-slate-900/40">
        <p className="font-semibold text-slate-700 dark:text-slate-200">
          {language === "ar"
            ? "لا توجد مراحل علاجية مسجلة بعد"
            : "No treatment stages have been recorded yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {language === "ar"
            ? "ستظهر مراحل العلاج هنا بعد مراجعة الطبيب للخطة العلاجية."
            : "Treatment stages will appear here after the doctor reviews the plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-start justify-between gap-3 px-1">
        {procedures.map((procedure, index) => {
          const completed = isCompletedStage(procedure.status);
          const current =
            isCurrentStage(procedure.status) ||
            (!procedures.some((stage) => isCurrentStage(stage.status)) &&
              !completed &&
              procedures
                .slice(0, index)
                .every((stage) => isCompletedStage(stage.status)));

          return (
            <div
              key={procedure.id || `${procedure.name}-${index}`}
              className="flex min-w-32 flex-1 items-start"
            >
              <div className="flex min-w-28 flex-col items-center text-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-sm ${
                    completed
                      ? "bg-emerald-500"
                      : current
                        ? "bg-teal-500 ring-4 ring-teal-100 dark:ring-teal-900"
                        : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </div>
                <p
                  className={`mt-3 max-w-36 text-sm font-semibold leading-snug ${current ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {procedure.name}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {getStatusLabel(procedure.status, language)}
                </p>
              </div>
              {index < procedures.length - 1 ? (
                <div
                  className={`mt-5 h-1 min-w-16 flex-1 rounded-full ${completed ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatientDashboard({
  userName,
  onNavigate,
  language = "ar",
}: HomePageProps) {
  const [summary, setSummary] = useState<PatientDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const dayNames =
    language === "ar"
      ? [
          "الأحد",
          "الاثنين",
          "الثلاثاء",
          "الأربعاء",
          "الخميس",
          "الجمعة",
          "السبت",
        ]
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
  const monthNames =
    language === "ar"
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

  const greeting = () => {
    const hour = today.getHours();
    if (language === "ar") return hour < 12 ? "صباح الخير" : "مساء الخير";
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<PatientDashboardSummary>(
        "/dashboard/patient-summary",
      );
      setSummary(response.data || null);
    } catch {
      setSummary(null);
      setError(
        language === "ar"
          ? "تعذر تحميل بيانات لوحة التحكم. حاول مرة أخرى."
          : "Unable to load dashboard data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [language]);

  const displayName = summary?.patient?.fullName || userName;
  const nextAppointment = summary?.nextAppointment || null;
  const latestDiagnosis = summary?.latestDiagnosis || null;
  const treatmentPlan = summary?.treatmentPlan || null;
  const procedures = treatmentPlan?.procedures || [];
  const completedStages = procedures.filter((stage) =>
    isCompletedStage(stage.status),
  ).length;
  const totalStages = procedures.length;
  const treatmentProgress =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  const diagnosisClinic =
    latestDiagnosis?.suggestedClinic?.nameAr ||
    latestDiagnosis?.suggestedClinic?.name ||
    latestDiagnosis?.suggestedClinic?.nameEn;
  const hasBalance = Boolean(
    summary &&
    (summary.balance.totalDue > 0 ||
      summary.balance.totalPaid > 0 ||
      summary.balance.balance > 0),
  );

  const heroMessage = useMemo(() => {
    if (nextAppointment) {
      return language === "ar"
        ? "لديك موعد قادم قريبًا"
        : "You have an upcoming appointment";
    }
    if (treatmentPlan) {
      return language === "ar"
        ? "تابع تقدم خطتك العلاجية"
        : "Track your treatment plan progress";
    }
    if (!latestDiagnosis) {
      return language === "ar"
        ? "ابدأ رحلتك من التشخيص الذكي أو حجز موعد"
        : "Start with smart diagnosis or book an appointment";
    }
    return language === "ar"
      ? "احجز موعدًا لمراجعة نتيجة التشخيص"
      : "Book an appointment to review your diagnosis";
  }, [language, latestDiagnosis, nextAppointment, treatmentPlan]);

  const quickActions = [
    {
      icon: Calendar,
      label: language === "ar" ? "حجز موعد" : "Book appointment",
      page: "appointments",
      color: "bg-teal-500",
    },
    {
      icon: Brain,
      label: language === "ar" ? "التشخيص الذكي" : "Smart diagnosis",
      page: "ai-diagnosis",
      color: "bg-cyan-500",
    },
    {
      icon: FileText,
      label: language === "ar" ? "السجل الطبي" : "Medical records",
      page: "medical-records",
      color: "bg-sky-500",
    },
    {
      icon: TrendingUp,
      label: language === "ar" ? "الخطة العلاجية" : "Treatment plan",
      page: "treatment-plans",
      color: "bg-emerald-500",
    },
    {
      icon: Pill,
      label: language === "ar" ? "أدويتي" : "My medications",
      page: "my-medications",
      color: "bg-amber-500",
    },
    {
      icon: MessageSquare,
      label: language === "ar" ? "تواصل" : "Chat",
      page: "chat",
      color: "bg-blue-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-start text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      ) : (
        <>
          <motion.section
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="rounded-xl bg-gradient-to-l from-teal-700 via-teal-600 to-teal-500 p-6 text-white shadow-md"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="text-start">
                <p className="text-sm font-medium text-teal-50">
                  {dayNames[today.getDay()]}، {today.getDate()}{" "}
                  {monthNames[today.getMonth()]} {today.getFullYear()}
                </p>
                <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold md:text-3xl">
                  <Smile className="h-6 w-6" />
                  {greeting()}، {displayName}
                </h1>
                <p className="mt-2 text-sm font-medium text-teal-50">
                  {heroMessage}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-inner">
                <Activity className="h-8 w-8" />
              </div>
            </div>
          </motion.section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Calendar}
              accent="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
              label={language === "ar" ? "الموعد القادم" : "Next appointment"}
              title={
                nextAppointment
                  ? `${formatDate(nextAppointment.date, language)}${nextAppointment.time ? ` · ${nextAppointment.time}` : ""}`
                  : language === "ar"
                    ? "لا توجد مواعيد قادمة"
                    : "No upcoming appointments"
              }
              detail={
                nextAppointment
                  ? [
                      nextAppointment.clinicName,
                      nextAppointment.doctorName,
                      getStatusLabel(nextAppointment.status, language),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : language === "ar"
                    ? "سيظهر هنا أقرب موعد مؤكد لك."
                    : "Your nearest confirmed appointment will appear here."
              }
              empty={!nextAppointment}
              onClick={() => onNavigate?.("my-appointments")}
            />
            <KpiCard
              icon={TrendingUp}
              accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              label={language === "ar" ? "تقدم العلاج" : "Treatment progress"}
              title={
                totalStages > 0
                  ? language === "ar"
                    ? `${completedStages}/${totalStages} مراحل مكتملة`
                    : `${completedStages}/${totalStages} stages completed`
                  : language === "ar"
                    ? "لا توجد مراحل علاجية"
                    : "No treatment stages"
              }
              detail={
                totalStages > 0
                  ? getTreatmentStatus(treatmentPlan, language)
                  : language === "ar"
                    ? "لا توجد مراحل علاجية مسجلة بعد."
                    : "No treatment stages are recorded yet."
              }
              value={
                <ProgressRing
                  progress={treatmentProgress}
                  label={
                    language === "ar" ? "تقدم العلاج" : "Treatment progress"
                  }
                />
              }
              empty={totalStages === 0}
              onClick={() => onNavigate?.("treatment-plans")}
            />
            <KpiCard
              icon={CreditCard}
              accent="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              label={language === "ar" ? "الرصيد المستحق" : "Balance due"}
              title={
                hasBalance
                  ? `${formatMoney(summary?.balance.balance, language)} ${language === "ar" ? "جنيه مصري" : "EGP"}`
                  : language === "ar"
                    ? "لا توجد مستحقات"
                    : "No balance due"
              }
              detail={
                hasBalance
                  ? language === "ar"
                    ? `${formatMoney(summary?.balance.totalPaid, language)} مدفوع من ${formatMoney(summary?.balance.totalDue, language)}`
                    : `${formatMoney(summary?.balance.totalPaid, language)} paid of ${formatMoney(summary?.balance.totalDue, language)}`
                  : language === "ar"
                    ? "لا توجد بيانات مدفوعات مستحقة حاليًا."
                    : "No payable balance is currently available."
              }
              empty={!hasBalance}
              onClick={() => onNavigate?.("payment")}
            />
            <KpiCard
              icon={Brain}
              accent="bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
              label={
                language === "ar" ? "آخر تشخيص ذكي" : "Latest smart diagnosis"
              }
              title={
                latestDiagnosis?.title ||
                (language === "ar"
                  ? "لم يتم إجراء تشخيص ذكي بعد"
                  : "No smart diagnosis yet")
              }
              detail={
                latestDiagnosis
                  ? [
                      diagnosisClinic,
                      formatDate(latestDiagnosis.createdAt, language),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : language === "ar"
                    ? "ابدأ التشخيص الذكي عند الحاجة."
                    : "Start a smart diagnosis when needed."
              }
              empty={!latestDiagnosis}
              onClick={() => onNavigate?.("ai-diagnosis")}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              icon={FileText}
              accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              label={language === "ar" ? "الخطة العلاجية" : "Treatment plan"}
              title={
                treatmentPlan?.title ||
                (language === "ar"
                  ? "لا توجد خطة علاجية حتى الآن"
                  : "No treatment plan yet")
              }
              detail={
                treatmentPlan
                  ? [
                      getTreatmentStatus(treatmentPlan, language),
                      treatmentPlan.doctorName,
                      formatDate(treatmentPlan.updatedAt, language),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : language === "ar"
                    ? "ستظهر الخطة عند توفرها في النظام."
                    : "Your plan will appear once available."
              }
              empty={!treatmentPlan}
              onClick={() => onNavigate?.("treatment-plans")}
            />
            <KpiCard
              icon={Pill}
              accent="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              label={
                language === "ar"
                  ? "الأدوية / جرعات اليوم"
                  : "Medication / doses today"
              }
              title={
                summary?.medications.todayDosesCount
                  ? language === "ar"
                    ? `${summary.medications.todayDosesCount} جرعات اليوم`
                    : `${summary.medications.todayDosesCount} doses today`
                  : language === "ar"
                    ? "لا توجد جرعات مسجلة اليوم"
                    : "No doses scheduled today"
              }
              detail={
                summary?.medications.activeCount
                  ? language === "ar"
                    ? `${summary.medications.activeCount} أدوية نشطة في النظام`
                    : `${summary.medications.activeCount} active medications`
                  : language === "ar"
                    ? "لا توجد أدوية نشطة حاليًا."
                    : "No active medications currently."
              }
              empty={!summary?.medications.todayDosesCount}
              onClick={() => onNavigate?.("my-medications")}
            />
            <KpiCard
              icon={Bell}
              accent="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              label={language === "ar" ? "الإشعارات" : "Notifications"}
              title={
                language === "ar"
                  ? `${summary?.notifications.unreadCount || 0} غير مقروءة`
                  : `${summary?.notifications.unreadCount || 0} unread`
              }
              detail={
                language === "ar"
                  ? "من إشعاراتك الفعلية في النظام."
                  : "From your actual system notifications."
              }
              empty={!summary?.notifications.unreadCount}
              onClick={() => onNavigate?.("notifications")}
            />
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 text-start shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                {language === "ar" ? "إجراءات سريعة" : "Quick actions"}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {quickActions.map((action) => (
                <QuickAction
                  key={action.page}
                  {...action}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 text-start shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                {language === "ar" ? "رحلة علاجك" : "Your treatment journey"}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate?.("treatment-plans")}
                className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                {language === "ar" ? "عرض التفاصيل ←" : "View details →"}
              </button>
            </div>
            <StageTimeline procedures={procedures} language={language} />
          </section>
        </>
      )}
    </motion.div>
  );
}

export default function HomePage(props: HomePageProps) {
  const isMedicalStaff = ["doctor", "student", "graduate"].includes(
    props.userType,
  );

  if (isMedicalStaff) {
    return (
      <MedicalStaffDashboard
        userName={props.userName}
        userType={props.userType}
        userId={props.userId}
        onNavigate={props.onNavigate}
        language={props.language}
      />
    );
  }

  return <PatientDashboard {...props} language={props.language || "ar"} />;
}
