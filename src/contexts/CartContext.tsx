"use client";
import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { CART_LIMITS, CART_ERROR_MESSAGES } from "@/lib/cart-limits";
type Product = Database["public"]["Tables"]["products"]["Row"];
type DeliveryFeeTier = Database["public"]["Tables"]["delivery_fee_tiers"]["Row"];
interface CartItem {
    product: Product;
    quantity: number;
    paymentMethod: 'cash' | 'points';
    variantId?: string;
    masterProductId?: string; // ✅ Add this to store original product ID
    price: number; // ✅ Add this to store the effective price (discounted or original)
}
interface CartContextType {
    items: CartItem[];
    addItem: (product: Product, quantity: number, variantId?: string, masterProductId?: string, customPrice?: number) => { success: boolean; error?: string };
    removeItem: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    updateItemPaymentMethod: (productId: string, method: 'cash' | 'points', variantId?: string) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
    getPointsNeeded: () => number;
    getCashNeeded: () => number;
    getDeliveryFee: () => number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [tiers, setTiers] = useState<DeliveryFeeTier[]>([]);
    const supabase = createClient();
    // 🔥 FIX: Migration function to upgrade old cart items
    // Note: We mark items for backend migration - the checkout API will handle the actual lookup
    const migrateCartItems = (oldItems: any[]): CartItem[] => {
        const migratedItems: CartItem[] = [];
        let needsMigration = false;

        for (const item of oldItems) {
            // Check if item needs migration (has variantId but no masterProductId OR missing price)
            if ((item.variantId && !item.masterProductId) || item.price === undefined) {
                needsMigration = true;

                // Calculate price fallback if missing
                let effectivePrice = item.price;
                if (effectivePrice === undefined) {
                    effectivePrice = item.product?.price || 0;
                    // Note: We can't easily recover variant price here without DB lookup, 
                    // but this is just for client-side state migration. 
                    // Real price validation happens on checkout.
                }
                console.log("🔄 Cart item needs migration:", {
                    productId: item.product?.id,
                    variantId: item.variantId,
                    productName: item.product?.name,
                    missingPrice: item.price === undefined
                });
                // Keep item as is - backend checkout will handle the lookup
                // This ensures compatibility with old carts without breaking them
                migratedItems.push({
                    ...item,
                    price: effectivePrice,
                    // masterProductId will be resolved by backend during checkout
                });
            } else {
                // Item is already in correct format
                migratedItems.push(item);
            }
        }
        if (needsMigration) {
            console.log("✅ Cart migration completed:", migratedItems.length, "items");
        }
        return migratedItems;
    };
    useEffect(() => {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);

                // Check if cart needs migration
                const needsMigration = parsedCart.some(
                    (item: any) => (item.variantId && !item.masterProductId) || item.price === undefined
                );
                if (needsMigration) {
                    console.log("🔄 Cart needs migration, upgrading items...");
                    const migratedItems = migrateCartItems(parsedCart);
                    setItems(migratedItems);
                    // Save migrated cart
                    localStorage.setItem("cart", JSON.stringify(migratedItems));
                } else {
                    setItems(parsedCart);
                }
            } catch (error) {
                console.error("Error parsing cart from localStorage:", error);
                // Clear corrupted cart
                localStorage.removeItem("cart");
            }
        }
        const fetchTiers = async () => {
            const { data } = await supabase
                .from("delivery_fee_tiers")
                .select("*")
                .eq("is_active", true)
                .order("min_order_amount", { ascending: true });
            if (data) setTiers(data);
        };
        fetchTiers();
    }, []);
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(items));
    }, [items]);
    const addItem = (product: Product, quantity: number, variantId?: string, masterProductId?: string, customPrice?: number) => {
        // Check total items limit
        const currentTotalItems = items.reduce((total, item) => total + item.quantity, 0);
        if (currentTotalItems + quantity > CART_LIMITS.MAX_TOTAL_ITEMS) {
            return { success: false, error: CART_ERROR_MESSAGES.MAX_ITEMS_EXCEEDED };
        }
        // Determine the effective price to store
        // Priority: customPrice > product.price (backend will re-validate)
        const effectivePrice = customPrice !== undefined ? customPrice : product.price;
        setItems((prevItems) => {
            const existingItem = prevItems.find(
                (item) => variantId
                    ? item.variantId === variantId
                    : item.product.id === product.id && !item.variantId
            );
            if (existingItem) {
                return prevItems.map((item) => {
                    const isMatch = variantId
                        ? item.variantId === variantId
                        : item.product.id === product.id && !item.variantId;
                    if (isMatch) {
                        const maxQuantity = Math.min(
                            item.quantity + quantity,
                            product.stock_estimate,
                            CART_LIMITS.MAX_QUANTITY_PER_PRODUCT
                        );
                        return {
                            ...item,
                            quantity: maxQuantity,
                            price: effectivePrice, // Update price in case it changed (e.g. new offer)
                        };
                    }
                    return item;
                });
            } else {
                return [...prevItems, {
                    product,
                    quantity: Math.min(quantity, CART_LIMITS.MAX_QUANTITY_PER_PRODUCT),
                    paymentMethod: 'cash',
                    variantId,
                    masterProductId,
                    price: effectivePrice
                }];
            }
        });
        return { success: true };
    };
    const removeItem = (productId: string, variantId?: string) => {
        setItems((prevItems) =>
            prevItems.filter((item) => {
                if (variantId) {
                    return item.variantId !== variantId;
                }
                return !(item.product.id === productId && !item.variantId);
            })
        );
    };
    const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            removeItem(productId, variantId);
            return;
        }
        setItems((prevItems) =>
            prevItems.map((item) => {
                const isMatch = variantId
                    ? item.variantId === variantId
                    : item.product.id === productId && !item.variantId;
                if (isMatch) {
                    const maxQuantity = Math.min(
                        quantity,
                        item.product.stock_estimate,
                        CART_LIMITS.MAX_QUANTITY_PER_PRODUCT
                    );
                    return { ...item, quantity: maxQuantity };
                }
                return item;
            })
        );
    };
    const updateItemPaymentMethod = (productId: string, method: 'cash' | 'points', variantId?: string) => {
        setItems((prevItems) =>
            prevItems.map((item) => {
                const isMatch = variantId
                    ? item.variantId === variantId
                    : item.product.id === productId && !item.variantId;
                return isMatch
                    ? { ...item, paymentMethod: method }
                    : item;
            })
        );
    };
    const clearCart = () => {
        setItems([]);
    };
    const getTotalItems = () => {
        return items.reduce((total, item) => total + item.quantity, 0);
    };
    const getTotalPrice = () => {
        return items.reduce(
            (total, item) => total + (item.price || item.product.price) * item.quantity,
            0
        );
    };
    const getPointsNeeded = () => {
        return items
            .filter(item => item.paymentMethod === 'points')
            .reduce((total, item) => {
                const itemTotal = (item.price || item.product.price) * item.quantity;
                return total + Math.ceil(itemTotal / 10);
            }, 0);
    };
    const getCashNeeded = () => {
        return items
            .filter(item => item.paymentMethod === 'cash')
            .reduce((total, item) => total + (item.price || item.product.price) * item.quantity, 0);
    };
    const getDeliveryFee = () => {
        const total = getTotalPrice();
        if (tiers.length === 0) {
            // Fallback
            return total >= 100000 ? 0 : 2000;
        }
        for (const tier of tiers) {
            const min = Number(tier.min_order_amount) || 0;
            const max = tier.max_order_amount === null ? Infinity : Number(tier.max_order_amount);

            if (total >= min && total < max) {
                return Number(tier.delivery_fee);
            }
        }
        return 2000; // Default fallback
    };
    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                updateItemPaymentMethod,
                clearCart,
                getTotalItems,
                getTotalPrice,
                getPointsNeeded,
                getCashNeeded,
                getDeliveryFee,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}
export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
