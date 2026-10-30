export type Theme =
  | 'system'
  | 'light'
  | 'dark'
  | 'midnight'
  | 'sepia'
  | 'ocean'
  | 'forest'
  | 'rose'
  | 'cyberpunk';

export type ResolvedTheme =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'sepia'
  | 'ocean'
  | 'forest'
  | 'rose'
  | 'cyberpunk';

export const THEMES: readonly Theme[] = [
  'system',
  'light',
  'dark',
  'midnight',
  'sepia',
  'ocean',
  'forest',
  'rose',
  'cyberpunk',
] as const;

export const RESOLVED_THEMES: readonly ResolvedTheme[] = [
  'light',
  'dark',
  'midnight',
  'sepia',
  'ocean',
  'forest',
  'rose',
  'cyberpunk',
] as const;

export const STORAGE_KEY = 'studyflow_theme';
export const DEFAULT_THEME: ResolvedTheme = 'light';

export const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: '#fbf9f5',
  dark: '#0f172a',
  midnight: '#05070d',
  sepia: '#f5ebd7',
  ocean: '#0a1526',
  forest: '#0a1811',
  rose: '#fdf2f4',
  cyberpunk: '#08080c',
};

export const DARK_THEMES: readonly ResolvedTheme[] = [
  'dark',
  'midnight',
  'ocean',
  'forest',
  'cyberpunk',
] as const;

export function isValidTheme(val: unknown): val is Theme {
  return typeof val === 'string' && (THEMES as readonly string[]).includes(val);
}

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_THEME;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return DEFAULT_THEME;
  }
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      // Key absent: preference is system
      return 'system';
    }
    if (isValidTheme(stored)) {
      return stored;
    }
    // Invalid stored value fallback
    return DEFAULT_THEME;
  } catch {
    // localStorage failure fallback
    return 'system';
  }
}

export function resolveTheme(preference: Theme): ResolvedTheme {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
}

export function applyThemeToDOM(resolvedTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Clear previous theme classes
  RESOLVED_THEMES.forEach((t) => {
    root.classList.remove(t);
  });
  root.classList.remove('dark');

  // Add the current resolved theme class and attribute
  root.classList.add(resolvedTheme);
  root.setAttribute('data-theme', resolvedTheme);

  // If dark-based, also add .dark so Tailwind darkMode: ["class"] utilities activate
  if ((DARK_THEMES as readonly string[]).includes(resolvedTheme)) {
    root.classList.add('dark');
  }

  // Update theme-color meta tag
  const metaColor = THEME_META_COLORS[resolvedTheme];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', metaColor);
}
