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
  // Only cache same-origin GET requests for shell navigation
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
    })
  );
});
