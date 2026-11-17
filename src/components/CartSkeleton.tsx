"use client";

import Navigation from "@/components/Navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Title */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            سلة التسوق
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            جاري التحميل...
          </p>
        </div>

        {/* Centered Loading Spinner */}
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 lg:py-40">
          <LoadingSpinner size="large" color="blue" className="h-24" />
          <p className="mt-8 text-lg sm:text-xl font-bold text-gray-700 animate-pulse">
            جاري تحميل سلة التسوق...
          </p>
          <p className="mt-3 text-sm sm:text-base text-gray-500">
            يرجى الانتظار قليلاً
          </p>
        </div>
      </div>
    </div>
  );
}