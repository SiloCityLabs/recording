import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE,
  defaultConfig,
  loadConfig,
  saveConfig,
  davBase,
  authHeader,
  ensureFolder,
  upload,
  remove,
  test as ncTest,
  Nextcloud,
} from "../nextcloud.js";

describe("Nextcloud", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes a window-compatible API object", () => {
    expect(Nextcloud.STORAGE).toBe(STORAGE);
    expect(Nextcloud.defaultConfig()).toMatchObject({ enabled: false, folder: "/Recorder" });
  });

  it("loadConfig returns defaults for missing/invalid JSON", () => {
    expect(loadConfig()).toEqual(defaultConfig());
    localStorage.setItem(STORAGE, "{not-json");
    expect(loadConfig()).toEqual(defaultConfig());
  });

  it("saveConfig round-trips", () => {
    const cfg = { ...defaultConfig(), url: "https://cloud.example", username: "u" };
    saveConfig(cfg);
    expect(loadConfig()).toMatchObject({ url: "https://cloud.example", username: "u" });
  });

  it("davBase builds WebDAV paths and encodes segments", () => {
    expect(
      davBase({
        url: "https://cloud.example/",
        username: "a b",
        folder: "/Recorder/Deep",
      })
    ).toBe("https://cloud.example/remote.php/dav/files/a%20b/Recorder/Deep");
  });

  it("davBase requires a URL", () => {
    expect(() => davBase({ url: "", username: "u" })).toThrow(/URL required/);
  });

  it("authHeader is basic auth", () => {
    const h = authHeader({ username: "u", appPassword: "p" });
    expect(h).toBe(`Basic ${btoa("u:p")}`);
  });

  it("ensureFolder accepts created/exists statuses", async () => {
    for (const status of [201, 405, 301, 200]) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ status })));
      await expect(
        ensureFolder({ url: "https://c", username: "u", appPassword: "p", folder: "/R" })
      ).resolves.toBeUndefined();
    }
  });

  it("ensureFolder maps auth failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 401 })));
    await expect(
      ensureFolder({ url: "https://c", username: "u", appPassword: "p", folder: "/R" })
    ).rejects.toThrow(/auth failed/);
  });

  it("ensureFolder surfaces unexpected status (except 409)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 500 })));
    await expect(
      ensureFolder({ url: "https://c", username: "u", appPassword: "p", folder: "/R" })
    ).rejects.toThrow(/Could not create folder/);

    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 409 })));
    await expect(
      ensureFolder({ url: "https://c", username: "u", appPassword: "p", folder: "/R" })
    ).resolves.toBeUndefined();
  });

  it("upload MKCOLs then PUTs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 201 })
      .mockResolvedValueOnce({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    const cfg = { url: "https://c", username: "u", appPassword: "p", folder: "/R" };
    const url = await upload(cfg, "a.webm", new Blob(["x"]), "audio/webm");
    expect(url).toContain("/a.webm");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });

  it("upload fails on bad PUT", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ status: 201 }).mockResolvedValueOnce({ ok: false, status: 500 })
    );
    await expect(
      upload(
        { url: "https://c", username: "u", appPassword: "p", folder: "/R" },
        "a.webm",
        new Blob(["x"])
      )
    ).rejects.toThrow(/Upload failed/);
  });

  it("remove accepts 200/204/404", async () => {
    for (const status of [200, 204, 404]) {
      vi.stubGlobal("fetch", vi.fn(async () => ({ status })));
      await expect(
        remove({ url: "https://c", username: "u", appPassword: "p", folder: "/R" }, "a.webm")
      ).resolves.toBeUndefined();
    }
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 500 })));
    await expect(
      remove({ url: "https://c", username: "u", appPassword: "p", folder: "/R" }, "a.webm")
    ).rejects.toThrow(/Delete failed/);
  });

  it("test() probes folder creation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 201 })));
    await expect(
      ncTest({ url: "https://c", username: "u", appPassword: "p", folder: "/R" })
    ).resolves.toBe(true);
  });
});
