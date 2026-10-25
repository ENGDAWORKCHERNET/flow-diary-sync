/**
 * Google Analytics 4 wrapper for StudyFlow.
 *
 * PRIVACY NOTICE: This module currently initialises analytics unconditionally
 * in production. A consent gate MUST be implemented before collecting data
 * in jurisdictions that require prior consent (e.g. GDPR / ePrivacy). When
 * that gate is added, call `initAnalytics()` only after the user has accepted,
 * and gate `trackPageView` / `trackEvent` behind the same flag.
 */

// ---------------------------------------------------------------------------
// Global type declarations — no `any`, no `@ts-ignore`.
// gtag pushes commands onto `window.dataLayer` which the loaded script reads.
// ---------------------------------------------------------------------------

type GtagCommand = 'config' | 'event' | 'js' | 'set';

interface GtagConfigParams {
  send_page_view?: boolean;
  page_path?: string;
  page_location?: string;
  page_title?: string;
  debug_mode?: boolean;
  [key: string]: unknown;
}

interface GtagEventParams {
  page_path?: string;
  page_location?: string;
  page_title?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (
      command: GtagCommand,
      target: string | Date,
      params?: GtagConfigParams | GtagEventParams
    ) => void;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GA_MEASUREMENT_ID = 'G-4DS4SCWLF7';

const DEBUG_LOGGING: boolean = import.meta.env.VITE_GA_DEBUG === '1';

// ---------------------------------------------------------------------------
// Initialisation — runs at most once per page load.
// Analytics is ONLY enabled in production builds.
// ---------------------------------------------------------------------------

let _initialized = false;

export interface InitAnalyticsOptions {
  /**
   * Force initialization regardless of import.meta.env.PROD.
   * Useful for unit testing production behaviors in test environments.
   */
  force?: boolean;
}

export function initAnalytics(options?: InitAnalyticsOptions): void {
  const isProduction = options?.force ?? import.meta.env.PROD;

  // Guard: only run in a real browser production context (or when forced for testing).
  if (
    !isProduction ||                   // skip in dev / test
    _initialized ||                    // skip if already initialised
    typeof window === 'undefined' ||   // skip in SSR / Node test env
    !GA_MEASUREMENT_ID                 // skip if ID is missing/empty
  ) {
    return;
  }

  // Ensure dataLayer exists (the loaded gtag/js script expects this).
  window.dataLayer = window.dataLayer ?? [];

  // Provide the gtag function if the script hasn't injected it yet.
  if (typeof window.gtag !== 'function') {
    window.gtag = function (...args: [GtagCommand, string | Date, (GtagConfigParams | GtagEventParams)?]) {
      window.dataLayer.push(args);
    };
  }

  window.gtag('js', new Date());

  // `send_page_view: false` prevents the automatic initial page view that GA4
  // fires by default. We control all page-view events via `trackPageView` so
  // there is no duplicate on first load.
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  // Dynamically load the Google Tag Manager script asynchronously only in production.
  if (typeof document !== 'undefined') {
    const existingScript = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }
  }

  _initialized = true;

  if (DEBUG_LOGGING) {
    console.debug('[Analytics] Initialised with ID:', GA_MEASUREMENT_ID);
  }
}

export function isAnalyticsInitialized(): boolean {
  return _initialized;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track a virtual or real page view.
 * Safe to call in development — becomes a no-op when analytics is disabled.
 *
 * @param path - Virtual or physical path starting with '/' (e.g. '/schedule')
 * @param title - Optional page title. Defaults to document.title if omitted.
 */
export function trackPageView(path: string, title?: string): void {
  if (!_initialized || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    if (DEBUG_LOGGING) {
      console.debug('[Analytics] trackPageView (no-op):', path);
    }
    return;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');

  if (title && typeof document !== 'undefined') {
    document.title = title;
  }

  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';

  window.gtag('event', 'page_view', {
    page_path: normalizedPath,
    page_location: origin + normalizedPath,
    page_title: pageTitle,
  });

  if (DEBUG_LOGGING) {
    console.debug('[Analytics] trackPageView:', normalizedPath, pageTitle);
  }
}

/**
 * Track a named GA4 event with optional parameters.
 * Safe to call in development — becomes a no-op when analytics is disabled.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!_initialized || typeof window === 'undefined' || typeof window.gtag !== 'function') {
    if (DEBUG_LOGGING) {
      console.debug('[Analytics] trackEvent (no-op):', name, params);
    }
    return;
  }

  window.gtag('event', name, params);

  if (DEBUG_LOGGING) {
    console.debug('[Analytics] trackEvent:', name, params);
  }
}

// Exported for testing only — do not rely on this in application code.
export function _resetForTesting(): void {
  _initialized = false;
  if (typeof document !== 'undefined') {
    const scripts = document.querySelectorAll(
      `script[src*="googletagmanager.com/gtag/js"]`
    );
    scripts.forEach((s) => s.remove());
  }
}
