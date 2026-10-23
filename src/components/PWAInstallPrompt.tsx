import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share,
  PlusSquare,
  Zap,
  WifiOff,
  Bell,
  Smartphone,
  Check,
  MoreVertical,
  MonitorSmartphone,
} from 'lucide-react';
import { toast } from 'sonner';

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type GuideMode = 'main' | 'ios' | 'android';

export default function PWAInstallPrompt({ forceOpen, onOpenChange }: PWAInstallPromptProps) {
  const { isInstallable, isStandalone, isIOS, isAndroid, canPromptDirectly, triggerInstall } =
    usePWAInstall();
  const [open, setOpen] = useState<boolean>(false);
  const [guide, setGuide] = useState<GuideMode>('main');
  const [hasInstalled, setHasInstalled] = useState<boolean>(false);

  // Auto-prompt on initial page load if not installed and not dismissed in this session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone) return;

    try {
      const dismissed = sessionStorage.getItem('studyflow_pwa_dismissed');
      if (dismissed === 'true') return;
    } catch {
      // sessionStorage blocked (private browsing or restrictive policy)
    }

    const timer = setTimeout(() => {
      if (isInstallable) setOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
    // Re-run only when installability resolves (hook fires async)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandalone, isInstallable]);

  // Handle manual trigger from a parent header button
  useEffect(() => {
    if (forceOpen === undefined) return;
    setOpen(forceOpen);
    if (forceOpen) {
      // If already on Android without native prompt, jump straight to guide
      if (isAndroid && !canPromptDirectly) setGuide('android');
      else if (isIOS) setGuide('ios');
      else setGuide('main');
    }
  }, [forceOpen, isAndroid, isIOS, canPromptDirectly]);

  const handleClose = (userInitiated = true) => {
    setOpen(false);
    setGuide('main');
    if (onOpenChange) onOpenChange(false);
    if (userInitiated) {
      try {
        sessionStorage.setItem('studyflow_pwa_dismissed', 'true');
      } catch {
        // Storage access blocked
      }
    }
  };

  const handleDownloadClick = async () => {
    if (isIOS) {
      setGuide('ios');
      return;
    }

    const result = await triggerInstall();

    switch (result) {
      case 'accepted':
        setHasInstalled(true);
        toast.success('StudyFlow installed to your device! 🎉');
        setTimeout(() => handleClose(false), 1500);
        break;
      case 'dismissed':
        handleClose(true);
        break;
      case 'manual_ios':
        setGuide('ios');
        break;
      case 'manual_android':
        setGuide('android');
        break;
      default:
        // Unsupported browser (desktop Firefox, etc.)
        toast.info(
          "To install, open your browser's menu (⋮) and choose 'Install app' or 'Add to Home screen'.",
        );
    }
  };

  if (isStandalone) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose(true);
        else setOpen(true);
      }}
    >
      <DialogContent className="rounded-3xl max-w-sm sm:max-w-md p-6 glass-card-solid border border-border/60 shadow-2xl overflow-hidden animate-scale-in">
        {/* ── Main install screen ── */}
        {guide === 'main' && (
          <div className="space-y-5">
            {/* App Header Branding */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative">
                <img
                  src="/icon-192.png"
                  alt="StudyFlow App Icon"
                  className="w-16 h-16 rounded-2xl shadow-md border border-border/50 object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold shadow-sm">
                  ⚡
                </span>
              </div>
              <div>
                <DialogTitle className="font-display text-xl font-bold leading-tight">
                  Install StudyFlow
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Smart Student Productivity App
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-primary font-medium">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Free • No App Store Needed</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add StudyFlow to your home screen for a full app experience with instant access and
              offline support — no App Store required.
            </p>

            {/* Benefit Highlights */}
            <div className="grid grid-cols-1 gap-2 bg-secondary/40 rounded-2xl p-3 border border-border/40">
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Instant Home Screen Access</strong> with custom icon &amp; name
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <WifiOff className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Works Offline</strong> without browser tabs or reloading
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <span>
                  <strong>Schedule &amp; Tasks</strong> always 1 tap away
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleDownloadClick}
                disabled={hasInstalled}
                className="w-full h-12 rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {hasInstalled ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Installed Successfully!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {canPromptDirectly
                        ? 'Install App'
                        : isAndroid
                          ? 'How to Install on Android'
                          : isIOS
                            ? 'How to Add to Home Screen'
                            : 'Download App to Device'}
                    </span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => handleClose(true)}
                className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Not now, continue in browser
              </Button>
            </div>
          </div>
        )}

        {/* ── iOS Safari step-by-step guide ── */}
        {guide === 'ios' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="StudyFlow"
                className="w-12 h-12 rounded-xl border border-border/50 shadow-sm"
              />
              <div>
                <DialogTitle className="font-display text-lg font-bold">
                  Add to iPhone Home Screen
                </DialogTitle>
                <p className="text-xs text-muted-foreground">3 quick steps in Safari:</p>
              </div>
            </div>

            <div className="space-y-3 bg-secondary/40 rounded-2xl p-4 border border-border/40 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  1
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap the{' '}
                  <strong className="text-foreground">Share button</strong>{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary text-primary font-semibold">
                    <Share className="w-3.5 h-3.5 inline mr-1" /> Share
                  </span>{' '}
                  in Safari's bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  2
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Scroll down and tap{' '}
                  <strong className="text-foreground">
                    <PlusSquare className="w-3.5 h-3.5 inline text-primary mr-1" />
                    Add to Home Screen
                  </strong>
                  .
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  3
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap <strong className="text-foreground">Add</strong> in the top right. StudyFlow
                  will appear on your home screen!
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleClose(true)}
              className="w-full h-11 rounded-2xl font-semibold text-xs mt-2"
            >
              Got it!
            </Button>
          </div>
        )}

        {/* ── Android manual install guide ── */}
        {guide === 'android' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <img
                src="/icon-192.png"
                alt="StudyFlow"
                className="w-12 h-12 rounded-xl border border-border/50 shadow-sm"
              />
              <div>
                <DialogTitle className="font-display text-lg font-bold">
                  Add to Android Home Screen
                </DialogTitle>
                <p className="text-xs text-muted-foreground">Works in Chrome, Samsung Browser &amp; more:</p>
              </div>
            </div>

            <div className="space-y-3 bg-secondary/40 rounded-2xl p-4 border border-border/40 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  1
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap the{' '}
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-primary font-semibold">
                    <MoreVertical className="w-3 h-3" /> Menu
                  </span>{' '}
                  icon (three dots) in the top-right corner of your browser.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  2
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap{' '}
                  <strong className="text-foreground">
                    "Add to Home screen"
                  </strong>{' '}
                  or{' '}
                  <strong className="text-foreground">"Install app"</strong>.
                  <br />
                  <span className="text-muted-foreground/70">
                    (Samsung Internet: tap <em>Add page to</em> → <em>Home screen</em>)
                  </span>
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  3
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap <strong className="text-foreground">Add</strong> or{' '}
                  <strong className="text-foreground">Install</strong> in the confirmation dialog.
                  StudyFlow will appear on your home screen!
                </p>
              </div>

              {/* Tip for Chrome */}
              <div className="flex items-start gap-2 mt-1 pt-2 border-t border-border/30">
                <MonitorSmartphone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground/70">
                  <strong className="text-muted-foreground">Chrome tip:</strong> Look for an{' '}
                  <strong className="text-foreground">Install</strong> button (⊕) in the address
                  bar — tap it for the fastest installation.
                </p>
              </div>
            </div>

            <Button
              onClick={() => handleClose(true)}
              className="w-full h-11 rounded-2xl font-semibold text-xs mt-2"
            >
              Got it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
