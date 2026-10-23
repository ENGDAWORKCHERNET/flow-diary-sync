import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  initAnalytics,
  isAnalyticsInitialized,
  trackPageView,
  trackEvent,
  _resetForTesting,
  GA_MEASUREMENT_ID,
} from '@/lib/analytics';
import {
  usePageViewTracking,
  TAB_PATHS,
  TAB_TITLES,
} from '@/hooks/usePageViewTracking';
import NotFound from '@/pages/NotFound';

describe('Google Analytics 4 Module (analytics.ts)', () => {
  beforeEach(() => {
    _resetForTesting();
    delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    delete (window as unknown as { gtag?: unknown }).gtag;
    document.title = 'StudyFlow — Smart Student Dashboard';
  });

  afterEach(() => {
    _resetForTesting();
    vi.restoreAllMocks();
  });

  it('Measurement ID matches G-MF5C3GZFY9', () => {
    expect(GA_MEASUREMENT_ID).toBe('G-MF5C3GZFY9');
  });

  it('does not initialize in non-production environments by default (no-op)', () => {
    initAnalytics();

    expect(isAnalyticsInitialized()).toBe(false);
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();

    const script = document.querySelector('script[src*="googletagmanager.com"]');
    expect(script).toBeNull();
  });

  it('trackPageView and trackEvent are safe no-ops when not initialized', () => {
    expect(() => trackPageView('/schedule')).not.toThrow();
    expect(() => trackEvent('test_event', { foo: 'bar' })).not.toThrow();
    expect(window.dataLayer).toBeUndefined();
  });

  it('initializes safely in production with async script and send_page_view: false', () => {
    initAnalytics({ force: true });

    expect(isAnalyticsInitialized()).toBe(true);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(typeof window.gtag).toBe('function');

    // Verify injected script tag
    const script = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.async).toBe(true);

    // Verify dataLayer queue contents
    // First call: ['js', Date]
    // Second call: ['config', GA_MEASUREMENT_ID, { send_page_view: false }]
    const configCall = window.dataLayer.find(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'config' &&
        entry[1] === GA_MEASUREMENT_ID
    ) as [string, string, { send_page_view?: boolean }] | undefined;

    expect(configCall).toBeDefined();
    expect(configCall?.[2]?.send_page_view).toBe(false);
  });

  it('does not re-initialize or inject multiple scripts on subsequent initAnalytics calls', () => {
    initAnalytics({ force: true });
    const initialDataLayerLength = window.dataLayer.length;

    // Second call
    initAnalytics({ force: true });

    const scripts = document.querySelectorAll(
      `script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`
    );
    expect(scripts.length).toBe(1);
    expect(window.dataLayer.length).toBe(initialDataLayerLength);
  });

  it('trackPageView correctly formats page_path, page_location, and page_title', () => {
    initAnalytics({ force: true });

    trackPageView('schedule', 'StudyFlow — Schedule');

    const pageViewCall = window.dataLayer.find(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'page_view'
    ) as [string, string, { page_path: string; page_location: string; page_title: string }] | undefined;

    expect(pageViewCall).toBeDefined();
    expect(pageViewCall?.[2].page_path).toBe('/schedule');
    expect(pageViewCall?.[2].page_location).toBe(`${window.location.origin}/schedule`);
    expect(pageViewCall?.[2].page_title).toBe('StudyFlow — Schedule');
    expect(document.title).toBe('StudyFlow — Schedule');
  });

  it('trackEvent correctly sends custom GA4 events', () => {
    initAnalytics({ force: true });

    trackEvent('task_completed', { taskId: 'task-101', durationMinutes: 25 });

    const eventCall = window.dataLayer.find(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'task_completed'
    ) as [string, string, Record<string, unknown>] | undefined;

    expect(eventCall).toBeDefined();
    expect(eventCall?.[2]).toEqual({ taskId: 'task-101', durationMinutes: 25 });
  });
});

