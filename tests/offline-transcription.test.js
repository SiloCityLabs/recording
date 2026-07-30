import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANG_MODELS,
  RUNTIME_SOURCE_URL,
  MODEL_CDN_BASE,
  formatBytes,
  langEntry,
  modelCdnUrl,
  modelCacheKey,
  engineSupported,
  approximateDownloadBytes,
  modelBytesFor,
  modelLabelFor,
  isEnabled,
  setEnabled,
  voskEndpointUrls,
  OfflineTranscription,
} from "../offline-transcription.js";

describe("offline-transcription helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps languages to CDN models", () => {
    expect(langEntry("en-US").modelId).toBe("vosk-model-small-en-us-0.15");
    expect(langEntry("en-GB").modelId).toBe(langEntry("en-US").modelId);
    expect(langEntry("es-ES").modelId).toBe("vosk-model-small-es-0.3");
    expect(langEntry("nope").modelId).toBe(LANG_MODELS["en-US"].modelId);
    expect(modelLabelFor("de-DE")).toMatch(/German/);
  });

  it("builds cache keys and CDN urls", () => {
    const id = "vosk-model-small-en-us-0.15";
    expect(modelCacheKey(id)).toBe(`./optional/transcription/${id}.tar.gz`);
    expect(modelCdnUrl(id)).toBe(`${MODEL_CDN_BASE}/${id}.tar.gz`);
    expect(RUNTIME_SOURCE_URL).toContain("jsdelivr.net/npm/vosk-browser");
  });

  it("formatBytes and size estimates", () => {
    expect(formatBytes(0)).toBe("—");
    expect(approximateDownloadBytes("en-US")).toBeGreaterThan(modelBytesFor("en-US"));
  });

  it("toggles enabled preference", () => {
    expect(isEnabled()).toBe(false);
    setEnabled(true);
    expect(isEnabled()).toBe(true);
    setEnabled(false);
    expect(isEnabled()).toBe(false);
  });

  it("engineSupported reports missing APIs", () => {
    const ok = engineSupported();
    // happy-dom provides Worker/WASM/Audio differently; assert shape.
    expect(ok).toHaveProperty("ok");
    expect(Array.isArray(ok.reasons)).toBe(true);
  });

  it("voskEndpointUrls is unique runtime + models", () => {
    const urls = voskEndpointUrls();
    expect(urls[0]).toBe(RUNTIME_SOURCE_URL);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(1 + new Set(Object.values(LANG_MODELS).map((e) => e.modelId)).size);
  });

  it("exposes OfflineTranscription facade", () => {
    expect(OfflineTranscription.LANG_MODELS).toBe(LANG_MODELS);
    expect(typeof OfflineTranscription.downloadOfflineModel).toBe("function");
  });
});
