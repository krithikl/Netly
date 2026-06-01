const CACHE_NAME = "netly-pwa-v2";
const APP_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg"
];
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const IS_LOCALHOST = LOCAL_HOSTNAMES.has(self.location.hostname);

self.addEventListener("install", (event) => {
  if (IS_LOCALHOST) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (IS_LOCALHOST) {
    event.waitUntil(clearNetlyCaches().then(() => self.registration.unregister()).then(() => self.clients.claim()));
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCALHOST) {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

// Serves immutable app assets from cache and refreshes the cache after misses.
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

// Keeps navigations fresh while allowing the installed shell to open offline.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match("/");
  }
}

// Keeps localhost development from being controlled by stale production assets.
async function clearNetlyCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("netly-pwa-")).map((key) => caches.delete(key)));
}