describe('usePageViewTracking Hook', () => {
  beforeEach(() => {
    _resetForTesting();
    window.dataLayer = [];
    delete (window as unknown as { gtag?: unknown }).gtag;
    initAnalytics({ force: true });
  });

  afterEach(() => {
    _resetForTesting();
    window.dataLayer = [];
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  function TestTabComponent({ tab }: { tab?: string }) {
    usePageViewTracking(tab);
    return <div>Current tab: {tab ?? 'none'}</div>;
  }

  it('fires initial virtual page view exactly once on mount with default dashboard tab', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestTabComponent tab="dashboard" />
      </MemoryRouter>
    );

    const pageViews = window.dataLayer.filter(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'page_view'
    );

    expect(pageViews.length).toBe(1);
    const pv = pageViews[0] as [string, string, { page_path: string; page_title: string }];
    expect(pv[2].page_path).toBe(TAB_PATHS.dashboard);
    expect(pv[2].page_title).toBe(TAB_TITLES.dashboard);
  });

  it('does not fire duplicate page views on re-renders or when re-selecting the active tab', () => {
    function StatefulTabApp() {
      const [tab, setTab] = useState('dashboard');
      const [, setCounter] = useState(0);
      usePageViewTracking(tab);

      return (
        <div>
          <button data-testid="reselect-btn" onClick={() => setTab('dashboard')}>
            Reselect Dashboard
          </button>
          <button data-testid="rerender-btn" onClick={() => setCounter((c) => c + 1)}>
            Re-render
          </button>
          <button data-testid="schedule-btn" onClick={() => setTab('schedule')}>
            Go to Schedule
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <StatefulTabApp />
      </MemoryRouter>
    );

    const getPageViewCount = () =>
      window.dataLayer.filter(
        (entry) =>
          Array.isArray(entry) &&
          entry[0] === 'event' &&
          entry[1] === 'page_view'
      ).length;

    expect(getPageViewCount()).toBe(1);

    // Re-render without tab change
    act(() => {
      getByTestId('rerender-btn').click();
    });
    expect(getPageViewCount()).toBe(1);

    // Reselect the same active tab
    act(() => {
      getByTestId('reselect-btn').click();
    });
    expect(getPageViewCount()).toBe(1);

    // Switch tab to schedule
    act(() => {
      getByTestId('schedule-btn').click();
    });
    expect(getPageViewCount()).toBe(2);

    const lastCall = window.dataLayer[window.dataLayer.length - 1] as [
      string,
      string,
      { page_path: string; page_title: string }
    ];
    expect(lastCall[2].page_path).toBe('/schedule');
    expect(lastCall[2].page_title).toBe(TAB_TITLES.schedule);
  });

  it('fires distinct page views across schedule, tasks, and back to dashboard', () => {
    function MultiTabApp() {
      const [tab, setTab] = useState('dashboard');
      usePageViewTracking(tab);

      return (
        <div>
          <button data-testid="tab-schedule" onClick={() => setTab('schedule')}>
            Schedule
          </button>
          <button data-testid="tab-tasks" onClick={() => setTab('tasks')}>
            Tasks
          </button>
          <button data-testid="tab-dashboard" onClick={() => setTab('dashboard')}>
            Dashboard
          </button>
        </div>
      );
    }

    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/']}>
        <MultiTabApp />
      </MemoryRouter>
    );

    act(() => {
      getByTestId('tab-schedule').click();
    });
    act(() => {
      getByTestId('tab-tasks').click();
    });
    act(() => {
      getByTestId('tab-dashboard').click();
    });

    const pageViews = window.dataLayer.filter(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'page_view'
    ) as [string, string, { page_path: string; page_title: string }][];

    expect(pageViews.length).toBe(4);
    expect(pageViews[0][2].page_path).toBe('/');
    expect(pageViews[1][2].page_path).toBe('/schedule');
    expect(pageViews[2][2].page_path).toBe('/tasks');
    expect(pageViews[3][2].page_path).toBe('/');
  });

  it('tracks URL changes when tab is undefined (e.g. 404 route)', () => {
    render(
      <MemoryRouter initialEntries={['/unmatched-route?src=external']}>
        <TestTabComponent tab={undefined} />
      </MemoryRouter>
    );

    const pageViews = window.dataLayer.filter(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'page_view'
    ) as [string, string, { page_path: string; page_location: string }][];

    expect(pageViews.length).toBe(1);
    expect(pageViews[0][2].page_path).toBe('/unmatched-route?src=external');
  });

  it('tracks page view on NotFound component mount', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/missing-page']}>
        <NotFound />
      </MemoryRouter>
    );

    const pageViews = window.dataLayer.filter(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === 'event' &&
        entry[1] === 'page_view'
    ) as [string, string, { page_path: string }][];

    expect(pageViews.length).toBe(1);
    expect(pageViews[0][2].page_path).toBe('/missing-page');
    consoleSpy.mockRestore();
  });
});
