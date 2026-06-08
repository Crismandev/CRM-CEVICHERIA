import { supabase } from './supabase';
import type { Producto, Orden, OrdenDetalle, TipoComprobante, Mesa } from '../types/database';

export const db = {
  // Productos
  async getProductos(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllProductosAdmin(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateProductoStock(id: string, nuevoStock: number): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .update({ stock_disponible: nuevoStock })
      .eq('id', id);

    if (error) throw error;
  },

  async saveProducto(producto: Omit<Producto, 'id'> & { id?: string }): Promise<Producto> {
    if (producto.id) {
      const { data, error } = await supabase
          .from('productos')
          .update(producto)
          .eq('id', producto.id)
          .select()
          .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
          .from('productos')
          .insert([producto])
          .select()
          .single();
      if (error) throw error;
      return data;
    }
  },

  // Órdenes
  async crearOrden(
    total: number,
    tipoComprobante: TipoComprobante,
    documentoCliente: string | null,
    items: { productoId: string; cantidad: number; precioUnitario: number }[],
    mesa: string | null = null,
    creadoPor: string | null = null
  ): Promise<Orden> {
    // 1. Insertar la orden
    const { data: ordenData, error: ordenError } = await supabase
      .from('ordenes')
      .insert([
        {
          total,
          tipo_comprobante: tipoComprobante,
          documento_cliente: documentoCliente || null,
          estado: 'pagado',
          mesa,
          creado_por: creadoPor,
        },
      ])
      .select()
      .single();

    if (ordenError) throw ordenError;
    const orden = ordenData as Orden;

    // 2. Insertar los detalles de la orden
    const detalles = items.map((item) => ({
      orden_id: orden.id,
      producto_id: item.productoId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      subtotal: item.cantidad * item.precioUnitario,
    }));

    const { error: detallesError } = await supabase
      .from('orden_detalles')
      .insert(detalles);

    if (detallesError) {
      // Intentar anular la orden en caso de fallo para no dejar datos huérfanos
      await supabase.from('ordenes').update({ estado: 'anulado' }).eq('id', orden.id);
      throw detallesError;
    }

    return orden;
  },

  async getOrdenes(): Promise<Orden[]> {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOrdenDetalles(ordenId: string): Promise<OrdenDetalle[]> {
    const { data, error } = await supabase
      .from('orden_detalles')
      .select('*, productos(nombre)')
      .eq('orden_id', ordenId);

    if (error) throw error;
    return data || [];
  },

  async anularOrden(id: string): Promise<void> {
    const { error } = await supabase
      .from('ordenes')
      .update({ estado: 'anulado' })
      .eq('id', id);

    if (error) throw error;
  },

  // Mesas
  async getMesas(): Promise<Mesa[]> {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateMesaEstado(id: number, estado: 'libre' | 'ocupada', atendidoPor: string | null): Promise<void> {
    const { error } = await supabase
      .from('mesas')
      .update({ estado, atendido_por: atendidoPor })
      .eq('id', id);

    if (error) throw error;
  },

  subscribeToMesas(callback: (payload: any) => void) {
    return supabase
      .channel('mesas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }
};
