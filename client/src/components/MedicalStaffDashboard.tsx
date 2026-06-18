import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertCircle,
    Bell,
    Calendar,
    Clock,
    DollarSign,
    RefreshCw,
    TrendingUp,
    Users,
} from "lucide-react";
import { apiGet } from "@/services/api";

interface MedicalStaffDashboardProps {
    userName: string;
    userType: string;
    userId?: string;
    onNavigate?: (page: string) => void;
    language?: "ar" | "en";
}

interface DoctorDashboardAppointment {
    id: string;
    time?: string | null;
    date?: string | null;
    status?: string | null;
    type?: string | null;
    patientName?: string | null;
    clinicName?: string | null;
}

interface DoctorDashboardNotification {
    id: string;
    title?: string | null;
    message?: string | null;
    titleEn?: string | null;
    messageEn?: string | null;
    type?: string | null;
    read?: boolean;
    createdAt?: string | Date | null;
}

interface DoctorDashboardSummary {
    doctor: {
        id: string;
        fullName?: string | null;
        specialization?: string | null;
        clinicId?: string | null;
    };
    summary: {
        todayPatientsCount: number;
        todayAppointmentsCount: number;
        waitingCount: number;
        todayRevenue: number;
        todayRevenueAvailable: boolean;
        monthRevenue: number;
        monthRevenueAvailable: boolean;
        unreadNotificationsCount: number;
    };
    todayAppointments: DoctorDashboardAppointment[];
    notifications: DoctorDashboardNotification[];
}

