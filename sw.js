const CACHE = "recorder-__BUILD_HASH__";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=__BUILD_HASH__",
  "./db.js?v=__BUILD_HASH__",
  "./nextcloud.js?v=__BUILD_HASH__",
  "./app.js?v=__BUILD_HASH__",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED", cache: CACHE }));
        })
      )
  );
});

function isShellRequest(url) {
  const path = url.pathname;
  return (
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".webmanifest") ||
    path.endsWith(".html") ||
    path.endsWith("/") ||
    /\/icons\//.test(path)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!isShellRequest(url) && request.mode !== "navigate") return;

  // Network-first for app shell so fixes (and BUILD_HASH bumps) are not stuck
  // behind a stale Cache Storage entry from an older deploy.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => {
            const putReq = request.mode === "navigate" ? new Request("./index.html") : request;
            cache.put(putReq, copy).catch(() => {});
          });
        }
        return response;
      })
      .catch(async () => {
        const cached =
          (await caches.match(request)) ||
          (request.mode === "navigate"
            ? (await caches.match("./index.html")) || (await caches.match("./"))
            : null);
        if (cached) return cached;
        throw new Error("Offline and not cached");
      })
  );
});
