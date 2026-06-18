import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, X, Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type DisplayStatus = "upcoming" | "completed" | "cancelled" | "missed";

interface ApiAppointment {
  id?: string;
  _id?: string;
  doctorId?: string;
  clinicId?: string;
  date?: string;
  time?: string;
  status?: string;
  notes?: string | null;
  type?: string;
  price?: number | string;
  doctor?: {
    fullName?: string;
    name?: string;
  };
  clinic?: {
    name?: string;
    nameAr?: string;
    nameEn?: string;
  };
}

interface Appointment {
  id: string;
  doctor: string;
  clinic: string;
  date: string;
  time: string;
  status: DisplayStatus;
  rawStatus: string;
  type: string;
  price: number | string;
}

const activeStatuses = new Set(["upcoming", "scheduled", "confirmed", "pending"]);

function normalizeStatus(status?: string): DisplayStatus {
  const normalized = (status || "scheduled").toLowerCase();
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized === "missed" || normalized === "no-show" || normalized === "no_show") return "missed";
  return "upcoming";
}

function canModifyAppointment(status: string) {
  return activeStatuses.has(status.toLowerCase());
}

function mapAppointment(appointment: ApiAppointment): Appointment {
  const id = appointment.id || appointment._id || "";
  const rawStatus = appointment.status || "scheduled";

  return {
    id,
    doctor: appointment.doctor?.fullName || appointment.doctor?.name || appointment.doctorId || "الطبيب",
    clinic: appointment.clinic?.nameAr || appointment.clinic?.name || appointment.clinic?.nameEn || appointment.clinicId || "العيادة",
    date: appointment.date || "",
    time: appointment.time || "",
    status: normalizeStatus(rawStatus),
    rawStatus,
    type: appointment.type || appointment.notes || "موعد طبي",
    price: appointment.price ?? "-",
  };
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/appointments", { credentials: "include" });
      if (!response.ok) {
        throw new Error("تعذر تحميل المواعيد");
      }

      const data: ApiAppointment[] = await response.json();
      setAppointments(data.map(mapAppointment).filter((appointment) => appointment.id));
    } catch (error: any) {
      toast({
        title: "حدث خطأ",
        description: error.message || "تعذر تحميل المواعيد",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filteredAppointments = appointments.filter((appointment) => {
    if (activeTab === "cancelled") {
      return appointment.status === "cancelled" || appointment.status === "missed";
    }
    return appointment.status === activeTab;
  });

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    try {
      setActionLoading(`cancel-${appointmentToCancel.id}`);
      const response = await fetch(`/api/appointments/${appointmentToCancel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "تعذر إلغاء الموعد");
      }

      toast({ title: "تم إلغاء الموعد", description: "تم تحديث قائمة مواعيدك" });
      setAppointmentToCancel(null);
      await fetchAppointments();
    } catch (error: any) {
      toast({
        title: "تعذر إلغاء الموعد",
        description: error.message || "حدث خطأ أثناء إلغاء الموعد",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setAppointmentToReschedule(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime(appointment.time);
  };

  const handleRescheduleAppointment = async () => {
    if (!appointmentToReschedule) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى اختيار التاريخ والوقت الجديدين",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(`reschedule-${appointmentToReschedule.id}`);
      const response = await fetch(`/api/appointments/${appointmentToReschedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: rescheduleDate,
          time: rescheduleTime,
          status: "scheduled",
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "تعذر إعادة جدولة الموعد");
      }

      toast({ title: "تمت إعادة الجدولة", description: "تم تحديث موعدك بنجاح" });
      setAppointmentToReschedule(null);
      await fetchAppointments();
    } catch (error: any) {
      toast({
        title: "تعذر إعادة الجدولة",
        description: error.message || "حدث خطأ أثناء إعادة جدولة الموعد",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "missed":
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Calendar className="h-4 w-4" />;
      case "completed":
        return <Check className="h-4 w-4" />;
      case "missed":
      case "cancelled":
        return <X className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "upcoming":
        return "قادم";
      case "completed":
        return "مكتمل";
      case "missed":
        return "لم يحضر";
      default:
        return "ملغى";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">مواعيدي</h1>
        <p className="text-muted-foreground">إدارة وتتبع جميع مواعيدك الطبية</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">القادمة</TabsTrigger>
          <TabsTrigger value="completed">المكتملة</TabsTrigger>
          <TabsTrigger value="cancelled">الملغاة</TabsTrigger>
        </TabsList>

        {["upcoming", "completed", "cancelled"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4 mt-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-muted-foreground">جاري تحميل المواعيد...</p>
                </CardContent>
              </Card>
            ) : filteredAppointments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">لا توجد مواعيد {
                    tab === "upcoming" ? "قادمة" : tab === "completed" ? "مكتملة" : "ملغاة"
                  }</p>
                </CardContent>
              </Card>
            ) : (
              filteredAppointments.map((appointment, idx) => {
                const canModify = canModifyAppointment(appointment.rawStatus);

                return (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="hover-elevate">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{appointment.doctor}</h3>
                            <p className="text-sm text-muted-foreground">{appointment.clinic}</p>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusIcon(appointment.status)}
                            <span className="ml-2">{getStatusLabel(appointment.status)}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>{appointment.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span>{appointment.clinic}</span>
                          </div>
                          <div className="text-sm font-semibold">{appointment.price} ج.م</div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">{appointment.type}</p>

                        <div className="flex gap-2">
                          {canModify && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                disabled={actionLoading === `reschedule-${appointment.id}`}
                                onClick={() => openRescheduleDialog(appointment)}
                                data-testid={`button-reschedule-${appointment.id}`}
                              >
                                إعادة جدولة
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === `cancel-${appointment.id}`}
                                onClick={() => setAppointmentToCancel(appointment)}
                                data-testid={`button-cancel-${appointment.id}`}
                              >
                                إلغاء
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" data-testid={`button-details-${appointment.id}`}>
                            التفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الموعد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء هذا الموعد؟ لا يمكن تنفيذ هذا الإجراء على المواعيد المكتملة أو الملغاة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={!!actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading?.startsWith("cancel-") ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!appointmentToReschedule} onOpenChange={(open) => !open && setAppointmentToReschedule(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة جدولة الموعد</DialogTitle>
            <DialogDescription>
              اختر التاريخ والوقت الجديدين للموعد.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">التاريخ الجديد</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                data-testid="input-reschedule-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">الوقت الجديد</Label>
              <Input
                id="reschedule-time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
                placeholder="10:00 AM"
                data-testid="input-reschedule-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointmentToReschedule(null)} disabled={!!actionLoading}>
              إلغاء
            </Button>
            <Button onClick={handleRescheduleAppointment} disabled={!!actionLoading}>
              {actionLoading?.startsWith("reschedule-") ? "جارٍ الحفظ..." : "حفظ الموعد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">نصيحة</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          تذكر: يمكنك إعادة جدولة موعدك قبل 24 ساعة من الموعد المحدد. إذا كان لديك أي استفسار، اتصل بنا على الرقم المرفق.
        </CardContent>
      </Card>
    </div>
  );
}
