/**
 * UNEQWURL Service Worker — minimal offline shell
 */
const CACHE_NAME = "UNEQWURL-v1";
const SHELL_ASSETS = [
  "/",
  "/songs",
  "/login",
  "/manifest.json",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET or cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never cache authenticated pages or API endpoints
  const authSensitive = [
    "/api/",
    "/dashboard",
    "/admin",
    "/room",
    "/account",
    "/soundfiles",
    "/uploads",
    "/submissions",
  ];
  if (authSensitive.some((path) => url.pathname.startsWith(path))) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// Listen for logout broadcast from clients and clear shell cache
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_AUTH_CACHE") {
    caches.delete(CACHE_NAME).catch(() => {});
  }
});
