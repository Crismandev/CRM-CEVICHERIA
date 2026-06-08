export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock_disponible: number;
  categoria: string;
  activo: boolean;
  created_at?: string;
}

export type TipoComprobante = 'ticket' | 'boleta' | 'factura';
export type EstadoOrden = 'pagado' | 'anulado';

export interface Orden {
  id: string;
  fecha_creacion: string;
  total: number;
  estado: EstadoOrden;
  tipo_comprobante: TipoComprobante;
  documento_cliente: string | null; // DNI o RUC
  mesa?: string | null;
  creado_por?: string | null;
  created_at?: string;
}

export interface OrdenDetalle {
  id: string;
  orden_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at?: string;
  // Joins opcionales para visualización
  productos?: {
    nombre: string;
  };
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export interface Mesa {
  id: number;
  nombre: string;
  estado: 'libre' | 'ocupada';
  atendido_por: string | null;
  created_at?: string;
}

export interface Perfil {
  id: string;
  email: string;
  rol: 'admin' | 'mesero';
  created_at?: string;
}
