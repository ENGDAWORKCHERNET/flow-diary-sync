/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets built by Vite (injected by VitePWA)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Background Push Notifications ───────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'StudyFlow Reminder', body: event.data?.text() ?? '' };
  }

  const title = data.title ?? 'StudyFlow Reminder';
  const body = data.body ?? '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'class-reminder',
      renotify: true,
      requireInteraction: false,
      data: { url: data.url ?? '/' },
    } as NotificationOptions)
  );
});

// Open or focus the app when the notification is tapped
self.addEventListener('notificationclick', (event: NotificationClickEvent) => {
  event.notification.close();
  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
