"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { ShoppingCart, ArrowLeft, Star, Package, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ProductFlavor {
  id: string;
  name: string;
  name_ar: string;
  image_url: string | null;
  stock_estimate: number;
  is_active: boolean;
}

interface ProductVariant {
  id: string;
  variant_name: string;
  variant_sku: string;
  price: number;
  stock_estimate: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  stock_estimate: number;
  description: string | null;
  has_flavors: boolean;
  product_flavors?: ProductFlavor[];
  product_variants?: ProductVariant[];
}

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  // للنكهات
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);

  // للمقاسات/Variants
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // الكمية
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${params.id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch product");
      }

      const data = await response.json();
      setProduct(data.product);

      // اختيار أول نكهة متوفرة تلقائياً
      if (
        data.product.has_flavors &&
        data.product.product_flavors?.length > 0
      ) {
        const firstActiveFlavor = data.product.product_flavors.find(
          (f: ProductFlavor) => f.is_active && f.stock_estimate > 0
        );
        if (firstActiveFlavor) {
          setSelectedFlavor(firstActiveFlavor.id);
        }
      }

      // اختيار أول variant متوفر تلقائياً
      if (data.product.product_variants?.length > 0) {
        const firstActiveVariant = data.product.product_variants.find(
          (v: ProductVariant) => v.is_active && v.stock_estimate > 0
        );
        if (firstActiveVariant) {
          setSelectedVariant(firstActiveVariant.id);
        }
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("فشل تحميل المنتج");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // التحقق من اختيار النكهة (إذا كان المنتج له نكهات)
    if (product.has_flavors && !selectedFlavor) {
      toast.error("يرجى اختيار النكهة");
      return;
    }

    // التحقق من اختيار المقاس (إذا كان المنتج له variants)
    if (
      product.product_variants &&
      product.product_variants.length > 0 &&
      !selectedVariant
    ) {
      toast.error("يرجى اختيار المقاس");
      return;
    }

    try {
      setAddingToCart(true);

      const cartData: {
        product_id: string;
        quantity: number;
        flavor_id?: string;
        variant_id?: string;
      } = {
        product_id: product.id,
        quantity,
      };

      if (selectedFlavor) {
        cartData.flavor_id = selectedFlavor;
      }

      if (selectedVariant) {
        cartData.variant_id = selectedVariant;
      }

      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cartData),
      });

      if (!response.ok) {
        throw new Error("Failed to add to cart");
      }

      toast.success("تمت الإضافة للسلة بنجاح! ✅");

      // يمكنك إعادة التوجيه للسلة أو تحديث عداد السلة
      // router.push("/cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("فشل إضافة المنتج للسلة");
    } finally {
      setAddingToCart(false);
    }
  };

  // حساب السعر النهائي
  const getFinalPrice = () => {
    if (!product) return 0;

    // إذا كان في variant محدد
    if (selectedVariant && product.product_variants) {
      const variant = product.product_variants.find(
        (v) => v.id === selectedVariant
      );
      return variant ? variant.price : product.price;
    }

    return product.price;
  };

  // التحقق من المخزون
  const isInStock = () => {
    if (!product) return false;

    // إذا كان في نكهة محددة
    if (selectedFlavor && product.product_flavors) {
      const flavor = product.product_flavors.find(
        (f) => f.id === selectedFlavor
      );
      return flavor ? flavor.stock_estimate > 0 : false;
    }

    // إذا كان في variant محدد
    if (selectedVariant && product.product_variants) {
      const variant = product.product_variants.find(
        (v) => v.id === selectedVariant
      );
      return variant ? variant.stock_estimate > 0 : false;
    }

    return product.stock_estimate > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              المنتج غير موجود
            </h1>
            <button
              onClick={() => router.push("/products")}
              className="text-blue-600 hover:text-blue-700"
            >
              العودة للمنتجات
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          العودة
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-medium ${
                  isInStock() ? "text-green-600" : "text-red-600"
                }`}
              >
                {isInStock() ? "متوفر في المخزون" : "نفذ من المخزون"}
              </span>
              <span className="text-sm text-gray-500">{product.category}</span>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold text-blue-600">
                {formatCurrency(getFinalPrice())}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Flavors Selection */}
            {product.has_flavors &&
              product.product_flavors &&
              product.product_flavors.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    اختر النكهة:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {product.product_flavors
                      .filter((f) => f.is_active)
                      .map((flavor) => (
                        <button
                          key={flavor.id}
                          onClick={() => setSelectedFlavor(flavor.id)}
                          disabled={flavor.stock_estimate === 0}
                          className={`p-4 rounded-lg border-2 transition text-right ${
                            selectedFlavor === flavor.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300"
                          } ${
                            flavor.stock_estimate === 0
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {flavor.name_ar}
                          </div>
                          <div className="text-sm text-gray-500">
                            {flavor.name}
                          </div>
                          {flavor.stock_estimate === 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              نفذ من المخزون
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

            {/* Variants Selection */}
            {product.product_variants &&
              product.product_variants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    اختر المقاس:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {product.product_variants
                      .filter((v) => v.is_active)
                      .map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant.id)}
                          disabled={variant.stock_estimate === 0}
                          className={`p-4 rounded-lg border-2 transition text-right ${
                            selectedVariant === variant.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300"
                          } ${
                            variant.stock_estimate === 0
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {variant.variant_name}
                          </div>
                          <div className="text-sm text-blue-600">
                            {formatCurrency(variant.price)}
                          </div>
                          {variant.stock_estimate === 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              نفذ من المخزون
                            </div>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                الكمية:
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-20 text-center px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Price */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">
                  المجموع:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(getFinalPrice() * quantity)}
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!isInStock() || addingToCart}
              className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium text-lg"
            >
              {addingToCart ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  {isInStock() ? "أضف إلى السلة" : "نفذ من المخزون"}
                </>
              )}
            </button>

            {/* Delivery Info */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    التوصيل المجاني
                  </p>
                  <p className="text-sm text-gray-600">
                    للطلبات فوق 50,000 ليرة سورية
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
