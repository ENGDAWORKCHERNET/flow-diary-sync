import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Detect the broad Android family: Chrome, Samsung Internet, Firefox, Edge, Opera, WebView
function detectAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /android/i.test(ua);
}

// Detect iOS (iPhone / iPad / iPod — including iPadOS masquerading as desktop Safari)
function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  );
}

// Detect whether the app is already running in standalone / installed mode
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export type InstallResult = 'accepted' | 'dismissed' | 'manual_ios' | 'manual_android' | 'unavailable';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = detectStandalone();
    setIsStandalone(standalone);

    const ios = detectIOS();
    const android = detectAndroid();
    setIsIOS(ios);
    setIsAndroid(android);

    if (standalone) {
      // Already installed — nothing to show
      setIsInstallable(false);
      return;
    }

    // iOS cannot trigger beforeinstallprompt; guide user via Safari share sheet
    if (ios) {
      setIsInstallable(true);
    }

    // Android without beforeinstallprompt (Samsung Internet, Firefox, old Chrome)
    // will get a manual guide — mark installable so the prompt is shown
    if (android && !ios) {
      setIsInstallable(true);
    }

    // Capture the standard Chromium / Android Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<InstallResult> => {
    if (isStandalone) return 'unavailable';

    // Native prompt available (Android Chrome, desktop Chromium)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstallable(false);
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.error('PWA install prompt error:', err);
        // Fall through to manual guide
      }
    }

    if (isIOS) return 'manual_ios';
    if (isAndroid) return 'manual_android';

    return 'unavailable';
  }, [deferredPrompt, isIOS, isAndroid, isStandalone]);

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    canPromptDirectly: Boolean(deferredPrompt),
    triggerInstall,
  };
}
