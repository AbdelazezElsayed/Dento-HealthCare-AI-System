import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiGet, apiPost } from "@/services/api";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pill,
  RotateCcw,
  Stethoscope,
  Timer,
} from "lucide-react";

interface DoseTime {
  time: string;
  label?: string;
  instructions?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  reason?: string;
  notes?: string;
  doctorName?: string;
  status?: "active" | "completed" | "stopped";
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  doseTimes?: DoseTime[];
}

interface TodayDose {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  scheduledFor: string;
  label?: string;
  instructions?: string;
  doctorName?: string;
  status: "not_due" | "due" | "taken" | "missed";
  takenAt?: string | null;
}

interface MedicationPayload {
  medications: Medication[];
  todayDoses: TodayDose[];
  stats: {
    activeMedications: number;
    todayDoses: number;
    takenToday: number;
    remainingToday: number;
  };
}

const statusLabels = {
  active: "نشط",
  completed: "مكتمل",
  stopped: "متوقف",
};

const doseStatusLabels = {
  not_due: "لم يحن الموعد بعد",
  due: "حان موعد الجرعة",
  taken: "تم تناول الجرعة",
  missed: "فات موعد الجرعة",
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function getMedicationStatus(medication: Medication): "active" | "completed" | "stopped" {
  if (medication.status === "completed" || medication.status === "stopped") return medication.status;
  if (medication.isActive === false) return "stopped";
  return "active";
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Pill }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1 text-start">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MedicationsPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [payload, setPayload] = useState<MedicationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDoseId, setConfirmingDoseId] = useState<string | null>(null);

  const isRtl = language === "ar";

  const loadMedications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet<MedicationPayload>("/patients/me/medications");
      setPayload(response.data);
    } catch {
      setError("تعذر تحميل الأدوية الموصوفة. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const medications = payload?.medications ?? [];
  const todayDoses = payload?.todayDoses ?? [];
  const stats = payload?.stats ?? {
    activeMedications: 0,
    todayDoses: 0,
    takenToday: 0,
    remainingToday: 0,
  };

  const activeMedications = useMemo(
    () => medications.filter((medication) => getMedicationStatus(medication) === "active"),
    [medications]
  );
  const inactiveMedications = useMemo(
    () => medications.filter((medication) => getMedicationStatus(medication) !== "active"),
    [medications]
  );

  const confirmDose = async (dose: TodayDose) => {
    try {
      setConfirmingDoseId(dose.id);
      await apiPost(`/patients/me/medications/${dose.prescriptionId}/intake`, {
        scheduledFor: dose.scheduledFor,
      });
      toast({ title: "تم تسجيل الجرعة", description: "تم حفظ تأكيد تناول الجرعة بنجاح." });
      await loadMedications();
    } catch (err: any) {
      const message = err?.data?.message || "تعذر تسجيل الجرعة. يرجى المحاولة مرة أخرى.";
      toast({ title: "لم يتم تسجيل الجرعة", description: message, variant: "destructive" });
    } finally {
      setConfirmingDoseId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="space-y-2 text-start">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl" dir={isRtl ? "rtl" : "ltr"}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-4 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="text-xl font-bold text-red-900">تعذر تحميل أدويتك</h1>
            <p className="font-medium text-red-800">{error}</p>
            <Button onClick={loadMedications} variant="outline">
              <RotateCcw className="me-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasNoMedications = medications.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <header className="space-y-2 text-start">
        <h1 className="text-3xl font-bold text-slate-950">أدويتي</h1>
        <p className="font-medium text-muted-foreground">
          تابع أدويتك الموصوفة ومواعيد الجرعات اليومية.
        </p>
      </header>

      {hasNoMedications ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="rounded-full bg-primary/10 p-5 text-primary">
              <Pill className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-950">لا توجد أدوية موصوفة حاليًا</h2>
              <p className="max-w-xl font-medium text-muted-foreground">
                عند وصف الطبيب لأي دواء، سيظهر هنا مع مواعيد الجرعات والتعليمات الخاصة به.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/treatment-plans">عرض الخطة العلاجية</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="الأدوية النشطة" value={stats.activeMedications} icon={Pill} />
            <StatCard title="جرعات اليوم" value={stats.todayDoses} icon={Clock} />
            <StatCard title="تم تناولها اليوم" value={stats.takenToday} icon={CheckCircle2} />
            <StatCard title="المتبقية اليوم" value={stats.remainingToday} icon={Timer} />
          </div>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-primary" />
                جرعات اليوم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayDoses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center font-medium text-muted-foreground">
                  لا توجد جرعات مجدولة لهذا اليوم.
                </div>
              ) : todayDoses.map((dose) => {
                const isTaken = dose.status === "taken";
                const canConfirm = dose.status === "due" || dose.status === "missed";

                return (
                  <div key={dose.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-950">{dose.medicationName}</h3>
                          <Badge variant={dose.status === "missed" ? "destructive" : isTaken ? "default" : "secondary"}>
                            {doseStatusLabels[dose.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
                          <span>{dose.dosage}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-primary" />
                            {dose.scheduledTime}
                          </span>
                          {dose.doctorName && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              {dose.doctorName}
                            </span>
                          )}
                        </div>
                        {dose.instructions && <p className="text-sm font-medium text-muted-foreground">{dose.instructions}</p>}
                        {isTaken && dose.takenAt && (
                          <p className="text-sm font-semibold text-green-700">تم تناول الجرعة الساعة {formatTime(dose.takenAt)}</p>
                        )}
                      </div>
                      <Button
                        onClick={() => confirmDose(dose)}
                        disabled={!canConfirm || confirmingDoseId === dose.id}
                        className="min-w-36"
                        variant={isTaken ? "outline" : "default"}
                      >
                        {isTaken ? "تم التأكيد" : confirmingDoseId === dose.id ? "جاري التسجيل..." : "تم تناول الجرعة"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Pill className="h-5 w-5 text-primary" />
                الأدوية النشطة
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {activeMedications.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed p-8 text-center font-medium text-muted-foreground">
                  لا توجد أدوية نشطة حاليًا.
                </div>
              ) : activeMedications.map((medication) => (
                <MedicationCard key={medication.id} medication={medication} />
              ))}
            </CardContent>
          </Card>

          {inactiveMedications.length > 0 && (
            <Card className="border-slate-200 bg-white/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
                  <CheckCircle2 className="h-5 w-5 text-slate-500" />
                  أدوية مكتملة أو متوقفة
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {inactiveMedications.map((medication) => (
                  <MedicationCard key={medication.id} medication={medication} muted />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MedicationCard({ medication, muted = false }: { medication: Medication; muted?: boolean }) {
  const status = getMedicationStatus(medication);
  const doseTimes = medication.doseTimes ?? [];

  return (
    <div className={`rounded-xl border p-4 text-start ${muted ? "border-slate-200 bg-slate-50 opacity-80" : "border-primary/15 bg-primary/5"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{medication.name}</h3>
          <p className="font-medium text-slate-700">{medication.dosage} — {medication.frequency}</p>
        </div>
        <Badge variant={status === "active" ? "default" : "secondary"}>{statusLabels[status]}</Badge>
      </div>

      <div className="space-y-3 text-sm font-medium text-slate-700">
        {doseTimes.length > 0 && (
          <div>
            <p className="mb-1 font-semibold text-slate-900">مواعيد الجرعات</p>
            <div className="flex flex-wrap gap-2">
              {doseTimes.map((dose) => (
                <Badge key={`${medication.id}-${dose.time}-${dose.label}`} variant="outline" className="bg-white">
                  {dose.label ? `${dose.label} — ` : ""}{dose.time}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {medication.startDate && (
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              البداية: {formatDate(medication.startDate)}
            </span>
          )}
          {medication.endDate && (
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              النهاية: {formatDate(medication.endDate)}
            </span>
          )}
          {medication.doctorName && (
            <span className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              وصفه: {medication.doctorName}
            </span>
          )}
          {medication.duration && <span>المدة: {medication.duration}</span>}
        </div>

        {medication.reason && <p><span className="font-semibold text-slate-900">السبب: </span>{medication.reason}</p>}
        {medication.instructions && <p><span className="font-semibold text-slate-900">التعليمات: </span>{medication.instructions}</p>}
        {medication.notes && <p><span className="font-semibold text-slate-900">ملاحظات: </span>{medication.notes}</p>}
      </div>
    </div>
  );
}
