// @vitest-environment node
import { describe, expect, it } from "vitest";
import { voskEndpointUrls, LANG_MODELS } from "../offline-transcription.js";

/**
 * Live HEAD checks against free CDNs — no body download.
 * Uses Node's fetch (not happy-dom) so CORS does not block header inspection.
 */
describe("Vosk CDN endpoints (HEAD only)", () => {
  it("runtime and each model respond OK with content-length and CORS", async () => {
    const urls = voskEndpointUrls();
    expect(urls.length).toBeGreaterThan(1);

    for (const url of urls) {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: { Origin: "https://recording.silocitylabs.com" },
      });
      expect(res.ok, `${url} status ${res.status}`).toBe(true);

      const len = Number(res.headers.get("content-length"));
      expect(len, `${url} content-length`).toBeGreaterThan(1024);

      const acao = res.headers.get("access-control-allow-origin");
      expect(acao === "*" || acao === "https://recording.silocitylabs.com", `${url} CORS ${acao}`).toBe(
        true
      );
    }
  }, 60_000);

  it("covers every LANG_MODELS entry", () => {
    const urls = voskEndpointUrls();
    for (const entry of Object.values(LANG_MODELS)) {
      expect(urls.some((u) => u.endsWith(`${entry.modelId}.tar.gz`))).toBe(true);
    }
  });
});
