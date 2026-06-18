import { useEffect, useState, type ComponentType, type ReactNode } from "react";
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
    cancelled: { ar: "ملغي", en: "Cancelled" },
    "no-show": { ar: "لم يحضر", en: "No show" },
    pending_doctor_review: { ar: "قيد مراجعة الطبيب", en: "Pending doctor review" },
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

function getStatusLabel(status: string | null | undefined, language: "ar" | "en") {
    if (!status) return "";
    return STATUS_LABELS[status]?.[language] || status;
}

function getTreatmentStatus(plan: DashboardTreatmentPlan | null, language: "ar" | "en") {
    if (!plan) return "";
    if (plan.isFinal || plan.reviewStatus === "approved") {
        return language === "ar" ? "خطة معتمدة" : "Approved plan";
    }
    if (plan.isAiDraft || plan.reviewStatus === "pending_doctor_review") {
        return language === "ar" ? "قيد مراجعة الطبيب" : "Pending doctor review";
    }
    return getStatusLabel(plan.reviewStatus || plan.status, language);
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-32 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-32 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
                ))}
            </div>
            <div className="h-40 rounded-xl bg-slate-100 animate-pulse dark:bg-slate-800" />
        </div>
    );
}

interface DataCardProps {
    icon: ComponentType<{ className?: string }>;
    label: string;
    title: string;
    detail: string;
    tone: "teal" | "emerald" | "amber" | "cyan" | "slate";
    empty?: boolean;
    onClick?: () => void;
}

