"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { ArrowLeft, Plus, Trash2, Info, Package, DollarSign, Tag, Boxes } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import ImageUploader from "@/components/ImageUploader";

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
        // استخدام GET لجلب آخر سعر محفوظ (المسجل يدوياً من قبل الأدمن)
        const response = await fetch("/api/admin/exchange-rate", {
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
    return Math.ceil((usd * rateInfo.rate) / 5) * 5;
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
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
          العودة
        </button>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl p-6 sm:p-8 mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">إضافة منتج جديد</h1>
          </div>
          <p className="text-blue-100">املأ جميع الحقول المطلوبة لإضافة منتج للمخزن</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-200">
                <Tag className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">المعلومات الأساسية</h2>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم المنتج <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                  placeholder="مثال: شيبس ليز"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  رمز المنتج (SKU) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="sku"
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                  placeholder="مثال: CHIPS-001"
                />
              </div>
            </div>

            {/* Has Flavors */}
            <div className="border-2 border-purple-200 rounded-xl p-5 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={hasFlavors}
                  onChange={(e) => {
                    setHasFlavors(e.target.checked);
                    if (!e.target.checked) setFlavors([]);
                  }}
                  className="h-5 w-5 text-purple-600 rounded-md mt-1 cursor-pointer border-2 border-purple-300 focus:ring-2 focus:ring-purple-500"
                />
                <div className="mr-3">
                  <span className="font-bold text-gray-900 block mb-1 text-base group-hover:text-purple-700 transition-colors">
                    🍕 هل المنتج له نكهات مختلفة؟
                  </span>
                  <p className="text-sm text-gray-700 font-medium">
                    مثال: شيبس بنكهة الجبنة، الباربيكيو، الملح، إلخ
                  </p>
                </div>
              </label>
            </div>

            {/* Pricing Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-200">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold text-gray-900">التسعير</h2>
              </div>

              {/* Pricing Mode */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  نظام التسعير
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPricingMode("usd")}
                    className={`py-4 px-4 rounded-xl border-2 font-bold transition-all shadow-sm ${pricingMode === "usd"
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg scale-105"
                      : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:shadow-md"
                      }`}
                  >
                    💵 تسعير بالدولار
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode("syp")}
                    className={`py-4 px-4 rounded-xl border-2 font-bold transition-all shadow-sm ${pricingMode === "syp"
                      ? "border-green-600 bg-green-600 text-white shadow-lg scale-105"
                      : "border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:shadow-md"
                      }`}
                  >
                    💰 تسعير بالليرة
                  </button>
                </div>
              </div>

              {/* Exchange Rate Info */}
              {pricingMode === "usd" && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-900 mb-3">
                        📅 سعر صرف اليوم (ثابت حتى 12 بالليل)
                      </p>
                      {rateLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent"></div>
                          <p className="text-lg text-green-700 font-medium">جاري التحميل...</p>
                        </div>
                      ) : rateInfo ? (
                        <>
                          <div className="bg-white rounded-lg p-4 border-2 border-green-200 mb-3">
                            <p className="text-4xl font-black text-green-700 mb-1">
                              {formatCurrency(rateInfo.rate)}
                            </p>
                            <p className="text-sm text-green-600 font-bold">السعر لكل 1 دولار</p>
                          </div>
                          <div className="space-y-2 text-sm text-green-800 font-medium bg-white/50 rounded-lg p-3 border border-green-200">
                            <p className="flex items-center gap-2">
                              <span className="text-base">📅</span>
                              آخر تحديث: {new Date(rateInfo.fetchedAt).toLocaleDateString("ar-SY", {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="text-base">⏰</span>
                              عمر السعر: {rateInfo.ageHours} ساعة
                            </p>
                            <div className="pt-2 border-t border-green-200">
                              <p className="text-green-900 font-bold flex items-start gap-2">
                                <span className="text-base">💡</span>
                                <span>السعر ثابت طول اليوم - يتحدث تلقائياً كل يوم الساعة 12 بالليل</span>
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                          <p className="text-lg text-red-700 font-bold">❌ فشل التحميل</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Inputs */}
              {pricingMode === "usd" ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      السعر بالدولار <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="usd_price"
                        required
                        value={formData.usd_price}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 pl-8 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
                        placeholder="0.50"
                      />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 flex flex-col justify-center shadow-sm">
                    <p className="text-sm text-blue-700 font-bold mb-1">💰 السعر بالليرة السورية</p>
                    <p className="text-3xl font-black text-blue-700">
                      {computedSypPrice()
                        ? formatCurrency(computedSypPrice()!)
                        : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    السعر بالليرة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="1"
                    required
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all hover:border-gray-400"
                    placeholder="5000"
                  />
                </div>
              )}
            </div>

            {/* Stock and Category */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-gray-200">
                <Boxes className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold text-gray-900">المخزون والتصنيف</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Stock */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    المخزون <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stock_estimate"
                    required
                    min="0"
                    value={formData.stock_estimate}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all hover:border-gray-400"
                    placeholder="50"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    التصنيف <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-bold bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all hover:border-gray-400 cursor-pointer"
                  >
                    <option value="">اختر التصنيف</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الوصف
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400 resize-none"
                placeholder="وصف قصير للمنتج..."
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                صورة المنتج
              </label>
              <ImageUploader
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
              />
            </div>

            {/* Flavors */}
            {hasFlavors && (
              <div className="border-t-4 border-purple-200 pt-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">🍕</span>
                    النكهات
                  </h3>
                  <button
                    type="button"
                    onClick={addFlavor}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 flex items-center gap-2 font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    إضافة نكهة
                  </button>
                </div>

                {flavors.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-dashed border-purple-300">
                    <div className="text-6xl mb-4">🍕</div>
                    <p className="text-gray-600 font-medium mb-4 text-lg">لم تتم إضافة نكهات بعد</p>
                    <button
                      type="button"
                      onClick={addFlavor}
                      className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-bold text-lg hover:scale-105 transition-transform"
                    >
                      <Plus className="h-5 w-5" />
                      اضغط لإضافة نكهة
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flavors.map((flavor, index) => (
                      <div
                        key={flavor.id}
                        className="p-5 border-2 border-purple-200 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-md hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                              {index + 1}
                            </span>
                            النكهة {index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFlavor(flavor.id)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              الاسم (English) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={flavor.name}
                              onChange={(e) =>
                                updateFlavor(flavor.id, "name", e.target.value)
                              }
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              placeholder="Cheese"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              الاسم (عربي) <span className="text-red-500">*</span>
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
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              placeholder="جبنة"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
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
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
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
                              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
            <div className="flex justify-end gap-3 pt-8 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-lg hover:shadow-xl transition-all disabled:hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
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