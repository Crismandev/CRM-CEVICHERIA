import React, { useEffect, useState, useCallback } from 'react';
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
import { TrendingUp, ShoppingBag, AlertTriangle, ArrowLeft, Shield, User, Coffee, Plus, Trash2, X } from 'lucide-react';

export const POSPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { activeTable, setActiveTable, clearCart } = useCart();
  const { showToast } = useToast();
  const { askConfirm } = useConfirm();
  const [showAddMesaModal, setShowAddMesaModal] = useState(false);
  const [nuevaMesaNombre, setNuevaMesaNombre] = useState('');
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
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Distribución del Salón & Barra</h3>
                <p className="text-2xs text-slate-500 font-bold uppercase mt-1">Selecciona una mesa para gestionar el pedido o asignar mesero</p>
              </div>
              <div className="flex items-center gap-4 text-2xs font-bold uppercase text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Libres</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> Ocupadas</span>
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

            {loadingMesas ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {mesas.map((mesa) => {
                  const isOccupied = mesa.estado === 'ocupada';
                  const isAttendingMe = mesa.atendido_por === user?.email;
                  const canManage = isAdmin || isAttendingMe;

                  return (
                    <div 
                      key={mesa.id}
                      className={`rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs ${
                        isOccupied 
                          ? 'border-red-200 bg-red-50/10' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Cabecera Tarjeta */}
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ubicación</span>
                          <h4 className="text-base font-black text-slate-800 leading-tight flex items-center gap-1.5">
                            {mesa.nombre}
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarMesa(mesa);
                                }}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                title="Eliminar Mesa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider ${
                          isOccupied ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOccupied ? 'Ocupada' : 'Libre'}
                        </span>
                      </div>

                      {/* Cuerpo - Estado del Mesero */}
                      <div className="p-4 flex-1 flex flex-col justify-center">
                        {isOccupied ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-xs">
                              {mesa.atendido_por === 'admin@elpuerto.com' ? (
                                <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              ) : (
                                <User className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              )}
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider leading-none">Mesero Asignado</span>
                                {isAdmin ? (
                                  /* Dropdown para que el admin cambie mesero */
                                  <select
                                    value={mesa.atendido_por || ''}
                                    onChange={(e) => handleReasignarMesero(mesa, e.target.value)}
                                    className="text-xs font-black text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none mt-1 cursor-pointer"
                                  >
                                    {meserosDisponibles.map(m => (
                                      <option key={m} value={m}>{m.split('@')[0]}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="font-bold text-slate-700 truncate mt-0.5" title={mesa.atendido_por || ''}>
                                    {mesa.atendido_por?.split('@')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-2xs text-slate-400 font-bold uppercase flex items-center justify-center gap-1.5">
                            <Coffee className="h-4 w-4 stroke-1.5" />
                            Esperando clientes
                          </div>
                        )}
                      </div>

                      {/* Footer - Botones de acción */}
                      <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                        {isOccupied ? (
                          <>
                            {canManage ? (
                              <button
                                onClick={() => setActiveTable(mesa.nombre)}
                                className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white text-2xs font-bold rounded-lg uppercase tracking-wider text-center cursor-pointer transition-colors"
                              >
                                Tomar Pedido
                              </button>
                            ) : (
                              <span className="flex-1 py-1.5 px-2 bg-slate-200 text-slate-400 text-3xs font-bold rounded-lg uppercase tracking-wider text-center select-none" title="Mesa ocupada por otro mesero">
                                Ocupado
                              </span>
                            )}
                            {canManage && (
                              <button
                                onClick={() => handleLiberarMesa(mesa)}
                                className="py-1.5 px-2 border border-red-200 hover:bg-red-50 text-red-600 text-2xs font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-colors"
                                title="Liberar mesa vaciando pedido"
                              >
                                Liberar
                              </button>
                            )}
                          </>
                        ) : (
                          /* Si está libre */
                          <button
                            onClick={() => handleOcuparMesa(mesa)}
                            className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-bold rounded-lg uppercase tracking-wider text-center cursor-pointer transition-colors"
                          >
                            Ocupar Mesa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VISTA 2: TOMA DE PEDIDO ACTIVA (Se selecciona una mesa) */
        <div className="flex flex-1 h-full overflow-hidden">
          
          {/* Grilla de productos (izquierda) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Barra superior de Mesa Activa */}
            <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => setActiveTable(null)}
                className="flex items-center gap-2 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-2xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a Mesas
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-3xs font-black uppercase text-slate-400 tracking-wider">Ordenando en:</span>
                <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                  🏠 {activeTable}
                </span>
                {activeMesaObj?.atendido_por && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full text-xs font-bold">
                    👤 Mesero: {activeMesaObj.atendido_por.split('@')[0]}
                  </span>
                )}
              </div>
            </div>

            {/* Grilla */}
            <div className="flex-1 overflow-hidden">
              <ProductGrid productos={productos} loading={loading} />
            </div>
          </div>

          {/* Ticket lateral derecho */}
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
            }} 
            setPrintData={setPrintData}
          />
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
