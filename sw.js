// =====================================================
// DUCTCULATOR PRO — offline service worker
// Online: always fetch the newest files (and keep a copy).
// Offline: serve the saved copy, so the app works with no signal.
// Fonts are saved the first time they load online.
// =====================================================

const CACHE = "ductculator-v9";

const SHELL = [
  "./",
  "index.html",
  "style.css",
  "offsetiso.css",
  "theme.css",
  "app.js",
  "offsetiso.js",
  "hvac-pro-calc.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/airflow.js",
  "js/equivalent.js",
  "js/equivalentSizes.js",
  "js/fittingViews.js",
  "js/equivalentUI.js",
  "js/flatOval.js",
  "js/formulas.js",
  "js/layoutMath.js",
  "js/navigation.js",
  "js/persist.js",
  "js/proCalc.js",
  "js/rectFittings.js",
  "js/rectangle.js",
  "js/reverse.js",
  "js/roundFittings.js",
  "js/shared.js",
  "js/sizingTools.js",
  "js/storage.js",
  "js/takeoff.js",
  "js/transitionSplitter.js",
  "js/ui.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Google Fonts: use the saved copy, refresh it in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(CACHE).then(async cache => {
        const saved = await cache.match(request);
        const fresh = fetch(request)
          .then(response => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => saved);
        return saved || fresh;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // App files: network first, saved copy when offline.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const saved = await caches.match(request, { ignoreSearch: true });

        if (saved) {
          return saved;
        }

        if (request.mode === "navigate") {
          return caches.match("index.html");
        }

        return Response.error();
      })
  );
});
