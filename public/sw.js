// PharmaNext Progressive Web App - Service Worker
const CACHE_NAME = "pharmanext-v1.0.2";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/app-icon.png",
  "/doonext-fav.png",
  "/favicon.ico"
];

// Install Event: pre-cache critical shell assets and immediately skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("PWA pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old caches and claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for message events (such as skip waiting commands from client)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch Event: Network-first strategy for real-time POS data and pages
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do not intercept non-GET requests or external API / Firebase calls
  if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Next.js hot reload and dev endpoints should never be cached
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful static responses
        if (
          response.status === 200 &&
          (url.pathname.startsWith("/_next/static/") ||
           url.pathname.endsWith(".png") ||
           url.pathname.endsWith(".ico") ||
           url.pathname.endsWith(".svg") ||
           url.pathname.endsWith(".css") ||
           url.pathname === "/manifest.json")
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache if network is unavailable
        const cached = await caches.match(request);
        if (cached) return cached;

        // If it's a page navigation, return cached login or root
        if (request.mode === "navigate") {
          const fallback = await caches.match("/login") || await caches.match("/");
          if (fallback) return fallback;
        }

        return new Response("Offline - PharmaNext", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain" }
        });
      })
  );
});
