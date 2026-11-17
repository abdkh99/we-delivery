import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  recentOrders: Record<string, unknown>[];
  recentProducts: Record<string, unknown>[];
};

export function useAdminDashboardData() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/admin/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
    stats: {
      totalOrders: data?.totalOrders || 0,
      pendingOrders: data?.pendingOrders || 0,
      completedOrders: data?.completedOrders || 0,
      totalRevenue: data?.totalRevenue || 0,
      totalProducts: data?.totalProducts || 0,
      lowStockProducts: data?.lowStockProducts || 0,
    },
    recentOrders: data?.recentOrders || [],
    recentProducts: data?.recentProducts || [],
  };
}
