import { describe, expect, it } from "vitest";
import {
  formatDuration,
  escapeHtml,
  formatTitle,
  formatLongDate,
  monthLabel,
  buildSummary,
  resamplePeaks,
  audioBufferToWav,
  writeStr,
  sliceBuffer,
  removeRange,
  micErrorMessage,
  browserProbeFailMessage,
  formatBytes,
  clamp01,
  uid,
} from "../rec-lib.js";

function fakeBuffer({ channels, sampleRate = 8000 }) {
  const length = channels[0].length;
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length,
    getChannelData(c) {
      return channels[c];
    },
  };
}

function fakeCtx() {
  return {
    createBuffer(numCh, length, sampleRate) {
      const data = Array.from({ length: numCh }, () => new Float32Array(length));
      return {
        numberOfChannels: numCh,
        length,
        sampleRate,
        getChannelData(c) {
          return data[c];
        },
      };
    },
  };
}

describe("rec-lib", () => {
  describe("formatDuration", () => {
    it("formats whole seconds", () => {
      expect(formatDuration(0)).toBe("00:00");
      expect(formatDuration(1000)).toBe("00:01");
      expect(formatDuration(61000)).toBe("01:01");
    });

    it("guards non-finite input", () => {
      expect(formatDuration(NaN)).toBe("00:00");
      expect(formatDuration(Infinity)).toBe("00:00");
      expect(formatDuration(-5)).toBe("00:00");
    });

    it("supports tenths", () => {
      expect(formatDuration(1500, true)).toBe("00:01.5");
    });
  });

  describe("escapeHtml", () => {
    it("escapes markup characters", () => {
      expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
    });
  });

  describe("date labels", () => {
    const ts = Date.UTC(2026, 6, 29, 12, 54, 0);

    it("formatTitle includes day and time", () => {
      const s = formatTitle(ts, "en-US");
      expect(s).toMatch(/Jul/);
      expect(s).toMatch(/29/);
      expect(s).toMatch(/at/);
    });

    it("formatLongDate includes weekday", () => {
      expect(formatLongDate(ts, "en-US")).toMatch(/Wednesday|Wed/);
    });

    it("monthLabel includes month and year", () => {
      expect(monthLabel(ts, "en-US")).toMatch(/July/);
      expect(monthLabel(ts, "en-US")).toMatch(/2026/);
    });
  });

  describe("buildSummary", () => {
    it("returns empty for short text", () => {
      expect(buildSummary("hi")).toEqual([]);
      expect(buildSummary("")).toEqual([]);
    });

    it("takes up to three long sentences", () => {
      const text =
        "This is a long enough first sentence for the summary. " +
        "Here comes another sentence that clears the length bar. " +
        "Third sentence also needs enough characters here. " +
        "Fourth should be dropped from the summary list.";
      const out = buildSummary(text);
      expect(out).toHaveLength(3);
      expect(out[0]).toMatch(/first sentence/);
    });

    it("falls back to a word chunk when no long sentences", () => {
      // No [.!?] breaks and each "sentence" after split is short → word-chunk path.
      const text = "short short short short short short short short short short short short short short short short short short short short short short";
      const out = buildSummary(text);
      expect(out).toHaveLength(1);
      expect(out[0].length).toBeGreaterThan(20);
    });
  });

  describe("resamplePeaks", () => {
    const peaks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it("returns empty for missing peaks", () => {
      expect(resamplePeaks(null, "crop", 0, 1)).toEqual([]);
      expect(resamplePeaks([], "crop", 0, 1)).toEqual([]);
    });

    it("crops a range", () => {
      expect(resamplePeaks(peaks, "crop", 0.2, 0.5)).toEqual([3, 4, 5]);
    });

    it("removes a range", () => {
      expect(resamplePeaks(peaks, "remove", 0.2, 0.5)).toEqual([1, 2, 6, 7, 8, 9, 10]);
    });
  });

  describe("wav + buffer edits", () => {
    it("writeStr writes ascii bytes", () => {
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      writeStr(view, 2, "RIFF");
      expect(String.fromCharCode(...new Uint8Array(buf).slice(2, 6))).toBe("RIFF");
    });

    it("audioBufferToWav produces a RIFF header", () => {
      const pcm = new Float32Array([0, 0.5, -0.5, 1]);
      const wav = audioBufferToWav(fakeBuffer({ channels: [pcm], sampleRate: 8000 }));
      const bytes = new Uint8Array(wav);
      expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
      expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
      expect(wav.byteLength).toBe(44 + pcm.length * 2);
    });

    it("sliceBuffer keeps a time window", () => {
      const src = fakeBuffer({ channels: [new Float32Array([0, 1, 2, 3, 4, 5, 6, 7])], sampleRate: 4 });
      const out = sliceBuffer(fakeCtx(), src, 0.5, 1.5);
      expect(out.length).toBe(4);
      expect([...out.getChannelData(0)]).toEqual([2, 3, 4, 5]);
    });

    it("removeRange drops a middle segment", () => {
      const src = fakeBuffer({ channels: [new Float32Array([0, 1, 2, 3, 4, 5, 6, 7])], sampleRate: 4 });
      const out = removeRange(fakeCtx(), src, 0.5, 1.5);
      expect([...out.getChannelData(0)]).toEqual([0, 1, 6, 7]);
    });
  });

  describe("error helpers", () => {
    it("maps microphone error names", () => {
      expect(micErrorMessage({ name: "NotAllowedError" })).toMatch(/blocked/i);
      expect(micErrorMessage({ name: "NotFoundError" })).toMatch(/No microphone/);
      expect(micErrorMessage({ name: "SecurityError" })).toMatch(/HTTPS/);
      expect(micErrorMessage({ name: "AbortError" })).toMatch(/interrupted/);
      expect(micErrorMessage({ message: "boom" })).toBe("Mic error: boom");
      expect(micErrorMessage({})).toMatch(/Could not start/);
    });

    it("maps browser speech probe failures", () => {
      expect(browserProbeFailMessage("unsupported")).toMatch(/Speech Recognition/);
      expect(browserProbeFailMessage("network")).toMatch(/unreachable/);
      expect(browserProbeFailMessage("timeout")).toMatch(/did not start/);
      expect(browserProbeFailMessage("weird")).toMatch(/failed the check/);
    });
  });

  describe("formatBytes / clamp01 / uid", () => {
    it("formatBytes", () => {
      expect(formatBytes(0)).toBe("—");
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(2048)).toBe("2 KB");
      expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });

    it("clamp01", () => {
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(0.4)).toBe(0.4);
      expect(clamp01(2)).toBe(1);
      expect(clamp01(NaN)).toBe(0);
    });

    it("uid is deterministic with injected clock/rng", () => {
      expect(uid(1_000, () => 0.123456)).toMatch(/^rec_/);
      expect(uid(1_000, () => 0.123456)).toBe(uid(1_000, () => 0.123456));
    });
  });
});
