/**
 * X+1 Service Worker — Self-Destructing Version
 *
 * This SW exists solely to replace the old caching SW.
 * On install: skipWaiting to immediately take over.
 * On activate: delete ALL caches, claim clients, then notify them.
 * On fetch: do nothing — let all requests go straight to the network.
 */

// Immediately take over from old SW
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activation, nuke all caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all controlled pages that the SW has been cleaned up
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_CACHE_CLEARED' });
        });
      })
  );
});

// Do NOT intercept any fetches — everything goes to the network
// This is intentionally empty. The old SW intercepted fetches and
// served stale cached content. This one lets everything through.
