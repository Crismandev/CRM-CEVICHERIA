import React, { createContext, useContext, useState, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmContextType {
  askConfirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const askConfirm = useCallback((opt: ConfirmOptions) => {
    setOptions(opt);
    setIsOpen(true);
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (options?.onConfirm) {
      options.onConfirm();
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (options?.onCancel) {
      options.onCancel();
    }
  };

  return (
    <ConfirmContext.Provider value={{ askConfirm }}>
      {children}

      {isOpen && options && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-slate-700" />
                <h3 className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">
                  {options.title || 'Confirmación'}
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm text-slate-600 font-semibold leading-relaxed">
                {options.message}
              </p>

              {/* Acciones */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer text-slate-600 font-sans"
                >
                  {options.cancelText || 'Cancelar'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
                >
                  {options.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
