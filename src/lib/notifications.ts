
let swRegistration: ServiceWorkerRegistration | null = null;

export const setSWRegistration = (registration: ServiceWorkerRegistration) => {
  swRegistration = registration;
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications.");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const sendLocalNotification = async (title: string, body?: string) => {
  if (Notification.permission !== "granted") {
    const granted = await requestPermission();
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
    } catch (error) {
      console.error("Failed to show notification via service worker:", error);
      // Fallback to basic notification if SW fails
      new Notification(title, { body, icon: "/icon-192.png" });
    }
  } else {
    // Basic fallback if no service worker registration yet
    new Notification(title, { body, icon: "/icon-192.png" });
  }
};

export const requestPermission = requestNotificationPermission;
