// contexts/CartContext.tsx

import { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "../types/cart";
import type { Product, ProductVariant } from "../types/product";

type CartContextType = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addToCart: (product: Product, variant: ProductVariant | null, quantity: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateVariant: (itemId: string, newVariant: ProductVariant) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "cart_items";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const price = Number(i.variant?.price ?? i.product.price ?? 0);
    return sum + price * i.quantity;
  }, 0);

  const addToCart = (product: Product, variant: ProductVariant | null, quantity: number) => {
    const itemId = `${product.id}-${variant?.id ?? "base"}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing) {
        return prev.map((i) => i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { id: itemId, product, variant, quantity }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(itemId); return; }
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity } : i));
  };

  const updateVariant = (itemId: string, newVariant: ProductVariant) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) return prev;
      const newItemId = `${item.product.id}-${newVariant.id}`;
      const existingNew = prev.find((i) => i.id === newItemId);
      if (existingNew) {
        return prev
          .filter((i) => i.id !== itemId)
          .map((i) => i.id === newItemId ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return prev.map((i) => i.id === itemId ? { ...i, id: newItemId, variant: newVariant } : i);
    });
  };

  const removeItem = (itemId: string) => setItems((prev) => prev.filter((i) => i.id !== itemId));
  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{
      items, totalCount, totalPrice,
      addToCart, updateQuantity, updateVariant, removeItem, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
