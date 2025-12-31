"use client";

export function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Skeleton */}
      <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Skeleton */}
        <div className="mb-4 sm:mb-6 lg:mb-8 space-y-2">
          <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-64 animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Products Section Skeleton */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-gray-100">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg animate-pulse mx-auto sm:mx-0" />

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                            <div className="h-5 bg-blue-200 rounded w-24 animate-pulse" />
                          </div>
                          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="h-8 bg-gray-200 rounded-lg w-32 animate-pulse" />
                          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Section Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 sticky top-4 sm:top-8">
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* Points */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="h-5 bg-blue-200 rounded w-32 animate-pulse" />
                </div>

                {/* Address Section */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                </div>

                {/* Summary */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <div className="h-5 bg-gray-200 rounded w-28 animate-pulse" />
                    <div className="h-5 bg-blue-200 rounded w-24 animate-pulse" />
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


