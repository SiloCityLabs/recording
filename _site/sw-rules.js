/** Pure URL / cache helpers for the service worker (and unit tests). */

export const TRANSCRIPTION_CACHE_PREFIX = "recorder-transcription-";

export function isProtectedOptionalCache(name) {
  return String(name || "").startsWith(TRANSCRIPTION_CACHE_PREFIX);
}

/** Shell caches to drop on activate (keep current shell + optional transcription). */
export function isObsoleteShellCache(name, currentShellCache) {
  const key = String(name || "");
  if (!key || key === currentShellCache) return false;
  if (isProtectedOptionalCache(key)) return false;
  return true;
}

export function isOptionalTranscriptionPath(url) {
  try {
    const u = typeof url === "string" ? new URL(url, "https://example.invalid") : url;
    return u.pathname.includes("/optional/transcription/");
  } catch {
    return false;
  }
}

export function isShellRequest(url) {
  try {
    const u = typeof url === "string" ? new URL(url, "https://example.invalid") : url;
    if (isOptionalTranscriptionPath(u)) return false;
    const path = u.pathname;
    return (
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".webmanifest") ||
      path.endsWith(".html") ||
      path.endsWith("/") ||
      /\/icons\//.test(path)
    );
  } catch {
    return false;
  }
}

export function shellCacheName(buildHash) {
  return `recorder-${buildHash || "dev"}`;
}
