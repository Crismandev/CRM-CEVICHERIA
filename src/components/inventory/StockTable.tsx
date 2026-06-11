import React, { useState, useMemo } from 'react';
import type { Producto } from '../../types/database';
import { db } from '../../services/db';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../hooks/useConfirm';
import { Edit2, Plus, Save, Search, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface StockTableProps {
  productos: Producto[];
  onRefresh: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({ productos, onRefresh }) => {
  const { showToast } = useToast();
  const { role } = useAuth();
  const { askConfirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Estado para edición rápida de stock
  const [quickStock, setQuickStock] = useState<{ [key: string]: number }>({});
  
  // Estado para el modal de agregar/editar
  const [showFormModal, setShowFormModal] = useState(false);
  const [formProduct, setFormProduct] = useState<Partial<Producto>>({
    nombre: '',
    precio: 0,
    stock_disponible: 0,
    categoria: '',
    activo: true,
  });

  // Categorías de platos habituales
  const categoriasPredeterminadas = ['Ceviches', 'Entradas', 'Platos de Fondo', 'Bebidas', 'Postres', 'Otros'];

  // Categorías presentes
  const categorias = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria));
    return ['Todos', ...Array.from(cats)];
  }, [productos]);

  // Filtrado
  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [productos, searchTerm, selectedCategory]);

  const handleQuickStockSave = async (id: string) => {
    const newStock = quickStock[id];
    if (newStock === undefined || newStock < 0) return;
    try {
      await db.updateProductoStock(id, newStock);
      // Limpiar estado
      setQuickStock((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      onRefresh();
      showToast('Stock actualizado exitosamente.', 'success');
    } catch (err: any) {
      showToast(`Error al actualizar el stock: ${err.message || err}`, 'error');
    }
  };

  const handleEditClick = (p: Producto) => {
    setFormProduct(p);
    setShowFormModal(true);
  };

  const handleAddClick = () => {
    setFormProduct({
      nombre: '',
      precio: 0,
      stock_disponible: 0,
      categoria: 'Ceviches',
      activo: true,
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.nombre || !formProduct.categoria) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }
    try {
      await db.saveProducto(formProduct as Omit<Producto, 'id'> & { id?: string });
      setShowFormModal(false);
      onRefresh();
      showToast(formProduct.id ? 'Plato editado correctamente.' : 'Plato agregado correctamente.', 'success');
    } catch (err: any) {
      showToast(`Error al guardar plato: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    askConfirm({
      title: 'Eliminar Plato / Bebida',
      message: `¿Está seguro de que desea eliminar "${name}"? Esta acción no se puede deshacer y fallará si el plato ya tiene registros de venta.`,
      confirmText: 'Eliminar Plato',
      onConfirm: async () => {
        try {
          await db.deleteProducto(id);
          setShowFormModal(false);
          onRefresh();
          showToast('Plato eliminado exitosamente.', 'success');
        } catch (err: any) {
          if (err.code === '23503') {
            showToast('No se puede eliminar el plato porque tiene ventas registradas. Se recomienda desactivarlo en su lugar.', 'error');
          } else {
            showToast(`Error al eliminar el plato: ${err.message || err}`, 'error');
          }
        }
      }
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Barra de herramientas de filtros y creación */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Buscador */}
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Selector de Categorías */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none"
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Agregar Plato */}
        {role === 'admin' && (
          <button
            onClick={handleAddClick}
            className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Agregar Plato / Bebida
          </button>
        )}
      </div>

      {/* Tabla de Gestión */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-4">Plato / Bebida</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Stock Disponible</th>
              <th className="p-4">Estado</th>
              {role === 'admin' && <th className="p-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No se encontraron productos registrados.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const stockEditVal = quickStock[p.id] !== undefined ? quickStock[p.id] : p.stock_disponible;
                const isDirty = quickStock[p.id] !== undefined;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    {/* Nombre */}
                    <td className="p-4 font-semibold text-slate-800">{p.nombre}</td>
                    
                    {/* Categoría */}
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                        {p.categoria}
                      </span>
                    </td>

                    {/* Precio */}
                    <td className="p-4 font-mono">S/ {p.precio.toFixed(2)}</td>

                    {/* Stock disponible (edición rápida solo para admin) */}
                    <td className="p-4">
                      {role === 'admin' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={stockEditVal}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setQuickStock((prev) => ({
                                ...prev,
                                [p.id]: isNaN(val) ? 0 : val,
                              }));
                            }}
                            className="w-20 px-2 py-1 border border-slate-200 rounded text-center focus:outline-none focus:border-slate-400"
                          />
                          {isDirty && (
                            <button
                              onClick={() => handleQuickStockSave(p.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                              title="Guardar stock"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className={`font-bold font-mono px-2.5 py-1 rounded-md text-xs ${
                          p.stock_disponible <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.stock_disponible} unds
                        </span>
                      )}
                    </td>

                    {/* Estado activo/inactivo */}
                    <td className="p-4">
                      {p.activo ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                          <CheckCircle className="h-4 w-4" /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
                          <XCircle className="h-4 w-4" /> Inactivo
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    {role === 'admin' && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Editar plato completo"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear/Editar Producto */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                {formProduct.id ? 'Editar Plato / Bebida' : 'Agregar Plato / Bebida'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nombre del Plato / Bebida *
                </label>
                <input
                  type="text"
                  required
                  value={formProduct.nombre || ''}
                  onChange={(e) => setFormProduct((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-sm"
                  placeholder="Ej: Ceviche de Conchas Negras"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Precio (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formProduct.precio || ''}
                    onChange={(e) =>
                      setFormProduct((prev) => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formProduct.stock_disponible || ''}
                    onChange={(e) =>
                      setFormProduct((prev) => ({
                        ...prev,
                        stock_disponible: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Categoría *
                </label>
                <select
                  value={formProduct.categoria || 'Ceviches'}
                  onChange={(e) => setFormProduct((prev) => ({ ...prev, categoria: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 text-sm bg-white"
                >
                  {categoriasPredeterminadas.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formProduct.activo !== false}
                  onChange={(e) => setFormProduct((prev) => ({ ...prev, activo: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="activo" className="text-sm font-semibold text-slate-700 select-none">
                  Plato habilitado en el menú (Activo)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center gap-2">
                <div>
                  {formProduct.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(formProduct.id!, formProduct.nombre || '')}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Eliminar plato"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md text-sm font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold cursor-pointer"
                  >
                    Guardar Plato
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
