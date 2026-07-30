import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecDB, __resetDbPromise } from "../db.js";

function sample(id, createdAt) {
  return {
    id,
    title: id,
    createdAt,
    durationMs: 1000,
    mimeType: "audio/webm",
    blob: new Blob(["x"]),
    peaks: [0.1],
    transcript: "",
    segments: [],
    summary: [],
    favorite: false,
    synced: false,
    syncName: "",
  };
}

async function wipeDb() {
  __resetDbPromise();
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase("recorder.db.v1");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
  __resetDbPromise();
}

describe("RecDB", () => {
  beforeEach(async () => {
    await wipeDb();
  });

  it("puts, gets, lists newest-first, and removes", async () => {
    await RecDB.put(sample("a", 100));
    await RecDB.put(sample("b", 200));
    const list = await RecDB.list();
    expect(list.map((r) => r.id)).toEqual(["b", "a"]);
    expect((await RecDB.get("a")).title).toBe("a");
    await RecDB.remove("a");
    expect(await RecDB.get("a")).toBeUndefined();
    expect((await RecDB.list()).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("RecDB.storageEstimate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back when unsupported", async () => {
    vi.stubGlobal("navigator", { ...navigator, storage: undefined });
    expect(await RecDB.storageEstimate()).toEqual({ usage: 0, quota: 0 });
  });

  it("proxies navigator.storage.estimate", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { estimate: vi.fn(async () => ({ usage: 9, quota: 99 })) },
    });
    expect(await RecDB.storageEstimate()).toEqual({ usage: 9, quota: 99 });
  });
});
