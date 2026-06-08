import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Producto, CartItem } from '../types/database';

interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto) => void;
  removeFromCart: (productoId: string) => void;
  decrementQuantity: (productoId: string) => void;
  clearCart: () => void;
  total: number;
  totalItems: number;
  activeTable: string | null;
  setActiveTable: (table: string | null) => void;
  getTableCart: (table: string) => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado de carritos indexados por mesa (ej: { 'Mesa 1': [...], 'Mesa 2': [...] })
  const [carts, setCarts] = useState<{ [table: string]: CartItem[] }>(() => {
    try {
      const saved = localStorage.getItem('el_puerto_carts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Mesa activa seleccionada en el POS
  const [activeTable, setActiveTable] = useState<string | null>(null);

  // Guardar en localStorage ante cambios
  useEffect(() => {
    localStorage.setItem('el_puerto_carts', JSON.stringify(carts));
  }, [carts]);

  // Obtener el carrito de la mesa activa
  const cart = useMemo(() => {
    if (!activeTable) return [];
    return carts[activeTable] || [];
  }, [carts, activeTable]);

  const getTableCart = useCallback((table: string) => {
    return carts[table] || [];
  }, [carts]);

  const addToCart = useCallback((producto: Producto) => {
    if (!activeTable) return;
    
    setCarts((prevCarts) => {
      const prevCart = prevCarts[activeTable] || [];
      const existingItemIndex = prevCart.findIndex((item) => item.producto.id === producto.id);
      let newCart = [...prevCart];

      if (existingItemIndex > -1) {
        const existingItem = prevCart[existingItemIndex];
        // Validar stock disponible
        if (existingItem.cantidad >= producto.stock_disponible) {
          alert(`No hay suficiente stock disponible para ${producto.nombre} (Stock: ${producto.stock_disponible})`);
          return prevCarts;
        }
        newCart[existingItemIndex] = {
          ...existingItem,
          cantidad: existingItem.cantidad + 1,
        };
      } else {
        if (producto.stock_disponible < 1) {
          alert(`No hay stock disponible para ${producto.nombre}`);
          return prevCarts;
        }
        newCart = [...prevCart, { producto, cantidad: 1 }];
      }

      return {
        ...prevCarts,
        [activeTable]: newCart,
      };
    });
  }, [activeTable]);

  const removeFromCart = useCallback((productoId: string) => {
    if (!activeTable) return;
    
    setCarts((prevCarts) => {
      const prevCart = prevCarts[activeTable] || [];
      const newCart = prevCart.filter((item) => item.producto.id !== productoId);
      
      const copy = { ...prevCarts };
      if (newCart.length === 0) {
        delete copy[activeTable];
        return copy;
      }
      return {
        ...copy,
        [activeTable]: newCart,
      };
    });
  }, [activeTable]);

  const decrementQuantity = useCallback((productoId: string) => {
    if (!activeTable) return;

    setCarts((prevCarts) => {
      const prevCart = prevCarts[activeTable] || [];
      const existingItemIndex = prevCart.findIndex((item) => item.producto.id === productoId);
      if (existingItemIndex === -1) return prevCarts;

      const existingItem = prevCart[existingItemIndex];
      let newCart = [...prevCart];

      if (existingItem.cantidad <= 1) {
        newCart = prevCart.filter((item) => item.producto.id !== productoId);
      } else {
        newCart[existingItemIndex] = {
          ...existingItem,
          cantidad: existingItem.cantidad - 1,
        };
      }

      const copy = { ...prevCarts };
      if (newCart.length === 0) {
        delete copy[activeTable];
        return copy;
      }
      return {
        ...copy,
        [activeTable]: newCart,
      };
    });
  }, [activeTable]);

  const clearCart = useCallback(() => {
    if (!activeTable) return;
    setCarts((prevCarts) => {
      const copy = { ...prevCarts };
      delete copy[activeTable];
      return copy;
    });
  }, [activeTable]);

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
      activeTable,
      setActiveTable,
      getTableCart,
    }),
    [cart, addToCart, removeFromCart, decrementQuantity, clearCart, total, totalItems, activeTable, getTableCart]
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
