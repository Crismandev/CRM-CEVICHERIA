import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import type { TipoComprobante, Orden } from '../../types/database';
import { db } from '../../services/db';
import { useToast } from '../../hooks/useToast';
import { Trash2, Plus, Minus, CreditCard, Receipt, User, ArrowLeft } from 'lucide-react';

interface TicketSidebarProps {
  onCheckoutSuccess: () => void;
  setPrintData: (data: { orden: Orden; items: any[] } | null) => void;
  onCloseMobile?: () => void;
}

export const TicketSidebar: React.FC<TicketSidebarProps> = ({ onCheckoutSuccess, setPrintData, onCloseMobile }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { cart, decrementQuantity, addToCart, total, clearCart, activeTable } = useCart();
  const [tipoComprobante, setTipoComprobante] = useState<TipoComprobante>('ticket');
  const [documentoCliente, setDocumentoCliente] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Validaciones
  const getValidationError = (): string | null => {
    if (cart.length === 0) return 'El carrito está vacío';
    
    if (tipoComprobante === 'factura') {
      if (!documentoCliente) return 'El RUC es obligatorio para Facturas';
      if (!/^[0-9]{11}$/.test(documentoCliente)) return 'El RUC debe tener 11 dígitos numéricos';
    }
    
    if (tipoComprobante === 'boleta' && documentoCliente) {
      if (!/^[0-9]{8}$/.test(documentoCliente)) return 'El DNI debe tener 8 dígitos numéricos';
    }

    if (documentoCliente && tipoComprobante === 'ticket') {
      if (!/^[0-9]{8}$|^[0-9]{11}$/.test(documentoCliente)) {
        return 'El documento debe ser un DNI (8 dígitos) o RUC (11 dígitos)';
      }
    }

    return null;
  };

  const error = getValidationError();

  const handleCobrar = async () => {
    if (error) return;
    
    setIsProcessing(true);
    try {
      const orderItems = cart.map((item) => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio,
      }));

      const orden = await db.crearOrden(
        total,
        tipoComprobante,
        documentoCliente || null,
        orderItems,
        activeTable,
        user?.email || null
      );

      const printItems = cart.map((item) => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio,
        subtotal: item.cantidad * item.producto.precio,
      }));

      setPrintData({ orden, items: printItems });

      setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 350);

      clearCart();
      setDocumentoCliente('');
      onCheckoutSuccess();
    } catch (err: any) {
      console.error(err);
      showToast(`Error al procesar la venta: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden shadow-sm">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 mr-1 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              title="Volver a los platos"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
          )}
          <Receipt className="h-5 w-5 text-slate-700" />
          <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">Detalle del Pedido</h3>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vaciar
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Receipt className="h-8 w-8 text-slate-300 stroke-1" />
            </div>
            <p className="text-sm font-semibold text-slate-500">La orden está vacía</p>
            <p className="text-xs text-slate-400 mt-1">Haz clic en los platos del menú para agregarlos aquí.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.producto.id}
              className="flex justify-between items-start border-b border-slate-100 pb-3"
            >
              <div className="flex-1 pr-3">
                <h4 className="text-sm font-bold text-slate-800 leading-snug">
                  {item.producto.nombre}
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  S/ {item.producto.precio.toFixed(2)} c/u
                </span>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {/* Controles de cantidad táctiles */}
                <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 overflow-hidden">
                  <button
                    onClick={() => decrementQuantity(item.producto.id)}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2.5 text-xs font-black text-slate-800 min-w-6 text-center font-mono">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => addToCart(item.producto)}
                    className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Subtotal */}
                <span className="text-sm font-black text-slate-800 font-mono">
                  S/ {(item.producto.precio * item.cantidad).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulario de Comprobante y Cobro */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 flex-shrink-0">
        
        {/* Selector de Mesa */}
        <div className="space-y-1">
          <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Ubicación / Mesa</span>
          <div className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            🏠 {activeTable || 'Sin mesa'}
          </div>
        </div>

        {/* Selector de Comprobante (Diseño Minimalista) */}
        <div className="space-y-1.5">
          <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Documento de Venta</span>
          <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-slate-200 rounded-lg">
            {(['ticket', 'boleta', 'factura'] as TipoComprobante[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => {
                  setTipoComprobante(tipo);
                  setDocumentoCliente('');
                }}
                className={`py-1.5 px-2 text-2xs font-bold rounded-md text-center transition-all duration-150 uppercase cursor-pointer select-none ${
                  tipoComprobante === tipo
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tipo === 'ticket' ? 'Ticket' : tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Campo Documento Cliente */}
        {tipoComprobante !== 'ticket' && (
          <div className="space-y-1">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">
              {tipoComprobante === 'factura' ? 'RUC del Cliente (Obligatorio)' : 'DNI del Cliente (Opcional)'}
            </span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder={tipoComprobante === 'factura' ? 'RUC (11 dígitos)' : 'DNI (8 dígitos)'}
                value={documentoCliente}
                onChange={(e) => setDocumentoCliente(e.target.value.replace(/\D/g, ''))}
                maxLength={tipoComprobante === 'factura' ? 11 : 8}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-500 text-slate-800 font-mono"
              />
            </div>
          </div>
        )}

        {/* Totales en Ticket Físico */}
        <div className="space-y-1 border-t border-slate-200 pt-3">
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>Op. Gravada:</span>
            <span>S/ {(total / 1.18).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>IGV (18%):</span>
            <span>S/ {(total - total / 1.18).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-slate-900 border-t border-dashed border-slate-300 pt-2 font-mono">
            <span>TOTAL:</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botón Cobrar */}
        <button
          disabled={!!error || isProcessing}
          onClick={handleCobrar}
          className={`w-full py-3 px-4 rounded-md font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none ${
            error
              ? 'bg-slate-300 cursor-not-allowed text-slate-500'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          {isProcessing ? 'Procesando...' : `Cobrar S/ ${total.toFixed(2)}`}
        </button>
        
        {error && cart.length > 0 && (
          <p className="text-3xs text-red-500 text-center font-bold uppercase tracking-wider">{error}</p>
        )}
      </div>
    </div>
  );
};
