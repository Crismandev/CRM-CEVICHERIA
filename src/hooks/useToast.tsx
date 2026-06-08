import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-eliminar después de 3.5 segundos
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border text-white transition-all duration-300 transform translate-y-0 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500'
                : toast.type === 'error'
                ? 'bg-red-600 border-red-500'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            {/* Icono */}
            <div className="flex-shrink-0 pt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-white" />}
              {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-white" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-white" />}
            </div>

            {/* Mensaje */}
            <div className="flex-1 text-xs font-bold leading-normal tracking-wide uppercase">
              {toast.message}
            </div>

            {/* Botón cerrar */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/75 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
