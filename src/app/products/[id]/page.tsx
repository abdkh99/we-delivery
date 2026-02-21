"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { ShoppingCart, ArrowLeft, Star, Package, Truck, LogIn, CheckCircle, AlertCircle, AlertOctagon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOffers } from "@/hooks/useOffers";
import ProductOfferBadge from "@/components/ProductOfferBadge";
import { ButtonBase } from "@mui/material";
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
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
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
    // Offers Logic
    const { calculateBestOffer } = useOffers();
    useEffect(() => {
        fetchProduct();
    }, [id]);
    const fetchProduct = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/products/${id}`);
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
    const { addItem } = useCart();
    const { user } = useAuth();
    const handleAddToCart = async () => {
        if (!product) return;
        // Check if user is logged in
        if (!user) {
            toast.error("يجب تسجيل الدخول أولاً! 🔐", {
                description: "سجل دخولك للمتابعة إلى سلة التسوق",
                icon: <LogIn className="h-5 w-5" />,
                action: {
                    label: "تسجيل الدخول",
                    onClick: () => router.push("/login"),
                },
                duration: 5000,
            });
            return;
        }
        // التحقق من اختيار النكهة (إذا كان المنتج له نكهات)
        if (product.has_flavors && !selectedFlavor) {
            toast.error("يرجى اختيار النكهة", {
                icon: <AlertCircle className="h-5 w-5" />,
            });
            return;
        }
        // التحقق من اختيار المقاس (إذا كان المنتج له variants)
        if (
            product.product_variants &&
            product.product_variants.length > 0 &&
            !selectedVariant
        ) {
            toast.error("يرجى اختيار المقاس", {
                icon: <AlertCircle className="h-5 w-5" />,
            });
            return;
        }
        try {
            setAddingToCart(true);
            // If product has variants, add the variant
            if (selectedVariant && product.product_variants) {
                const variant = product.product_variants.find(
                    (v) => v.id === selectedVariant
                );
                if (!variant) {
                    toast.error("النكهة غير موجودة", {
                        icon: <AlertCircle className="h-5 w-5" />,
                    });
                    return;
                }
                if (variant.stock_estimate === 0) {
                    toast.error("النكهة غير متوفرة حالياً", {
                        icon: <AlertCircle className="h-5 w-5" />,
                    });
                    return;
                }
                // Calculate offer for this variant
                const { finalPrice: variantPriceWithDiscount } = calculateBestOffer(product as any, variant.price);
                // Add variant item to cart (like products page does)
                addItem(
                    {
                        ...product,
                        id: variant.id,
                        name: `${product.name} - ${variant.variant_name}`,
                        price: variant.price,
                        stock_estimate: variant.stock_estimate || 0,
                        sku: variant.variant_sku || product.id,
                        image_url: product.image_url,
                    } as any,
                    quantity,
                    variant.id,
                    product.id, // masterProductId
                    variantPriceWithDiscount // Pass calculated discounted price
                );
            } else {
                // Add regular product to cart
                if (product.stock_estimate === 0) {
                    toast.error("المنتج غير متوفر حالياً", {
                        icon: <AlertCircle className="h-5 w-5" />,
                    });
                    return;
                }
                const { finalPrice: productFinalPrice } = calculateBestOffer(product as any, product.price);
                addItem(
                    product as any,
                    quantity,
                    undefined,
                    undefined,
                    productFinalPrice // Pass calculated discounted price
                );
            }
            toast.success("تمت الإضافة للسلة بنجاح! ✅", {
                description: `تم إضافة ${product.name} إلى سلة التسوق`,
                icon: <CheckCircle className="h-5 w-5" />,
            });
        } catch (error) {
            console.error("Error adding to cart:", error);
            toast.error("فشل إضافة المنتج للسلة", {
                icon: <AlertCircle className="h-5 w-5" />,
            });
        } finally {
            setAddingToCart(false);
        }
    };
    const getDisplayDetails = () => {
        if (!product) return { originalPrice: 0, finalPrice: 0, bestOffer: null };
        let currentPrice = product.price;
        // إذا كان في variant محدد
        if (selectedVariant && product.product_variants) {
            const variant = product.product_variants.find(
                (v) => v.id === selectedVariant
            );
            if (variant) currentPrice = variant.price;
        }
        const { finalPrice, bestOffer } = calculateBestOffer(product as any, currentPrice);
        return { originalPrice: currentPrice, finalPrice, bestOffer };
    };
    const { originalPrice, finalPrice, bestOffer } = getDisplayDetails();
    const hasDiscount = finalPrice < originalPrice;
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
                    <div className="bg-white rounded-lg shadow-sm border p-6 relative">
                        {/* Offer Badge Overlay on Image */}
                        {hasDiscount && (
                            <div className="absolute top-4 left-4 z-10 w-full max-w-[120px]">
                                <ProductOfferBadge
                                    offer={bestOffer}
                                    originalPrice={originalPrice}
                                    finalPrice={finalPrice}
                                />
                            </div>
                        )}

                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                            {product.image_url ? (
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    width={800}
                                    height={800}
                                    quality={75}
                                    className="w-full h-full object-cover"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    priority
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
                                className={`text-sm font-medium ${isInStock() ? "text-green-600" : "text-red-600"
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
                        <div className="flex flex-col gap-1 mb-6">
                            {hasDiscount ? (
                                <div className="flex items-end gap-3">
                                    <span className="text-4xl font-bold text-red-600">
                                        {formatCurrency(finalPrice)}
                                    </span>
                                    <span className="text-xl text-gray-400 line-through mb-1">
                                        {formatCurrency(originalPrice)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-4xl font-bold text-blue-600">
                                    {formatCurrency(originalPrice)}
                                </span>
                            )}
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
                                                <ButtonBase
                                                    key={flavor.id}
                                                    onClick={() => setSelectedFlavor(flavor.id)}
                                                    disabled={flavor.stock_estimate === 0}
                                                    focusRipple
                                                    className={`p-4 rounded-lg border-2 transition text-right w-full block ${selectedFlavor === flavor.id
                                                        ? "border-blue-600 bg-blue-50"
                                                        : "border-gray-200 hover:border-blue-300"
                                                        } ${flavor.stock_estimate === 0
                                                            ? "opacity-50 cursor-not-allowed"
                                                            : ""
                                                        }`}
                                                    sx={{
                                                        borderRadius: '0.5rem',
                                                        overflow: 'hidden',
                                                        justifyContent: 'flex-start',
                                                        display: 'block',
                                                        textAlign: 'right'
                                                    }}
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
                                                </ButtonBase>
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
                                                <ButtonBase
                                                    key={variant.id}
                                                    onClick={() => setSelectedVariant(variant.id)}
                                                    disabled={variant.stock_estimate === 0}
                                                    focusRipple
                                                    className={`p-4 rounded-lg border-2 transition text-right w-full block ${selectedVariant === variant.id
                                                        ? "border-blue-600 bg-blue-50"
                                                        : "border-gray-200 hover:border-blue-300"
                                                        } ${variant.stock_estimate === 0
                                                            ? "opacity-50 cursor-not-allowed"
                                                            : ""
                                                        }`}
                                                    sx={{
                                                        borderRadius: '0.5rem',
                                                        overflow: 'hidden',
                                                        justifyContent: 'flex-start',
                                                        display: 'block',
                                                        textAlign: 'right'
                                                    }}
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
                                                </ButtonBase>
                                            ))}
                                    </div>
                                </div>
                            )}
                        {/* Quantity */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-900 mb-3">
                                الكمية:
                            </label>
                            <div className="flex items-center gap-3 text-black">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 text-black rounded-lg border border-gray-300 hover:bg-gray-100 transition"
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
                                    {formatCurrency(finalPrice * quantity)}
                                </span>
                            </div>
                        </div>
                        {/* Add to Cart Button */}
                        <button
                            onClick={handleAddToCart}
                            disabled={!isInStock() || addingToCart}
                            className="w-full translate-y-10 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium text-lg"
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
                    </div>
                </div>
            </div>
        </div>
    );
}
