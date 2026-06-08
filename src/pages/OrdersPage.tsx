import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import type { Orden, OrdenDetalle } from '../types/database';
import { PrintReceipt } from '../components/pos/PrintReceipt';
import { useToast } from '../hooks/useToast';
import { 
  History, Search, Eye, Ban, 
  TrendingUp, XCircle, Printer 
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>('hoy'); // 'hoy', 'ayer', '7dias', 'todos'

  // Detalles de orden seleccionada
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);
  const [selectedDetalles, setSelectedDetalles] = useState<OrdenDetalle[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  // Estado para impresión
  const [printData, setPrintData] = useState<{ orden: Orden; items: any[] } | null>(null);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getOrdenes();
      setOrdenes(data);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      // Fallback local para desarrollo si no hay conexión
      if (ordenes.length === 0) {
        setOrdenes([
          { id: 'uuid-1-test', fecha_creacion: new Date().toISOString(), total: 45.00, estado: 'pagado', tipo_comprobante: 'ticket', documento_cliente: null },
          { id: 'uuid-2-test', fecha_creacion: new Date(Date.now() - 3600000).toISOString(), total: 72.00, estado: 'pagado', tipo_comprobante: 'boleta', documento_cliente: '76543210' },
          { id: 'uuid-3-test', fecha_creacion: new Date(Date.now() - 86400000).toISOString(), total: 32.00, estado: 'anulado', tipo_comprobante: 'ticket', documento_cliente: null }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [ordenes.length]);

  useEffect(() => {
    fetchOrdenes();
  }, []);

  const handleSelectOrden = async (orden: Orden) => {
    setSelectedOrden(orden);
    setLoadingDetalles(true);
    try {
      const data = await db.getOrdenDetalles(orden.id);
      setSelectedDetalles(data);
    } catch (err: any) {
      console.error(err);
      // Fallback local para desarrollo
      setSelectedDetalles([
        { id: '1', orden_id: orden.id, producto_id: '1', cantidad: 1, precio_unitario: 28.00, subtotal: 28.00, productos: { nombre: 'Ceviche Clásico' } },
        { id: '2', orden_id: orden.id, producto_id: '3', cantidad: 1, precio_unitario: 17.00, subtotal: 17.00, productos: { nombre: 'Leche de Tigre' } }
      ]);
    } finally {
      setLoadingDetalles(false);
    }
  };

  const handleAnnulOrder = async (ordenId: string) => {
    if (!window.confirm('¿Está seguro de que desea ANULAR este comprobante? El stock de los platos vendidos se devolverá al inventario automáticamente.')) {
      return;
    }
    try {
      await db.anularOrden(ordenId);
      showToast('Orden anulada exitosamente. El inventario ha sido restaurado.', 'success');
      setSelectedOrden((prev) => prev ? { ...prev, estado: 'anulado' } : null);
      fetchOrdenes();
    } catch (err: any) {
      showToast(`Error al anular orden: ${err.message || err}`, 'error');
    }
  };

  const handleReprint = () => {
    if (!selectedOrden || selectedDetalles.length === 0) return;

    const printItems = selectedDetalles.map((det) => ({
      nombre: det.productos?.nombre || 'Plato desconocido',
      cantidad: det.cantidad,
      precioUnitario: det.precio_unitario,
      subtotal: det.subtotal,
    }));

    setPrintData({ orden: selectedOrden, items: printItems });

    // Lanzar diálogo de impresión física
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 350);
  };

  // Filtrado de órdenes
  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((o) => {
      // 1. Filtro de búsqueda
      const matchesSearch = 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (o.documento_cliente && o.documento_cliente.includes(searchTerm));

      // 2. Filtro de estado
      const matchesStatus = statusFilter === 'todos' || o.estado === statusFilter;

      // 3. Filtro de fecha
      const date = new Date(o.fecha_creacion);
      const now = new Date();
      let matchesDate = true;

      if (dateFilter === 'hoy') {
        matchesDate = date.toDateString() === now.toDateString();
      } else if (dateFilter === 'ayer') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        matchesDate = date.toDateString() === yesterday.toDateString();
      } else if (dateFilter === '7dias') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = date >= sevenDaysAgo;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [ordenes, searchTerm, statusFilter, dateFilter]);

  // Cálculos de Resumen
  const metrics = useMemo(() => {
    const netas = filteredOrdenes
      .filter((o) => o.estado === 'pagado')
      .reduce((acc, o) => acc + Number(o.total), 0);

    const anuladas = filteredOrdenes
      .filter((o) => o.estado === 'anulado')
      .reduce((acc, o) => acc + Number(o.total), 0);

    return {
      totalNeto: netas,
      totalAnulado: anuladas,
      cantidad: filteredOrdenes.length,
    };
  }, [filteredOrdenes]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      
      {/* 1. KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest">Ventas Netas (Filtro)</span>
            <h3 className="text-xl font-black text-slate-800 leading-none">S/ {metrics.totalNeto.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest">Monto Anulado</span>
            <h3 className="text-xl font-black text-slate-800 leading-none">S/ {metrics.totalAnulado.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest">Comprobantes</span>
            <h3 className="text-xl font-black text-slate-800 leading-none">{metrics.cantidad} documentos</h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
            <History className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Filtros */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-white border border-slate-200 rounded-lg p-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Búsqueda */}
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por DNI/RUC o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:bg-white focus:border-slate-500"
            />
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1">
            {['hoy', 'ayer', '7dias', 'todos'].map((range) => (
              <button
                key={range}
                onClick={() => setDateFilter(range)}
                className={`px-3 py-1 rounded text-2xs font-bold uppercase transition-all duration-100 cursor-pointer ${
                  dateFilter === range
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {range === '7dias' ? '7 días' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full lg:w-44 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none cursor-pointer"
        >
          <option value="todos">Todos los Estados</option>
          <option value="pagado">Pagado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {/* 3. Panel de Tabla y Detalle Lateral */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Tabla a la izquierda */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-2xs font-bold uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-4">Código / ID</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4 font-mono">Doc. Cliente</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredOrdenes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se encontraron órdenes registradas con este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredOrdenes.map((o) => (
                    <tr 
                      key={o.id} 
                      onClick={() => handleSelectOrden(o)}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                        selectedOrden?.id === o.id ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="p-4 font-bold text-slate-800 uppercase text-xs">
                        #{o.id.substring(0, 8)}
                      </td>
                      <td className="p-4 text-xs">
                        {new Date(o.fecha_creacion).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-2xs font-extrabold uppercase">
                          {o.tipo_comprobante}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {o.documento_cliente || '-'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-800">
                        S/ {o.total.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            o.estado === 'pagado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {o.estado === 'pagado' ? 'Cobrado' : 'Anulado'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel lateral derecho (Detalle) */}
        <div className="w-96 bg-white border border-slate-200 rounded-lg flex flex-col h-full overflow-hidden flex-shrink-0">
          {selectedOrden ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 uppercase text-xs">Comprobante</h4>
                  <span className="font-mono text-2xs text-slate-500">ID: #{selectedOrden.id.substring(0, 8)}</span>
                </div>
                <button
                  onClick={() => setSelectedOrden(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Contenido / Detalle platos */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingDetalles ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
                  </div>
                ) : (
                  <>
                    {/* Metadatos */}
                    <div className="space-y-1.5 text-xs border-b border-dashed border-slate-200 pb-3">
                      <p className="flex justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-3xs">Fecha y Hora:</span>
                        <span className="font-bold text-slate-700">
                          {new Date(selectedOrden.fecha_creacion).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-3xs">Tipo:</span>
                        <span className="font-extrabold uppercase text-slate-700">{selectedOrden.tipo_comprobante}</span>
                      </p>
                      {selectedOrden.documento_cliente && (
                        <p className="flex justify-between">
                          <span className="text-slate-400 font-semibold uppercase text-3xs">Doc. Cliente:</span>
                          <span className="font-mono font-bold text-slate-700">{selectedOrden.documento_cliente}</span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-3xs">Estado:</span>
                        <span className={`font-extrabold uppercase ${
                          selectedOrden.estado === 'pagado' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {selectedOrden.estado === 'pagado' ? 'Pagado' : 'Anulado'}
                        </span>
                      </p>
                    </div>

                    {/* Tabla de platos */}
                    <div className="space-y-3">
                      <h5 className="font-extrabold text-slate-400 text-3xs uppercase tracking-widest">Platos del Pedido</h5>
                      <div className="divide-y divide-slate-100">
                        {selectedDetalles.map((det) => (
                          <div key={det.id} className="py-2 flex justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-800 leading-snug">{det.productos?.nombre || 'Plato desconocido'}</p>
                              <span className="text-slate-400 text-3xs font-mono">{det.cantidad} x S/ {det.precio_unitario.toFixed(2)}</span>
                            </div>
                            <span className="font-bold text-slate-800 font-mono">S/ {det.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desglose de impuestos */}
                    <div className="border-t border-dashed border-slate-200 pt-3 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>Op. Gravada:</span>
                        <span>S/ {(selectedOrden.total / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 font-mono">
                        <span>IGV (18%):</span>
                        <span>S/ {(selectedOrden.total - selectedOrden.total / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-800 border-t border-slate-100 pt-2 font-mono text-sm">
                        <span>TOTAL:</span>
                        <span>S/ {selectedOrden.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer de Acciones (Reimprimir / Anular) */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 flex-shrink-0">
                <button
                  onClick={handleReprint}
                  disabled={loadingDetalles || selectedDetalles.length === 0}
                  className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Reimprimir Ticket (80mm)
                </button>

                {selectedOrden.estado === 'pagado' && (
                  <button
                    onClick={() => handleAnnulOrder(selectedOrden.id)}
                    disabled={loadingDetalles}
                    className="w-full py-2.5 px-4 border border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    Anular Comprobante
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <History className="h-8 w-8 text-slate-300 stroke-1" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Ningún comprobante seleccionado</p>
              <p className="text-xs text-slate-400 mt-1">Selecciona una orden de la lista para ver su detalle, reimprimirla o anularla.</p>
            </div>
          )}
        </div>
      </div>

      {/* Render físico de impresión (oculto en pantalla) */}
      <PrintReceipt printData={printData} />
    </div>
  );
};
