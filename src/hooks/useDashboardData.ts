import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

type DashboardData = {
  profile: Record<string, unknown>;
  recentOrders: Record<string, unknown>[];
  recommendedProducts: Record<string, unknown>[];
  unreadNotificationsCount: number;
};

export function useDashboardData() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    '/api/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  return {
    data,
    isLoading,
    error,
    mutate,
    profile: data?.profile,
    recentOrders: data?.recentOrders || [],
    recommendedProducts: data?.recommendedProducts || [],
    unreadNotificationsCount: data?.unreadNotificationsCount || 0,
  };
}
