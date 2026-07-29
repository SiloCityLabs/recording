/**
 * Optional on-device transcription via vosk-browser + small per-language models.
 * Disabled by default. Runtime/model load only after explicit Settings opt-in.
 * Large assets live under ./optional/transcription/ and Cache Storage
 * recorder-transcription-v1 — never in the app-shell precache.
 */
(() => {
  "use strict";

  const STORAGE_ENABLED = "recorder.offlineTranscribe.v1";
  const STORAGE_INSTALLED = "recorder.offlineTranscribe.installed.v1";
  const CACHE_NAME = "recorder-transcription-v1";
  const SAMPLE_RATE = 16000;
  const RUNTIME_PATH = "./optional/transcription/vosk.js";
  const MANIFEST_PATH = "./optional/transcription/manifest.json";
  const RUNTIME_FALLBACK_BYTES = 5804767;

  /**
   * Maps app transcription languages (SpeechRecognition BCP-47) to Vosk small models.
   * modelBytes are approximate hosted tar.gz sizes (refined from manifest when online).
   */
  const LANG_MODELS = {
    "en-US": {
      modelId: "vosk-model-small-en-us-0.15",
      label: "English (US)",
      modelBytes: 41206532,
    },
    "en-GB": {
      modelId: "vosk-model-small-en-gb-0.15",
      label: "English (UK)",
      modelBytes: 40800000,
    },
    "es-ES": {
      modelId: "vosk-model-small-es-0.42",
      label: "Spanish",
      modelBytes: 38000000,
    },
    "fr-FR": {
      modelId: "vosk-model-small-fr-0.22",
      label: "French",
      modelBytes: 40300000,
    },
    "de-DE": {
      modelId: "vosk-model-small-de-0.15",
      label: "German",
      modelBytes: 44500000,
    },
  };

  let installedCache = null;
  let installedLangCache = null;
  let downloadAbort = null;
  let activeTranscribe = null;
  let voskLoading = null;
  let modelHandle = null;
  let modelBlobUrl = null;
  let runtimeBlobUrl = null;
  let loadedModelId = null;
  /** @type {Record<string, number>} modelId → bytes */
  let manifestModelBytes = {};
  let manifestRuntimeBytes = RUNTIME_FALLBACK_BYTES;
  let manifestLoaded = false;

  function modelPath(modelId) {
    return `./optional/transcription/${modelId}.tar.gz`;
  }

  function langEntry(lang) {
    return LANG_MODELS[lang] || LANG_MODELS["en-US"];
  }

  function modelLabelFor(lang) {
    const e = langEntry(lang);
    return `Vosk small ${e.label}`;
  }

  function isEnabled() {
    return localStorage.getItem(STORAGE_ENABLED) === "on";
  }

  function setEnabled(on) {
    localStorage.setItem(STORAGE_ENABLED, on ? "on" : "off");
  }

  function formatBytes(n) {
    if (!Number.isFinite(n) || n <= 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function engineSupported() {
    const reasons = [];
    if (typeof Worker === "undefined") reasons.push("Web Workers unavailable");
    if (typeof WebAssembly === "undefined") reasons.push("WebAssembly unavailable");
    if (!(window.AudioContext || window.webkitAudioContext)) {
      reasons.push("Web Audio unavailable");
    }
    if (typeof caches === "undefined") reasons.push("Cache Storage unavailable");
    return { ok: reasons.length === 0, reasons };
  }

  function assetUrlsForLang(lang) {
    const e = langEntry(lang);
    return [RUNTIME_PATH, modelPath(e.modelId)];
  }

  async function cacheOpen() {
    return caches.open(CACHE_NAME);
  }

  async function readInstalledMeta() {
    try {
      const raw = localStorage.getItem(STORAGE_INSTALLED);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeInstalledMeta(meta) {
    if (!meta) localStorage.removeItem(STORAGE_INSTALLED);
    else localStorage.setItem(STORAGE_INSTALLED, JSON.stringify(meta));
  }

  function modelBytesFor(lang) {
    const e = langEntry(lang);
    return manifestModelBytes[e.modelId] || e.modelBytes;
  }

  function runtimeBytes() {
    return manifestRuntimeBytes || RUNTIME_FALLBACK_BYTES;
  }

  function approximateDownloadBytes(lang) {
    return runtimeBytes() + modelBytesFor(lang);
  }

  async function refreshKnownBytes() {
    try {
      const res = await fetch(MANIFEST_PATH, { cache: "no-cache" });
      if (!res.ok) return;
      const man = await res.json();
      if (man?.runtimeBytes) manifestRuntimeBytes = man.runtimeBytes;
      if (man?.models && typeof man.models === "object") {
        for (const [id, info] of Object.entries(man.models)) {
          if (info?.bytes) manifestModelBytes[id] = info.bytes;
        }
      }
      // Legacy v1 manifest: single model file list
      if (!man?.models && Array.isArray(man?.files)) {
        for (const f of man.files) {
          if (f.path?.endsWith("vosk.js") && f.bytes) manifestRuntimeBytes = f.bytes;
          else if (f.path?.includes("vosk-model-") && f.bytes) {
            const id = f.path.split("/").pop().replace(/\.tar\.gz$/, "");
            manifestModelBytes[id] = f.bytes;
          }
        }
      }
      manifestLoaded = true;
    } catch {
      /* keep fallbacks */
    }
  }

  async function measureCachedSize(lang) {
    const cache = await cacheOpen();
    let total = 0;
    const parts = {};
    for (const u of assetUrlsForLang(lang)) {
      const res = await cache.match(u);
      if (!res) continue;
      const buf = await res.clone().arrayBuffer();
      parts[u] = buf.byteLength;
      total += buf.byteLength;
    }
    return { total, parts };
  }

  async function isOfflineModelInstalled(lang) {
    const support = engineSupported();
    if (!support.ok) {
      installedCache = false;
      installedLangCache = null;
      return false;
    }
    const target = langEntry(lang);
    try {
      const cache = await cacheOpen();
      for (const u of assetUrlsForLang(lang)) {
        const hit = await cache.match(u);
        if (!hit || !hit.ok) {
          installedCache = false;
          installedLangCache = null;
          return false;
        }
      }
      const meta = await readInstalledMeta();
      if (!meta || meta.cache !== CACHE_NAME || meta.model !== target.modelId) {
        const sizes = await measureCachedSize(lang);
        writeInstalledMeta({
          cache: CACHE_NAME,
          model: target.modelId,
          lang,
          runtime: "vosk-browser@0.0.8",
          bytes: sizes.total,
          at: Date.now(),
        });
      }
      installedCache = true;
      installedLangCache = lang;
      return true;
    } catch {
      installedCache = false;
      installedLangCache = null;
      return false;
    }
  }

  function isInstalledCached(lang) {
    if (lang) return installedCache === true && installedLangCache === lang;
    return installedCache === true;
  }

  async function fetchWithProgress(url, onProgress, signal) {
    const res = await fetch(url, { signal, cache: "no-cache" });
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
    const totalHeader = Number(res.headers.get("content-length")) || 0;
    if (!res.body || !res.body.getReader) {
      const buf = await res.arrayBuffer();
      onProgress?.(buf.byteLength, totalHeader || buf.byteLength);
      return new Response(buf, {
        status: 200,
        headers: { "Content-Type": res.headers.get("Content-Type") || "application/octet-stream" },
      });
    }
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.(received, totalHeader);
    }
    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return new Response(merged.buffer, {
      status: 200,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/octet-stream" },
    });
  }

  async function downloadOfflineModel(onProgress, lang) {
    const support = engineSupported();
    if (!support.ok) {
      throw new Error(`Offline transcription unsupported: ${support.reasons.join("; ")}`);
    }
    if (downloadAbort) {
      throw new Error("A download is already in progress");
    }
    const target = langEntry(lang);
    downloadAbort = new AbortController();
    const { signal } = downloadAbort;

    try {
      await refreshKnownBytes();
      await deleteOfflineModelFilesOnly();

      const cache = await cacheOpen();
      const files = [
        { url: RUNTIME_PATH, weight: runtimeBytes() },
        { url: modelPath(target.modelId), weight: modelBytesFor(lang) },
      ];
      const weightSum = files.reduce((s, f) => s + f.weight, 0) || 1;
      let completedWeight = 0;

      for (const file of files) {
        const res = await fetchWithProgress(
          file.url,
          (received, total) => {
            const fileTotal = total || file.weight;
            const frac = fileTotal ? Math.min(1, received / fileTotal) : 0;
            const overall = (completedWeight + frac * file.weight) / weightSum;
            onProgress?.({
              phase: "download",
              url: file.url,
              received,
              total: fileTotal,
              overall,
            });
          },
          signal
        );
        const buf = await res.arrayBuffer();
        if (!buf.byteLength) throw new Error(`Empty download: ${file.url}`);
        if (file.weight > 1024 * 1024 && buf.byteLength < file.weight * 0.85) {
          throw new Error(`Incomplete download for ${file.url}`);
        }
        await cache.put(
          file.url,
          new Response(buf, {
            status: 200,
            headers: {
              "Content-Type":
                file.url.endsWith(".js") ? "application/javascript" : "application/gzip",
              "Content-Length": String(buf.byteLength),
            },
          })
        );
        completedWeight += file.weight;
      }

      for (const u of assetUrlsForLang(lang)) {
        const hit = await cache.match(u);
        if (!hit) throw new Error(`Cache missing ${u} after download`);
      }

      const sizes = await measureCachedSize(lang);
      writeInstalledMeta({
        cache: CACHE_NAME,
        model: target.modelId,
        lang,
        runtime: "vosk-browser@0.0.8",
        bytes: sizes.total,
        at: Date.now(),
      });
      installedCache = true;
      installedLangCache = lang;
      setEnabled(true);
      onProgress?.({ phase: "done", overall: 1, storedBytes: sizes.total });
      return { bytes: sizes.total, model: target.modelId, lang };
    } catch (err) {
      await deleteOfflineModelFilesOnly().catch(() => {});
      installedCache = false;
      installedLangCache = null;
      writeInstalledMeta(null);
      throw err;
    } finally {
      downloadAbort = null;
    }
  }

  function cancelDownload() {
    downloadAbort?.abort();
    downloadAbort = null;
  }

  async function deleteOfflineModelFilesOnly() {
    releaseTranscriber();
    if (typeof caches === "undefined") return;
    await caches.delete(CACHE_NAME);
  }

  async function deleteOfflineModel() {
    cancelDownload();
    await deleteOfflineModelFilesOnly();
    writeInstalledMeta(null);
    installedCache = false;
    installedLangCache = null;
    setEnabled(false);
  }

  /**
   * True when a model is installed but it does not match `lang` (switching would replace it).
   */
  async function installedConflictsWith(lang) {
    const meta = await readInstalledMeta();
    if (!meta?.model) return false;
    const support = engineSupported();
    if (!support.ok) return false;
    try {
      const cache = await cacheOpen();
      const runtimeHit = await cache.match(RUNTIME_PATH);
      const modelHit = await cache.match(modelPath(meta.model));
      if (!runtimeHit || !modelHit) return false;
      return meta.model !== langEntry(lang).modelId;
    } catch {
      return false;
    }
  }

  async function getInstalledInfo() {
    const meta = await readInstalledMeta();
    if (!meta?.model) return null;
    try {
      const cache = await cacheOpen();
      if (!(await cache.match(RUNTIME_PATH)) || !(await cache.match(modelPath(meta.model)))) {
        return null;
      }
    } catch {
      return null;
    }
    const lang =
      meta.lang ||
      Object.keys(LANG_MODELS).find((k) => LANG_MODELS[k].modelId === meta.model) ||
      "en-US";
    return {
      lang,
      modelId: meta.model,
      label: langEntry(lang).label,
      modelLabel: modelLabelFor(lang),
      bytes: meta.bytes || 0,
    };
  }

  function loadScriptFromUrl(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load vosk runtime"));
      document.head.appendChild(s);
    });
  }

  async function ensureVoskLoaded() {
    if (window.Vosk?.createModel) return window.Vosk;
    if (voskLoading) return voskLoading;
    voskLoading = (async () => {
      const cache = await cacheOpen();
      const res = await cache.match(RUNTIME_PATH);
      if (!res) throw new Error("Offline runtime not installed");
      const blob = await res.blob();
      if (runtimeBlobUrl) URL.revokeObjectURL(runtimeBlobUrl);
      runtimeBlobUrl = URL.createObjectURL(blob);
      await loadScriptFromUrl(runtimeBlobUrl);
      if (!window.Vosk?.createModel) throw new Error("Vosk global missing after load");
      return window.Vosk;
    })();
    try {
      return await voskLoading;
    } catch (e) {
      voskLoading = null;
      throw e;
    }
  }

  async function loadOfflineTranscriber(lang) {
    const target = langEntry(lang);
    if (modelHandle && loadedModelId === target.modelId) return modelHandle;
    if (modelHandle) releaseTranscriber();

    const Vosk = await ensureVoskLoaded();
    const cache = await cacheOpen();
    const res = await cache.match(modelPath(target.modelId));
    if (!res) throw new Error("Offline model not installed for this language");
    const blob = await res.blob();
    if (modelBlobUrl) URL.revokeObjectURL(modelBlobUrl);
    modelBlobUrl = URL.createObjectURL(blob);

    modelHandle = await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err instanceof Error ? err : new Error(String(err || "Model load failed")));
      };
      Vosk.createModel(modelBlobUrl)
        .then((model) => {
          if (settled) return;
          settled = true;
          loadedModelId = target.modelId;
          resolve(model);
        })
        .catch(fail);
      setTimeout(() => {
        if (!settled) fail(new Error("Timed out loading offline model"));
      }, 180000);
    });
    return modelHandle;
  }

  function releaseTranscriber() {
    try {
      modelHandle?.terminate?.();
    } catch {
      /* ignore */
    }
    modelHandle = null;
    loadedModelId = null;
    if (modelBlobUrl) {
      URL.revokeObjectURL(modelBlobUrl);
      modelBlobUrl = null;
    }
  }

  async function decodeToMono16k(blob) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    try {
      const ab = await blob.arrayBuffer();
      let audioBuf;
      try {
        audioBuf = await ctx.decodeAudioData(ab.slice(0));
      } catch (err) {
        const e = new Error("This browser cannot decode this recording for offline transcription");
        e.cause = err;
        e.code = "DECODE_UNSUPPORTED";
        throw e;
      }
      const mono = mixToMono(audioBuf);
      if (audioBuf.sampleRate === SAMPLE_RATE) return mono;
      // High-quality resample via OfflineAudioContext when available.
      try {
        const frames = Math.max(1, Math.ceil(mono.length * (SAMPLE_RATE / audioBuf.sampleRate)));
        const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
        const srcBuf = offline.createBuffer(1, mono.length, audioBuf.sampleRate);
        srcBuf.copyToChannel(mono, 0);
        const src = offline.createBufferSource();
        src.buffer = srcBuf;
        src.connect(offline.destination);
        src.start(0);
        const rendered = await offline.startRendering();
        return rendered.getChannelData(0).slice();
      } catch {
        return resampleLinear(mono, audioBuf.sampleRate, SAMPLE_RATE);
      }
    } finally {
      try {
        await ctx.close();
      } catch {
        /* ignore */
      }
    }
  }

  function mixToMono(audioBuf) {
    const { numberOfChannels, length } = audioBuf;
    if (numberOfChannels === 1) return audioBuf.getChannelData(0).slice();
    const out = new Float32Array(length);
    for (let c = 0; c < numberOfChannels; c++) {
      const ch = audioBuf.getChannelData(c);
      for (let i = 0; i < length; i++) out[i] += ch[i];
    }
    const inv = 1 / numberOfChannels;
    for (let i = 0; i < length; i++) out[i] *= inv;
    return out;
  }

  function resampleLinear(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const newLen = Math.max(1, Math.round(input.length / ratio));
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const t = src - i0;
      out[i] = input[i0] * (1 - t) + input[i1] * t;
    }
    return out;
  }

  function yieldToUi(ms = 0) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Local transcripts often lack reliable word timings. Single segment at t:0
   * unless word timestamps are present (coarse ~8s chunks — approximate).
   */
  function segmentsFromResult(resultObj) {
    const text = (resultObj?.text || "").trim();
    const words = Array.isArray(resultObj?.result) ? resultObj.result : [];
    if (words.length && words.every((w) => typeof w.start === "number")) {
      const chunks = [];
      let buf = [];
      let startT = words[0].start;
      for (const w of words) {
        buf.push(w.word);
        const span = w.end - startT;
        if (span >= 8 || buf.length >= 24) {
          chunks.push({ t: Math.round(startT * 1000), text: buf.join(" "), speaker: 1 });
          buf = [];
          startT = w.end;
        }
      }
      if (buf.length) {
        chunks.push({ t: Math.round(startT * 1000), text: buf.join(" "), speaker: 1 });
      }
      if (chunks.length) return { text: text || chunks.map((c) => c.text).join(" "), segments: chunks };
    }
    if (!text) return { text: "", segments: [] };
    return { text, segments: [{ t: 0, text, speaker: 1 }] };
  }

  async function transcribeAudioBlob(blob, options = {}) {
    if (activeTranscribe) {
      throw new Error("Transcription already running");
    }
    const lang = options.lang || "en-US";
    const signal = options.signal;
    const onProgress = options.onProgress;

    let cancelled = false;
    const onAbort = () => {
      cancelled = true;
    };
    signal?.addEventListener("abort", onAbort);

    const job = (async () => {
      onProgress?.({ phase: "decode", overall: 0.05 });
      const pcm = await decodeToMono16k(blob);
      if (cancelled) throw new DOMException("Aborted", "AbortError");
      if (!pcm.length) {
        return { text: "", segments: [], engine: "vosk-offline", model: langEntry(lang).modelId, lang };
      }

      onProgress?.({ phase: "load", overall: 0.15 });
      const model = await loadOfflineTranscriber(lang);
      if (cancelled) throw new DOMException("Aborted", "AbortError");

      const recognizer = new model.KaldiRecognizer(SAMPLE_RATE);
      try {
        recognizer.setWords(true);
      } catch {
        /* optional */
      }

      const texts = [];
      const wordHits = [];
      let lastPartial = "";
      let progressFrac = 0;

      const pushResult = (msg) => {
        const t = msg?.result?.text?.trim();
        if (t) texts.push(t);
        const words = msg?.result?.result;
        if (Array.isArray(words)) wordHits.push(...words);
      };

      recognizer.on("result", pushResult);
      recognizer.on("partialresult", (msg) => {
        lastPartial = msg?.result?.partial || "";
        onProgress?.({
          phase: "recognize",
          overall: Math.min(0.95, 0.2 + progressFrac * 0.7),
          partial: lastPartial,
        });
      });

      // ~0.5s chunks with a short pause so the Vosk worker can process each
      // message before retrieveFinalResult — flooding setTimeout(0) yielded empty transcripts.
      const chunk = Math.floor(SAMPLE_RATE / 2);
      for (let i = 0; i < pcm.length; i += chunk) {
        if (cancelled) throw new DOMException("Aborted", "AbortError");
        const slice = pcm.subarray(i, Math.min(i + chunk, pcm.length));
        recognizer.acceptWaveformFloat(new Float32Array(slice), SAMPLE_RATE);
        progressFrac = i / Math.max(1, pcm.length);
        onProgress?.({
          phase: "recognize",
          overall: 0.2 + progressFrac * 0.7,
          partial: lastPartial,
        });
        await yieldToUi(25);
      }

      await new Promise((res) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(safety);
          res();
        };
        const safety = setTimeout(finish, 5000);
        recognizer.on("result", finish);
        try {
          recognizer.retrieveFinalResult();
        } catch {
          finish();
        }
      });
      // Let any trailing result listener updates land.
      await yieldToUi(50);

      try {
        recognizer.remove();
      } catch {
        /* ignore */
      }

      let joined = texts.join(" ").replace(/\s+/g, " ").trim();
      if (!joined && lastPartial.trim()) joined = lastPartial.trim();
      const { text, segments } = segmentsFromResult({
        text: joined,
        result: wordHits,
      });
      onProgress?.({ phase: "done", overall: 1 });
      return {
        text,
        segments,
        engine: "vosk-offline",
        model: langEntry(lang).modelId,
        lang,
      };
    })();

    activeTranscribe = job;
    try {
      return await job;
    } finally {
      if (activeTranscribe === job) activeTranscribe = null;
      signal?.removeEventListener("abort", onAbort);
      releaseTranscriber();
    }
  }

  function isTranscribing() {
    return !!activeTranscribe;
  }

  async function getStatus(lang) {
    const support = engineSupported();
    await refreshKnownBytes();
    const useLang = lang || "en-US";
    const installed = support.ok ? await isOfflineModelInstalled(useLang) : false;
    const meta = await readInstalledMeta();
    const installedInfo = await getInstalledInfo();
    let storedBytes = meta?.bytes || 0;
    if (installed && !storedBytes) {
      try {
        storedBytes = (await measureCachedSize(useLang)).total;
      } catch {
        storedBytes = 0;
      }
    }
    const entry = langEntry(useLang);
    return {
      supported: support.ok,
      unsupportedReasons: support.reasons,
      enabled: isEnabled(),
      installed,
      downloading: !!downloadAbort,
      lang: useLang,
      langLabel: entry.label,
      modelId: entry.modelId,
      modelLabel: modelLabelFor(useLang),
      downloadBytes: approximateDownloadBytes(useLang),
      modelBytes: modelBytesFor(useLang),
      runtimeBytes: runtimeBytes(),
      storedBytes,
      installedInfo,
      conflicts: installedInfo ? installedInfo.modelId !== entry.modelId : false,
      cacheName: CACHE_NAME,
      formatBytes,
      languages: Object.keys(LANG_MODELS).map((id) => ({
        id,
        label: LANG_MODELS[id].label,
        modelId: LANG_MODELS[id].modelId,
        downloadBytes: approximateDownloadBytes(id),
      })),
    };
  }

  window.OfflineTranscription = {
    STORAGE_ENABLED,
    CACHE_NAME,
    LANG_MODELS,
    isEnabled,
    setEnabled,
    engineSupported,
    isOfflineModelInstalled,
    isInstalledCached,
    downloadOfflineModel,
    cancelDownload,
    deleteOfflineModel,
    loadOfflineTranscriber,
    releaseTranscriber,
    transcribeAudioBlob,
    isTranscribing,
    getStatus,
    refreshKnownBytes,
    approximateDownloadBytes,
    modelBytesFor,
    formatBytes,
    modelLabelFor,
    langEntry,
    installedConflictsWith,
    getInstalledInfo,
    SAMPLE_RATE,
  };
})();
