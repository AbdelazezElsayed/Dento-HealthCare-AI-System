import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Download, Eye, Calendar, User, AlertCircle, Pill, Bell, Clock,
  IdCard, Check, Zap, CheckCircle, RefreshCw, ShieldCheck, ClipboardList,
  AlertTriangle, Inbox
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiGet } from "@/services/api";

interface MedicalRecord {
  id: string;
  type: string;
  typeEn?: string;
  date: string;
  doctor: string;
  doctorEn?: string;
  clinic: string;
  clinicEn?: string;
  description: string;
  descriptionEn?: string;
  findings: string;
  findingsEn?: string;
  recommendations: string;
  recommendationsEn?: string;
  status: "normal" | "alert" | "follow-up";
  followUpDate?: string;
}

interface Medication {
  id: string;
  name: string;
  nameEn?: string;
  dosage: string;
  frequency: string;
  frequencyEn?: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  purpose: string;
  purposeEn?: string;
  reminderTime?: string;
}

interface FollowUpAlert {
  id: string;
  title: string;
  titleEn?: string;
  dueDate: string;
  type: "checkup" | "test" | "review";
  priority: "low" | "medium" | "high";
  description: string;
  descriptionEn?: string;
  status: "pending" | "completed";
}

interface PatientData {
  _id: string;
  fullName: string;
  bloodType?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  insuranceStatus?: string;
  userId: string;
}

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function to calculate days until due date and get urgency level
const getDaysUntil = (dueDate: string): { days: number; level: "urgent" | "warning" | "normal" } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diff <= 3) return { days: Math.ceil(diff), level: "urgent" };
  if (diff <= 7) return { days: Math.ceil(diff), level: "warning" };
  return { days: Math.ceil(diff), level: "normal" };
};

const getCountdownText = (daysInfo: { days: number; level: string }, language: "ar" | "en"): string => {
  if (language === "ar") {
    if (daysInfo.days === 0) return "اليوم";
    if (daysInfo.days === 1) return "غداً";
    if (daysInfo.days < 0) return "متأخر";
    return `في ${daysInfo.days} أيام`;
  } else {
    if (daysInfo.days === 0) return "Today";
    if (daysInfo.days === 1) return "Tomorrow";
    if (daysInfo.days < 0) return "Overdue";
    return `In ${daysInfo.days} days`;
  }
};

