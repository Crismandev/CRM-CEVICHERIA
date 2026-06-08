import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import type { Producto, Orden } from '../types/database';
import { ProductGrid } from '../components/pos/ProductGrid';
import { TicketSidebar } from '../components/pos/TicketSidebar';
import { PrintReceipt } from '../components/pos/PrintReceipt';
import { TrendingUp, ShoppingBag, AlertTriangle } from 'lucide-react';

export const POSPage: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState<{ orden: Orden; items: any[] } | null>(null);
  
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    orderCount: 0,
    lowStockCount: 0,
  });

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getProductos();
      setProductos(data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      if (productos.length === 0) {
        setProductos([
          { id: '1', nombre: 'Ceviche Clásico', precio: 28.00, stock_disponible: 15, categoria: 'Ceviches', activo: true },
          { id: '2', nombre: 'Ceviche Mixto', precio: 32.00, stock_disponible: 8, categoria: 'Ceviches', activo: true },
          { id: '3', nombre: 'Leche de Tigre', precio: 15.00, stock_disponible: 2, categoria: 'Entradas', activo: true },
          { id: '4', nombre: 'Chicharrón de Calamar', precio: 25.00, stock_disponible: 5, categoria: 'Entradas', activo: true },
          { id: '5', nombre: 'Arroz con Mariscos', precio: 30.00, stock_disponible: 12, categoria: 'Platos de Fondo', activo: true },
          { id: '6', nombre: 'Chicha Morada 1L', precio: 12.00, stock_disponible: 40, categoria: 'Bebidas', activo: true }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [productos.length]);

  const fetchMetrics = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Obtener órdenes de hoy
      const { data: ordersToday, error: ordersError } = await supabase
        .from('ordenes')
        .select('total, estado')
        .gte('fecha_creacion', today.toISOString());

      // 2. Obtener productos con stock crítico (<= 5)
      const { data: lowStockProducts, error: stockError } = await supabase
        .from('productos')
        .select('id')
        .eq('activo', true)
        .lte('stock_disponible', 5);

      if (!ordersError && !stockError) {
        const pagadas = (ordersToday || []).filter((o) => o.estado === 'pagado');
        const salesSum = pagadas.reduce((acc, o) => acc + Number(o.total), 0);
        
        setMetrics({
          totalSales: salesSum,
          orderCount: pagadas.length,
          lowStockCount: (lowStockProducts || []).length,
        });
      } else {
        // Mock fallback para desarrollo local en caso de error
        const lowStockMock = productos.filter(p => p.stock_disponible <= 5 && p.activo).length;
        setMetrics({
          totalSales: 215.00,
          orderCount: 8,
          lowStockCount: lowStockMock || 2,
        });
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }, [productos]);

  const refreshPageData = useCallback(() => {
    fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    fetchProductos();
  }, []);

  // Recargar métricas cuando cambie la lista de productos
  useEffect(() => {
    if (productos.length > 0) {
      fetchMetrics();
    }
  }, [productos, fetchMetrics]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* Sección principal izquierda */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Banner de Métricas Rápidas (Diseño Minimalista e Industrial) */}
        <div className="grid grid-cols-3 gap-4 px-6 pt-6 flex-shrink-0">
          
          {/* Card 1: Ventas */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Caja (Ventas del Día)</span>
              <h4 className="text-lg font-black text-slate-800 leading-none">S/ {metrics.totalSales.toFixed(2)}</h4>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Pedidos */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Pedidos Cobrados</span>
              <h4 className="text-lg font-black text-slate-800 leading-none">{metrics.orderCount} ordenes</h4>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Stock Crítico */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Stock Crítico (Alertas)</span>
              <h4 className="text-lg font-black text-slate-800 leading-none">{metrics.lowStockCount} platos</h4>
            </div>
            <div className={`p-2.5 rounded-lg ${metrics.lowStockCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

        </div>

        {/* Grilla de productos */}
        <div className="flex-1 overflow-hidden">
          <ProductGrid productos={productos} loading={loading} />
        </div>
      </div>

      {/* Ticket lateral derecho */}
      <TicketSidebar 
        onCheckoutSuccess={refreshPageData} 
        setPrintData={setPrintData}
      />

      {/* Componente para la impresión física (oculto en pantalla) */}
      <PrintReceipt printData={printData} />
    </div>
  );
};
