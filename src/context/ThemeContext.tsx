import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  type Theme,
  type ResolvedTheme,
  THEMES,
  STORAGE_KEY,
  DEFAULT_THEME,
  isValidTheme,
  getStoredTheme,
  resolveTheme,
  applyThemeToDOM,
} from '@/lib/theme';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  themes: readonly Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredTheme())
  );

  // Synchronize DOM whenever resolvedTheme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Listen to OS preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    let mediaQuery: MediaQueryList;
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const handleChange = () => {
      // Only adjust resolvedTheme if the user preference is 'system'
      if (theme === 'system') {
        const nextResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme((prev) => {
          if (prev !== nextResolved) {
            applyThemeToDOM(nextResolved);
            return nextResolved;
          }
          return prev;
        });
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    const valid = isValidTheme(newTheme) ? newTheme : DEFAULT_THEME;
    setThemeState(valid);

    try {
      window.localStorage.setItem(STORAGE_KEY, valid);
    } catch {
      // Gracefully handle localStorage exceptions
    }

    const nextResolved = resolveTheme(valid);
    setResolvedTheme(nextResolved);
    applyThemeToDOM(nextResolved);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      themes: THEMES,
    }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