export default function MedicalRecordsPage() {
  const { user, userId } = useAuth();
  const { language } = useLanguage();

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [followUpAlerts, setFollowUpAlerts] = useState<FollowUpAlert[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("records");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Translations object
  const t = {
    pageTitle: {
      ar: "الملف الطبي الشامل",
      en: "Comprehensive Medical Record"
    },
    pageDescription: {
      ar: "سجلاتك الطبية، أدويتك، والتنبيهات المهمة",
      en: "Your medical records, medications, and important alerts"
    },
    digitalIdCard: {
      ar: "بطاقة هوية المريض الرقمية",
      en: "Digital Patient ID Card"
    },
    registrationNumber: {
      ar: "رقم التسجيل",
      en: "Registration #"
    },
    bloodType: {
      ar: "مجموعة الدم",
      en: "Blood Type"
    },
    age: {
      ar: "العمر",
      en: "Age"
    },
    years: {
      ar: "سنة",
      en: "years"
    },
    insuranceStatus: {
      ar: "حالة التأمين",
      en: "Insurance Status"
    },
    active: {
      ar: "نشط",
      en: "Active"
    },
    lastUpdate: {
      ar: "آخر تحديث",
      en: "Last Update"
    },
    tabs: {
      records: { ar: "السجلات", en: "Records" },
      medications: { ar: "الأدوية", en: "Medications" },
      followups: { ar: "المتابعات", en: "Follow-ups" },
      reminders: { ar: "التنبيهات", en: "Reminders" }
    },
    totalRecords: {
      ar: "إجمالي السجلات",
      en: "Total Records"
    },
    lastCheckup: {
      ar: "آخر فحص",
      en: "Last Checkup"
    },
    alerts: {
      ar: "تنبيهات",
      en: "Alerts"
    },
    followUps: {
      ar: "متابعات",
      en: "Follow-ups"
    },
    filters: {
      all: { ar: "الكل", en: "All" },
      checkups: { ar: "فحوصات", en: "Checkups" },
      xrays: { ar: "أشعة", en: "X-Rays" },
      alertsFilter: { ar: "تنبيهات", en: "Alerts" }
    },
    status: {
      alert: { ar: "تنبيه", en: "Alert" },
      followUp: { ar: "متابعة", en: "Follow-up" },
      normal: { ar: "عادي", en: "Normal" }
    },
    buttons: {
      view: { ar: "عرض", en: "View" },
      download: { ar: "تحميل", en: "Download" },
      stop: { ar: "إيقاف", en: "Stop" },
      done: { ar: "تم", en: "Done" },
      retry: { ar: "إعادة المحاولة", en: "Retry" }
    },
    fields: {
      description: { ar: "الوصف", en: "Description" },
      findings: { ar: "الملاحظات", en: "Findings" },
      recommendations: { ar: "التوصيات", en: "Recommendations" },
      dosage: { ar: "الجرعة", en: "Dosage" },
      frequency: { ar: "المعدل", en: "Frequency" },
      purpose: { ar: "الغرض", en: "Purpose" },
      prescribedBy: { ar: "وصفها", en: "Prescribed By" },
      dueDate: { ar: "الموعد", en: "Due Date" }
    },
    urgency: {
      urgent: { ar: "عاجل جداً", en: "Very Urgent" },
      warning: { ar: "قريب", en: "Soon" },
      normal: { ar: "طبيعي", en: "Normal" }
    },
    dailyReminder: {
      ar: "تذكير يومي في",
      en: "Daily reminder at"
    },
    scheduledReminders: {
      ar: "التنبيهات المجدولة",
      en: "Scheduled Reminders"
    },
    takeMedication: {
      ar: "تناول",
      en: "Take"
    },
    daily: {
      ar: "يومياً",
      en: "Daily"
    },
    loading: {
      ar: "جاري التحميل...",
      en: "Loading..."
    },
    error: {
      ar: "حدث خطأ في تحميل البيانات",
      en: "Error loading data"
    },
    empty: {
      records: {
        ar: "لا توجد سجلات طبية",
        en: "No Medical Records"
      },
      recordsDesc: {
        ar: "لم يتم إنشاء أي سجلات طبية بعد. قم بزيارة عيادة لبدء رحلتك الصحية.",
        en: "No medical records have been created yet. Visit a clinic to start your health journey."
      },
      medications: {
        ar: "لا توجد أدوية",
        en: "No Medications"
      },
      medicationsDesc: {
        ar: "لا يوجد لديك أدوية موصوفة حالياً.",
        en: "You don't have any prescribed medications currently."
      },
      followups: {
        ar: "لا توجد متابعات",
        en: "No Follow-ups"
      },
      followupsDesc: {
        ar: "لا توجد لديك مواعيد متابعة قادمة.",
        en: "You don't have any upcoming follow-up appointments."
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch patient data from API
        const patientRes = await apiGet<PatientData>(`/patients/user/${userId}`);
        if (patientRes.success && patientRes.data) {
          const pData = patientRes.data;
          setPatientData(pData);
          const patientId = pData._id || (pData as any).id;
          
          if (patientId) {
            const [recordsRes, medsRes] = await Promise.all([
              apiGet<any[]>(`/patients/${patientId}/medical-records`),
              apiGet<any[]>(`/patients/${patientId}/medications`)
            ]);

            if (recordsRes.success && recordsRes.data) {
              setRecords(recordsRes.data.map(r => ({
                id: r.id || r._id,
                type: r.diagnosis || "سجل طبي",
                typeEn: "Medical Record",
                date: r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                doctor: r.doctorName || "طبيب",
                doctorEn: "Doctor",
                clinic: "عيادة الأسنان",
                clinicEn: "Dental Clinic",
                description: r.chiefComplaint || "",
                descriptionEn: r.chiefComplaint || "",
                findings: r.treatmentProvided || "",
                findingsEn: r.treatmentProvided || "",
                recommendations: r.notes || r.nextStep || "",
                recommendationsEn: r.notes || r.nextStep || "",
                status: "normal"
              })));
            } else {
              setRecords([]);
            }

            if (medsRes.success && medsRes.data) {
              setMedications(medsRes.data.map(m => ({
                id: m.id || m._id,
                name: m.name,
                nameEn: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                frequencyEn: m.frequency,
                startDate: m.startDate ? new Date(m.startDate).toISOString().split('T')[0] : "",
                endDate: m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : undefined,
                prescribedBy: "طبيب الأسنان",
                purpose: m.instructions || "",
                purposeEn: m.instructions || ""
              })));
            } else {
              setMedications([]);
            }
            
            setFollowUpAlerts([]);
          }
        }

      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-96 mb-2" />
          <Skeleton className="h-6 w-[600px]" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <ClipboardList className="h-10 w-10 text-primary" />
            {t.pageTitle[language]}
          </h1>
          <p className="text-muted-foreground text-lg">{t.pageDescription[language]}</p>
        </div>
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{t.error[language]}</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                {t.buttons.retry[language]}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userDisplayName = patientData?.fullName || user?.fullName || user?.email || (language === "ar" ? "مستخدم" : "User");
  const age = patientData?.dateOfBirth ? calculateAge(patientData.dateOfBirth) : null;
  const registrationNumber = patientData?._id ? `#${patientData._id.slice(-8).toUpperCase()}` : "#--------";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <ClipboardList className="h-10 w-10 text-primary" />
          {t.pageTitle[language]}
        </h1>
        <p className="text-muted-foreground text-lg">{t.pageDescription[language]}</p>
      </div>

      {/* Enhanced Digital ID Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-blue-50 dark:from-primary/20 dark:via-primary/10 dark:to-blue-900/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-4 rounded-xl">
                <IdCard className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t.digitalIdCard[language]}</p>
                <h3 className="text-3xl font-bold mb-1">{userDisplayName}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.registrationNumber[language]}: {registrationNumber}
                </p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground">{t.bloodType[language]}</p>
              <p className="text-2xl font-bold text-primary">{patientData?.bloodType || "N/A"}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.age[language]}</p>
              <p className="font-semibold">
                {age !== null ? `${age} ${t.years[language]}` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.insuranceStatus[language]}</p>
              <Badge variant="default" className="text-xs gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t.active[language]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t.lastUpdate[language]}</p>
              <p className="text-sm">{new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">{t.tabs.records[language]}</TabsTrigger>
          <TabsTrigger value="medications" className="gap-1">
            <Pill className="h-4 w-4" />
            {t.tabs.medications[language]} ({medications.length})
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1">
            <Bell className="h-4 w-4" />
            {t.tabs.followups[language]} ({followUpAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="reminders">{t.tabs.reminders[language]}</TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t.totalRecords[language]}</p>
                  <p className="text-3xl font-bold text-primary">{records.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.lastUpdate[language]}: {language === "ar" ? "اليوم" : "Today"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t.lastCheckup[language]}</p>
                  <p className="text-lg font-semibold">
                    {records.length > 0 ? records[0].date : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {records.length > 0 ? (language === "ar" ? records[0].doctor : records[0].doctorEn || records[0].doctor) : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-6">
                <div className="space-y-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-yellow-900 dark:text-yellow-100 font-semibold">
                      {t.alerts[language]}
                    </p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      {followUpAlerts.filter(a => a.status === "pending").length} {t.followUps[language]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              {t.filters.all[language]}
            </Button>
            <Button
              variant={filterType === "فحص عام" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("فحص عام")}
            >
              {t.filters.checkups[language]}
            </Button>
            <Button
              variant={filterType === "أشعة سينية" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("أشعة سينية")}
            >
              {t.filters.xrays[language]}
            </Button>
            <Button
              variant={filterStatus === "alert" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(filterStatus === "alert" ? "all" : "alert")}
              className={filterStatus === "alert" ? "bg-red-600" : ""}
            >
              {t.filters.alertsFilter[language]}
            </Button>
          </div>

          {/* Medical Records */}
          {records.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Inbox className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t.empty.records[language]}</h3>
                <p className="text-muted-foreground">{t.empty.recordsDesc[language]}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {records.filter(r =>
                (filterType === "all" || r.type === filterType) &&
                (filterStatus === "all" || r.status === filterStatus)
              ).map(record => (
                <Card
                  key={record.id}
                  className={`${record.status === "alert" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10" : ""}`}
                  role="article"
                  aria-label={`${language === "ar" ? "السجل الطبي" : "Medical Record"}: ${language === "ar" ? record.type : record.typeEn || record.type} - ${record.status}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <FileText className={`h-5 w-5 ${record.status === "alert" ? "text-red-600" : "text-primary"}`} />
                            <h3 className="text-lg font-bold">
                              {language === "ar" ? record.type : record.typeEn || record.type}
                            </h3>
                            {record.status === "alert" && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {t.status.alert[language]}
                              </Badge>
                            )}
                            {record.status === "follow-up" && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {t.status.followUp[language]}
                              </Badge>
                            )}
                            {record.status === "normal" && (
                              <Badge variant="default" className="text-xs gap-1">
                                <CheckCircle className="h-3 w-3" />
                                {t.status.normal[language]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {record.date}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {language === "ar" ? record.doctor : record.doctorEn || record.doctor}
                            </div>
                            <Badge variant="secondary">
                              {language === "ar" ? record.clinic : record.clinicEn || record.clinic}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Eye className="h-4 w-4" />
                            {t.buttons.view[language]}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            {t.buttons.download[language]}
                          </Button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3 pt-4 border-t">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {t.fields.description[language]}
                          </p>
                          <p className="text-sm">
                            {language === "ar" ? record.description : record.descriptionEn || record.description}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {t.fields.findings[language]}
                          </p>
                          <p className="text-sm bg-muted p-2 rounded">
                            {language === "ar" ? record.findings : record.findingsEn || record.findings}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {t.fields.recommendations[language]}
                          </p>
                          <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                            {language === "ar" ? record.recommendations : record.recommendationsEn || record.recommendations}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="mt-6 space-y-4">
          {medications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Pill className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t.empty.medications[language]}</h3>
                <p className="text-muted-foreground">{t.empty.medicationsDesc[language]}</p>
              </CardContent>
            </Card>
          ) : (
            medications.map(med => (
              <Card key={med.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 flex-1">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg h-fit">
                        <Pill className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">
                          {language === "ar" ? med.name : med.nameEn || med.name}
                        </h3>
                        <div className="grid gap-2 mt-2 text-sm">
                          <p><strong>{t.fields.dosage[language]}:</strong> {med.dosage}</p>
                          <p><strong>{t.fields.frequency[language]}:</strong> {language === "ar" ? med.frequency : med.frequencyEn || med.frequency}</p>
                          <p><strong>{t.fields.purpose[language]}:</strong> {language === "ar" ? med.purpose : med.purposeEn || med.purpose}</p>
                          <p><strong>{t.fields.prescribedBy[language]}:</strong> {med.prescribedBy}</p>
                          {med.reminderTime && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <Clock className="h-4 w-4" />
                              {t.dailyReminder[language]} {med.reminderTime}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">{t.buttons.stop[language]}</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="mt-6 space-y-4">
          {followUpAlerts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t.empty.followups[language]}</h3>
                <p className="text-muted-foreground">{t.empty.followupsDesc[language]}</p>
              </CardContent>
            </Card>
          ) : (
            followUpAlerts.map(alert => {
              const daysInfo = getDaysUntil(alert.dueDate);
              const countdownText = getCountdownText(daysInfo, language);

              let borderColor = "border-gray-200 dark:border-gray-800";
              let bgColor = "bg-white dark:bg-slate-900";
              let badgeVariant: "default" | "destructive" | "secondary" = "secondary";
              let urgencyIcon = null;

              if (daysInfo.level === "urgent") {
                borderColor = "border-red-300 dark:border-red-700";
                bgColor = "bg-red-50 dark:bg-red-900/20";
                badgeVariant = "destructive";
                urgencyIcon = <Zap className="h-4 w-4 text-red-600" />;
              } else if (daysInfo.level === "warning") {
                borderColor = "border-yellow-300 dark:border-yellow-700";
                bgColor = "bg-yellow-50 dark:bg-yellow-900/20";
                urgencyIcon = <AlertCircle className="h-4 w-4 text-yellow-600" />;
              }

              return (
                <Card
                  key={alert.id}
                  className={`${borderColor} ${bgColor}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg">
                            {language === "ar" ? alert.title : alert.titleEn || alert.title}
                          </h3>
                          <Badge variant={badgeVariant} className="text-xs flex items-center gap-1">
                            {urgencyIcon}
                            {t.urgency[daysInfo.level][language]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === "ar" ? alert.description : alert.descriptionEn || alert.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{t.fields.dueDate[language]}: {alert.dueDate}</span>
                          </div>
                          <div className={`font-semibold px-3 py-1 rounded-full ${daysInfo.level === "urgent" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200" : daysInfo.level === "warning" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-200" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200"}`}>
                            {countdownText}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="gap-2">
                        <Check className="h-4 w-4" />
                        {t.buttons.done[language]}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.scheduledReminders[language]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {medications.filter(m => m.reminderTime).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === "ar" ? "لا توجد تنبيهات مجدولة" : "No scheduled reminders"}
                </div>
              ) : (
                medications.filter(m => m.reminderTime).map(med => (
                  <div key={med.id} className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                      <p className="font-semibold">
                        {t.takeMedication[language]} {language === "ar" ? med.name : med.nameEn || med.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {language === "ar" ? med.frequency : med.frequencyEn || med.frequency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{med.reminderTime}</p>
                      <p className="text-xs text-muted-foreground">{t.daily[language]}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
