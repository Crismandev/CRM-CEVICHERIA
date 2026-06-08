import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './hooks/useCart';
import { ToastProvider } from './hooks/useToast';
import { MainLayout } from './layouts/MainLayout';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <MainLayout>
            <Routes>
              <Route path="/" element={<POSPage />} />
              <Route path="/ordenes" element={<OrdersPage />} />
              <Route path="/inventario" element={<InventoryPage />} />
              <Route path="*" element={<POSPage />} />
            </Routes>
          </MainLayout>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
