(() => {
  "use strict";

  /**
   * Optional Nextcloud WebDAV sync.
   * Uses an app password — never ship credentials in the repo.
   * Settings stored in localStorage under recorder.nextcloud.v1
   */
  const STORAGE = "recorder.nextcloud.v1";

  function loadConfig() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (!raw || typeof raw !== "object") return defaultConfig();
      return { ...defaultConfig(), ...raw };
    } catch {
      return defaultConfig();
    }
  }

  function defaultConfig() {
    return {
      enabled: false,
      url: "", // e.g. https://cloud.example.com
      username: "",
      appPassword: "",
      folder: "/Recorder",
    };
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE, JSON.stringify(cfg));
  }

  function davBase(cfg) {
    const root = String(cfg.url || "").replace(/\/+$/, "");
    if (!root) throw new Error("Nextcloud URL required");
    const user = encodeURIComponent(cfg.username);
    const folder = String(cfg.folder || "/Recorder")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${root}/remote.php/dav/files/${user}/${folder}`;
  }

  function authHeader(cfg) {
    const token = btoa(`${cfg.username}:${cfg.appPassword}`);
    return `Basic ${token}`;
  }

  async function ensureFolder(cfg) {
    const base = davBase(cfg);
    const res = await fetch(base, {
      method: "MKCOL",
      headers: { Authorization: authHeader(cfg) },
    });
    // 201 created, 405 already exists
    if (![201, 405, 301, 200].includes(res.status)) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Nextcloud auth failed — check user + app password");
      }
      // Some servers return 409 for missing parent; surface status
      if (res.status !== 409) {
        throw new Error(`Could not create folder (${res.status})`);
      }
    }
  }

  async function upload(cfg, filename, blob, contentType) {
    await ensureFolder(cfg);
    const url = `${davBase(cfg)}/${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": contentType || blob.type || "application/octet-stream",
      },
      body: blob,
    });
    if (!res.ok && res.status !== 201 && res.status !== 204) {
      throw new Error(`Upload failed (${res.status})`);
    }
    return url;
  }

  async function remove(cfg, filename) {
    const url = `${davBase(cfg)}/${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader(cfg) },
    });
    if (![200, 204, 404].includes(res.status)) {
      throw new Error(`Delete failed (${res.status})`);
    }
  }

  async function test(cfg) {
    await ensureFolder(cfg);
    return true;
  }

  window.Nextcloud = {
    STORAGE,
    loadConfig,
    saveConfig,
    defaultConfig,
    ensureFolder,
    upload,
    remove,
    test,
  };
})();
