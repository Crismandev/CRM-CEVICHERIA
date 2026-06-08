import React from 'react';
import type { Orden } from '../../types/database';

interface PrintReceiptProps {
  printData: {
    orden: Orden;
    items: {
      nombre: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }[];
  } | null;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ printData }) => {
  if (!printData) return null;

  const { orden, items } = printData;
  const fecha = new Date(orden.fecha_creacion).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
  });

  return (
    <div id="print-area" className="hidden print:block w-[80mm] p-4 bg-white text-black font-mono text-xs leading-normal">
      {/* Cevichería Header */}
      <div className="text-center border-b border-dashed border-black pb-3 mb-3">
        <h1 className="text-sm font-bold uppercase">CEVICHERÍA EL PUERTO</h1>
        <p>Av. Larco 456, Miraflores - Lima</p>
        <p>Telf: (01) 444-5566</p>
        <p className="font-bold mt-2 uppercase">
          {orden.tipo_comprobante === 'ticket' ? 'TICKET DE CONTROL' : orden.tipo_comprobante === 'boleta' ? 'BOLETA DE VENTA ELECTRÓNICA' : 'FACTURA ELECTRÓNICA'}
        </p>
        <p className="text-2xs">N° {orden.id.substring(0, 8).toUpperCase()}</p>
      </div>

      {/* metadata */}
      <div className="space-y-1 mb-3 border-b border-dashed border-black pb-3">
        <p><strong>Fecha:</strong> {fecha}</p>
        <p><strong>Cajero:</strong> Cajero Central</p>
        {orden.documento_cliente && (
          <p>
            <strong>{orden.tipo_comprobante === 'factura' ? 'RUC:' : 'DNI/RUC:'}</strong>{' '}
            {orden.documento_cliente}
          </p>
        )}
        <p><strong>Estado:</strong> {orden.estado.toUpperCase()}</p>
      </div>

      {/* Items Table */}
      <div className="mb-3 border-b border-dashed border-black pb-3">
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
          <span className="w-1/12 text-left">Cant</span>
          <span className="w-7/12 text-left">Plato</span>
          <span className="w-4/12 text-right">Total</span>
        </div>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start">
              <span className="w-1/12 text-left">{item.cantidad}</span>
              <span className="w-7/12 text-left leading-tight">{item.nombre}</span>
              <span className="w-4/12 text-right">S/ {item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totales */}
      <div className="space-y-1 text-right mb-4">
        <div className="flex justify-between">
          <span>Op. Gravada:</span>
          <span>S/ {(orden.total / 1.18).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>IGV (18%):</span>
          <span>S/ {(orden.total - orden.total / 1.18).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
          <span>TOTAL:</span>
          <span>S/ {orden.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 border-t border-dashed border-black">
        <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
        <p className="text-3xs mt-1">Este comprobante no es válido para SUNAT salvo formalización de Boleta/Factura.</p>
      </div>
    </div>
  );
};
