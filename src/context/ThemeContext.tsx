import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { ThemeTokens, Colors } from '@/theme/colors';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  darkMode: boolean;
  isDark: boolean;
  tokens: typeof ThemeTokens.dark;
  colors: typeof ThemeTokens.dark;
  setTheme: (mode: ThemeMode) => void;
  setDarkMode: (value: boolean) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'ae-theme';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  darkMode: true,
  isDark: true,
  tokens: ThemeTokens.dark,
  colors: ThemeTokens.dark,
  setTheme: () => {},
  setDarkMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  // Apply data-theme to HTML root on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Load saved theme on native mobile mount
  useEffect(() => {
    if (Platform.OS !== 'web') {
      SecureStore.getItemAsync(THEME_STORAGE_KEY)
        .then((val) => {
          if (val === 'light' || val === 'dark') {
            setThemeState(val);
          }
        })
        .catch(() => {});
    }
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', mode);
      }
    } else {
      SecureStore.setItemAsync(THEME_STORAGE_KEY, mode).catch(() => {});
    }
  };

  const setDarkMode = (val: boolean) => {
    setTheme(val ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const darkMode = theme === 'dark';
  const isDark = darkMode;
  const tokens = ThemeTokens[theme];
  const colors = tokens;

  // Sync Android root window background color to prevent white flash during keyboard pop or theme toggle
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(tokens.bgApp).catch(() => {});
    }
  }, [tokens.bgApp]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        darkMode,
        isDark,
        tokens,
        colors,
        setTheme,
        setDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
