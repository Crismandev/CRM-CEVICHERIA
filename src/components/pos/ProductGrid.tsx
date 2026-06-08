import React, { useState, useMemo } from 'react';
import type { Producto } from '../../types/database';
import { useCart } from '../../hooks/useCart';
import { Search, Sparkles, ListFilter, Fish, Soup, CupSoda, UtensilsCrossed, Candy } from 'lucide-react';

interface ProductGridProps {
  productos: Producto[];
  loading: boolean;
}

// Diccionario de iconos para cada tipo de categoría
const CATEGORY_ICONS: { [key: string]: any } = {
  'Todos': ListFilter,
  'Ceviches': Fish,
  'Entradas': Soup,
  'Bebidas': CupSoda,
  'Platos de Fondo': UtensilsCrossed,
  'Postres': Candy,
  'Otros': Sparkles,
};

export const ProductGrid: React.FC<ProductGridProps> = ({ productos, loading }) => {
  const { addToCart, cart } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Obtener categorías únicas
  const categorias = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria));
    return ['Todos', ...Array.from(cats)];
  }, [productos]);

  // Filtrar productos
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [productos, searchTerm, selectedCategory]);

  // Obtener el stock virtual restante (stock_disponible - cantidad en carrito)
  const getVirtualStock = (producto: Producto) => {
    const cartItem = cart.find((item) => item.producto.id === producto.id);
    const cartQty = cartItem ? cartItem.cantidad : 0;
    return producto.stock_disponible - cartQty;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      {/* Filtros superiores */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white border border-slate-200 rounded-lg p-4">
        
        {/* Categorías con iconos */}
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] || Sparkles;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center gap-2 border select-none ${
                  isSelected
                    ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                {cat}
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="relative w-full lg:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar plato o bebida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:bg-white focus:border-slate-500"
          />
        </div>
      </div>

      {/* Grilla de productos */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProductos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white border border-slate-100 rounded-lg">
            No se encontraron platos en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {filteredProductos.map((p) => {
              const stockRestante = getVirtualStock(p);
              const isOutStock = stockRestante <= 0;

              return (
                <button
                  key={p.id}
                  disabled={isOutStock}
                  onClick={() => addToCart(p)}
                  className={`flex flex-col text-left bg-white border rounded-lg p-4 transition-all duration-150 select-none group relative ${
                    isOutStock
                      ? 'opacity-60 border-slate-200 cursor-not-allowed'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-md cursor-pointer active:scale-98'
                  }`}
                >
                  {/* Categoría Tag */}
                  <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {p.categoria}
                  </span>

                  {/* Nombre */}
                  <h3 className="font-semibold text-slate-800 text-base leading-tight mb-2 group-hover:text-slate-900">
                    {p.nombre}
                  </h3>

                  <div className="mt-auto flex justify-between items-end w-full">
                    {/* Precio */}
                    <span className="text-lg font-bold text-slate-700">
                      S/ {p.precio.toFixed(2)}
                    </span>

                    {/* Stock status */}
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOutStock
                          ? 'bg-red-50 text-red-600'
                          : stockRestante <= 5
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isOutStock ? 'Agotado' : `${stockRestante} unds`}
                    </span>
                  </div>

                  {/* Efecto visual hover */}
                  {!isOutStock && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
