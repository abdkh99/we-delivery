"use client";

import { ShoppingBag, Coins, MapPin, CheckCircle, Package } from "lucide-react";

export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100">
      {/* Navigation Placeholder */}
      <div className="h-16 bg-white/90 backdrop-blur-md border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="w-32 h-8 bg-gray-300 rounded-lg animate-pulse" />
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
            <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Page Header Skeleton */}
        <div className="mb-6 sm:mb-8 space-y-3">
          <div className="h-8 sm:h-10 bg-gray-400 rounded-xl w-48 sm:w-64 animate-pulse" />
          <div className="h-4 sm:h-5 bg-gray-300 rounded-lg w-72 sm:w-96 animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Products List Skeleton */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-300 overflow-hidden">
              {/* Card Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-400 rounded animate-pulse" />
                <div className="h-6 bg-gray-400 rounded w-40 animate-pulse" />
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-200">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-4 sm:p-6 bg-white">
                    <div className="flex gap-4 sm:gap-6">
                      {/* Product Image Skeleton */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl flex-shrink-0 animate-pulse border border-gray-300 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400 opacity-50" />
                      </div>

                      {/* Content Skeleton */}
                      <div className="flex-1 min-w-0 space-y-4">
                        {/* Title & Price Row */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="h-5 sm:h-6 bg-gray-300 rounded-lg w-3/4 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                            <div className="h-6 sm:h-7 bg-gray-300 rounded w-24 animate-pulse mt-1" />
                          </div>
                          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse border border-gray-300" />
                        </div>

                        {/* Controls Row */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pt-2">
                          {/* Quantity Skeleton */}
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-12 bg-gray-300 rounded animate-pulse hidden sm:block" />
                            <div className="w-32 h-10 bg-gray-100 rounded-xl border border-gray-300 animate-pulse relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                            </div>
                          </div>

                          {/* Payment Method Skeleton */}
                          <div className="flex-1 sm:max-w-[240px] space-y-2">
                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse sm:hidden" />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="h-10 bg-gray-100 rounded-xl border border-gray-300 animate-pulse" />
                              <div className="h-10 bg-gray-100 rounded-xl border border-gray-300 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        {/* Total Row */}
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                          <div className="h-4 w-16 bg-gray-300 rounded animate-pulse" />
                          <div className="h-6 w-24 bg-gray-400 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-300 sticky top-24 overflow-hidden">
              {/* Summary Header */}
              <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 flex gap-2 items-center">
                <div className="w-5 h-5 bg-gray-400 rounded animate-pulse" />
                <div className="h-6 bg-gray-400 rounded w-32 animate-pulse" />
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Points Card Skeleton */}
                <div className="p-4 bg-gray-100 rounded-xl border border-gray-300 animate-pulse flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full" />
                    <div className="h-4 w-20 bg-gray-300 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-gray-400 rounded" />
                </div>

                {/* Address Skeleton */}
                <div className="space-y-3">
                  <div className="h-4 w-32 bg-gray-400 rounded animate-pulse self-end" />
                  <div className="h-32 bg-gray-100 rounded-xl border border-gray-300 animate-pulse w-full" />
                </div>

                {/* Costs Breakdown */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-400 rounded animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-400 rounded animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-400 rounded animate-pulse" />
                  </div>

                  {/* Total */}
                  <div className="flex justify-between pt-4 border-t border-gray-300 mt-2">
                    <div className="h-6 w-24 bg-gray-400 rounded animate-pulse" />
                    <div className="h-6 w-32 bg-gray-500 rounded animate-pulse" />
                  </div>
                </div>

                {/* Action Button */}
                <div className="h-14 bg-gray-300 rounded-xl w-full animate-pulse mt-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
