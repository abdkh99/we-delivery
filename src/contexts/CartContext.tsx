"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface CartItem {
  product: Product;
  quantity: number;
  paymentMethod: 'cash' | 'points';
  variantId?: string;
  masterProductId?: string; // ✅ Add this to store original product ID
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, variantId?: string, masterProductId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  updateItemPaymentMethod: (productId: string, method: 'cash' | 'points', variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getPointsNeeded: () => number;
  getCashNeeded: () => number;
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

  const addItem = (product: Product, quantity: number, variantId?: string, masterProductId?: string) => {
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
            const MAX_QUANTITY_PER_PRODUCT = 100;
            const maxQuantity = Math.min(
              item.quantity + quantity,
              product.stock_estimate,
              MAX_QUANTITY_PER_PRODUCT
            );
            return {
              ...item,
              quantity: maxQuantity,
            };
          }
          return item;
        });
      } else {
        return [...prevItems, { 
          product, 
          quantity, 
          paymentMethod: 'cash', 
          variantId,
          masterProductId // ✅ Store the master product ID
        }];
      }
    });
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
          const MAX_QUANTITY_PER_PRODUCT = 100;
          const maxQuantity = Math.min(
            quantity, 
            item.product.stock_estimate,
            MAX_QUANTITY_PER_PRODUCT
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
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const getPointsNeeded = () => {
    return items
      .filter(item => item.paymentMethod === 'points')
      .reduce((total, item) => {
        const itemTotal = item.product.price * item.quantity;
        return total + Math.ceil(itemTotal / 10);
      }, 0);
  };

  const getCashNeeded = () => {
    return items
      .filter(item => item.paymentMethod === 'cash')
      .reduce((total, item) => total + item.product.price * item.quantity, 0);
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
