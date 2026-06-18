import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface Notification {
  id: string;
  type: "appointment" | "message" | "payment" | "general" | "system";
  title: string;
  message: string;
  titleEn?: string;
  messageEn?: string;
  createdAt: string;
  read: boolean;
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/v1/notifications", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

async function markAllReadApi(): Promise<void> {
  await fetch("/api/v1/notifications/read-all", { method: "PATCH", credentials: "include" });
}

async function deleteNotificationApi(id: string): Promise<void> {
  await fetch(`/api/v1/notifications/${id}`, { method: "DELETE", credentials: "include" });
}

async function markAsReadApi(id: string): Promise<void> {
  await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  appointment: <Clock className="h-4 w-4 text-blue-600" />,
  message: <Bell className="h-4 w-4 text-teal-600" />,
  payment: <AlertCircle className="h-4 w-4 text-amber-600" />,
  system: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  general: <CheckCircle2 className="h-4 w-4 text-slate-500" />,
};

const TYPE_COLORS: Record<string, string> = {
  appointment: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  message: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
  payment: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  system: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  general: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
};

function formatDate(dateStr: string, language: "ar" | "en"): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function NotificationsPage() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");

  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotificationApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: markAsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = notifications.filter(
    (n) => filterType === "all" || n.type === filterType
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  const FILTER_LABELS = {
    all: language === "ar" ? "الكل" : "All",
    appointment: language === "ar" ? "مواعيد" : "Appointments",
    message: language === "ar" ? "رسائل" : "Messages",
    payment: language === "ar" ? "دفع" : "Payments",
    system: language === "ar" ? "النظام" : "System",
    general: language === "ar" ? "عام" : "General",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-destructive gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>{language === "ar" ? "فشل في تحميل الإشعارات" : "Failed to load notifications"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            {language === "ar" ? "الإشعارات" : "Notifications"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? (language === "ar" ? `لديك ${unreadCount} إشعار غير مقروء` : `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`)
              : (language === "ar" ? "كل الإشعارات مقروءة" : "All caught up!")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            {language === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map((key) => (
          <Button
            key={key}
            variant={filterType === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(key)}
          >
            {FILTER_LABELS[key]}
            {key !== "all" && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {notifications.filter((n) => n.type === key).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {language === "ar" ? "لا توجد إشعارات" : "No notifications here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            (() => {
              const title = language === "en" && notification.titleEn ? notification.titleEn : notification.title;
              const message = language === "en" && notification.messageEn ? notification.messageEn : notification.message;

              return (
            <Card
              key={notification.id}
              className={`border transition-all ${TYPE_COLORS[notification.type] || TYPE_COLORS.general} ${!notification.read ? "shadow-sm" : "opacity-80"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {TYPE_ICONS[notification.type] || TYPE_ICONS.general}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm ${!notification.read ? "font-bold" : "font-medium"} text-slate-800 dark:text-white`}>
                        {title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.createdAt, language)}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={language === "ar" ? "تحديد كمقروء" : "Mark as read"}
                        onClick={() => markReadMutation.mutate(notification.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title={language === "ar" ? "حذف" : "Delete"}
                      onClick={() => deleteMutation.mutate(notification.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}
