
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

