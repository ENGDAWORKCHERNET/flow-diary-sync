import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Share, PlusSquare, Zap, WifiOff, Bell, Smartphone, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PWAInstallPromptProps {
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PWAInstallPrompt({ forceOpen, onOpenChange }: PWAInstallPromptProps) {
  const { isInstallable, isStandalone, isIOS, triggerInstall } = usePWAInstall();
  const [open, setOpen] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [hasInstalled, setHasInstalled] = useState<boolean>(false);

  // Auto-prompt on initial page load if not installed and not dismissed in session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do nothing if already running as standalone PWA
    if (isStandalone) return;

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('studyflow_pwa_dismissed');
    if (dismissed === 'true') return;

    // Show popup after a small smooth delay (1.2 seconds)
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isStandalone]);

  // Handle manual trigger from parent/header button
  useEffect(() => {
    if (forceOpen !== undefined) {
      setOpen(forceOpen);
      if (forceOpen && isIOS) {
        setShowIOSGuide(true);
      }
    }
  }, [forceOpen, isIOS]);

  const handleClose = (userInitiated = true) => {
    setOpen(false);
    if (onOpenChange) onOpenChange(false);
    if (userInitiated && typeof window !== 'undefined') {
      sessionStorage.setItem('studyflow_pwa_dismissed', 'true');
    }
  };

  const handleDownloadClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    const result = await triggerInstall();
    if (result === 'accepted') {
      setHasInstalled(true);
      toast.success('StudyFlow installed to your device! 🎉');
      setTimeout(() => {
        handleClose(false);
      }, 1500);
    } else if (result === 'manual_ios') {
      setShowIOSGuide(true);
    } else if (result === 'dismissed') {
      handleClose(true);
    } else {
      // Browser didn't support automated prompt (e.g. desktop firefox / unsupported)
      toast.info("To install, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
    }
  };

  if (isStandalone) return null;

  return (
    <Dialog open={open} onOpenChange={isOpen => {
      if (!isOpen) handleClose(true);
      else setOpen(true);
    }}>
      <DialogContent className="rounded-3xl max-w-sm sm:max-w-md p-6 glass-card-solid border border-border/60 shadow-2xl overflow-hidden animate-scale-in">
        {/* Close Button */}
        <button
          onClick={() => handleClose(true)}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {!showIOSGuide ? (
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
              Download StudyFlow directly to your phone for a full app experience with instant schedule access and offline support.
            </p>

            {/* Benefit Highlights */}
            <div className="grid grid-cols-1 gap-2 bg-secondary/40 rounded-2xl p-3 border border-border/40">
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span><strong>Instant Home Screen Access</strong> with custom icon & name</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <WifiOff className="w-3.5 h-3.5" />
                </div>
                <span><strong>Works Offline</strong> without browser tabs or reloading</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-foreground/90">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <span><strong>Class Timetable & Tasks</strong> always 1 tap away</span>
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
                    <span>Download App to Device</span>
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
        ) : (
          /* iOS Safari Specific Step-by-Step Guide */
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
                <p className="text-xs text-muted-foreground">Follow these 3 quick steps in Safari:</p>
              </div>
            </div>

            <div className="space-y-3 bg-secondary/40 rounded-2xl p-4 border border-border/40 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  1
                </span>
                <p className="pt-0.5 text-muted-foreground">
                  Tap the <strong className="text-foreground">Share button</strong>{' '}
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
                  Tap <strong className="text-foreground">Add</strong> in the top right. StudyFlow will appear on your phone screen with its icon!
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
