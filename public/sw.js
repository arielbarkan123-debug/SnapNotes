/**
 * NoteSnap Service Worker
 * Provides offline caching for courses and static assets
 */

const CACHE_NAME = 'notesnap-v1';
const STATIC_CACHE = 'notesnap-static-v1';
const COURSE_CACHE = 'notesnap-courses-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
];

// API routes to cache with network-first strategy
const CACHE_API_ROUTES = [
  '/api/courses',
  '/api/weak-areas',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== COURSE_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // Handle API routes with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle course pages - cache for offline viewing
  if (url.pathname.startsWith('/course/')) {
    event.respondWith(cacheFirstWithNetwork(request, COURSE_CACHE));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Default: network with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

// Network first, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

// Cache first, fallback to network
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    throw error;
  }
}

// Cache first with network update
async function cacheFirstWithNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately, update in background
  if (cached) {
    fetchPromise; // Start background update
    return cached;
  }

  // No cache, wait for network
  const response = await fetchPromise;
  if (response) return response;

  // Return offline page as fallback
  return caches.match('/offline');
}

// Network first with offline fallback for navigation
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);

    // Cache successful page navigations
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) return offlinePage;

    // Return basic offline response
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - NoteSnap</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; }
          .container { text-align: center; padding: 2rem; }
          h1 { color: #4f46e5; margin-bottom: 1rem; }
          p { color: #6b7280; margin-bottom: 2rem; }
          button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
          button:hover { background: #4338ca; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  // Don't cache Next.js chunks in development - they change constantly
  // Only cache actual static files like images and fonts
  if (pathname.startsWith('/_next/')) {
    return false; // Let Next.js handle its own caching
  }
  const staticExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_COURSE') {
    const { courseId, courseData } = event.data;
    cacheCourseData(courseId, courseData);
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache course data for offline access
async function cacheCourseData(courseId, courseData) {
  const cache = await caches.open(COURSE_CACHE);
  const response = new Response(JSON.stringify(courseData), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(`/api/course-offline/${courseId}`, response);
  console.log('[SW] Cached course:', courseId);
}
