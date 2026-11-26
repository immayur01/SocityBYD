import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type IslandType = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'confirm' | 'upload';

export interface IslandConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

export interface IslandToastOptions {
  duration?: number;
  expanded?: boolean;
}

export interface IslandData {
  id: string;
  type: IslandType;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  expanded: boolean;
  duration: number; // 0 means do not auto-dismiss
  uploadProgress?: number; // 0.0 - 1.0
  thumbnailUri?: string;
  mediaIconType?: 'post' | 'event' | 'notice';
  onRetry?: () => void;
  isUploadError?: boolean;
}

interface IslandContextValue {
  currentIsland: IslandData | null;
  showSuccess: (title: string, description?: string, options?: IslandToastOptions) => void;
  showError: (title: string, description?: string, options?: IslandToastOptions) => void;
  showInfo: (title: string, description?: string, options?: IslandToastOptions) => void;
  showWarning: (title: string, description?: string, options?: IslandToastOptions) => void;
  showLoading: (title: string, description?: string) => void;
  showConfirm: (options: IslandConfirmOptions) => void;
  expandIsland: () => void;
  dismissIsland: () => void;
}

const IslandContext = createContext<IslandContextValue | undefined>(undefined);

// Global handler reference to allow calling island.* from outside React components
type GlobalIslandHandler = {
  show: (data: Omit<IslandData, 'id'>) => void;
  updateUpload: (data: Partial<IslandData>) => void;
  expand: () => void;
  dismiss: () => void;
};

let globalHandler: GlobalIslandHandler | null = null;

export const island = {
  upload: (
    title: string,
    progress: number = 0,
    options?: {
      thumbnailUri?: string;
      mediaIconType?: 'post' | 'event' | 'notice';
      onRetry?: () => void;
    }
  ) => {
    globalHandler?.show({
      type: 'upload',
      title,
      uploadProgress: Math.min(Math.max(progress, 0), 1),
      thumbnailUri: options?.thumbnailUri,
      mediaIconType: options?.mediaIconType ?? 'post',
      onRetry: options?.onRetry,
      isUploadError: false,
      expanded: true,
      duration: 0,
    });
  },
  updateUploadProgress: (progress: number, title?: string) => {
    globalHandler?.updateUpload({
      uploadProgress: Math.min(Math.max(progress, 0), 1),
      ...(title ? { title } : {}),
      isUploadError: false,
    });
  },
  uploadError: (title: string, onRetry: () => void, onCancel?: () => void) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    globalHandler?.updateUpload({
      title,
      isUploadError: true,
      onRetry,
      onCancel,
      expanded: true,
      duration: 0,
    });
  },
  success: (title: string, description?: string, options?: IslandToastOptions) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    globalHandler?.show({
      type: 'success',
      title,
      description,
      expanded: options?.expanded ?? false,
      duration: options?.duration ?? 3500,
    });
  },
  error: (title: string, description?: string, options?: IslandToastOptions) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    globalHandler?.show({
      type: 'error',
      title,
      description,
      expanded: options?.expanded ?? (description ? true : false),
      duration: options?.duration ?? 4500,
    });
  },
  info: (title: string, description?: string, options?: IslandToastOptions) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    globalHandler?.show({
      type: 'info',
      title,
      description,
      expanded: options?.expanded ?? false,
      duration: options?.duration ?? 3500,
    });
  },
  warning: (title: string, description?: string, options?: IslandToastOptions) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
    globalHandler?.show({
      type: 'warning',
      title,
      description,
      expanded: options?.expanded ?? false,
      duration: options?.duration ?? 4000,
    });
  },
  loading: (title: string, description?: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    globalHandler?.show({
      type: 'loading',
      title,
      description,
      expanded: false,
      duration: 0, // no auto-dismiss
    });
  },
  confirm: (options: IslandConfirmOptions) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    globalHandler?.show({
      type: 'confirm',
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      isDestructive: options.isDestructive ?? false,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
      expanded: true,
      duration: 0, // confirm stays until action
    });
  },
  expand: () => {
    globalHandler?.expand();
  },
  dismiss: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    globalHandler?.dismiss();
  },
};

export const IslandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentIsland, setCurrentIsland] = useState<IslandData | null>(null);

  const show = useCallback((data: Omit<IslandData, 'id'>) => {
    setCurrentIsland({
      ...data,
      id: String(Date.now()),
    });
  }, []);

  const updateUpload = useCallback((data: Partial<IslandData>) => {
    setCurrentIsland((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const expand = useCallback(() => {
    setCurrentIsland((prev) => (prev ? { ...prev, expanded: true } : null));
  }, []);

  const dismiss = useCallback(() => {
    setCurrentIsland(null);
  }, []);

  useEffect(() => {
    globalHandler = { show, updateUpload, expand, dismiss };
    return () => {
      globalHandler = null;
    };
  }, [show, updateUpload, expand, dismiss]);

  const showSuccess = useCallback(
    (title: string, description?: string, options?: IslandToastOptions) => {
      island.success(title, description, options);
    },
    []
  );

  const showError = useCallback(
    (title: string, description?: string, options?: IslandToastOptions) => {
      island.error(title, description, options);
    },
    []
  );

  const showInfo = useCallback(
    (title: string, description?: string, options?: IslandToastOptions) => {
      island.info(title, description, options);
    },
    []
  );

  const showWarning = useCallback(
    (title: string, description?: string, options?: IslandToastOptions) => {
      island.warning(title, description, options);
    },
    []
  );

  const showLoading = useCallback((title: string, description?: string) => {
    island.loading(title, description);
  }, []);

  const showConfirm = useCallback((options: IslandConfirmOptions) => {
    island.confirm(options);
  }, []);

  return (
    <IslandContext.Provider
      value={{
        currentIsland,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        showLoading,
        showConfirm,
        expandIsland: expand,
        dismissIsland: dismiss,
      }}
    >
      {children}
    </IslandContext.Provider>
  );
};

export const useIsland = () => {
  const context = useContext(IslandContext);
  if (!context) {
    throw new Error('useIsland must be used within an IslandProvider');
  }
  return context;
};
