/**
 * usePageViewTracking — SPA page-view tracking for StudyFlow.
 *
 * Architecture note: The app uses react-router-dom v6 BrowserRouter but only
 * declares two real URL routes (`/` and `/*`). All "navigation" between
 * Dashboard, Schedule, and Tasks is driven by in-component tab state, not by
 * URL changes. This hook therefore tracks two kinds of events:
 *
 *  1. Real route changes — detected via `useLocation` from react-router-dom.
 *     These fire once on mount (for `/`) and again if the user somehow reaches
 *     the 404 route.
 *
 *  2. Virtual tab changes — the `tab` argument. Callers pass the current tab
 *     value; whenever it changes we fire a virtual page view with a synthetic
 *     path (e.g. `/schedule`). This covers the main navigation experience.
 *
 * Duplicate-prevention strategy:
 *  - The URL-based effect tracks `location.key` (react-router's unique key per
 *    navigation) rather than `location.pathname`. This prevents Strict Mode
 *    double-firing from sending two identical events.
 *  - The tab-based effect only fires when `tab` actually changes.
 *  - Both effects are completely independent — a tab change will never
 *    re-trigger the URL effect and vice-versa.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

// Maps tab keys to user-friendly virtual paths that appear in GA4 reports.
export const TAB_PATHS: Record<string, string> = {
  dashboard: '/',
  schedule: '/schedule',
  tasks: '/tasks',
};

// Maps tab keys to descriptive page titles for GA4 reports.
export const TAB_TITLES: Record<string, string> = {
  dashboard: 'StudyFlow — Smart Student Dashboard',
  schedule: 'StudyFlow — Schedule',
  tasks: 'StudyFlow — Tasks',
};

/**
 * Mount this hook inside a component that lives below BrowserRouter.
 *
 * @param tab - The active tab name (e.g. 'dashboard' | 'schedule' | 'tasks').
 *              Pass undefined if the component does not have tab navigation.
 */
export function usePageViewTracking(tab?: string): void {
  const location = useLocation();

  // -------------------------------------------------------------------------
  // 1. Real URL-based page views (handles the initial load of `/` and any
  //    genuine URL navigation such as direct links or 404 pages).
  // -------------------------------------------------------------------------
  const lastTrackedKey = useRef<string | null>(null);

  useEffect(() => {
    // location.key is a stable, unique string per navigation entry. React
    // Router generates a new key on every push/replace, but keeps the same key
    // on re-renders within the same navigation entry — so this is safe under
    // React Strict Mode's double-invocation.
    if (lastTrackedKey.current === location.key) return;
    lastTrackedKey.current = location.key;

    const path = location.pathname + location.search;

    // Only send the URL-based event for the root path when no tab is active yet
    // (i.e. on initial mount). Once tab tracking takes over, the root URL event
    // would be a duplicate of the tab's '/' virtual page view, so we skip it.
    if (tab === undefined) {
      trackPageView(path);
    }
    // If tab is defined, the tab effect below is responsible for the initial
    // page view — we intentionally do not fire here to avoid a duplicate.
  }, [location.key, location.pathname, location.search, tab]);

  // -------------------------------------------------------------------------
  // 2. Virtual tab-based page views (handles in-app navigation).
  // -------------------------------------------------------------------------
  const lastTrackedTab = useRef<string | null>(null);

  useEffect(() => {
    if (tab === undefined) return;
    if (lastTrackedTab.current === tab) return;

    lastTrackedTab.current = tab;

    const virtualPath = TAB_PATHS[tab] ?? `/${tab}`;
    const virtualTitle = TAB_TITLES[tab] ?? document.title;
    trackPageView(virtualPath, virtualTitle);
  }, [tab]);
}
