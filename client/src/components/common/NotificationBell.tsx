import { useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Notification {
    id: string;
    title: string;
    message: string;
    titleEn?: string;
    messageEn?: string;
    createdAt: string;
    type: "appointment" | "message" | "payment" | "general" | "system";
    read: boolean;
}

interface NotificationBellProps {
    language?: "ar" | "en";
    onNotificationClick?: (type: string) => void;
}

async function fetchNotifications(): Promise<Notification[]> {
    const res = await fetch("/api/v1/notifications", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
}

async function markAsReadApi(id: string): Promise<void> {
    await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
    });
}

async function markAllAsReadApi(): Promise<void> {
    await fetch("/api/v1/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
    });
}

async function deleteNotificationApi(id: string): Promise<void> {
    await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
}

function formatTime(dateStr: string, language: "ar" | "en"): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (language === "ar") {
        if (diff < 60) return "الآن";
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
        return `منذ ${Math.floor(diff / 86400)} يوم`;
    } else {
        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }
}

const TYPE_ICONS: Record<string, string> = {
    appointment: "📅",
    message: "💬",
    payment: "💳",
    system: "🔔",
    general: "🔔",
};

const NAVIGATION_MAP: Record<string, string> = {
    appointment: "appointments",
    message: "chat",
    payment: "payment",
    system: "treatment-plan-detail",
    general: "home",
};

export function NotificationBell({ language = "ar", onNotificationClick }: NotificationBellProps) {
    const queryClient = useQueryClient();
    const { subscribe } = useWebSocket();

    const { data: notifications = [] } = useQuery<Notification[]>({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
        refetchInterval: 30_000, // Poll every 30 seconds
        staleTime: 10_000,
    });

    useEffect(() => {
        return subscribe<Notification>("notification", (notification) => {
            queryClient.setQueryData<Notification[]>(["notifications"], (current = []) => {
                if (current.some((item) => item.id === notification.id)) {
                    return current;
                }
                return [notification, ...current];
            });
        });
    }, [queryClient, subscribe]);

    const markReadMutation = useMutation({
        mutationFn: markAsReadApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: markAllAsReadApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNotificationApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const handleNotificationClick = useCallback((notification: Notification) => {
        if (!notification.read) {
            markReadMutation.mutate(notification.id);
        }
        onNotificationClick?.(NAVIGATION_MAP[notification.type] || "home");
    }, [markReadMutation, onNotificationClick]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <DropdownMenu dir={language === "ar" ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full"
                    data-testid="notification-bell"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            variant="destructive"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align={language === "ar" ? "start" : "end"}
                className="w-80"
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-base">
                        {language === "ar" ? "الإشعارات" : "Notifications"}
                    </h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllReadMutation.mutate()}
                            className="text-xs h-7"
                        >
                            {language === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                                {language === "ar" ? "لا توجد إشعارات" : "No notifications"}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                (() => {
                                    const title = language === "en" && notification.titleEn ? notification.titleEn : notification.title;
                                    const message = language === "en" && notification.messageEn ? notification.messageEn : notification.message;

                                    return (
                                        <DropdownMenuItem
                                            key={notification.id}
                                            className={`p-4 cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="flex gap-3 w-full">
                                                <div className="flex-shrink-0 text-2xl">
                                                    {TYPE_ICONS[notification.type] || "🔔"}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm ${!notification.read ? "font-semibold" : "font-medium"}`}>
                                                            {title}
                                                        </p>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatTime(notification.createdAt, language)}
                                                    </p>
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    );
                                })()
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {notifications.length > 0 && (
                    <div className="p-2 border-t">
                        <Button
                            variant="ghost"
                            className="w-full text-sm"
                            onClick={() => onNotificationClick?.("notifications")}
                        >
                            {language === "ar" ? "عرض جميع الإشعارات" : "View all notifications"}
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
