import { SWRConfiguration } from "swr";

/**
 * إعدادات SWR العالمية لتحسين الأداء
 */
export const swrConfig: SWRConfiguration = {
  // إعادة التحقق من البيانات
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,

  // التحديث التلقائي
  refreshWhenOffline: false,
  refreshWhenHidden: false,

  // منع الطلبات المكررة
  dedupingInterval: 5000, // 5 ثواني

  // الاحتفاظ بالبيانات السابقة أثناء التحديث
  keepPreviousData: true,

  // معالجة الأخطاء
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // Fallback للبيانات
  fallbackData: undefined,

  // استخدام cache محلي
  provider: () => new Map(),
};

/**
 * إعدادات SWR للبيانات في الوقت الفعلي (Real-time)
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000, // تحديث كل 5 ثواني
  dedupingInterval: 2000, // 2 ثانية
};

/**
 * إعدادات SWR للبيانات الثابتة
 */
export const swrStaticConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 0, // لا يوجد تحديث تلقائي
  dedupingInterval: 60000, // دقيقة واحدة
  revalidateIfStale: false,
};
