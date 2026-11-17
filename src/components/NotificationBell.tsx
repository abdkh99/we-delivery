"use client";

import { useState, useEffect } from "react";
import { Bell, ShoppingCart } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  status: string;
  orderId: string;
}

interface NotificationBellProps {
  userRole?: string;
}

export default function NotificationBell({ userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const fetchNotifications = async () => {
    if (userRole !== "admin") return;

    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      
      // تجاهل أخطاء 401 (غير مصرح) بصمت
      if (response.status === 401) {
        setNotifications([]);
        return;
      }
      
      if (!response.ok) {
        console.warn(`Notifications API returned status: ${response.status}`);
        setNotifications([]);
        return;
      }
      
      const data = await response.json();

      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      // تسجيل الخطأ بصمت دون إظهار خطأ في console
      console.debug("Notifications fetch:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const newOrderCount = notifications.filter(
    (n) => n.status === "pending"
  ).length;

  if (userRole !== "admin") return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {newOrderCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {newOrderCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
            <p className="text-sm text-gray-600">Recent orders and updates</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    window.open(`/admin`, "_blank");
                    setShowNotifications(false);
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          notification.status === "pending"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t bg-gray-50">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}