export default function MedicalStaffDashboard({
    userName,
    userType,
    userId,
    onNavigate,
    language = "ar",
}: MedicalStaffDashboardProps) {
    const today = new Date();
    const isDoctor = userType === "doctor";
    const isMedicalStaff = userType === "doctor" || userType === "graduate";
    const [dashboard, setDashboard] = useState<DoctorDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!isMedicalStaff) {
            setLoading(false);
            setError(language === "ar" ? "هذه اللوحة متاحة للفريق الطبي فقط" : "This dashboard is only available to medical staff");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await apiGet<DoctorDashboardSummary>("/dashboard/doctor-summary");
            setDashboard(response.data);
        } catch (err) {
            console.error("Failed to fetch doctor dashboard data:", err);
            setError(language === "ar" ? "تعذر تحميل بيانات لوحة الطبيب" : "Unable to load doctor dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userType, language]);

    const dayNames = language === "ar"
        ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
        : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const monthNames = language === "ar"
        ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
        : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const greeting = () => {
        const hour = today.getHours();
        if (language === "ar") {
            return hour < 12 ? "صباح الخير" : "مساء الخير";
        }
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const doctorName = dashboard?.doctor.fullName || userName;
    const summary = dashboard?.summary;
    const todayAppointments = dashboard?.todayAppointments ?? [];
    const notifications = dashboard?.notifications ?? [];

    const quickActions = [
        { icon: <Calendar className="w-5 h-5" />, label: language === "ar" ? "مواعيد اليوم" : "Today's Schedule", page: "today-appointments", color: "bg-teal-500" },
        { icon: <Users className="w-5 h-5" />, label: language === "ar" ? "المرضى" : "Patients", page: "patients", color: "bg-blue-500" },
        { icon: <Activity className="w-5 h-5" />, label: language === "ar" ? "التقارير" : "Reports", page: "reports", color: "bg-purple-500" },
        ...(isDoctor ? [{ icon: <DollarSign className="w-5 h-5" />, label: language === "ar" ? "الأسعار" : "Pricing", page: "price-management", color: "bg-amber-500" }] : []),
    ];

    const formatCurrency = (amount?: number, available = true) => {
        if (!available) return language === "ar" ? "غير متاح" : "Unavailable";
        return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
            maximumFractionDigits: 0,
        }).format(amount ?? 0);
    };

    const formatNotificationDate = (value?: string | Date | null) => {
        if (!value) return language === "ar" ? "تاريخ غير محدد" : "Unknown date";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return language === "ar" ? "تاريخ غير محدد" : "Unknown date";
        return date.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const getStatusBadge = (status?: string | null) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">{language === "ar" ? "مكتمل" : "Done"}</Badge>;
            case "in-progress":
            case "in_progress":
            case "checked_in":
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">{language === "ar" ? "جاري" : "Active"}</Badge>;
            case "scheduled":
            case "confirmed":
                return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30">{language === "ar" ? "مجدول" : "Scheduled"}</Badge>;
            case "waiting":
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30">{language === "ar" ? "في الانتظار" : "Waiting"}</Badge>;
            default:
                return <Badge variant="outline">{language === "ar" ? "غير محدد" : "Unknown"}</Badge>;
        }
    };

    const getNotificationText = (notification: DoctorDashboardNotification) => {
        if (language === "en") {
            return notification.messageEn || notification.message || notification.titleEn || notification.title || "Notification";
        }
        return notification.message || notification.title || notification.messageEn || notification.titleEn || "إشعار";
    };

    if (error && !loading) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="p-8 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {language === "ar" ? "تعذر تحميل لوحة الطبيب" : "Unable to load dashboard"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {language === "ar" ? "إعادة المحاولة" : "Retry"}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-l from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg"
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="text-start">
                        <p className="text-teal-100 text-sm mb-1">
                            {dayNames[today.getDay()]}، {today.getDate()} {monthNames[today.getMonth()]} {today.getFullYear()}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold mb-2">
                            {greeting()}، {isDoctor && language === "ar" ? "دكتور " : ""}{doctorName}
                        </h1>
                        <p className="text-teal-100">
                            {loading
                                ? language === "ar" ? "جاري تحميل بياناتك الفعلية..." : "Loading your real dashboard data..."
                                : summary?.todayAppointmentsCount
                                    ? language === "ar"
                                        ? `لديك ${summary.todayAppointmentsCount} موعد اليوم، منهم ${summary.waitingCount} في الانتظار`
                                        : `You have ${summary.todayAppointmentsCount} appointment(s) today, ${summary.waitingCount} waiting`
                                    : language === "ar"
                                        ? "لا توجد مواعيد مسجلة لك اليوم"
                                        : "No appointments assigned to you today"}
                        </p>
                    </div>
                    <div className="hidden md:flex w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                        <Activity className="w-8 h-8" />
                    </div>
                </div>
            </motion.div>

            <div className={`grid grid-cols-2 ${isDoctor ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all text-start w-full"
                    onClick={() => onNavigate?.("today-appointments")}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {language === "ar" ? "مرضى اليوم" : "Today's Patients"}
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">
                        {loading ? "..." : summary?.todayPatientsCount ?? 0}
                    </p>
                    <p className="text-sm text-teal-600 dark:text-teal-400">
                        {language === "ar" ? "مرضى مرتبطون بمواعيدك" : "patients from your schedule"}
                    </p>
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all text-start w-full"
                    onClick={() => onNavigate?.("today-appointments")}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {language === "ar" ? "قائمة الانتظار" : "Queue"}
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800 dark:text-white">
                        {loading ? "..." : summary?.waitingCount ?? 0}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        {language === "ar" ? "حالات بانتظار الإجراء" : "waiting/in-progress cases"}
                    </p>
                </motion.button>

                {isDoctor && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 text-start">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {language === "ar" ? "إيرادات اليوم" : "Today's Revenue"}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white">
                            {loading ? "..." : formatCurrency(summary?.todayRevenue, summary?.todayRevenueAvailable)}
                        </p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{language === "ar" ? "جنيه مصري" : "EGP"}</p>
                    </div>
                )}

                {isDoctor && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 text-start">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {language === "ar" ? "إيرادات الشهر" : "Monthly Revenue"}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800 dark:text-white">
                            {loading ? "..." : formatCurrency(summary?.monthRevenue, summary?.monthRevenueAvailable)}
                        </p>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                            {language === "ar" ? "من الجلسات المدفوعة المرتبطة بك" : "from paid sessions linked to you"}
                        </p>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-teal-500" />
                        {language === "ar" ? "إجراءات سريعة" : "Quick Actions"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {quickActions.map((action) => (
                            <Button
                                key={action.page}
                                variant="outline"
                                className="h-auto flex-col gap-2 p-4"
                                onClick={() => onNavigate?.(action.page)}
                            >
                                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                                    {action.icon}
                                </div>
                                <span className="text-xs">{action.label}</span>
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            {language === "ar" ? "جدول اليوم" : "Today's Schedule"}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigate?.("today-appointments")}
                        >
                            {language === "ar" ? "عرض الكل" : "View All"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        </div>
                    ) : todayAppointments.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{language === "ar" ? "لا توجد مواعيد مسجلة لك اليوم" : "No appointments assigned to you today"}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todayAppointments.map((appointment) => {
                                const patientName = appointment.patientName || (language === "ar" ? "مريض غير محدد" : "Unknown patient");
                                const clinicName = appointment.clinicName || (language === "ar" ? "عيادة غير محددة" : "Unknown clinic");
                                const time = appointment.time || (language === "ar" ? "وقت غير محدد" : "Unknown time");

                                return (
                                    <div
                                        key={appointment.id}
                                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0">
                                                {patientName[0]?.toUpperCase() || "P"}
                                            </div>
                                            <div className="min-w-0 text-start">
                                                <p className="font-semibold text-slate-800 dark:text-white truncate">{patientName}</p>
                                                <p className="text-xs text-slate-500 truncate">{clinicName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">{time}</span>
                                            {getStatusBadge(appointment.status)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            {language === "ar" ? "الإشعارات" : "Notifications"}
                        </CardTitle>
                        {!loading && (
                            <Badge variant="outline">
                                {summary?.unreadNotificationsCount ?? 0} {language === "ar" ? "غير مقروء" : "unread"}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>{language === "ar" ? "لا توجد إشعارات جديدة" : "No notifications"}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => {
                                const isUrgent = notification.type === "urgent" || notification.type === "emergency";
                                return (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg ${isUrgent
                                            ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                                            : "bg-slate-50 dark:bg-slate-800/50"
                                            }`}
                                    >
                                        {isUrgent && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                                        <div className="flex-1 text-start">
                                            <p className={`text-sm ${isUrgent ? "text-red-900 dark:text-red-100 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                                                {getNotificationText(notification)}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{formatNotificationDate(notification.createdAt)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
