// Knowway Service Worker
// Updated: Force fresh content - increment version to bust cache
const CACHE_NAME = 'knowway-v4-' + Date.now(); // Dynamic version to force cache refresh
const STATIC_CACHE_NAME = 'knowway-static-v4'; // Separate cache for truly static assets

// Only cache truly static assets (images, fonts)
const staticAssetsToCache = [
    '/manifest.json'
];

// Install event - minimal caching
self.addEventListener('install', (event) => {
    console.log('Service Worker installing, cache version:', CACHE_NAME);
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(staticAssetsToCache);
            })
            .catch((error) => {
                console.log('Cache install failed:', error);
            })
    );
    // Activate immediately - don't wait
    self.skipWaiting();
});

// Activate event - AGGRESSIVELY clean up ALL old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating, clearing old caches');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL caches except the current static cache
                    if (cacheName !== STATIC_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - NETWORK-FIRST for everything except truly static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // NEVER cache API requests - always go to network
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ success: false, message: 'Network error - you are offline' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }

    // NETWORK-FIRST for HTML, CSS, and JS files - always fetch fresh
    if (url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname === '/' ||
        url.pathname === '') {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }) // Force bypass browser cache too
                .then((response) => {
                    return response;
                })
                .catch(() => {
                    // Only fall back to cache if completely offline
                    return caches.match(event.request) || caches.match('/index.html');
                })
        );
        return;
    }

    // For truly static assets (images, fonts), use cache-first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((networkResponse) => {
                    // Only cache images and fonts
                    const contentType = networkResponse.headers.get('content-type') || '';
                    if (contentType.includes('image/') || contentType.includes('font/')) {
                        const responseToCache = networkResponse.clone();
                        caches.open(STATIC_CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                return new Response('Offline', { status: 503 });
            })
    );
});
