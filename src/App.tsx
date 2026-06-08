import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './hooks/useCart';
import { ToastProvider, useToast } from './hooks/useToast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { MainLayout } from './layouts/MainLayout';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';

// Componente para denegar el acceso a meseros en la ruta de inventario
const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      showToast('Acceso denegado. Se requieren permisos de Administrador.', 'error');
      navigate('/', { replace: true });
    }
  }, [role, loading, navigate, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return role === 'admin' ? <>{children}</> : null;
};

// Componente de enrutamiento principal que interactúa con el estado de autenticación
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  // Si no está autenticado, mostramos la pantalla de Login directamente
  if (!user) {
    return <LoginPage />;
  }

  // Si está autenticado, mostramos el Layout del POS principal con sus rutas protegidas
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<POSPage />} />
        <Route path="/ordenes" element={<OrdersPage />} />
        <Route 
          path="/inventario" 
          element={<InventoryPage />} 
        />
        <Route 
          path="/usuarios" 
          element={
            <AdminRouteGuard>
              <UsersPage />
            </AdminRouteGuard>
          } 
        />
        <Route path="*" element={<POSPage />} />
      </Routes>
    </MainLayout>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
