"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      window.location.href = "/";
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12">
          {/* Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <WifiOff className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            لا يوجد اتصال بالإنترنت
          </h1>

          {/* Description */}
          <p className="text-gray-600 mb-8">
            يبدو أن اتصالك بالإنترنت غير متاح حالياً. يرجى التحقق من اتصالك
            والمحاولة مرة أخرى.
          </p>

          {/* Retry Button */}
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <RefreshCw className="h-5 w-5" />
            إعادة المحاولة
          </button>

          {/* Status */}
          <div className="mt-6 text-sm text-gray-500">
            {isOnline ? (
              <span className="text-green-600 font-medium">
                ✓ تم استعادة الاتصال
              </span>
            ) : (
              <span>🔴 غير متصل</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-sm text-gray-500">
          <p>بعض الصفحات المحفوظة قد تكون متاحة أثناء عدم الاتصال</p>
        </div>
      </div>
    </div>
  );
}
