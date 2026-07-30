import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_NAME,
  downloadOfflineModel,
  deleteOfflineModel,
  getStatus,
  isOfflineModelInstalled,
  cancelDownload,
  OfflineTranscription,
  RUNTIME_CACHE_KEY,
  modelCacheKey,
  LANG_MODELS,
} from "../offline-transcription.js";

function mockResponse(bytes, { ok = true, status = 200, contentType = "application/gzip" } = {}) {
  const body = typeof bytes === "number" ? new Uint8Array(bytes) : bytes;
  return {
    ok,
    status,
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (key === "content-length") return String(body.byteLength ?? body.length);
        if (key === "content-type") return contentType;
        return null;
      },
    },
    body: {
      getReader() {
        let done = false;
        return {
          async read() {
            if (done) return { done: true, value: undefined };
            done = true;
            return { done: false, value: body instanceof Uint8Array ? body : new Uint8Array(body) };
          },
        };
      },
    },
    async arrayBuffer() {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    },
  };
}

describe("offline-transcription download / cache", () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    store = new Map();
    const cache = {
      async match(key) {
        return store.has(String(key)) ? store.get(String(key)) : undefined;
      },
      async put(key, res) {
        store.set(String(key), res);
      },
    };
    vi.stubGlobal("caches", {
      async open(name) {
        expect(name).toBe(CACHE_NAME);
        return cache;
      },
      async delete(name) {
        if (name === CACHE_NAME) store.clear();
        return true;
      },
    });
    // happy-dom may omit Worker / AudioContext — stub enough for engineSupported().
    vi.stubGlobal("Worker", class {});
    vi.stubGlobal("WebAssembly", globalThis.WebAssembly || {});
    vi.stubGlobal(
      "AudioContext",
      class {
        close() {}
      }
    );
    vi.stubGlobal("webkitAudioContext", undefined);
  });

  afterEach(() => {
    cancelDownload();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloadOfflineModel fetches runtime+model and stores under cache keys", async () => {
    const modelId = LANG_MODELS["en-US"].modelId;
    const modelBytes = LANG_MODELS["en-US"].modelBytes;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init = {}) => {
        if (init.method === "HEAD") {
          const len = String(url).includes("vosk.js") ? 10000 : modelBytes;
          return {
            ok: true,
            headers: { get: (n) => (n.toLowerCase() === "content-length" ? String(len) : null) },
          };
        }
        if (String(url).includes("vosk.js")) return mockResponse(new Uint8Array(10_000), { contentType: "application/javascript" });
        return mockResponse(new Uint8Array(modelBytes));
      })
    );

    const progress = [];
    const result = await downloadOfflineModel((p) => progress.push(p), "en-US");
    expect(result.model).toBe(modelId);
    expect(result.bytes).toBeGreaterThan(0);
    expect(store.has(RUNTIME_CACHE_KEY)).toBe(true);
    expect(store.has(modelCacheKey(modelId))).toBe(true);
    expect(progress.some((p) => p.phase === "done")).toBe(true);
    expect(await isOfflineModelInstalled("en-US")).toBe(true);

    const status = await getStatus("en-US");
    expect(status.installed).toBe(true);
    expect(status.enabled).toBe(true);
  });

  it("deleteOfflineModel clears cache and preference", async () => {
    store.set(RUNTIME_CACHE_KEY, mockResponse(8));
    localStorage.setItem("recorder.offlineTranscribe.v1", "on");
    await deleteOfflineModel();
    expect(store.size).toBe(0);
    expect(localStorage.getItem("recorder.offlineTranscribe.v1")).toBe("off");
  });

  it("rejects overlapping downloads", async () => {
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init = {}) => {
        if (init.method === "HEAD") {
          return { ok: true, headers: { get: () => String(LANG_MODELS["en-US"].modelBytes) } };
        }
        await gate;
        return mockResponse(LANG_MODELS["en-US"].modelBytes);
      })
    );
    const first = downloadOfflineModel(undefined, "en-US");
    // Let the first call pass engineSupported and set downloadAbort.
    await new Promise((r) => setTimeout(r, 0));
    await expect(downloadOfflineModel(undefined, "en-US")).rejects.toThrow(/already in progress/);
    release();
    await first.catch(() => {});
  });

  it("getStatus reports unsupported when Cache Storage missing", async () => {
    vi.stubGlobal("caches", undefined);
    const status = await OfflineTranscription.getStatus("en-US");
    expect(status.supported).toBe(false);
    expect(status.unsupportedReasons.join(" ")).toMatch(/Cache Storage/i);
  });
});
