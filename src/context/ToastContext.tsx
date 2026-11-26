import React, { createContext, useContext, useCallback } from 'react';
import { IslandProvider, island, useIsland, IslandType, IslandConfirmOptions } from './IslandContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void;
  hideToast: () => void;
  island: typeof island;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = useCallback(
    (title: string, description?: string, type: ToastType = 'info') => {
      switch (type) {
        case 'success':
          island.success(title, description);
          break;
        case 'error':
          island.error(title, description);
          break;
        case 'warning':
          island.warning(title, description);
          break;
        case 'info':
        default:
          island.info(title, description);
          break;
      }
    },
    []
  );

  const hideToast = useCallback(() => {
    island.dismiss();
  }, []);

  return (
    <IslandProvider>
      <ToastContext.Provider value={{ showToast, hideToast, island }}>
        {children}
      </ToastContext.Provider>
    </IslandProvider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export { island, useIsland, IslandProvider, IslandConfirmOptions };
