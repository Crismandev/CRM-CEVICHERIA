import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../services/db';
import type { Producto } from '../types/database';
import { StockTable } from '../components/inventory/StockTable';

export const InventoryPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getAllProductosAdmin();
      setProductos(data);
    } catch (err: any) {
      console.error('Error fetching admin products:', err);
      // Fallback local en caso de error de conexión
      if (productos.length === 0) {
        setProductos([
          { id: '1', nombre: 'Ceviche Clásico', precio: 28.00, stock_disponible: 15, categoria: 'Ceviches', activo: true },
          { id: '2', nombre: 'Ceviche Mixto', precio: 32.00, stock_disponible: 8, categoria: 'Ceviches', activo: true },
          { id: '3', nombre: 'Leche de Tigre', precio: 15.00, stock_disponible: 20, categoria: 'Entradas', activo: true },
          { id: '4', nombre: 'Chicharrón de Calamar', precio: 25.00, stock_disponible: 5, categoria: 'Entradas', activo: true },
          { id: '5', nombre: 'Arroz con Mariscos', precio: 30.00, stock_disponible: 12, categoria: 'Platos de Fondo', activo: true },
          { id: '6', nombre: 'Chicha Morada 1L', precio: 12.00, stock_disponible: 40, categoria: 'Bebidas', activo: true }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [productos.length]);

  useEffect(() => {
    fetchProductos();
  }, []);

  if (loading && productos.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <StockTable productos={productos} onRefresh={fetchProductos} />
    </div>
  );
};
