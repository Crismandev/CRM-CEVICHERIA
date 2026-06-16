import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { ChefHat, ShoppingBag, Package, LogOut, Anchor, History, ShieldAlert, Users, Menu, X } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { showToast } = useToast();
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogoutClick = async () => {
    try {
      await logout();
      showToast('Sesión cerrada correctamente.', 'info');
    } catch (err) {
      showToast('Error al cerrar sesión.', 'error');
    }
  };

  const navigation = [
    { name: 'Punto de Venta', href: '/', icon: ShoppingBag },
    { name: 'Historial / Ventas', href: '/ordenes', icon: History },
    { name: role === 'admin' ? 'Inventario / Platos' : 'Consulta de Stock', href: '/inventario', icon: Package },
    ...(role === 'admin'
      ? [{ name: 'Gestión de Personal', href: '/usuarios', icon: Users }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Backdrop for Mobile Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Slate 900 Dark Theme */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 flex-shrink-0 select-none
        transform lg:transform-none transition-transform duration-250 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Header - Restaurante Branding */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Anchor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm uppercase tracking-wider leading-none text-white">El Puerto</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">POS & Inventario</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-white border-l-4 border-emerald-500'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex flex-col gap-2 bg-slate-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {role === 'admin' ? (
                <ShieldAlert className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
              ) : (
                <ChefHat className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-slate-300 truncate text-[11px]" title={user?.email || ''}>
                  {user?.email || 'Usuario'}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-wider ${role === 'admin' ? 'text-amber-500' : 'text-sky-400'}`}>
                  {role === 'admin' ? 'Administrador' : 'Mesero'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleLogoutClick}
              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/55 transition-colors cursor-pointer flex-shrink-0"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Abrir menú"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>
            <h2 className="text-2xs sm:text-xs md:text-sm font-black text-slate-800 uppercase tracking-widest truncate max-w-[170px] sm:max-w-none">
              {location.pathname === '/' ? 'Terminal POS / Ventas' : location.pathname === '/ordenes' ? 'Historial de Comprobantes' : 'Administración / Menú e Inventario'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-3xs sm:text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="hidden sm:inline">En Línea</span>
              <span className="sm:hidden">Online</span>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50">
          {children}
        </div>
      </main>
    </div>
  );
};
