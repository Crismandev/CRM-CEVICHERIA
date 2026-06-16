import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import type { Producto, Orden, Mesa } from '../types/database';
import { ProductGrid } from '../components/pos/ProductGrid';
import { TicketSidebar } from '../components/pos/TicketSidebar';
import { PrintReceipt } from '../components/pos/PrintReceipt';
import { TrendingUp, ShoppingBag, AlertTriangle, ArrowLeft, Shield, User, Coffee, Plus, Trash2, X, Search, CheckCircle, XCircle } from 'lucide-react';

export const POSPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { activeTable, setActiveTable, clearCart, cart } = useCart();
  const { showToast } = useToast();
  const { askConfirm } = useConfirm();
  const [showAddMesaModal, setShowAddMesaModal] = useState(false);
  const [nuevaMesaNombre, setNuevaMesaNombre] = useState('');
  const [showCartMobile, setShowCartMobile] = useState(false);
  
  // Filtros de Mesas responsivos y rápidos
  const [mesaSearch, setMesaSearch] = useState('');
  const [mesaFilterTab, setMesaFilterTab] = useState<'Todas' | 'Salón' | 'Barra' | 'Terraza' | 'Otras'>('Todas');

  // Reset mobile cart view when table changes
  useEffect(() => {
    setShowCartMobile(false);
  }, [activeTable]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMesas, setLoadingMesas] = useState(true);
  const [printData, setPrintData] = useState<{ orden: Orden; items: any[] } | null>(null);

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    orderCount: 0,
    lowStockCount: 0,
  });

  const meserosDisponibles = ['admin@elpuerto.com', 'usuario@elpuerto.com', 'usuario2@elpuerto.com'];

  // Clasificación y filtrado de mesas dinámico
  const filteredMesas = useMemo(() => {
    return mesas.filter((m) => {
      const matchesSearch = m.nombre.toLowerCase().includes(mesaSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (mesaFilterTab === 'Todas') return true;
      const nombreLower = m.nombre.toLowerCase();
      if (mesaFilterTab === 'Barra') return nombreLower.includes('barra');
      if (mesaFilterTab === 'Terraza') return nombreLower.includes('terraza');
      if (mesaFilterTab === 'Salón') {
        return nombreLower.includes('salón') || nombreLower.includes('salon') || nombreLower.includes('mesa');
      }
      if (mesaFilterTab === 'Otras') {
        return !nombreLower.includes('barra') && !nombreLower.includes('terraza') && !nombreLower.includes('salón') && !nombreLower.includes('salon') && !nombreLower.includes('mesa');
      }
      return true;
    });
  }, [mesas, mesaSearch, mesaFilterTab]);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getProductos();
      setProductos(data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMesas = useCallback(async () => {
    setLoadingMesas(true);
    try {
      const data = await db.getMesas();
      setMesas(data);
    } catch (err: any) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoadingMesas(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: ordersToday, error: ordersError } = await supabase
        .from('ordenes')
        .select('total, estado')
        .gte('fecha_creacion', today.toISOString());

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
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }, []);

  // Suscripción Realtime para Mesas
  useEffect(() => {
    fetchMesas();
    fetchProductos();
    
    const subscription = db.subscribeToMesas(() => {
      fetchMesas();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchMesas, fetchProductos]);

  // Recargar métricas periódicamente o al cambiar mesas
  useEffect(() => {
    fetchMetrics();
  }, [mesas, fetchMetrics]);

  const refreshPageData = () => {
    fetchProductos();
    fetchMetrics();
  };

  // Acciones de Mesas
  const handleOcuparMesa = async (mesa: Mesa) => {
    try {
      // Por defecto, se asigna al usuario actual
      const meseroAsignado = user?.email || 'Desconocido';
      await db.updateMesaEstado(mesa.id, 'ocupada', meseroAsignado);
      // Ir directo a tomar pedido
      setActiveTable(mesa.nombre);
    } catch (err: any) {
      console.error('Error al ocupar mesa:', err);
    }
  };

  const handleReasignarMesero = async (mesa: Mesa, nuevoMesero: string) => {
    if (!isAdmin) return; // Solo admin
    try {
      await db.updateMesaEstado(mesa.id, 'ocupada', nuevoMesero);
    } catch (err: any) {
      console.error('Error al reasignar mesero:', err);
    }
  };

  const handleLiberarMesa = (mesa: Mesa) => {
    askConfirm({
      title: 'Liberar Mesa',
      message: `¿Está seguro de que desea liberar la ${mesa.nombre}? Esto vaciará su pedido actual.`,
      confirmText: 'Liberar Mesa',
      onConfirm: async () => {
        try {
          await db.updateMesaEstado(mesa.id, 'libre', null);
          setActiveTable(mesa.nombre);
          setTimeout(() => {
            clearCart();
            setActiveTable(null);
          }, 50);
          showToast(`La ${mesa.nombre} ha sido liberada.`, 'info');
        } catch (err: any) {
          console.error('Error al liberar mesa:', err);
          showToast('Error al liberar mesa: ' + (err.message || err), 'error');
        }
      }
    });
  };

  const handleAgregarMesaClick = () => {
    setShowAddMesaModal(true);
  };

  const handleAgregarMesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaMesaNombre || !nuevaMesaNombre.trim()) {
      showToast('Por favor ingrese un nombre para la mesa.', 'error');
      return;
    }
    try {
      await db.addMesa(nuevaMesaNombre.trim());
      showToast(`Mesa "${nuevaMesaNombre.trim()}" agregada exitosamente.`, 'success');
      setShowAddMesaModal(false);
      setNuevaMesaNombre('');
      fetchMesas();
    } catch (err: any) {
      showToast('Error al agregar mesa: ' + (err.message || err), 'error');
    }
  };

  const handleEliminarMesa = (mesa: Mesa) => {
    askConfirm({
      title: 'Eliminar Mesa',
      message: `¿Está seguro de que desea eliminar permanentemente la ${mesa.nombre}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Mesa',
      onConfirm: async () => {
        try {
          await db.deleteMesa(mesa.id);
          showToast(`La ${mesa.nombre} fue eliminada exitosamente.`, 'success');
          fetchMesas();
        } catch (err: any) {
          showToast('Error al eliminar mesa: ' + (err.message || err), 'error');
        }
      }
    });
  };

  const activeMesaObj = mesas.find(m => m.nombre === activeTable);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* VISTA 1: GRILLA DE MESAS (Si no hay mesa activa seleccionada) */}
      {!activeTable ? (
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-6 space-y-6">
          
          {/* Banner de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Ventas de Hoy</span>
                <h4 className="text-lg font-black text-slate-800 leading-none">S/ {metrics.totalSales.toFixed(2)}</h4>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Pedidos Cobrados</span>
                <h4 className="text-lg font-black text-slate-800 leading-none">{metrics.orderCount} ordenes</h4>
              </div>
              <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Alertas de Stock</span>
                <h4 className="text-lg font-black text-slate-800 leading-none">{metrics.lowStockCount} platos</h4>
              </div>
              <div className={`p-2.5 rounded-lg ${metrics.lowStockCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Sección de Mesas */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Distribución del Salón & Barra</h3>
                <p className="text-2xs text-slate-500 font-bold uppercase mt-1">Busca y selecciona una mesa directamente. Un toque para ocupar o gestionar.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-2xs font-bold uppercase text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Libres</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500"></span> Mis Mesas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Otras</span>
                {isAdmin && (
                  <button
                    onClick={handleAgregarMesaClick}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-3xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar Mesa
                  </button>
                )}
              </div>
            </div>

            {/* Controles de Búsqueda y Pestañas Rápidas */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar mesa rápidamente (ej: Barra 2, Mesa 5...)"
                  value={mesaSearch}
                  onChange={(e) => setMesaSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:bg-white focus:border-slate-400 placeholder:text-slate-400 transition-colors"
                />
                {mesaSearch && (
                  <button
                    onClick={() => setMesaSearch('')}
                    className="absolute right-3 top-2.5 text-2xs font-extrabold text-slate-400 hover:text-slate-600"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {(['Todas', 'Salón', 'Barra', 'Terraza', 'Otras'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMesaFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-2xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      mesaFilterTab === tab
                        ? 'bg-white text-slate-800 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loadingMesas ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredMesas.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-lg font-bold">
                    No se encontraron mesas que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredMesas.map((mesa) => {
                    const isOccupied = mesa.estado === 'ocupada';
                    const isAttendingMe = mesa.atendido_por === user?.email;
                    const canManage = isAdmin || isAttendingMe;
                    const meseroIniciales = mesa.atendido_por ? mesa.atendido_por.split('@')[0] : '';

                    const handleClickMesa = () => {
                      if (!isOccupied) {
                        handleOcuparMesa(mesa);
                      } else if (canManage) {
                        setActiveTable(mesa.nombre);
                      } else {
                        showToast(`Mesa ocupada por ${mesa.atendido_por?.split('@')[0]}`, 'error');
                      }
                    };

                    return (
                      <div
                        key={mesa.id}
                        onClick={handleClickMesa}
                        className={`relative aspect-[4/3] rounded-xl border-2 p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none group text-left ${
                          isOccupied
                            ? isAttendingMe
                              ? 'border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/40 shadow-2xs'
                              : 'border-rose-200 bg-rose-50/20 hover:bg-rose-50/30'
                            : 'border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/20 hover:shadow-xs'
                        }`}
                      >
                        {/* Fila superior: Nombre mesa y controles de borrado/liberación */}
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-800 leading-tight">
                            {mesa.nombre}
                          </h4>
                          
                          <div className="flex items-center gap-1">
                            {/* Acción rápida para liberar */}
                            {isOccupied && canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLiberarMesa(mesa);
                                }}
                                className="p-1 bg-white hover:bg-rose-100 text-rose-500 rounded border border-rose-100 shadow-3xs transition-colors"
                                title="Liberar mesa vaciando pedido"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarMesa(mesa);
                                }}
                                className="p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded border border-slate-100 shadow-3xs transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar Mesa"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Fila inferior: Estado del mesero e indicador visual */}
                        <div className="flex justify-between items-center gap-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 overflow-hidden flex-1">
                            {isOccupied ? (
                              <>
                                <User className={`h-3 w-3 flex-shrink-0 ${isAttendingMe ? 'text-indigo-600' : 'text-rose-500'}`} />
                                {isAdmin ? (
                                  <select
                                    value={mesa.atendido_por || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleReasignarMesero(mesa, e.target.value)}
                                    className="text-[9px] font-black text-slate-600 border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none cursor-pointer max-w-[80px] truncate"
                                  >
                                    {meserosDisponibles.map(m => (
                                      <option key={m} value={m}>{m.split('@')[0]}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-[9px] font-black uppercase tracking-wider truncate ${
                                    isAttendingMe ? 'text-indigo-700' : 'text-rose-600'
                                  }`}>
                                    {meseroIniciales}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-0.5">
                                <CheckCircle className="h-3 w-3" /> Libre
                              </span>
                            )}
                          </div>
                          
                          {/* Punto de color de estado */}
                          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                            isOccupied
                              ? isAttendingMe
                                ? 'bg-indigo-500 animate-pulse'
                                : 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VISTA 2: TOMA DE PEDIDO ACTIVA (Se selecciona una mesa) */
        <div className="flex flex-1 h-full overflow-hidden relative">
          
          {/* Grilla de productos (izquierda) */}
          <div className="flex-1 flex flex-col overflow-hidden w-full">
            
            {/* Barra superior de Mesa Activa */}
            <div className="min-h-14 py-2 bg-white border-b border-slate-200 px-4 md:px-6 flex flex-wrap items-center justify-between flex-shrink-0 gap-3">
              <button
                onClick={() => setActiveTable(null)}
                className="flex items-center gap-2 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-2xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Volver a Mesas</span>
                <span className="sm:hidden">Volver</span>
              </button>
              
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="hidden xs:inline text-3xs font-black uppercase text-slate-400 tracking-wider">Ordenando en:</span>
                <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                  🏠 {activeTable}
                </span>
                {activeMesaObj?.atendido_por && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-2xs font-bold truncate max-w-[140px] sm:max-w-none">
                    👤 {activeMesaObj.atendido_por.split('@')[0]}
                  </span>
                )}
                
                <button
                  onClick={() => setShowCartMobile(true)}
                  className="lg:hidden flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Pedido ({cart.reduce((sum, item) => sum + item.cantidad, 0)})
                </button>
              </div>
            </div>

            {/* Grilla */}
            <div className="flex-1 overflow-hidden">
              <ProductGrid productos={productos} loading={loading} />
            </div>
          </div>

          {/* Overlay background for mobile ticket view */}
          {showCartMobile && (
            <div 
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-200"
              onClick={() => setShowCartMobile(false)}
            />
          )}

          {/* Ticket lateral derecho */}
          <div className={`
            fixed lg:relative inset-y-0 right-0 z-40 w-full sm:w-96 lg:w-96 bg-white border-l lg:border-slate-200
            transform transition-transform duration-250 ease-in-out lg:transform-none flex flex-col h-full
            ${showCartMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}>
            <TicketSidebar 
              onCheckoutSuccess={() => {
                // Liberar la mesa tras cobrar exitosamente
                if (activeMesaObj) {
                  db.updateMesaEstado(activeMesaObj.id, 'libre', null).then(() => {
                    fetchMesas();
                  });
                }
                setActiveTable(null);
                refreshPageData();
                setShowCartMobile(false);
              }} 
              setPrintData={setPrintData}
              onCloseMobile={() => setShowCartMobile(false)}
            />
          </div>
        </div>
      )}

      {/* Modal para Agregar Mesa */}
      {showAddMesaModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-700" />
                <h3 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">Agregar Mesa / Barra</h3>
              </div>
              <button
                onClick={() => setShowAddMesaModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleAgregarMesaSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-3xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Nombre / Ubicación *
                </label>
                <input
                  type="text"
                  required
                  value={nuevaMesaNombre}
                  onChange={(e) => setNuevaMesaNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-500 text-sm placeholder-slate-400 bg-slate-50/50"
                  placeholder="Ej: Mesa 7 o Barra 3"
                />
              </div>

              {/* Acciones */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMesaModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Componente para la impresión física (oculto en pantalla) */}
      <PrintReceipt printData={printData} />
    </div>
  );
};
