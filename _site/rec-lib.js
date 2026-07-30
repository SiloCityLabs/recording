/**
 * Pure helpers shared by the app shell and unit tests.
 * No DOM, no IndexedDB, no MediaRecorder — safe to import anywhere.
 */

export function formatDuration(ms, withTenths = false) {
  const n = Number(ms);
  const total = Number.isFinite(n) && n > 0 ? n / 1000 : 0;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const mm = Number.isFinite(m) ? String(m).padStart(2, "0") : "00";
  const ss = Number.isFinite(s) ? String(s).padStart(2, "0") : "00";
  if (withTenths) {
    const t = Math.floor((total % 1) * 10);
    return `${mm}:${ss}.${Number.isFinite(t) ? t : 0}`;
  }
  return `${mm}:${ss}`;
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatTitle(ts, locales) {
  const d = new Date(ts);
  const day = d.toLocaleDateString(locales, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(locales, { hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
}

export function formatLongDate(ts, locales) {
  const d = new Date(ts);
  return d.toLocaleString(locales, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function monthLabel(ts, locales) {
  return new Date(ts).toLocaleString(locales, { month: "long", year: "numeric" });
}

export function buildSummary(text) {
  if (!text || text.trim().length < 40) return [];
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  if (!sentences.length) {
    const words = text.trim().split(/\s+/);
    const chunk = words.slice(0, 18).join(" ");
    return chunk ? [chunk + (words.length > 18 ? "…" : "")] : [];
  }
  return sentences.slice(0, 3);
}

export function resamplePeaks(peaks, mode, start, end) {
  if (!peaks?.length) return [];
  const a = Math.floor(start * peaks.length);
  const b = Math.floor(end * peaks.length);
  if (mode === "crop") return peaks.slice(a, b);
  return peaks.slice(0, a).concat(peaks.slice(b));
}

export function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/** Encode an AudioBuffer-like object ({ numberOfChannels, sampleRate, length, getChannelData }) to WAV. */
export function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const dataLen = len * numCh * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataLen, true);
  let offset = 44;
  const channels = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return ab;
}

export function sliceBuffer(ctx, buffer, start, end) {
  const sr = buffer.sampleRate;
  const s0 = Math.floor(start * sr);
  const s1 = Math.floor(end * sr);
  const len = Math.max(1, s1 - s0);
  const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(s0, s1));
  }
  return out;
}

export function removeRange(ctx, buffer, start, end) {
  const sr = buffer.sampleRate;
  const s0 = Math.floor(start * sr);
  const s1 = Math.floor(end * sr);
  const len = Math.max(1, buffer.length - (s1 - s0));
  const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, s0), 0);
    dst.set(src.subarray(s1), s0);
  }
  return out;
}

export function micErrorMessage(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone blocked — allow mic access for this site and try again";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microphone is in use by another app";
  }
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Microphone settings not supported on this device";
  }
  if (name === "SecurityError") {
    return "Microphone requires HTTPS (or localhost)";
  }
  if (name === "AbortError") {
    return "Microphone request was interrupted — try again";
  }
  return err?.message ? `Mic error: ${err.message}` : "Could not start microphone";
}

export function browserProbeFailMessage(reason) {
  switch (reason) {
    case "unsupported":
      return "This browser has no Speech Recognition API";
    case "not-allowed":
    case "service-not-allowed":
      return "Browser transcription blocked — allow microphone access";
    case "network":
      return "Browser speech service unreachable — left off";
    case "audio-capture":
      return "Microphone busy — browser transcription left off";
    case "timeout":
      return "Browser transcription did not start — left off";
    default:
      return "Browser transcription failed the check — left off";
  }
}

export function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function uid(now = Date.now(), rand = Math.random) {
  return `rec_${now.toString(36)}_${rand().toString(36).slice(2, 8)}`;
}

if (typeof window !== "undefined") {
  window.RecLib = {
    formatDuration,
    escapeHtml,
    formatTitle,
    formatLongDate,
    monthLabel,
    buildSummary,
    resamplePeaks,
    writeStr,
    audioBufferToWav,
    sliceBuffer,
    removeRange,
    micErrorMessage,
    browserProbeFailMessage,
    formatBytes,
    clamp01,
    uid,
  };
}
