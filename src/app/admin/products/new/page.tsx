"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Flavor {
  id: string;
  name: string;
  name_ar: string;
  image_url?: string;
  stock_estimate: number;
}

export default function AddProductPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [pricingMode, setPricingMode] = useState<"usd" | "syp">("usd");
  const [hasFlavors, setHasFlavors] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    usd_price: "",
    stock_estimate: "",
    category: "",
    description: "",
    image_url: "",
  });

  const [rateInfo, setRateInfo] = useState<any>(null);
  const [rateLoading, setRateLoading] = useState(false);

  // جلب سعر اليوم
  useEffect(() => {
    const fetchRate = async () => {
      try {
        setRateLoading(true);
        // استخدام GET لجلب آخر سعر محفوظ (بدون تحديث)
        const response = await fetch("/api/admin/update-exchange-rate", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          setRateInfo(data);
          console.log("📊 Today's rate:", data);
        } else {
          console.error("Failed to fetch rate:", response.status);
        }
      } catch (error) {
        console.error("Failed to load rate:", error);
      } finally {
        setRateLoading(false);
      }
    };

    if (pricingMode === "usd") {
      fetchRate();
    }
  }, [pricingMode]);

  // حساب السعر بالليرة
  const computedSypPrice = () => {
    if (pricingMode !== "usd" || !rateInfo || !formData.usd_price) {
      return null;
    }
    const usd = parseFloat(formData.usd_price);
    if (isNaN(usd)) return null;
    return Math.ceil((usd * rateInfo.rate) / 500) * 500;
  };

  const categories = [
    "Dairy",
    "Bakery",
    "Grains",
    "Cooking",
    "Vegetables",
    "Meat",
    "Spices",
    "Beverages",
    "Snacks",
    "Frozen",
    "Other",
  ];

  const addFlavor = () => {
    setFlavors([
      ...flavors,
      {
        id: `temp-${Date.now()}`,
        name: "",
        name_ar: "",
        image_url: "",
        stock_estimate: 0,
      },
    ]);
  };

  const removeFlavor = (id: string) => {
    setFlavors(flavors.filter((f) => f.id !== id));
  };

  const updateFlavor = (id: string, field: keyof Flavor, value: any) => {
    setFlavors(
      flavors.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || profile?.role !== "admin") {
      toast.error("Admin access required");
      return;
    }

    setLoading(true);

    try {
      const stock = parseInt(formData.stock_estimate);
      if (isNaN(stock) || stock < 0) {
        toast.error("المخزون يجب أن يكون رقم صحيح >= 0");
        setLoading(false);
        return;
      }

      if (pricingMode === "usd") {
        const usd = parseFloat(formData.usd_price);
        if (!usd || usd <= 0) {
          toast.error("أدخل سعر دولار صحيح");
          setLoading(false);
          return;
        }
      } else {
        const syp = parseFloat(formData.price);
        if (!syp || syp <= 0) {
          toast.error("أدخل سعر ليرة صحيح");
          setLoading(false);
          return;
        }
      }

      if (hasFlavors) {
        if (flavors.length === 0) {
          toast.error("أضف نكهة واحدة على الأقل");
          setLoading(false);
          return;
        }

        for (const flavor of flavors) {
          if (!flavor.name || !flavor.name_ar) {
            toast.error("املأ اسم النكهة بالإنجليزية والعربية");
            setLoading(false);
            return;
          }
        }
      }

      const payload: any = {
        name: formData.name,
        sku: formData.sku,
        stock_estimate: stock,
        category: formData.category,
        description: formData.description,
        image_url: formData.image_url || null,
        pricing_mode: pricingMode,
        has_flavors: hasFlavors,
      };

      if (pricingMode === "usd") {
        payload.usd_price = parseFloat(formData.usd_price);
      } else {
        payload.price = parseFloat(formData.price);
      }

      if (hasFlavors) {
        payload.flavors = flavors.map((f) => ({
          name: f.name,
          name_ar: f.name_ar,
          image_url: f.image_url || null,
          stock_estimate: f.stock_estimate,
        }));
      }

      console.log("📤 Sending:", payload);

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log("📥 Response:", text);

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to add product");
      }

      console.log("✅ Success:", data);
      toast.success("تم إضافة المنتج بنجاح! ✅");
      router.push("/admin");
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error(error instanceof Error ? error.message : "فشل إضافة المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!user || profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Admin Access Required
          </h1>
          <p className="text-gray-600">تحتاج صلاحيات admin لإضافة المنتجات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          إضافة منتج جديد
        </h1>
        <p className="text-gray-600 mb-8">املأ جميع الحقول المطلوبة</p>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج * <span className="text-red-500">مطلوب</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="مثال: شيبس ليز"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز المنتج (SKU) * <span className="text-red-500">مطلوب</span>
              </label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="مثال: CHIPS-001"
              />
            </div>

            {/* Has Flavors */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFlavors}
                  onChange={(e) => {
                    setHasFlavors(e.target.checked);
                    if (!e.target.checked) setFlavors([]);
                  }}
                  className="h-5 w-5 text-blue-600 rounded mt-1"
                />
                <div className="mr-3">
                  <span className="font-semibold text-gray-900 block mb-1">
                    هل المنتج له نكهات مختلفة؟
                  </span>
                  <p className="text-sm text-gray-600">
                    مثال: شيبس بنكهة الجبنة، الباربيكيو، إلخ
                  </p>
                </div>
              </label>
            </div>

            {/* Pricing Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                نظام التسعير
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPricingMode("usd")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                    pricingMode === "usd"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  💵 تسعير بالدولار
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("syp")}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition ${
                    pricingMode === "syp"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  💰 تسعير بالليرة
                </button>
              </div>
            </div>

            {/* Exchange Rate Info */}
            {pricingMode === "usd" && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      📅 سعر صرف اليوم (ثابت حتى 12 بالليل)
                    </p>
                    {rateLoading ? (
                      <p className="text-lg text-green-700">جاري التحميل...</p>
                    ) : rateInfo ? (
                      <>
                        <p className="text-3xl font-bold text-green-700 mb-2">
                          {formatCurrency(rateInfo.rate)} / 1$
                        </p>
                        <div className="text-xs text-green-800 space-y-1">
                          <p>
                            📅 آخر تحديث:{" "}
                            {new Date(rateInfo.fetchedAt).toLocaleDateString(
                              "ar-SY"
                            )}
                          </p>
                          <p>⏰ عمر السعر: {rateInfo.ageHours} ساعة</p>
                          <p className="text-green-900 font-medium mt-2">
                            💡 السعر ثابت طول اليوم - يتحدث تلقائياً كل يوم
                            الساعة 12 بالليل
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-lg text-red-600">فشل التحميل</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Price Inputs */}
            {pricingMode === "usd" ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    السعر بالدولار * <span className="text-red-500">مطلوب</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="usd_price"
                    required
                    value={formData.usd_price}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="0.50"
                  />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">السعر بالليرة</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    {computedSypPrice()
                      ? formatCurrency(computedSypPrice()!)
                      : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر بالليرة * <span className="text-red-500">مطلوب</span>
                </label>
                <input
                  type="number"
                  name="price"
                  min="1"
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="5000"
                />
              </div>
            )}

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المخزون * <span className="text-red-500">مطلوب</span>
              </label>
              <input
                type="number"
                name="stock_estimate"
                required
                min="0"
                value={formData.stock_estimate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التصنيف * <span className="text-red-500">مطلوب</span>
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر التصنيف</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="وصف قصير للمنتج..."
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط الصورة
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Flavors */}
            {hasFlavors && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    🍕 النكهات
                  </h3>
                  <button
                    type="button"
                    onClick={addFlavor}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة نكهة
                  </button>
                </div>

                {flavors.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                    <p className="text-gray-500 mb-3">لم تتم إضافة نكهات بعد</p>
                    <button
                      type="button"
                      onClick={addFlavor}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      اضغط لإضافة نكهة
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flavors.map((flavor, index) => (
                      <div
                        key={flavor.id}
                        className="p-4 border-2 rounded-lg bg-gray-50"
                      >
                        <div className="flex justify-between mb-3">
                          <h4 className="font-medium">النكهة {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeFlavor(flavor.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              الاسم (English) *
                            </label>
                            <input
                              type="text"
                              required
                              value={flavor.name}
                              onChange={(e) =>
                                updateFlavor(flavor.id, "name", e.target.value)
                              }
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="Cheese"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              الاسم (عربي) *
                            </label>
                            <input
                              type="text"
                              required
                              value={flavor.name_ar}
                              onChange={(e) =>
                                updateFlavor(
                                  flavor.id,
                                  "name_ar",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="جبنة"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              المخزون
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={flavor.stock_estimate}
                              onChange={(e) =>
                                updateFlavor(
                                  flavor.id,
                                  "stock_estimate",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              رابط الصورة
                            </label>
                            <input
                              type="url"
                              value={flavor.image_url}
                              onChange={(e) =>
                                updateFlavor(
                                  flavor.id,
                                  "image_url",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded-lg px-3 py-2"
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    إضافة المنتج
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
