import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Producto, CartItem } from '../types/database';

interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto) => void;
  removeFromCart: (productoId: string) => void;
  decrementQuantity: (productoId: string) => void;
  clearCart: () => void;
  total: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((producto: Producto) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.producto.id === producto.id);

      if (existingItemIndex > -1) {
        const existingItem = prevCart[existingItemIndex];
        // Validar stock disponible
        if (existingItem.cantidad >= producto.stock_disponible) {
          alert(`No hay suficiente stock disponible para ${producto.nombre} (Stock: ${producto.stock_disponible})`);
          return prevCart;
        }
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...existingItem,
          cantidad: existingItem.cantidad + 1,
        };
        return newCart;
      } else {
        if (producto.stock_disponible < 1) {
          alert(`No hay stock disponible para ${producto.nombre}`);
          return prevCart;
        }
        return [...prevCart, { producto, cantidad: 1 }];
      }
    });
  }, []);

  const removeFromCart = useCallback((productoId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productoId));
  }, []);

  const decrementQuantity = useCallback((productoId: string) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.producto.id === productoId);
      if (existingItemIndex === -1) return prevCart;

      const existingItem = prevCart[existingItemIndex];
      if (existingItem.cantidad <= 1) {
        return prevCart.filter((item) => item.producto.id !== productoId);
      }

      const newCart = [...prevCart];
      newCart[existingItemIndex] = {
        ...existingItem,
        cantidad: existingItem.cantidad - 1,
      };
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.cantidad, 0);
  }, [cart]);

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      decrementQuantity,
      clearCart,
      total,
      totalItems,
    }),
    [cart, addToCart, removeFromCart, decrementQuantity, clearCart, total, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
