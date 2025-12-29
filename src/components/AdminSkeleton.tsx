export const AdminDashboardSkeleton = () => {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="h-8 w-48 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%]" />
              <div className="flex gap-4">
                <div className="h-10 w-32 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%]" />
                <div className="h-10 w-32 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%]" />
              </div>
            </div>
          </div>
        </div>
  
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid Skeleton - IMPROVED CONTRAST & SHIMMER */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-full animate-shimmer bg-[length:200%_100%]" />
                  <div className="h-4 w-16 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%]" />
                </div>
                <div className="h-8 w-24 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-150 bg-[length:200%_100%] mb-2" />
                <div className="h-4 w-32 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
  
          {/* Tabs Skeleton - IMPROVED CONTRAST & SHIMMER */}
          <div className="flex gap-4 mb-6 border-b">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-10 w-24 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-t animate-shimmer bg-[length:200%_100%] animate-delay-${i * 100}`} />
            ))}
          </div>
  
          {/* Table Skeleton - IMPROVED CONTRAST & SHIMMER */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="h-6 w-32 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%] mb-4" />
            </div>
            
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="px-6 py-3">
                      <div className="h-4 w-20 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%]" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="border-t">
                    {[1, 2, 3, 4, 5].map((col) => (
                      <td key={col} className="px-6 py-4">
                        <div className="h-4 w-24 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer bg-[length:200%_100%]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
  
  export const AdminStatsSkeleton = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-300 via-blue-200 to-blue-300 rounded-full animate-shimmer bg-[length:200%_100%]" />
              <div className="h-4 w-16 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-100 bg-[length:200%_100%]" />
            </div>
            <div className="h-8 w-24 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-150 bg-[length:200%_100%] mb-2" />
            <div className="h-4 w-32 bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 rounded animate-shimmer animate-delay-200 bg-[length:200%_100%]" />
          </div>
        ))}
      </div>
    );
  };
  