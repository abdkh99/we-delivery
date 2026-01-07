"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  ArrowLeft,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (user && profile) {
      fetchNotifications();
    }
  }, [user, profile]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
        toast.success("تم حذف الإشعار");
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("فشل حذف الإشعار");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        toast.success("تم تحديد جميع الإشعارات كمقروءة");
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = (type: string, read: boolean) => {
    const opacity = read ? "50" : "100";
    switch (type) {
      case "success":
        return `bg-green-${opacity}`;
      case "warning":
        return `bg-yellow-${opacity}`;
      case "error":
        return `bg-red-${opacity}`;
      default:
        return `bg-blue-${opacity}`;
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              غير مصرح
            </h1>
            <p className="text-gray-600">يجب تسجيل الدخول لعرض الإشعارات</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={profile?.role === "admin" ? "/admin" : "/driver"}
              className="p-2 hover:bg-white rounded-lg transition"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                الإشعارات
              </h1>
              {unreadCount > 0 && (
                <p className="text-gray-600 mt-1">
                  لديك {unreadCount} إشعار غير مقروء
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchNotifications}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="تحديث"
            >
              <RefreshCcw className="h-5 w-5 text-gray-600" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                لا توجد إشعارات
              </h3>
              <p className="text-gray-600">
                {filter === "unread"
                  ? "جميع الإشعارات مقروءة"
                  : "لا توجد إشعارات حتى الآن"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border-r-4 ${
                  notification.type === "success"
                    ? "border-green-500"
                    : notification.type === "warning"
                    ? "border-yellow-500"
                    : notification.type === "error"
                    ? "border-red-500"
                    : "border-blue-500"
                } ${!notification.read ? "shadow-md" : ""}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        notification.type === "success"
                          ? "bg-green-100"
                          : notification.type === "warning"
                          ? "bg-yellow-100"
                          : notification.type === "error"
                          ? "bg-red-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900">
                          {notification.title}
                          {!notification.read && (
                            <span className="inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              جديد
                            </span>
                          )}
                        </h3>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-gray-700 mb-3">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(notification.created_at)}</span>
                        </div>

                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            تحديد كمقروء
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
