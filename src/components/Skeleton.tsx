// مكونات Skeleton محسنة مع animations سلسة ✨

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 group">
      {/* صورة المنتج - shimmer effect with IMPROVED CONTRAST */}
      <div className="aspect-square bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 animate-shimmer bg-[length:200%_100%]" />
      
      <div className="p-4 space-y-3">
        {/* عنوان المنتج - IMPROVED CONTRAST */}
        <div className="h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%] w-3/4" />
        
        {/* الوصف - IMPROVED CONTRAST */}
        <div className="h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%] w-1/2" />
        
        {/* السعر والتقييم - IMPROVED CONTRAST */}
        <div className="flex justify-between items-center">
          <div className="h-5 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%] w-20" />
          <div className="h-5 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%] w-16" />
        </div>
        
        {/* زر الإضافة - IMPROVED CONTRAST */}
        <div className="h-10 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-lg animate-shimmer animate-delay-300 bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

export function ProductsGridSkeleton() {
  const delayClasses = [
    'animate-delay-0',
    'animate-delay-50',
    'animate-delay-100',
    'animate-delay-150',
    'animate-delay-200',
    'animate-delay-250',
    'animate-delay-300',
    'animate-delay-350',
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={`animate-fade-in ${delayClasses[i]}`}
        >
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%] w-32" />
          <div className="h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%] w-24" />
        </div>
        <div className="h-6 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-full animate-shimmer animate-delay-200 bg-[length:200%_100%] w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-150 bg-[length:200%_100%] w-full" />
        <div className="h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%] w-5/6" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const delayClasses = [
    'animate-delay-0',
    'animate-delay-50',
    'animate-delay-100',
    'animate-delay-150',
    'animate-delay-200',
  ];

  return (
    <div className="space-y-2">
      {/* Header - IMPROVED CONTRAST */}
      <div className="h-10 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-lg animate-shimmer bg-[length:200%_100%]" />
      
      {/* Rows - IMPROVED CONTRAST */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-16 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-lg animate-shimmer bg-[length:200%_100%] animate-fade-in ${delayClasses[i] || 'animate-delay-200'}`}
        />
      ))}
    </div>
  );
}

export function DeliveryCardSkeleton() {
  return (
    <div className="p-4 sm:p-6 border-b border-gray-100 animate-fade-in">
      <div className="space-y-4">
        {/* Header - IMPROVED CONTRAST */}
        <div className="flex justify-between">
          <div className="h-5 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%] w-32" />
          <div className="h-5 bg-gradient-to-r from-orange-300 via-orange-200 to-orange-300 rounded-full animate-shimmer animate-delay-100 bg-[length:200%_100%] w-24" />
        </div>
        
        {/* Content - IMPROVED CONTRAST */}
        <div className="h-16 bg-gradient-to-r from-blue-100 via-gray-100 to-blue-100 rounded-lg animate-shimmer animate-delay-150 bg-[length:200%_100%]" />
        
        {/* Buttons - IMPROVED CONTRAST */}
        <div className="flex gap-2">
          <div className="h-10 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-lg animate-shimmer animate-delay-200 bg-[length:200%_100%] flex-1" />
          <div className="h-10 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded-lg animate-shimmer animate-delay-250 bg-[length:200%_100%] flex-1" />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-fade-in hover:shadow-md transition-shadow">
      <div className="flex items-center">
        {/* Icon - IMPROVED CONTRAST */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-300 via-blue-200 to-blue-100 rounded-lg animate-shimmer bg-[length:200%_100%]" />
        
        <div className="ml-3 space-y-2 flex-1">
          {/* Label - IMPROVED CONTRAST */}
          <div className="h-3 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%] w-24" />
          
          {/* Value - IMPROVED CONTRAST */}
          <div className="h-6 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%] w-16" />
        </div>
      </div>
    </div>
  );
}
