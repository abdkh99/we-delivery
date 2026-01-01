"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Database } from "@/types/database";
import { 
  CART_LIMITS, 
  CART_LIMIT_MESSAGES,
  validateCartLimits 
} from "@/lib/cart-limits.config";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface CartItem {
  product: Product;
  quantity: number;
  paymentMethod: 'cash' | 'points';
  variantId?: string;
  masterProductId?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, variantId?: string, masterProductId?: string) => { success: boolean; error?: string };
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => { success: boolean; error?: string };
  updateItemPaymentMethod: (productId: string, method: 'cash' | 'points', variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getPointsNeeded: () => number;
  getCashNeeded: () => number;
  canAddToCart: (product: Product, quantity: number, variantId?: string) => { canAdd: boolean; error?: string };
  getCartLimits: () => typeof CART_LIMITS;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  /**
   * Check if item can be added to cart without exceeding limits
   */
  const canAddToCart = (product: Product, quantity: number, variantId?: string): { canAdd: boolean; error?: string } => {
    const totalItems = getTotalItems();
    const currentTotalPrice = getTotalPrice();
    
    // Find existing item
    const existingItem = items.find(
      (item) => variantId 
        ? item.variantId === variantId
        : item.product.id === product.id && !item.variantId
    );
    
    const currentItemQuantity = existingItem?.quantity || 0;
    
    // Validate against cart limits
    const validation = validateCartLimits(
      totalItems,
      currentItemQuantity,
      quantity,
      currentTotalPrice,
      product.price
    );

    if (!validation.isValid) {
      return { canAdd: false, error: validation.error };
    }

    // Check stock availability
    if (currentItemQuantity + quantity > product.stock_estimate) {
      return { 
        canAdd: false, 
        error: CART_LIMIT_MESSAGES.STOCK_EXCEEDED 
      };
    }

    return { canAdd: true };
  };

  /**
   * Add item to cart with validation
   */
  const addItem = (
    product: Product, 
    quantity: number, 
    variantId?: string, 
    masterProductId?: string
  ): { success: boolean; error?: string } => {
    // Validate before adding
    const validation = canAddToCart(product, quantity, variantId);
    if (!validation.canAdd) {
      return { success: false, error: validation.error };
    }

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
            // Apply all three limits: max per product, stock, and cart limit
            const maxQuantity = Math.min(
              item.quantity + quantity,
              product.stock_estimate,
              CART_LIMITS.MAX_QUANTITY_PER_PRODUCT
            );
            return {
              ...item,
              quantity: maxQuantity,
            };
          }
          return item;
        });
      } else {
        // Check if adding new item exceeds total items limit
        if (prevItems.length >= CART_LIMITS.MAX_TOTAL_ITEMS) {
          return prevItems; // Don't add, but this should be caught by canAddToCart
        }
        
        return [...prevItems, { 
          product, 
          quantity: Math.min(quantity, CART_LIMITS.MAX_QUANTITY_PER_PRODUCT), 
          paymentMethod: 'cash', 
          variantId,
          masterProductId
        }];
      }
    });

    return { success: true };
  };

  /**
   * Remove item from cart
   */
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

  /**
   * Update item quantity with validation
   */
  const updateQuantity = (
    productId: string, 
    quantity: number, 
    variantId?: string
  ): { success: boolean; error?: string } => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return { success: true };
    }

    // Find the item to get its product details
    const item = items.find((item) => 
      variantId 
        ? item.variantId === variantId
        : item.product.id === productId && !item.variantId
    );

    if (!item) {
      return { success: false, error: "المنتج غير موجود في السلة" };
    }

    // Check quantity limit
    if (quantity > CART_LIMITS.MAX_QUANTITY_PER_PRODUCT) {
      return { 
        success: false, 
        error: CART_LIMIT_MESSAGES.MAX_QUANTITY_PER_PRODUCT 
      };
    }

    // Check stock
    if (quantity > item.product.stock_estimate) {
      return { 
        success: false, 
        error: CART_LIMIT_MESSAGES.STOCK_EXCEEDED 
      };
    }

    // Check if new quantity would exceed order value limit
    const currentTotalPrice = getTotalPrice();
    const itemCurrentPrice = item.product.price * item.quantity;
    const itemNewPrice = item.product.price * quantity;
    const projectedTotal = currentTotalPrice - itemCurrentPrice + itemNewPrice;

    if (projectedTotal > CART_LIMITS.MAX_ORDER_VALUE_SYP) {
      return { 
        success: false, 
        error: CART_LIMIT_MESSAGES.MAX_ORDER_VALUE 
      };
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

    return { success: true };
  };

  /**
   * Update payment method for item
   */
  const updateItemPaymentMethod = (
    productId: string, 
    method: 'cash' | 'points', 
    variantId?: string
  ) => {
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

  /**
   * Clear entire cart
   */
  const clearCart = () => {
    setItems([]);
  };

  /**
   * Get total number of items (sum of all quantities)
   */
  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * Get total cart price
   */
  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  /**
   * Get points needed for items paid with points
   */
  const getPointsNeeded = () => {
    return items
      .filter(item => item.paymentMethod === 'points')
      .reduce((total, item) => {
        const itemTotal = item.product.price * item.quantity;
        return total + Math.ceil(itemTotal / 10);
      }, 0);
  };

  /**
   * Get cash needed for items paid with cash
   */
  const getCashNeeded = () => {
    return items
      .filter(item => item.paymentMethod === 'cash')
      .reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  /**
   * Get current cart limits configuration
   */
  const getCartLimits = () => CART_LIMITS;

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
        canAddToCart,
        getCartLimits,
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
