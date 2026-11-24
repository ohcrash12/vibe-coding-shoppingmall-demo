import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "../api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setCartCount(0);
      return 0;
    }

    try {
      const response = await fetch(apiUrl("/carts"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setCartCount(0);
        return 0;
      }

      const count = Number(data.itemCount) || 0;
      setCartCount(count);
      return count;
    } catch {
      setCartCount(0);
      return 0;
    }
  }, []);

  const addToCart = useCallback(
    async ({ productId, size, quantity = 1 }) => {
      const token = sessionStorage.getItem("token");

      if (!token) {
        const error = new Error("LOGIN_REQUIRED");
        error.code = "LOGIN_REQUIRED";
        throw error;
      }

      const response = await fetch(apiUrl("/carts/items"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, size, quantity }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || "장바구니 담기에 실패했습니다.");
        error.code = "ADD_FAILED";
        throw error;
      }

      const count = Number(data.itemCount) || 0;
      setCartCount(count);
      window.dispatchEvent(new Event("cart-updated"));
      return data;
    },
    []
  );

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  useEffect(() => {
    const onUpdate = () => {
      refreshCartCount();
    };

    window.addEventListener("cart-updated", onUpdate);
    window.addEventListener("storage", onUpdate);

    return () => {
      window.removeEventListener("cart-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refreshCartCount]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCartCount, addToCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart는 CartProvider 안에서만 사용할 수 있습니다.");
  }

  return value;
}
