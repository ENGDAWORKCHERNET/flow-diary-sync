import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

describe('usePWAInstall hook', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('detects when app is not in standalone mode', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isStandalone).toBe(false);
  });

  it('handles beforeinstallprompt event and makes app installable', () => {
    const { result } = renderHook(() => usePWAInstall());

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const userChoicePromise = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    const mockEvent = new Event('beforeinstallprompt');
    Object.assign(mockEvent, {
      prompt: promptMock,
      userChoice: userChoicePromise,
      platforms: ['web'],
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.isInstallable).toBe(true);
    expect(result.current.canPromptDirectly).toBe(true);
  });

  it('triggers native prompt and returns accepted outcome', async () => {
    const { result } = renderHook(() => usePWAInstall());

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const userChoicePromise = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

    const mockEvent = new Event('beforeinstallprompt');
    Object.assign(mockEvent, {
      prompt: promptMock,
      userChoice: userChoicePromise,
      platforms: ['web'],
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.triggerInstall();
    });

    expect(promptMock).toHaveBeenCalled();
    expect(outcome).toBe('accepted');
  });
});
