// src/components/SkeletonLoading.tsx
// مكونات skeleton loading احترافية لجميع الصفحات

import React from "react";

// ============================================
// 🔲 Skeleton Base Components
// ============================================

export const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

export const SkeletonCircle = ({ size = "h-12 w-12" }: { size?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-full ${size}`}></div>
);

export const SkeletonText = ({ lines = 1, className = "" }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`h-4 bg-gray-200 rounded animate-pulse ${i === lines - 1 ? "w-4/5" : "w-full"
          }`}
      ></div>
    ))}
  </div>
);

// ============================================
// 🏠 Home Page Skeleton
// ============================================

export const HomePageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-4">
        <SkeletonBox className="h-8 w-64" />
        <SkeletonText lines={2} />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 space-y-3">
            <SkeletonCircle size="h-16 w-16" />
            <SkeletonBox className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// 📦 Product Card Skeleton
// ============================================

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <SkeletonBox className="h-48 w-full" />
    <div className="p-4 space-y-3">
      <SkeletonBox className="h-5 w-32" />
      <SkeletonText lines={2} />
      <div className="flex justify-between items-center">
        <SkeletonBox className="h-6 w-20" />
        <SkeletonBox className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  </div>
);

// ============================================
// 🛒 Cart Page Skeleton
// ============================================

export const CartPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <SkeletonBox className="h-10 w-48" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-6 space-y-4">
          <div className="flex gap-4">
            <SkeletonBox className="h-24 w-24 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonBox className="h-5 w-32" />
              <SkeletonText lines={1} />
              <SkeletonBox className="h-6 w-24" />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl p-6 space-y-4">
        <div className="flex justify-between">
          <SkeletonBox className="h-6 w-32" />
          <SkeletonBox className="h-6 w-24" />
        </div>
        <SkeletonBox className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

// ============================================
// 📋 Orders List Skeleton
// ============================================

export const OrdersListSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <SkeletonBox className="h-10 w-48" />
        <SkeletonBox className="h-10 w-32 rounded-lg" />
      </div>

      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <SkeletonBox className="h-6 w-32" />
              <SkeletonText lines={1} className="w-48" />
            </div>
            <SkeletonBox className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="h-6 w-32" />
            </div>
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="h-6 w-24" />
            </div>
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="h-6 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// 👤 Profile Page Skeleton
// ============================================

export const ProfilePageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex items-center gap-6">
          <SkeletonCircle size="h-24 w-24" />
          <div className="flex-1 space-y-3">
            <SkeletonBox className="h-8 w-48" />
            <SkeletonText lines={1} className="w-64" />
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <SkeletonBox className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

// ============================================
// 🚚 Driver Dashboard Skeleton
// ============================================

export const DriverDashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <SkeletonCircle size="h-12 w-12" />
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <SkeletonBox className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <SkeletonBox className="h-6 w-32" />
              <SkeletonBox className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonText lines={2} />
            <div className="flex gap-2">
              <SkeletonBox className="h-10 flex-1 rounded-lg" />
              <SkeletonBox className="h-10 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// 🔐 Login/Signup Skeleton
// ============================================

export const AuthPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="max-w-md w-full mx-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <SkeletonBox className="h-10 w-48 mx-auto" />
          <SkeletonText lines={1} className="w-64 mx-auto" />
        </div>

        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-12 w-full rounded-lg" />
          </div>
        ))}

        <SkeletonBox className="h-12 w-full rounded-xl" />
        <SkeletonBox className="h-6 w-40 mx-auto" />
      </div>
    </div>
  </div>
);

// ============================================
// 🏢 Admin Dashboard Skeleton (موجود بالفعل)
// ============================================

export const AdminDashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-3xl p-8 space-y-4">
        <SkeletonBox className="h-8 w-64 bg-white/20" />
        <SkeletonBox className="h-12 w-96 bg-white/20" />
        <div className="flex gap-3">
          <SkeletonBox className="h-10 w-32 bg-white/20 rounded-xl" />
          <SkeletonBox className="h-10 w-40 bg-white/20 rounded-xl" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-3">
            <SkeletonCircle size="h-12 w-12" />
            <div className="space-y-2">
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBox key={i} className="h-10 w-32 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// 📄 Product Detail Skeleton
// ============================================

export const ProductDetailSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <SkeletonBox className="h-96 w-full rounded-2xl" />

        {/* Details */}
        <div className="space-y-6">
          <div className="space-y-3">
            <SkeletonBox className="h-8 w-3/4" />
            <SkeletonText lines={3} />
          </div>

          <div className="space-y-2">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-12 w-32" />
          </div>

          <div className="space-y-2">
            <SkeletonBox className="h-4 w-32" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBox key={i} className="h-10 w-24 rounded-lg" />
              ))}
            </div>
          </div>

          <SkeletonBox className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export default {
  HomePageSkeleton,
  ProductCardSkeleton,
  CartPageSkeleton,
  OrdersListSkeleton,
  ProfilePageSkeleton,
  DriverDashboardSkeleton,
  AuthPageSkeleton,
  AdminDashboardSkeleton,
  ProductDetailSkeleton,
};
