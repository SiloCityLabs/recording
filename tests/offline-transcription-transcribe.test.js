import { afterEach, describe, expect, it, vi } from "vitest";
import {
  transcribeAudioBlob,
  isTranscribing,
  CACHE_NAME,
  modelCacheKey,
  LANG_MODELS,
} from "../offline-transcription.js";

describe("transcribeAudioBlob (mocked Vosk)", () => {
  afterEach(() => {
    delete window.Vosk;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("runs decode → recognize → final text", async () => {
    const pcm = new Float32Array(16000);
    class FakeAudioCtx {
      async decodeAudioData() {
        return {
          numberOfChannels: 1,
          length: pcm.length,
          sampleRate: 16000,
          getChannelData() {
            return pcm;
          },
        };
      }
      async close() {}
    }
    vi.stubGlobal("AudioContext", FakeAudioCtx);
    vi.stubGlobal("Worker", class {});
    vi.stubGlobal("WebAssembly", {});

    // Skip script injection — ensureVoskLoaded short-circuits when Vosk exists.
    window.Vosk = {
      async createModel() {
        return {
          KaldiRecognizer: class {
            constructor() {
              this._handlers = {};
            }
            on(evt, fn) {
              (this._handlers[evt] ||= []).push(fn);
            }
            setWords() {}
            acceptWaveformFloat() {}
            retrieveFinalResult() {
              for (const fn of this._handlers.result || []) {
                fn({ result: { text: "hello world", result: [] } });
              }
            }
            remove() {}
          },
          terminate() {},
        };
      },
    };

    const modelId = LANG_MODELS["en-US"].modelId;
    const store = new Map();
    store.set(modelCacheKey(modelId), {
      async blob() {
        return new Blob([new Uint8Array(8)]);
      },
    });
    vi.stubGlobal("caches", {
      async open(name) {
        expect(name).toBe(CACHE_NAME);
        return {
          async match(key) {
            return store.get(String(key));
          },
        };
      },
    });

    const phases = [];
    expect(isTranscribing()).toBe(false);
    const result = await transcribeAudioBlob(new Blob(["x"]), {
      lang: "en-US",
      onProgress: (p) => phases.push(p.phase),
    });
    expect(result.text).toBe("hello world");
    expect(result.engine).toBe("vosk-offline");
    expect(phases).toContain("decode");
    expect(phases).toContain("load");
    expect(phases).toContain("done");
    expect(isTranscribing()).toBe(false);
  });
});
