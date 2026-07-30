import { describe, expect, it } from "vitest";
import {
  isProtectedOptionalCache,
  isOptionalTranscriptionPath,
  isShellRequest,
  shellCacheName,
  TRANSCRIPTION_CACHE_PREFIX,
} from "../sw-rules.js";

describe("sw-rules", () => {
  it("protects transcription caches", () => {
    expect(isProtectedOptionalCache("recorder-transcription-v2")).toBe(true);
    expect(isProtectedOptionalCache("recorder-transcription-v1")).toBe(true);
    expect(isProtectedOptionalCache("recorder-abc1234")).toBe(false);
    expect(TRANSCRIPTION_CACHE_PREFIX).toBe("recorder-transcription-");
  });

  it("detects optional transcription paths", () => {
    expect(isOptionalTranscriptionPath("https://x.test/optional/transcription/vosk.js")).toBe(true);
    expect(isOptionalTranscriptionPath(new URL("https://x.test/app.js"))).toBe(false);
    expect(isOptionalTranscriptionPath("not a url ::")).toBe(false);
  });

  it("classifies shell requests", () => {
    expect(isShellRequest("https://x.test/app.js")).toBe(true);
    expect(isShellRequest("https://x.test/styles.css")).toBe(true);
    expect(isShellRequest("https://x.test/")).toBe(true);
    expect(isShellRequest("https://x.test/icons/icon-192.png")).toBe(true);
    expect(isShellRequest("https://x.test/optional/transcription/vosk.js")).toBe(false);
    expect(isShellRequest("https://x.test/api/other")).toBe(false);
  });

  it("builds shell cache names", () => {
    expect(shellCacheName("abc1234")).toBe("recorder-abc1234");
    expect(shellCacheName("")).toBe("recorder-dev");
  });
});
