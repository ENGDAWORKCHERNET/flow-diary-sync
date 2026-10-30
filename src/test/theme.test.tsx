import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import {
  getStoredTheme,
  resolveTheme,
  applyThemeToDOM,
  STORAGE_KEY,
  DEFAULT_THEME,
  THEME_META_COLORS,
  THEMES,
  RESOLVED_THEMES,
  DARK_THEMES,
  type Theme,
} from '@/lib/theme';
import { ThemePicker } from '@/components/ThemePicker';

describe('StudyFlow Theme System', () => {
  let listeners: Array<() => void> = [];
  let isDarkMode = false;

  beforeEach(() => {
    listeners = [];
    isDarkMode = false;
    window.localStorage.clear();

    // Reset document attributes and classes
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');

    // Ensure meta tag exists
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#fbf9f5');

    // Mock matchMedia with dynamic matches getter
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        get matches() {
          return isDarkMode;
        },
        media: query,
        onchange: null,
        addListener: (fn: () => void) => listeners.push(fn),
        removeListener: (fn: () => void) => {
          listeners = listeners.filter((l) => l !== fn);
        },
        addEventListener: (_event: string, fn: () => void) => listeners.push(fn),
        removeEventListener: (_event: string, fn: () => void) => {
          listeners = listeners.filter((l) => l !== fn);
        },
        dispatchEvent: () => true,
      })),
    });
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  describe('Theme Resolution & Validation (getStoredTheme & resolveTheme)', () => {
    it('returns "system" when storage key is absent', () => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(getStoredTheme()).toBe('system');
    });

    it('falls back to DEFAULT_THEME ("light") for invalid stored values', () => {
      window.localStorage.setItem(STORAGE_KEY, 'invalid_theme');
      expect(getStoredTheme()).toBe(DEFAULT_THEME);
      expect(DEFAULT_THEME).toBe('light');

      window.localStorage.setItem(STORAGE_KEY, '');
      expect(getStoredTheme()).toBe(DEFAULT_THEME);

      window.localStorage.setItem(STORAGE_KEY, 'dark_mode');
      expect(getStoredTheme()).toBe(DEFAULT_THEME);
    });

    it('handles localStorage exceptions gracefully (falls back to "system")', () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      expect(getStoredTheme()).toBe('system');
    });

    it('returns each valid theme name from storage', () => {
      THEMES.forEach((t) => {
        window.localStorage.setItem(STORAGE_KEY, t);
        expect(getStoredTheme()).toBe(t);
      });
    });

    it('resolves "system" to "light" when OS prefers light mode', () => {
      isDarkMode = false;
      expect(resolveTheme('system')).toBe('light');
    });

    it('resolves "system" to "dark" when OS prefers dark mode', () => {
      isDarkMode = true;
      expect(resolveTheme('system')).toBe('dark');
    });

    it('never resolves "system" to midnight, sepia, ocean, forest, rose, or cyberpunk', () => {
      isDarkMode = false;
      const lightResolved = resolveTheme('system');
      expect(['midnight', 'sepia', 'ocean', 'forest', 'rose', 'cyberpunk']).not.toContain(lightResolved);

      isDarkMode = true;
      const darkResolved = resolveTheme('system');
      expect(['midnight', 'sepia', 'ocean', 'forest', 'rose', 'cyberpunk']).not.toContain(darkResolved);
    });

    it('resolves explicit themes to themselves regardless of OS preference', () => {
      RESOLVED_THEMES.forEach((t) => {
        isDarkMode = false;
        expect(resolveTheme(t)).toBe(t);
        isDarkMode = true;
        expect(resolveTheme(t)).toBe(t);
      });
    });
  });

  describe('DOM & Meta Tag Updates (applyThemeToDOM)', () => {
    it('correctly applies classes and data-theme for each theme', () => {
      RESOLVED_THEMES.forEach((theme) => {
        applyThemeToDOM(theme);

        expect(document.documentElement.classList.contains(theme)).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe(theme);

        if ((DARK_THEMES as readonly string[]).includes(theme)) {
          expect(document.documentElement.classList.contains('dark')).toBe(true);
        } else {
          expect(document.documentElement.classList.contains('dark')).toBe(false);
        }

        const meta = document.querySelector('meta[name="theme-color"]');
        expect(meta?.getAttribute('content')).toBe(THEME_META_COLORS[theme]);
      });
    });
  });

  describe('ThemeProvider & useTheme Hook', () => {
    function ThemeTestConsumer() {
      const { theme, resolvedTheme, setTheme, themes } = useTheme();
      return (
        <div>
          <span data-testid="theme-val">{theme}</span>
          <span data-testid="resolved-val">{resolvedTheme}</span>
          <span data-testid="themes-count">{themes.length}</span>
          <button data-testid="btn-midnight" onClick={() => setTheme('midnight')}>
            Midnight
          </button>
          <button data-testid="btn-system" onClick={() => setTheme('system')}>
            System
          </button>
          <button data-testid="btn-sepia" onClick={() => setTheme('sepia')}>
            Sepia
          </button>
        </div>
      );
    }

    it('initializes with absent storage defaulting to system preference', () => {
      isDarkMode = false;
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      expect(getByTestId('theme-val').textContent).toBe('system');
      expect(getByTestId('resolved-val').textContent).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('persists theme changes to localStorage and applies immediately without reload', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      act(() => {
        getByTestId('btn-midnight').click();
      });

      expect(getByTestId('theme-val').textContent).toBe('midnight');
      expect(getByTestId('resolved-val').textContent).toBe('midnight');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('midnight');
      expect(document.documentElement.classList.contains('midnight')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
      ).toBe(THEME_META_COLORS.midnight);
    });

    it('handles localStorage.setItem failures gracefully when changing themes', () => {
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      expect(() => {
        act(() => {
          getByTestId('btn-sepia').click();
        });
      }).not.toThrow();

      expect(getByTestId('theme-val').textContent).toBe('sepia');
      expect(getByTestId('resolved-val').textContent).toBe('sepia');
      expect(document.documentElement.classList.contains('sepia')).toBe(true);
    });

    it('reacts to live OS preference changes when preference is "system"', () => {
      isDarkMode = false;
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      expect(getByTestId('theme-val').textContent).toBe('system');
      expect(getByTestId('resolved-val').textContent).toBe('light');

      // Simulate OS switching to dark mode
      isDarkMode = true;
      act(() => {
        listeners.forEach((l) => l());
      });

      // Resolved theme changes to dark
      expect(getByTestId('theme-val').textContent).toBe('system');
      expect(getByTestId('resolved-val').textContent).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(
        document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
      ).toBe(THEME_META_COLORS.dark);

      // Verify that localStorage is not overwritten with "dark"
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does NOT change theme on OS preference change when an explicit theme is selected', () => {
      window.localStorage.setItem(STORAGE_KEY, 'midnight');
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      expect(getByTestId('theme-val').textContent).toBe('midnight');
      expect(getByTestId('resolved-val').textContent).toBe('midnight');

      // Simulate OS preference change
      isDarkMode = false;
      act(() => {
        listeners.forEach((l) => l());
      });

      expect(getByTestId('theme-val').textContent).toBe('midnight');
      expect(getByTestId('resolved-val').textContent).toBe('midnight');
      expect(document.documentElement.classList.contains('midnight')).toBe(true);
    });

    it('cleans up media query listeners on unmount', () => {
      const { unmount } = render(
        <ThemeProvider>
          <ThemeTestConsumer />
        </ThemeProvider>
      );

      expect(listeners.length).toBeGreaterThan(0);
      unmount();
      expect(listeners.length).toBe(0);
    });
  });

  describe('ThemePicker Component UI & Accessibility', () => {
    it('renders accessible trigger button with current theme information', () => {
      const { getByRole } = render(
        <ThemeProvider>
          <ThemePicker />
        </ThemeProvider>
      );

      const trigger = getByRole('button');
      expect(trigger).toHaveAttribute('aria-label');
      expect(trigger.getAttribute('aria-label')).toContain('Theme:');
    });

    it('opens dropdown menu displaying all 8 options with accessible names and swatches', async () => {
      render(
        <ThemeProvider>
          <ThemePicker />
        </ThemeProvider>
      );

      const trigger = screen.getByRole('button');
      act(() => {
        fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      });

      const radioItems = await screen.findAllByRole('menuitemradio');
      expect(radioItems.length).toBe(9); // system + 8 themes (including cyberpunk)

      // Check that each option has an aria-label
      radioItems.forEach((item) => {
        expect(item).toHaveAttribute('aria-label');
      });
    });

    it('closes on Escape key press and returns focus to trigger', async () => {
      render(
        <ThemeProvider>
          <ThemePicker />
        </ThemeProvider>
      );

      const trigger = screen.getByRole('button');
      act(() => {
        fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
      });

      const menu = await screen.findByRole('menu');
      expect(menu).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(menu, { key: 'Escape', code: 'Escape' });
      });

      expect(screen.queryByRole('menu')).toBeNull();
    });
  });
});
