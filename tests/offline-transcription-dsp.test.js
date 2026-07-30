import { describe, expect, it, vi, afterEach } from "vitest";
import {
  segmentsFromResult,
  mixToMono,
  resampleLinear,
  decodeToMono16k,
  refreshKnownBytes,
  modelBytesFor,
  installedConflictsWith,
  getInstalledInfo,
  CACHE_NAME,
  modelCacheKey,
  RUNTIME_CACHE_KEY,
} from "../offline-transcription.js";

describe("offline-transcription DSP / segments", () => {
  it("segmentsFromResult handles empty, plain text, and word timings", () => {
    expect(segmentsFromResult({})).toEqual({ text: "", segments: [] });
    expect(segmentsFromResult({ text: " hello " })).toEqual({
      text: "hello",
      segments: [{ t: 0, text: "hello", speaker: 1 }],
    });
    const words = [];
    for (let i = 0; i < 30; i++) {
      words.push({ word: `w${i}`, start: i * 0.4, end: i * 0.4 + 0.3 });
    }
    const timed = segmentsFromResult({ text: "x", result: words });
    expect(timed.segments.length).toBeGreaterThan(1);
    expect(timed.segments[0].speaker).toBe(1);
  });

  it("mixToMono averages channels", () => {
    const buf = {
      numberOfChannels: 2,
      length: 2,
      getChannelData(c) {
        return c === 0 ? new Float32Array([1, 0]) : new Float32Array([0, 1]);
      },
    };
    expect([...mixToMono(buf)]).toEqual([0.5, 0.5]);
    const mono = {
      numberOfChannels: 1,
      length: 2,
      getChannelData() {
        return new Float32Array([0.25, 0.75]);
      },
    };
    expect([...mixToMono(mono)]).toEqual([0.25, 0.75]);
  });

  it("resampleLinear changes length", () => {
    const input = new Float32Array([0, 1, 0, 1]);
    const out = resampleLinear(input, 16000, 8000);
    expect(out.length).toBe(2);
    expect(resampleLinear(input, 16000, 16000)).toBe(input);
  });

  it("decodeToMono16k uses OfflineAudioContext when present", async () => {
    const pcm = new Float32Array([0.1, -0.1, 0.2, -0.2]);
    class FakeAudioCtx {
      async decodeAudioData() {
        return {
          numberOfChannels: 1,
          length: pcm.length,
          sampleRate: 8000,
          getChannelData() {
            return pcm;
          },
        };
      }
      async close() {}
    }
    class FakeOffline {
      constructor(_ch, frames, rate) {
        this.frames = frames;
        this.rate = rate;
      }
      createBuffer() {
        const data = new Float32Array(pcm.length);
        return {
          copyToChannel(src) {
            data.set(src);
          },
        };
      }
      createBufferSource() {
        return { buffer: null, connect() {}, start() {} };
      }
      async startRendering() {
        return {
          getChannelData() {
            return new Float32Array(this.frames || 2).map(() => 0.05);
          },
        };
      }
    }
    // Fix OfflineAudioContext mock — map() on Float32Array returns array not Float32Array
    FakeOffline.prototype.startRendering = async function startRendering() {
      return {
        getChannelData: () => new Float32Array(Math.max(1, this.frames)).fill(0.05),
      };
    };

    vi.stubGlobal("AudioContext", FakeAudioCtx);
    vi.stubGlobal("OfflineAudioContext", FakeOffline);
    const out = await decodeToMono16k(new Blob(["x"]));
    expect(out.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});

describe("offline-transcription meta helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("refreshKnownBytes updates sizes from HEAD content-length", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => "12345678" },
      }))
    );
    await refreshKnownBytes();
    expect(modelBytesFor("en-US")).toBe(12345678);
  });

  it("installedConflictsWith / getInstalledInfo read cache meta", async () => {
    const store = new Map();
    store.set(RUNTIME_CACHE_KEY, { ok: true });
    store.set(modelCacheKey("vosk-model-small-en-us-0.15"), { ok: true });
    vi.stubGlobal("caches", {
      async open() {
        return {
          async match(key) {
            return store.get(String(key));
          },
        };
      },
    });
    vi.stubGlobal("Worker", class {});
    vi.stubGlobal("AudioContext", class {});
    localStorage.setItem(
      "recorder.offlineTranscribe.installed.v1",
      JSON.stringify({
        cache: CACHE_NAME,
        model: "vosk-model-small-en-us-0.15",
        lang: "en-US",
        bytes: 99,
      })
    );
    expect(await installedConflictsWith("de-DE")).toBe(true);
    expect(await installedConflictsWith("en-US")).toBe(false);
    const info = await getInstalledInfo();
    expect(info.modelId).toBe("vosk-model-small-en-us-0.15");
    expect(info.bytes).toBe(99);
  });
});
