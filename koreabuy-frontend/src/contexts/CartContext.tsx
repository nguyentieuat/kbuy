// contexts/CartContext.tsx

import { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "../types/cart";
import type { Product, ProductVariant } from "../types/product";
import * as CartApi from "../api/cart.api";
import { resolveVariant } from "../utils/resolveVariant";

type CartContextType = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addToCart: (
    product: Product,
    variant: ProductVariant | null,
    quantity: number,
    selectedOptions?: Record<string, string>,
    selectedAddon?: any,
  ) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateVariant: (itemId: string, newVariant: ProductVariant) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  updateItemOptions: (itemId: string, options: Record<string, string>) => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "cart_items";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    async function initCart() {
      try {
        if (!token) {
          const saved = localStorage.getItem(STORAGE_KEY);
          const parsed = saved ? JSON.parse(saved) : [];
          setItems(parsed);
        } else {
          const res = await CartApi.fetchCart();
          setItems(res.data);
        }
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setHydrated(true);
      }
    }

    initCart();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const token = localStorage.getItem("token");

    if (!token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const price = i.variant?.pricing?.price ?? i.product.pricing?.price ?? 0;

    return sum + price * i.quantity;
  }, 0);

  const persistGuestCart = (items: CartItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const addToCart = async (
    product: Product,
    variant: ProductVariant | null,
    quantity: number,
    selectedOptions: Record<string, string> = {},
    selectedAddon: any = null,
  ) => {
    debugger;
    const token = localStorage.getItem("token");
    // guest cart
    if (!token) {
      const itemId = `${product.id}-${
        variant?.id ?? "base"
      }-${JSON.stringify(selectedOptions ?? {})}-${selectedAddon?.value ?? "no-addon"}`;

      setItems((prev) => {
        const existing = prev.find((i) => i.id === itemId);

        let updated;

        if (existing) {
          updated = prev.map((i) =>
            i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i,
          );
        } else {
          updated = [
            ...prev,
            {
              id: itemId,
              product,
              variant,
              quantity,
              selectedOptions,
              selectedAddon,
            },
          ];
        }

        persistGuestCart(updated);
        return updated;
      });

      return;
    }

    // logged in
    try {
      await CartApi.addCartItem({
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity,
      });

      const res = await CartApi.fetchCart();

      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateItemOptions = (
    itemId: string,
    options: Record<string, string>,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const newVariant = resolveVariant(
          item.product,
          options,
          item.selectedAddon,
        );

        return {
          ...item,
          selectedOptions: options,
          variant: newVariant,
        };
      }),
    );
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const token = localStorage.getItem("token");

    // guest cart
    if (!token) {
      if (quantity <= 0) {
        removeItem(itemId);
        return;
      }

      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
      );

      return;
    }

    // logged in
    try {
      await CartApi.updateCartItem(itemId, quantity);

      const res = await CartApi.fetchCart();

      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateVariant = async (itemId: string, newVariant: ProductVariant) => {
    const token = localStorage.getItem("token");

    // guest cart
    if (!token) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;

          return {
            ...item,
            variant: newVariant,
            selectedOptions: newVariant.attributes ?? {},
          };
        }),
      );

      return;
    }

    // logged in
    try {
      const item = items.find((i) => i.id === itemId);

      if (!item) return;

      // remove old item
      await CartApi.deleteCartItem(itemId);

      // add new variant
      await CartApi.addCartItem({
        productId: item.product.id,
        variantId: newVariant.id,
        quantity: item.quantity,
      });

      const res = await CartApi.fetchCart();

      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId: string) => {
    const token = localStorage.getItem("token");

    // guest cart
    if (!token) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));

      return;
    }

    // logged in
    try {
      await CartApi.deleteCartItem(itemId);

      const res = await CartApi.fetchCart();

      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const clearCart = async () => {
    const token = localStorage.getItem("token");

    // guest cart
    if (!token) {
      setItems([]);
      return;
    }

    try {
      // tạm thời xoá từng item
      await Promise.all(items.map((item) => CartApi.deleteCartItem(item.id)));

      setItems([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        totalPrice,
        addToCart,
        updateQuantity,
        updateVariant,
        removeItem,
        clearCart,
        updateItemOptions,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