function DataCard({ icon: Icon, label, title, detail, tone, empty, onClick }: DataCardProps) {
    const toneClasses = {
        teal: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
        slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    }[tone];

    const body = (
        <>
            <div className="flex items-center justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <div className="mt-4 text-start">
                <h3 className={`text-base font-bold leading-snug ${empty ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                    {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
            </div>
        </>
    );

    const className = "rounded-xl border border-slate-100 bg-white p-5 text-start shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800";

    if (onClick) {
        return (
            <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={onClick}
                className={`${className} hover:border-teal-200 hover:shadow-md dark:hover:border-teal-700`}
            >
                {body}
            </motion.button>
        );
    }

    return <div className={className}>{body}</div>;
}

interface StatCardProps {
    icon: ComponentType<{ className?: string }>;
    title: string;
    value: ReactNode;
    detail: string;
    onClick?: () => void;
}

function StatCard({ icon: Icon, title, value, detail, onClick }: StatCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-xl border border-slate-100 bg-white p-5 text-start shadow-sm transition-all hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-700"
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </button>
    );
}

function PatientDashboard({ userName, onNavigate, language = "ar" }: HomePageProps) {
    const [summary, setSummary] = useState<PatientDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const today = new Date();
    const dayNames = language === "ar"
        ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
        : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = language === "ar"
        ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
            const response = await apiGet<PatientDashboardSummary>("/dashboard/patient-summary");
            setSummary(response.data || null);
        } catch {
            setSummary(null);
            setError(language === "ar" ? "تعذر تحميل بيانات لوحة التحكم. حاول مرة أخرى." : "Unable to load dashboard data. Please try again.");
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
    const diagnosisClinic = latestDiagnosis?.suggestedClinic?.nameAr || latestDiagnosis?.suggestedClinic?.name || latestDiagnosis?.suggestedClinic?.nameEn;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                    <section className="rounded-xl bg-gradient-to-l from-teal-600 to-teal-500 p-6 text-white shadow-sm">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="text-start">
                                <p className="text-sm font-medium text-teal-50">
                                    {dayNames[today.getDay()]}، {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}
                                </p>
                                <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold md:text-3xl">
                                    <Smile className="h-6 w-6" />
                                    {greeting()}، {displayName}
                                </h1>
                                <p className="mt-2 text-sm text-teal-50">
                                    {language === "ar" ? "ملخصك الصحي من بياناتك الفعلية في النظام" : "Your health summary from real system data"}
                                </p>
                            </div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                                <Activity className="h-7 w-7" />
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <DataCard
                            icon={Calendar}
                            tone="teal"
                            label={language === "ar" ? "الموعد القادم" : "Next appointment"}
                            title={nextAppointment ? `${formatDate(nextAppointment.date, language)}${nextAppointment.time ? ` · ${nextAppointment.time}` : ""}` : language === "ar" ? "لا توجد مواعيد قادمة" : "No upcoming appointments"}
                            detail={nextAppointment ? [nextAppointment.doctorName, nextAppointment.clinicName].filter(Boolean).join(" · ") : language === "ar" ? "سيظهر هنا أقرب موعد مؤكد لك." : "Your nearest confirmed appointment will appear here."}
                            empty={!nextAppointment}
                            onClick={() => onNavigate?.("appointments")}
                        />
                        <DataCard
                            icon={Brain}
                            tone="cyan"
                            label={language === "ar" ? "آخر تشخيص ذكي" : "Latest smart diagnosis"}
                            title={latestDiagnosis?.title || (language === "ar" ? "لم يتم إجراء تشخيص ذكي بعد" : "No smart diagnosis yet")}
                            detail={latestDiagnosis ? [diagnosisClinic, formatDate(latestDiagnosis.createdAt, language)].filter(Boolean).join(" · ") : language === "ar" ? "ابدأ التشخيص الذكي عند الحاجة." : "Start a smart diagnosis when needed."}
                            empty={!latestDiagnosis}
                            onClick={() => onNavigate?.(latestDiagnosis ? "ai-diagnosis" : "ai-diagnosis")}
                        />
                        <DataCard
                            icon={FileText}
                            tone="emerald"
                            label={language === "ar" ? "الخطة العلاجية" : "Treatment plan"}
                            title={treatmentPlan?.title || (language === "ar" ? "لا توجد خطة علاجية حتى الآن" : "No treatment plan yet")}
                            detail={treatmentPlan ? [getTreatmentStatus(treatmentPlan, language), treatmentPlan.doctorName].filter(Boolean).join(" · ") : language === "ar" ? "ستظهر الخطة عند توفرها في النظام." : "Your plan will appear once available."}
                            empty={!treatmentPlan}
                            onClick={() => onNavigate?.("treatment-plans")}
                        />
                        <DataCard
                            icon={Pill}
                            tone="amber"
                            label={language === "ar" ? "الأدوية اليوم" : "Today's medications"}
                            title={
                                summary?.medications.activeCount
                                    ? language === "ar"
                                        ? `${summary.medications.activeCount} أدوية نشطة`
                                        : `${summary.medications.activeCount} active medications`
                                    : language === "ar"
                                        ? "لا توجد أدوية نشطة"
                                        : "No active medications"
                            }
                            detail={
                                summary?.medications.todayDosesCount
                                    ? language === "ar"
                                        ? `${summary.medications.todayDosesCount} جرعات مسجلة لليوم`
                                        : `${summary.medications.todayDosesCount} doses scheduled today`
                                    : language === "ar"
                                        ? "لا توجد جرعات مسجلة اليوم."
                                        : "No doses scheduled today."
                            }
                            empty={!summary?.medications.activeCount}
                            onClick={() => onNavigate?.("medications")}
                        />
                    </section>

                    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <StatCard
                            icon={Calendar}
                            title={language === "ar" ? "ملخص المواعيد" : "Appointment summary"}
                            value={language === "ar"
                                ? `${summary?.appointmentStats.upcomingCount || 0} قادمة · ${summary?.appointmentStats.completedCount || 0} مكتملة`
                                : `${summary?.appointmentStats.upcomingCount || 0} upcoming · ${summary?.appointmentStats.completedCount || 0} completed`}
                            detail={language === "ar" ? "محسوبة من مواعيدك فقط" : "Calculated from your appointments only"}
                            onClick={() => onNavigate?.("appointments")}
                        />
                        <StatCard
                            icon={Bell}
                            title={language === "ar" ? "الإشعارات غير المقروءة" : "Unread notifications"}
                            value={summary?.notifications.unreadCount || 0}
                            detail={language === "ar" ? "من إشعاراتك الفعلية" : "From your actual notifications"}
                            onClick={() => onNavigate?.("notifications")}
                        />
                        <StatCard
                            icon={CreditCard}
                            title={language === "ar" ? "الرصيد المستحق" : "Balance due"}
                            value={`${formatMoney(summary?.balance.balance, language)} ${language === "ar" ? "جنيه مصري" : "EGP"}`}
                            detail={language === "ar" ? "من بيانات الجلسات والمدفوعات" : "From sessions and payments"}
                            onClick={() => onNavigate?.("payment")}
                        />
                    </section>

                    <section className="rounded-xl border border-slate-100 bg-white p-5 text-start shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                                <TrendingUp className="h-5 w-5 text-teal-600" />
                                {language === "ar" ? "مراحل الخطة العلاجية" : "Treatment plan stages"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => onNavigate?.("treatment-plans")}
                                className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                            >
                                {language === "ar" ? "عرض التفاصيل" : "View details"}
                            </button>
                        </div>

                        {!treatmentPlan ? (
                            <div className="rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                                {language === "ar" ? "لا توجد خطة علاجية مسجلة حتى الآن." : "No treatment plan is registered yet."}
                            </div>
                        ) : procedures.length === 0 ? (
                            <div className="rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
                                {language === "ar" ? "لا توجد مراحل علاجية مسجلة لهذه الخطة." : "No treatment stages are registered for this plan."}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {procedures.slice(0, 4).map((procedure, index) => (
                                    <div key={procedure.id || `${procedure.name}-${index}`} className="flex items-center gap-4 rounded-lg border border-slate-100 p-4 dark:border-slate-700">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-900 dark:text-white">{procedure.name}</p>
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getStatusLabel(procedure.status, language)}</p>
                                        </div>
                                        {procedure.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </motion.div>
    );
}

export default function HomePage(props: HomePageProps) {
    const isMedicalStaff = ["doctor", "student", "graduate"].includes(props.userType);

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
