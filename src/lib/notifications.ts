
import { toast } from 'sonner';
import { formatTime12, type ClassSession } from './data';

let swRegistration: ServiceWorkerRegistration | null = null;

export const setSWRegistration = (registration: ServiceWorkerRegistration) => {
  swRegistration = registration;
};

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined';
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.warn("This browser or platform does not support web notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return false;
  }
};

export const sendLocalNotification = async (title: string, body?: string) => {
  if (!isNotificationSupported()) return;

  try {
    if (Notification.permission !== "granted") {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }

    if (!swRegistration && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) swRegistration = reg;
      } catch {}
    }

    if (swRegistration) {
      try {
        await swRegistration.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/favicon.png",
          vibrate: [200, 100, 200],
          tag: "studyflow-notification",
          renotify: true,
        } as any);
        return;
      } catch (error) {
        console.error("Failed to show notification via service worker:", error);
      }
    }

    // Basic fallback if no service worker registration yet
    new Notification(title, { body, icon: "/icon-192.png" });
  } catch (err) {
    console.error("Failed to show notification:", err);
  }
};

export const requestPermission = requestNotificationPermission;

export const NOTIFIED_CLASSES_STORAGE_KEY = 'studyflow_notified_classes';

export interface NotifiedRecord {
  [dateAndSessionKey: string]: number; // timestamp
}

export function getNotifiedClasses(): NotifiedRecord {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(NOTIFIED_CLASSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveNotifiedClasses(records: NotifiedRecord) {
  try {
    if (typeof window === 'undefined') return;
    // Clean up records older than 2 days
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const cleaned: NotifiedRecord = {};
    for (const [k, v] of Object.entries(records)) {
      if (v > cutoff) cleaned[k] = v;
    }
    localStorage.setItem(NOTIFIED_CLASSES_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}

export function clearNotifiedClasses() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NOTIFIED_CLASSES_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Play a subtle, elegant chime sound via Web Audio API.
 */
export function playChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {}
}

export interface ReminderResult {
  notified: boolean;
  session?: ClassSession;
  minutesUntil?: number;
}

/**
 * Checks if any class today starts in 15 minutes or less (and hasn't been notified yet).
 * If found, triggers both a system push notification and an in-app toast with room number.
 */
export function checkAndTriggerClassReminder(
  schedule: ClassSession[],
  customNow?: Date,
  options?: { showInAppToast?: boolean }
): ReminderResult {
  if (!schedule || schedule.length === 0) return { notified: false };

  const now = customNow || new Date();
  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const todayClasses = schedule.filter(s => s.day === today);
  const notifiedRecords = getNotifiedClasses();

  for (const session of todayClasses) {
    const [h, m] = session.startTime.split(':').map(Number);
    const startMin = h * 60 + m;
    const minutesUntil = startMin - nowMinutes;

    // Trigger reminder if class starts within 15 minutes (1 to 15 mins away)
    if (minutesUntil > 0 && minutesUntil <= 15) {
      const recordKey = `${dateStr}_${session.id || session.subject}_${session.startTime}`;
      if (!notifiedRecords[recordKey]) {
        // Mark as notified for today
        notifiedRecords[recordKey] = Date.now();
        saveNotifiedClasses(notifiedRecords);

        const timeFormatted = formatTime12(session.startTime);
        const roomPart = session.room ? ` in ${session.room}` : '';
        const labPart = session.isLab ? ` (Lab${session.labGroup ? ` • ${session.labGroup}` : ''})` : '';

        const title = `Class in ${minutesUntil}m: ${session.subject}`;
        const body = `Starts at ${timeFormatted}${roomPart}${labPart}. Don't be late!`;

        // Send system notification
        sendLocalNotification(title, body);

        // Play gentle audio chime
        playChime();

        // Show in-app alert toast
        if (options?.showInAppToast !== false) {
          toast.info(title, {
            description: body,
            duration: 10000,
          });
        }

        return { notified: true, session, minutesUntil };
      }
    }
  }

  return { notified: false };
}

