// Order Status Translations
export const orderStatusMap: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  on_delivery: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

export function getOrderStatusArabic(status: string): string {
  return orderStatusMap[status] || status;
}

// Category Translations
export const categoryMap: Record<string, string> = {
  Dairy: "منتجات الألبان",
  Bakery: "المخبوزات",
  Grains: "الحبوب",
  Cooking: "مستلزمات الطبخ",
  Vegetables: "الخضروات",
  Meat: "اللحوم",
  Spices: "البهارات",
  Beverages: "المشروبات",
  Snacks: "الوجبات الخفيفة",
  Frozen: "المجمدات",
  Other: "أخرى",
};

export function getCategoryArabic(category: string): string {
  return categoryMap[category] || category;
}

// Delivery Status Translations
export const deliveryStatusMap: Record<string, string> = {
  assigned: "تم التعيين",
  on_way: "في الطريق",
  delivered: "تم التوصيل",
};

export function getDeliveryStatusArabic(status: string): string {
  return deliveryStatusMap[status] || status;
}
