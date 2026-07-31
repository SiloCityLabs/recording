import {
  TRANSCRIPTION_CACHE_PREFIX,
  isProtectedOptionalCache,
  isObsoleteShellCache,
  isOptionalTranscriptionPath,
  isShellRequest,
} from "./sw-rules.js";

const CACHE = "recorder-__BUILD_HASH__";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=__BUILD_HASH__",
  "./db.js?v=__BUILD_HASH__",
  "./nextcloud.js?v=__BUILD_HASH__",
  "./offline-transcription.js?v=__BUILD_HASH__",
  "./rec-lib.js?v=__BUILD_HASH__",
  "./sw-rules.js?v=__BUILD_HASH__",
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

// Re-export prefix for any tooling that introspects the SW scope.
void TRANSCRIPTION_CACHE_PREFIX;
void isProtectedOptionalCache;

async function deleteObsoleteCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => isObsoleteShellCache(k, CACHE)).map((k) => caches.delete(k)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(ASSETS);
      } catch (err) {
        // A failed install must not leave an empty/partial shell cache behind —
        // those orphans otherwise stack up across deploys.
        await caches.delete(CACHE);
        throw err;
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    deleteObsoleteCaches()
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED", cache: CACHE }));
        })
      )
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "CLEAR_OBSOLETE_CACHES") {
    event.waitUntil(deleteObsoleteCaches());
  }
});

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

  // Optional transcription assets: never write into the shell cache.
  // Prefer the dedicated transcription cache (filled by Settings download),
  // then network. Do not fall back to shell cache.
  if (isOptionalTranscriptionPath(url)) {
    event.respondWith(
      caches.keys().then(async (keys) => {
        const optionalKeys = keys.filter(isProtectedOptionalCache);
        for (const key of optionalKeys) {
          const hit = await caches.open(key).then((c) => c.match(request));
          if (hit) return hit;
          // Also try without query string / alternate relative form
          const alt = await caches.open(key).then((c) => c.match(url.pathname.replace(/^\//, "./")));
          if (alt) return alt;
        }
        try {
          return await fetch(request);
        } catch {
          // Relative key as stored by offline-transcription.js
          for (const key of optionalKeys) {
            const rel = "./" + url.pathname.replace(/^\//, "").replace(/^.*?(optional\/transcription\/)/, "$1");
            const hit = await caches.open(key).then((c) => c.match(rel));
            if (hit) return hit;
            const hit2 = await caches.open(key).then((c) =>
              c.match("./optional/transcription/" + url.pathname.split("/").pop())
            );
            if (hit2) return hit2;
          }
          throw new Error("Offline transcription asset unavailable");
        }
      })
    );
    return;
  }

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
