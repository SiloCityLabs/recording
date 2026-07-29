(() => {
  "use strict";

  const STORAGE_THEME = "recorder.theme.v1";
  const STORAGE_WAKE = "recorder.wake.v1";
  const STORAGE_BLACKOUT = "recorder.blackout.v1";
  const STORAGE_PIN = "recorder.pin.v1";
  const STORAGE_TRANSCRIBE = "recorder.transcribe.v1";
  const STORAGE_LANG = "recorder.lang.v1";
  const THEME_ORDER = ["system", "light", "dark"];
  const SPEEDS = [1, 1.5, 2, 0.75];
  const LANGS = [
    { id: "en-US", label: "English (US)" },
    { id: "en-GB", label: "English (UK)" },
    { id: "es-ES", label: "Spanish" },
    { id: "fr-FR", label: "French" },
    { id: "de-DE", label: "German" },
  ];

  const el = {
    app: document.getElementById("app"),
    views: {
      home: document.getElementById("viewHome"),
      search: document.getElementById("viewSearch"),
      recording: document.getElementById("viewRecording"),
      detail: document.getElementById("viewDetail"),
      edit: document.getElementById("viewEdit"),
      settings: document.getElementById("viewSettings"),
    },
    recordingList: document.getElementById("recordingList"),
    homeEmpty: document.getElementById("homeEmpty"),
    recordFab: document.getElementById("recordFab"),
    searchOpenBtn: document.getElementById("searchOpenBtn"),
    searchBackBtn: document.getElementById("searchBackBtn"),
    searchInput: document.getElementById("searchInput"),
    searchClearBtn: document.getElementById("searchClearBtn"),
    searchResults: document.getElementById("searchResults"),
    profileBtn: document.getElementById("profileBtn"),
    profileSheet: document.getElementById("profileSheet"),
    profileCloseBtn: document.getElementById("profileCloseBtn"),
    syncBadge: document.getElementById("syncBadge"),
    avatarLetter: document.getElementById("avatarLetter"),
    sheetAvatar: document.getElementById("sheetAvatar"),
    sheetHello: document.getElementById("sheetHello"),
    manageNcBtn: document.getElementById("manageNcBtn"),
    storageFill: document.getElementById("storageFill"),
    storageMeta: document.getElementById("storageMeta"),
    storageLabel: document.getElementById("storageLabel"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    openSettingsBtn: document.getElementById("openSettingsBtn"),
    installBtn: document.getElementById("installBtn"),
    recTitle: document.getElementById("recTitle"),
    recBlackoutBtn: document.getElementById("recBlackoutBtn"),
    recDiscardBtn: document.getElementById("recDiscardBtn"),
    recMenuBtn: document.getElementById("recMenuBtn"),
    liveWaveform: document.getElementById("liveWaveform"),
    liveTranscript: document.getElementById("liveTranscript"),
    langPill: document.getElementById("langPill"),
    recDot: document.getElementById("recDot"),
    recTimer: document.getElementById("recTimer"),
    pauseBtn: document.getElementById("pauseBtn"),
    stopBtn: document.getElementById("stopBtn"),
    detailBackBtn: document.getElementById("detailBackBtn"),
    detailTitle: document.getElementById("detailTitle"),
    favoriteBtn: document.getElementById("favoriteBtn"),
    detailMenuBtn: document.getElementById("detailMenuBtn"),
    summaryCard: document.getElementById("summaryCard"),
    summaryToggle: document.getElementById("summaryToggle"),
    summaryList: document.getElementById("summaryList"),
    detailWaveform: document.getElementById("detailWaveform"),
    detailTranscript: document.getElementById("detailTranscript"),
    seekBar: document.getElementById("seekBar"),
    playTime: document.getElementById("playTime"),
    remainTime: document.getElementById("remainTime"),
    playBtn: document.getElementById("playBtn"),
    playBtnLabel: document.getElementById("playBtnLabel"),
    rewindBtn: document.getElementById("rewindBtn"),
    forwardBtn: document.getElementById("forwardBtn"),
    detailMenu: document.getElementById("detailMenu"),
    menuRecTitle: document.getElementById("menuRecTitle"),
    menuMetaTime: document.getElementById("menuMetaTime"),
    menuMetaSync: document.getElementById("menuMetaSync"),
    renameBtn: document.getElementById("renameBtn"),
    speedBtn: document.getElementById("speedBtn"),
    editCloseBtn: document.getElementById("editCloseBtn"),
    editUndoBtn: document.getElementById("editUndoBtn"),
    editSaveBtn: document.getElementById("editSaveBtn"),
    editWaveform: document.getElementById("editWaveform"),
    editSelection: document.getElementById("editSelection"),
    cropKeepBtn: document.getElementById("cropKeepBtn"),
    cropRemoveBtn: document.getElementById("cropRemoveBtn"),
    editSeekBar: document.getElementById("editSeekBar"),
    editPlayTime: document.getElementById("editPlayTime"),
    editRemainTime: document.getElementById("editRemainTime"),
    editPlayBtn: document.getElementById("editPlayBtn"),
    editRewindBtn: document.getElementById("editRewindBtn"),
    editForwardBtn: document.getElementById("editForwardBtn"),
    settingsBackBtn: document.getElementById("settingsBackBtn"),
    ncStatus: document.getElementById("ncStatus"),
    themeSettingLabel: document.getElementById("themeSettingLabel"),
    wakeLockToggle: document.getElementById("wakeLockToggle"),
    blackoutToggle: document.getElementById("blackoutToggle"),
    pinStatus: document.getElementById("pinStatus"),
    langSettingLabel: document.getElementById("langSettingLabel"),
    autoTranscribeToggle: document.getElementById("autoTranscribeToggle"),
    ncModal: document.getElementById("ncModal"),
    ncUrl: document.getElementById("ncUrl"),
    ncUser: document.getElementById("ncUser"),
    ncPass: document.getElementById("ncPass"),
    ncFolder: document.getElementById("ncFolder"),
    ncEnabled: document.getElementById("ncEnabled"),
    ncTestBtn: document.getElementById("ncTestBtn"),
    ncCancelBtn: document.getElementById("ncCancelBtn"),
    ncSaveBtn: document.getElementById("ncSaveBtn"),
    pinModal: document.getElementById("pinModal"),
    pinModalTitle: document.getElementById("pinModalTitle"),
    pinModalSub: document.getElementById("pinModalSub"),
    pinDots: document.getElementById("pinDots"),
    pinPad: document.getElementById("pinPad"),
    pinCancelBtn: document.getElementById("pinCancelBtn"),
    pinClearBtn: document.getElementById("pinClearBtn"),
    blackout: document.getElementById("blackout"),
    blackoutHint: document.getElementById("blackoutHint"),
    toast: document.getElementById("toast"),
    audio: document.getElementById("audioEl"),
    themeColor: document.getElementById("themeColor"),
  };

  const state = {
    view: "home",
    recordings: [],
    currentId: null,
    theme: loadTheme(),
    wakeLockPref: localStorage.getItem(STORAGE_WAKE) !== "off",
    blackoutPref: localStorage.getItem(STORAGE_BLACKOUT) === "on",
    pin: localStorage.getItem(STORAGE_PIN) || "",
    autoTranscribe: localStorage.getItem(STORAGE_TRANSCRIBE) !== "off",
    lang: localStorage.getItem(STORAGE_LANG) || "en-US",
    nc: Nextcloud.loadConfig(),
    deferredPrompt: null,
    speedIndex: 0,
    recView: "wave",
    detailView: "wave",
    // recording session
    mediaStream: null,
    mediaRecorder: null,
    audioCtx: null,
    analyser: null,
    chunks: [],
    peaks: [],
    startedAt: 0,
    elapsedMs: 0,
    timerBase: 0,
    recording: false,
    paused: false,
    wakeLock: null,
    recognition: null,
    transcriptFinal: "",
    transcriptInterim: "",
    transcriptSegments: [],
    raf: 0,
    // playback
    objectUrl: null,
    seeking: false,
    // edit
    editStart: 0.15,
    editEnd: 0.55,
    editHistory: [],
    // pin UI
    pinMode: "setup", // setup | confirm | unlock
    pinBuffer: "",
    pinConfirm: "",
    unlockResolver: null,
  };

  function loadTheme() {
    const t = localStorage.getItem(STORAGE_THEME);
    return THEME_ORDER.includes(t) ? t : "system";
  }

  function uid() {
    return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.toast.hidden = true;
    }, 1800);
  }

  function formatDuration(ms, withTenths = false) {
    const total = Math.max(0, ms) / 1000;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    if (withTenths) {
      const t = Math.floor((total % 1) * 10);
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatTitle(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatLongDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function monthLabel(ts) {
    return new Date(ts).toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function langLabel(id) {
    return (LANGS.find((l) => l.id === id) || LANGS[0]).label;
  }

  function resolvedTheme() {
    if (state.theme === "light" || state.theme === "dark") return state.theme;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    el.themeSettingLabel.textContent = state.theme[0].toUpperCase() + state.theme.slice(1);
    const color = resolvedTheme() === "light" ? "#f7f5fa" : "#0b0e14";
    if (el.themeColor) el.themeColor.setAttribute("content", color);
  }

  function setView(name) {
    state.view = name;
    el.app.dataset.view = name;
    Object.entries(el.views).forEach(([key, node]) => {
      if (!node) return;
      node.hidden = key !== name;
    });
  }

  async function refreshList() {
    state.recordings = await RecDB.list();
    renderList(el.recordingList, state.recordings);
    el.homeEmpty.hidden = state.recordings.length > 0;
    updateStorageCard();
    updateSyncBadge();
  }

  function renderList(container, items) {
    container.innerHTML = "";
    let lastMonth = "";
    items.forEach((rec) => {
      const month = monthLabel(rec.createdAt);
      if (month !== lastMonth) {
        lastMonth = month;
        const h = document.createElement("div");
        h.className = "month-label";
        h.textContent = month.split(" ")[0];
        container.appendChild(h);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rec-card";
      btn.innerHTML = `
        <div class="rec-card-title">
          ${rec.synced ? "" : `<svg class="cloud-off" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM3 10h1.73C5.5 7.7 8.5 6 12 6c2.76 0 5.1 1.64 6.17 4H19c1.66 0 3 1.34 3 3s-1.34 3-3 3H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.5-3.97L3 10zm8.59 6L8 12.41 9.41 11 12 13.59 17.59 8 19 9.41 12.59 16z" opacity=".4"/></svg>`}
          <span>${escapeHtml(rec.title || formatTitle(rec.createdAt))}</span>
          ${rec.favorite ? `<span class="rec-card-star" aria-label="Favorite">★</span>` : ""}
        </div>
        <div class="rec-card-date">${new Date(rec.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
        <div class="rec-card-right">
          <span class="mini-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="rec-card-dur">${formatDuration(rec.durationMs || 0)}</span>
        </div>`;
      btn.addEventListener("click", () => openDetail(rec.id));
      container.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const NEXTCLOUD_UNAVAILABLE =
    "Nextcloud sync is disabled for now — browsers block cross-origin WebDAV (CORS). Coming later via a same-origin proxy.";

  function showNcUnavailable() {
    toast(NEXTCLOUD_UNAVAILABLE);
  }

  function updateSyncBadge() {
    el.syncBadge.hidden = false;
    el.syncBadge.classList.add("off");
    el.syncBadge.title = "Nextcloud sync unavailable";
    el.syncBadge.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M24 15c0-2.64-2.05-4.78-4.65-4.96A7.49 7.49 0 0 0 12 4c-.7 0-1.37.1-2 .29L20.36 14.66A4.98 4.98 0 0 1 24 15zM3.71 4.56 2.29 5.97l2.6 2.6A5.98 5.98 0 0 0 0 14c0 3.31 2.69 6 6 6h11.17l2.86 2.86 1.41-1.41L3.71 4.56z"/></svg>`;
    if (el.ncStatus) {
      el.ncStatus.textContent =
        "Unavailable — browsers block cross-origin WebDAV (CORS). Coming later via a same-origin proxy.";
    }
  }

  async function measureCacheBytes() {
    if (!("caches" in window)) return 0;
    let total = 0;
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      for (const req of reqs) {
        const res = await cache.match(req);
        if (!res) continue;
        try {
          const buf = await res.clone().arrayBuffer();
          total += buf.byteLength;
        } catch {
          /* ignore */
        }
      }
    }
    return total;
  }

  async function measureRecordingBytes() {
    let total = 0;
    for (const rec of state.recordings) {
      total += rec.blob?.size || 0;
    }
    return total;
  }

  async function updateStorageCard() {
    const est = await RecDB.storageEstimate();
    const usage = est.usage || 0;
    const quota = est.quota || 0;
    const [cacheBytes, recBytes] = await Promise.all([
      measureCacheBytes(),
      measureRecordingBytes(),
    ]);
    const pct = quota ? Math.min(100, (usage / quota) * 100) : 0;
    el.storageFill.style.width = `${pct.toFixed(1)}%`;
    el.storageLabel.textContent = "Site data (not just recordings)";
    const parts = [
      `${state.recordings.length} recording${state.recordings.length === 1 ? "" : "s"} · ${formatBytes(recBytes)}`,
      `app cache · ${formatBytes(cacheBytes)}`,
    ];
    if (quota) parts.push(`browser total ${formatBytes(usage)} / ${formatBytes(quota)}`);
    else parts.push(`browser total ${formatBytes(usage)}`);
    el.storageMeta.textContent = parts.join(" · ");
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /* —— Wake lock —— */
  async function requestWakeLock() {
    if (!state.wakeLockPref || !("wakeLock" in navigator)) return;
    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {
        state.wakeLock = null;
      });
    } catch {
      /* ignore */
    }
  }

  async function releaseWakeLock() {
    try {
      await state.wakeLock?.release();
    } catch {
      /* ignore */
    }
    state.wakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.recording && !state.paused) {
      requestWakeLock();
    }
  });

  /* —— Waveform drawing —— */
  function drawLiveWave() {
    const canvas = el.liveWaveform;
    if (!canvas || !state.analyser) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const buffer = new Uint8Array(state.analyser.frequencyBinCount);
    state.analyser.getByteTimeDomainData(buffer);

    // sample peaks for stored waveform
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      peak = Math.max(peak, Math.abs(buffer[i] - 128) / 128);
    }
    if (state.recording && !state.paused) {
      state.peaks.push(peak);
      if (state.peaks.length > 4000) state.peaks.shift();
    }

    const bars = Math.min(96, Math.floor(w / 6));
    const mid = h / 2;
    const step = Math.floor(buffer.length / bars);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--wave").trim() || "#8ab4f8";
    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += Math.abs(buffer[i * step + j] - 128);
      const amp = (sum / step / 128) * (h * 0.42) + 3;
      const x = (i / bars) * w;
      const bw = Math.max(2, w / bars - 2);
      roundRect(ctx, x, mid - amp, bw, amp * 2, bw / 2);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawPeaks(canvas, peaks, progress = 0) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const data = peaks && peaks.length ? peaks : [0.05];
    const bars = Math.min(120, Math.floor(w / 5));
    const mid = h / 2;
    const wave = getComputedStyle(document.documentElement).getPropertyValue("--wave").trim() || "#8ab4f8";
    const dim = getComputedStyle(document.documentElement).getPropertyValue("--wave-dim").trim() || "#5f7aa8";
    const playhead = Math.floor(progress * bars);
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length);
      const amp = Math.max(3, data[idx] * (h * 0.42));
      const x = (i / bars) * w;
      const bw = Math.max(2, w / bars - 2);
      ctx.fillStyle = i <= playhead ? wave : dim;
      roundRect(ctx, x, mid - amp, bw, amp * 2, bw / 2);
      ctx.fill();
    }
    // playhead line
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progress * w, 8);
    ctx.lineTo(progress * w, h - 8);
    ctx.stroke();
  }

  function loopVisual() {
    if (state.recording) {
      drawLiveWave();
      if (!state.paused) {
        state.elapsedMs = state.timerBase + (performance.now() - state.startedAt);
        el.recTimer.textContent = formatDuration(state.elapsedMs, true);
      }
      state.raf = requestAnimationFrame(loopVisual);
    }
  }

  /* —— Speech recognition —— */
  function speechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function startRecognition() {
    stopRecognition();
    if (!state.autoTranscribe || !speechSupported()) {
      el.langPill.hidden = true;
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = state.lang;
    rec.onresult = (ev) => {
      let interim = "";
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalChunk) {
        state.transcriptFinal = `${state.transcriptFinal} ${finalChunk}`.trim();
        state.transcriptSegments.push({
          t: state.elapsedMs,
          text: finalChunk.trim(),
          speaker: 1,
        });
      }
      state.transcriptInterim = interim;
      renderLiveTranscript();
    };
    rec.onerror = () => {
      /* restart soft-fail */
    };
    rec.onend = () => {
      if (state.recording && !state.paused && state.autoTranscribe) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    try {
      rec.start();
      state.recognition = rec;
      el.langPill.hidden = false;
      el.langPill.textContent = `${langLabel(state.lang)} ›`;
    } catch {
      el.langPill.hidden = true;
    }
  }

  function stopRecognition() {
    if (state.recognition) {
      try {
        state.recognition.onend = null;
        state.recognition.stop();
      } catch {
        /* ignore */
      }
    }
    state.recognition = null;
  }

  function renderLiveTranscript() {
    const segs = state.transcriptSegments;
    let html = segs
      .map(
        (s, i) => `
      <div class="speaker-block">
        <div class="speaker-head"><span class="speaker-dot"></span> Speaker 1 · ${formatDuration(s.t)}</div>
        <div>${escapeHtml(s.text)}</div>
      </div>`
      )
      .join("");
    if (state.transcriptInterim) {
      html += `<div class="speaker-block"><div class="speaker-head"><span class="speaker-dot"></span> Live</div><div>${escapeHtml(state.transcriptInterim)}</div></div>`;
    }
    if (!html) html = `<p style="color:var(--text-muted)">Listening for speech…</p>`;
    el.liveTranscript.innerHTML = html;
    el.liveTranscript.scrollTop = el.liveTranscript.scrollHeight;
  }

  function setRecView(mode) {
    state.recView = mode;
    document.querySelectorAll("[data-rec-view]").forEach((btn) => {
      const on = btn.dataset.recView === mode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    el.liveWaveform.hidden = mode !== "wave";
    el.liveTranscript.hidden = mode !== "text";
    document.getElementById("recVizLabel").hidden = mode !== "wave";
    if (mode === "text") renderLiveTranscript();
  }

  function setDetailView(mode) {
    state.detailView = mode;
    document.querySelectorAll("[data-detail-view]").forEach((btn) => {
      const on = btn.dataset.detailView === mode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    el.detailWaveform.hidden = mode !== "wave";
    el.detailTranscript.hidden = mode !== "text";
  }

  /* —— Recording —— */
  let startingRecording = false;

  function micErrorMessage(err) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Microphone blocked — allow mic access for this site and try again";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No microphone found";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "Microphone is in use by another app";
    }
    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      return "Microphone settings not supported on this device";
    }
    if (name === "SecurityError") {
      return "Microphone requires HTTPS (or localhost)";
    }
    if (name === "AbortError") {
      return "Microphone request was interrupted — try again";
    }
    return err?.message ? `Mic error: ${err.message}` : "Could not start microphone";
  }

  async function requestMicStream() {
    // Prefer gentle constraints; some devices reject channelCount / AEC flags.
    const attempts = [
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      },
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      },
      { audio: true },
    ];

    let lastErr = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
        // Permission truly denied — don't keep prompting with looser constraints.
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError" || err?.name === "SecurityError") {
          throw err;
        }
      }
    }
    throw lastErr || new Error("getUserMedia failed");
  }

  async function ensureAudioContextRunning(ctx) {
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore — visuals may be quiet until next gesture */
      }
    }
  }

  async function startRecording() {
    if (state.recording || startingRecording) return;
    if (!window.isSecureContext) {
      toast("Microphone requires HTTPS (or localhost)");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("Microphone not available in this browser");
      return;
    }

    startingRecording = true;
    el.recordFab?.setAttribute("aria-busy", "true");
    try {
      // Permissions API is advisory — always still await getUserMedia.
      try {
        const status = await navigator.permissions?.query?.({ name: "microphone" });
        if (status?.state === "denied") {
          toast("Microphone blocked in site settings — reset permission and try again");
          return;
        }
      } catch {
        /* Firefox / Safari may not support microphone permission query */
      }

      const stream = await requestMicStream();
      // Ensure tracks are live before wiring recorder (some PWAs report muted briefly).
      await Promise.all(
        stream.getAudioTracks().map(async (track) => {
          if (track.readyState === "ended") {
            throw new DOMException("Microphone track ended", "NotReadableError");
          }
          try {
            await track.applyConstraints?.({});
          } catch {
            /* optional */
          }
        })
      );

      state.mediaStream = stream;
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await ensureAudioContextRunning(state.audioCtx);
      const source = state.audioCtx.createMediaStreamSource(stream);
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 2048;
      source.connect(state.analyser);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
            ? "audio/ogg;codecs=opus"
            : "";
      state.mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      state.chunks = [];
      state.peaks = [];
      state.transcriptFinal = "";
      state.transcriptInterim = "";
      state.transcriptSegments = [];
      state.elapsedMs = 0;
      state.timerBase = 0;
      state.paused = false;

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size) state.chunks.push(e.data);
      };
      state.mediaRecorder.onerror = (e) => {
        console.error(e);
        toast("Recording error");
      };

      state.mediaRecorder.start(250);
      state.recording = true;
      state.startedAt = performance.now();
      el.recTitle.textContent = formatTitle(Date.now());
      el.recDot.classList.remove("paused");
      el.pauseBtn.querySelector("span").textContent = "Pause";
      setView("recording");
      setRecView("wave");
      await requestWakeLock();
      startRecognition();
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(loopVisual);
      if (state.blackoutPref) enterBlackout();
    } catch (err) {
      console.error(err);
      state.mediaStream?.getTracks().forEach((t) => t.stop());
      state.mediaStream = null;
      try {
        await state.audioCtx?.close();
      } catch {
        /* ignore */
      }
      state.audioCtx = null;
      state.mediaRecorder = null;
      state.recording = false;
      toast(micErrorMessage(err));
    } finally {
      startingRecording = false;
      el.recordFab?.removeAttribute("aria-busy");
    }
  }

  async function togglePause() {
    if (!state.mediaRecorder || !state.recording) return;
    if (state.paused) {
      state.mediaRecorder.resume();
      await ensureAudioContextRunning(state.audioCtx);
      state.timerBase = state.elapsedMs;
      state.startedAt = performance.now();
      state.paused = false;
      el.recDot.classList.remove("paused");
      el.pauseBtn.querySelector("span").textContent = "Pause";
      startRecognition();
      requestWakeLock();
    } else {
      state.mediaRecorder.pause();
      state.elapsedMs = state.timerBase + (performance.now() - state.startedAt);
      state.timerBase = state.elapsedMs;
      state.paused = true;
      el.recDot.classList.add("paused");
      el.pauseBtn.querySelector("span").textContent = "Resume";
      stopRecognition();
    }
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (!state.mediaRecorder || !state.recording) {
        resolve(null);
        return;
      }
      const mr = state.mediaRecorder;
      mr.onstop = async () => {
        state.recording = false;
        cancelAnimationFrame(state.raf);
        stopRecognition();
        await releaseWakeLock();
        exitBlackout(true);
        state.mediaStream?.getTracks().forEach((t) => t.stop());
        try {
          await state.audioCtx?.close();
        } catch {
          /* ignore */
        }
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(state.chunks, { type });
        const durationMs = state.elapsedMs;
        const createdAt = Date.now();
        const rec = {
          id: uid(),
          title: formatTitle(createdAt),
          createdAt,
          durationMs,
          mimeType: type,
          blob,
          peaks: state.peaks.slice(),
          transcript: state.transcriptFinal,
          segments: state.transcriptSegments.slice(),
          summary: buildSummary(state.transcriptFinal),
          favorite: false,
          synced: false,
          syncName: null,
        };
        await RecDB.put(rec);
        maybeAutoSync(rec);
        state.mediaRecorder = null;
        state.mediaStream = null;
        resolve(rec);
      };
      try {
        if (mr.state !== "inactive") mr.stop();
        else mr.onstop();
      } catch {
        resolve(null);
      }
    });
  }

  async function discardRecording() {
    if (!state.recording) return;
    if (!confirm("Discard this recording?")) return;
    state.recording = false;
    cancelAnimationFrame(state.raf);
    stopRecognition();
    await releaseWakeLock();
    exitBlackout(true);
    try {
      if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
        state.mediaRecorder.onstop = null;
        state.mediaRecorder.stop();
      }
    } catch {
      /* ignore */
    }
    state.mediaStream?.getTracks().forEach((t) => t.stop());
    try {
      await state.audioCtx?.close();
    } catch {
      /* ignore */
    }
    state.mediaRecorder = null;
    setView("home");
    toast("Discarded");
  }

  function buildSummary(text) {
    if (!text || text.trim().length < 40) return [];
    const sentences = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
    if (!sentences.length) {
      const words = text.trim().split(/\s+/);
      const chunk = words.slice(0, 18).join(" ");
      return chunk ? [chunk + (words.length > 18 ? "…" : "")] : [];
    }
    return sentences.slice(0, 3);
  }

  /* —— Detail / playback —— */
  async function openDetail(id) {
    const rec = await RecDB.get(id);
    if (!rec) return;
    state.currentId = id;
    stopAudio();
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = URL.createObjectURL(rec.blob);
    el.audio.src = state.objectUrl;
    el.audio.playbackRate = SPEEDS[state.speedIndex];
    el.detailTitle.textContent = rec.title || formatTitle(rec.createdAt);
    el.favoriteBtn.setAttribute("aria-pressed", rec.favorite ? "true" : "false");
    el.favoriteBtn.style.color = rec.favorite ? "var(--accent)" : "";
    if (rec.summary?.length) {
      el.summaryCard.hidden = false;
      el.summaryList.innerHTML = rec.summary.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    } else {
      el.summaryCard.hidden = true;
    }
    renderDetailTranscript(rec);
    setDetailView(rec.transcript ? state.detailView : "wave");
    setView("detail");
    await el.audio.play().then(() => el.audio.pause()).catch(() => {});
    updatePlayUi();
    drawPeaks(el.detailWaveform, rec.peaks, 0);
  }

  function renderDetailTranscript(rec) {
    const segs = rec.segments?.length
      ? rec.segments
      : rec.transcript
        ? [{ t: 0, text: rec.transcript, speaker: 1 }]
        : [];
    if (!segs.length) {
      el.detailTranscript.innerHTML = `<p style="color:var(--text-muted)">No transcript. Use “Transcribe again” if your browser supports speech recognition.</p>`;
      return;
    }
    el.detailTranscript.innerHTML = segs
      .map(
        (s) => `
      <div class="speaker-block" data-t="${s.t}">
        <div class="speaker-head"><span class="speaker-dot"></span> Speaker ${s.speaker || 1} · ${formatDuration(s.t)}</div>
        <div>${escapeHtml(s.text)}</div>
      </div>`
      )
      .join("");
  }

  function stopAudio() {
    el.audio.pause();
    el.audio.removeAttribute("src");
    el.audio.load();
  }

  function updatePlayUi() {
    const playing = !el.audio.paused && !el.audio.ended;
    el.playBtnLabel.textContent = playing ? "Pause" : "Play";
    const playIcon = el.playBtn.querySelector(".icon-play");
    const pauseIcon = el.playBtn.querySelector(".icon-pause");
    if (playIcon) playIcon.hidden = playing;
    if (pauseIcon) pauseIcon.hidden = !playing;
    const dur = el.audio.duration || 0;
    const cur = el.audio.currentTime || 0;
    if (!state.seeking && Number.isFinite(dur) && dur > 0) {
      el.seekBar.value = String(Math.round((cur / dur) * 1000));
    }
    el.playTime.textContent = formatDuration(cur * 1000);
    el.remainTime.textContent = `-${formatDuration(Math.max(0, (dur - cur) * 1000))}`;
    const rec = state.recordings.find((r) => r.id === state.currentId);
    if (rec && Number.isFinite(dur) && dur > 0) {
      drawPeaks(el.detailWaveform, rec.peaks, cur / dur);
    }
  }

  el.audio.addEventListener("timeupdate", updatePlayUi);
  el.audio.addEventListener("ended", updatePlayUi);
  el.audio.addEventListener("play", updatePlayUi);
  el.audio.addEventListener("pause", updatePlayUi);

  /* —— Edit —— */
  async function openEdit() {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    state.editStart = 0.15;
    state.editEnd = 0.55;
    state.editHistory = [];
    updateEditSelection();
    drawPeaks(el.editWaveform, rec.peaks, 0);
    if (state.objectUrl) {
      el.audio.src = state.objectUrl;
    }
    setView("edit");
  }

  function updateEditSelection() {
    const sel = el.editSelection;
    const left = state.editStart * 100;
    const width = Math.max(2, (state.editEnd - state.editStart) * 100);
    sel.style.left = `${left}%`;
    sel.style.width = `${width}%`;
  }

  function bindEditHandles() {
    let active = null;
    const onMove = (clientX) => {
      if (!active) return;
      const rect = el.editWaveform.getBoundingClientRect();
      let p = (clientX - rect.left) / rect.width;
      p = Math.max(0, Math.min(1, p));
      if (active === "start") {
        state.editStart = Math.min(p, state.editEnd - 0.02);
      } else {
        state.editEnd = Math.max(p, state.editStart + 0.02);
      }
      updateEditSelection();
    };
    el.editSelection.querySelectorAll(".edit-handle").forEach((handle) => {
      handle.addEventListener("pointerdown", (e) => {
        active = handle.dataset.handle;
        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      handle.addEventListener("pointermove", (e) => onMove(e.clientX));
      handle.addEventListener("pointerup", () => {
        active = null;
      });
    });
  }

  async function saveEditedCopy(mode) {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    toast("Processing…");
    try {
      const arrayBuf = await rec.blob.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
      const start = state.editStart * audioBuf.duration;
      const end = state.editEnd * audioBuf.duration;
      let outBuf;
      if (mode === "crop") {
        outBuf = sliceBuffer(ctx, audioBuf, start, end);
      } else {
        outBuf = removeRange(ctx, audioBuf, start, end);
      }
      const wav = audioBufferToWav(outBuf);
      const blob = new Blob([wav], { type: "audio/wav" });
      const createdAt = Date.now();
      const copy = {
        id: uid(),
        title: `${rec.title || formatTitle(rec.createdAt)} (edit)`,
        createdAt,
        durationMs: outBuf.duration * 1000,
        mimeType: "audio/wav",
        blob,
        peaks: resamplePeaks(rec.peaks, mode, state.editStart, state.editEnd),
        transcript: rec.transcript || "",
        segments: rec.segments || [],
        summary: rec.summary || [],
        favorite: false,
        synced: false,
        syncName: null,
      };
      await RecDB.put(copy);
      await ctx.close();
      toast("Saved copy");
      await refreshList();
      openDetail(copy.id);
    } catch (err) {
      console.error(err);
      toast("Edit failed in this browser");
    }
  }

  function sliceBuffer(ctx, buffer, start, end) {
    const sr = buffer.sampleRate;
    const s0 = Math.floor(start * sr);
    const s1 = Math.floor(end * sr);
    const len = Math.max(1, s1 - s0);
    const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      out.getChannelData(c).set(buffer.getChannelData(c).subarray(s0, s1));
    }
    return out;
  }

  function removeRange(ctx, buffer, start, end) {
    const sr = buffer.sampleRate;
    const s0 = Math.floor(start * sr);
    const s1 = Math.floor(end * sr);
    const len = Math.max(1, buffer.length - (s1 - s0));
    const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dst = out.getChannelData(c);
      dst.set(src.subarray(0, s0), 0);
      dst.set(src.subarray(s1), s0);
    }
    return out;
  }

  function resamplePeaks(peaks, mode, start, end) {
    if (!peaks?.length) return [];
    const a = Math.floor(start * peaks.length);
    const b = Math.floor(end * peaks.length);
    if (mode === "crop") return peaks.slice(a, b);
    return peaks.slice(0, a).concat(peaks.slice(b));
  }

  function audioBufferToWav(buffer) {
    const numCh = buffer.numberOfChannels;
    const sr = buffer.sampleRate;
    const len = buffer.length;
    const dataLen = len * numCh * 2;
    const ab = new ArrayBuffer(44 + dataLen);
    const view = new DataView(ab);
    writeStr(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLen, true);
    writeStr(view, 8, "WAVE");
    writeStr(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * numCh * 2, true);
    view.setUint16(32, numCh * 2, true);
    view.setUint16(34, 16, true);
    writeStr(view, 36, "data");
    view.setUint32(40, dataLen, true);
    let offset = 44;
    const channels = [];
    for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < numCh; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return ab;
  }

  function writeStr(view, offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  /* —— Nextcloud (disabled until same-origin proxy) —— */
  async function maybeAutoSync() {
    /* no-op: browser CORS blocks cross-origin WebDAV */
  }

  async function syncOne() {
    showNcUnavailable();
  }

  async function syncAll() {
    showNcUnavailable();
  }

  function openNcModal() {
    showNcUnavailable();
  }

  /* —— PIN / blackout —— */
  function buildPinPad() {
    el.pinPad.innerHTML = "";
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    keys.forEach((k) => {
      if (!k) {
        const spacer = document.createElement("div");
        el.pinPad.appendChild(spacer);
        return;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pin-key";
      btn.textContent = k;
      btn.addEventListener("click", () => onPinKey(k));
      el.pinPad.appendChild(btn);
    });
  }

  function renderPinDots() {
    const target =
      state.pinMode === "unlock"
        ? Math.max(4, state.pin.length)
        : Math.max(4, state.pinBuffer.length || 4, state.pinConfirm.length || 4);
    el.pinDots.innerHTML = "";
    for (let i = 0; i < Math.min(8, target); i++) {
      const d = document.createElement("span");
      d.className = "pin-dot" + (i < state.pinBuffer.length ? " filled" : "");
      el.pinDots.appendChild(d);
    }
  }

  function openPinModal(mode) {
    state.pinMode = mode;
    state.pinBuffer = "";
    state.pinConfirm = "";
    if (mode === "setup") {
      el.pinModalTitle.textContent = "Set PIN";
      el.pinModalSub.textContent = "Choose a 4–8 digit PIN for blackout unlock.";
      el.pinClearBtn.hidden = !state.pin;
    } else if (mode === "confirm") {
      el.pinModalTitle.textContent = "Confirm PIN";
      el.pinModalSub.textContent = "Enter the same PIN again.";
      el.pinClearBtn.hidden = true;
    } else {
      el.pinModalTitle.textContent = "Enter PIN";
      el.pinModalSub.textContent = "Unlock to leave blackout.";
      el.pinClearBtn.hidden = true;
      el.pinCancelBtn.hidden = mode === "unlock";
    }
    renderPinDots();
    el.pinModal.hidden = false;
  }

  function onPinKey(k) {
    if (k === "⌫") {
      state.pinBuffer = state.pinBuffer.slice(0, -1);
      renderPinDots();
      return;
    }
    if (state.pinBuffer.length >= 8) return;
    state.pinBuffer += k;
    renderPinDots();
    if (state.pinMode === "setup" && state.pinBuffer.length >= 4) {
      // wait for user to hit length they want — auto-advance at 4 if they pause? Better: advance when 4+ and they stop... Use 4 minimum auto when length>=4 after short delay, or when they reach 4 and press same again.
      // Simpler: when length is 4–8, treat next identical completion via reaching 4 then confirming.
      if (state.pinBuffer.length === 4) {
        // allow longer; use confirm when they tap a hidden OK — auto confirm at 4 for simplicity, allow 5-8 if they keep typing within 800ms
        clearTimeout(onPinKey._t);
        onPinKey._t = setTimeout(() => {
          if (state.pinMode === "setup" && state.pinBuffer.length >= 4) {
            state.pinConfirm = state.pinBuffer;
            state.pinBuffer = "";
            state.pinMode = "confirm";
            el.pinModalTitle.textContent = "Confirm PIN";
            el.pinModalSub.textContent = "Enter the same PIN again.";
            renderPinDots();
          }
        }, 600);
      }
      if (state.pinBuffer.length === 8) {
        clearTimeout(onPinKey._t);
        state.pinConfirm = state.pinBuffer;
        state.pinBuffer = "";
        state.pinMode = "confirm";
        el.pinModalTitle.textContent = "Confirm PIN";
        renderPinDots();
      }
    } else if (state.pinMode === "confirm") {
      if (state.pinBuffer.length === state.pinConfirm.length) {
        if (state.pinBuffer === state.pinConfirm) {
          state.pin = state.pinBuffer;
          localStorage.setItem(STORAGE_PIN, state.pin);
          el.pinStatus.textContent = "On";
          el.pinModal.hidden = false;
          el.pinModal.hidden = true;
          toast("PIN saved");
        } else {
          toast("PINs did not match");
          state.pinBuffer = "";
          state.pinConfirm = "";
          state.pinMode = "setup";
          el.pinModalTitle.textContent = "Set PIN";
          renderPinDots();
        }
      }
    } else if (state.pinMode === "unlock") {
      if (state.pinBuffer.length === state.pin.length) {
        if (state.pinBuffer === state.pin) {
          el.pinModal.hidden = true;
          el.pinCancelBtn.hidden = false;
          exitBlackout(true);
          state.unlockResolver?.();
          state.unlockResolver = null;
        } else {
          toast("Wrong PIN");
          state.pinBuffer = "";
          renderPinDots();
        }
      }
    }
  }

  function enterBlackout() {
    el.blackout.hidden = false;
    el.blackout.classList.add("show-hint");
    clearTimeout(enterBlackout._t);
    enterBlackout._t = setTimeout(() => el.blackout.classList.remove("show-hint"), 1800);
  }

  function exitBlackout(force) {
    if (!force && state.pin) {
      openPinModal("unlock");
      return;
    }
    el.blackout.hidden = true;
  }

  /* —— Share / delete / rename —— */
  async function shareCurrent() {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    const file = new File([rec.blob], `${rec.title || "recording"}.webm`, { type: rec.mimeType || "audio/webm" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: rec.title });
        return;
      } catch {
        /* fall through */
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(rec.blob);
    a.download = file.name;
    a.click();
    toast("Download started");
  }

  async function deleteCurrent() {
    if (!confirm("Delete this recording?")) return;
    await RecDB.remove(state.currentId);
    stopAudio();
    el.detailMenu.hidden = true;
    setView("home");
    await refreshList();
    toast("Deleted");
  }

  async function renameCurrent() {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    const next = prompt("Rename recording", rec.title || "");
    if (next == null) return;
    rec.title = next.trim() || rec.title;
    await RecDB.put(rec);
    el.detailTitle.textContent = rec.title;
    el.menuRecTitle.textContent = rec.title;
    await refreshList();
  }

  async function toggleFavorite() {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    rec.favorite = !rec.favorite;
    await RecDB.put(rec);
    el.favoriteBtn.setAttribute("aria-pressed", rec.favorite ? "true" : "false");
    el.favoriteBtn.style.color = rec.favorite ? "var(--accent)" : "";
    await refreshList();
  }

  async function retranscribe() {
    toast("Live re-transcribe needs mic playback — paste not supported offline");
    // Best-effort: if SpeechRecognition exists, we can't feed audio blobs in most browsers.
    // Keep UX honest.
  }

  /* —— Search —— */
  function runSearch(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      el.searchResults.innerHTML = "";
      return;
    }
    const hits = state.recordings.filter((r) => {
      const hay = `${r.title || ""} ${r.transcript || ""}`.toLowerCase();
      return hay.includes(query);
    });
    renderList(el.searchResults, hits);
  }

  /* —— Events —— */
  el.recordFab.addEventListener("click", startRecording);
  el.pauseBtn.addEventListener("click", togglePause);
  el.stopBtn.addEventListener("click", async () => {
    const rec = await stopRecording();
    await refreshList();
    if (rec) openDetail(rec.id);
    else setView("home");
  });
  el.recDiscardBtn.addEventListener("click", discardRecording);
  el.recBlackoutBtn.addEventListener("click", () => {
    if (el.blackout.hidden) enterBlackout();
    else exitBlackout(false);
  });

  document.querySelectorAll("[data-rec-view]").forEach((btn) => {
    btn.addEventListener("click", () => setRecView(btn.dataset.recView));
  });
  document.querySelectorAll("[data-detail-view]").forEach((btn) => {
    btn.addEventListener("click", () => setDetailView(btn.dataset.detailView));
  });

  el.detailBackBtn.addEventListener("click", () => {
    stopAudio();
    setView("home");
  });
  el.favoriteBtn.addEventListener("click", toggleFavorite);
  el.playBtn.addEventListener("click", () => {
    if (el.audio.paused) el.audio.play();
    else el.audio.pause();
  });
  el.rewindBtn.addEventListener("click", () => {
    el.audio.currentTime = Math.max(0, el.audio.currentTime - 5);
  });
  el.forwardBtn.addEventListener("click", () => {
    el.audio.currentTime = Math.min(el.audio.duration || 0, el.audio.currentTime + 10);
  });
  el.seekBar.addEventListener("input", () => {
    state.seeking = true;
  });
  el.seekBar.addEventListener("change", () => {
    const dur = el.audio.duration || 0;
    el.audio.currentTime = (Number(el.seekBar.value) / 1000) * dur;
    state.seeking = false;
    updatePlayUi();
  });

  el.detailMenuBtn.addEventListener("click", async () => {
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    el.menuRecTitle.textContent = rec.title || formatTitle(rec.createdAt);
    el.menuMetaTime.textContent = formatLongDate(rec.createdAt);
    el.menuMetaSync.textContent = "Nextcloud sync coming later (CORS)";
    el.speedBtn.textContent = `${SPEEDS[state.speedIndex]}×`;
    el.detailMenu.hidden = false;
  });
  el.detailMenu.addEventListener("click", (e) => {
    if (e.target === el.detailMenu) el.detailMenu.hidden = true;
  });
  el.detailMenu.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      el.detailMenu.hidden = true;
      if (action === "delete") deleteCurrent();
      else if (action === "share") shareCurrent();
      else if (action === "edit") openEdit();
      else if (action === "search-transcript") {
        setView("search");
        el.searchInput.value = "";
        el.searchInput.focus();
        toast("Search titles & transcripts");
      }       else if (action === "retranscribe") retranscribe();
      else if (action === "sync") showNcUnavailable();
    });
  });
  el.renameBtn.addEventListener("click", renameCurrent);
  el.speedBtn.addEventListener("click", () => {
    state.speedIndex = (state.speedIndex + 1) % SPEEDS.length;
    el.audio.playbackRate = SPEEDS[state.speedIndex];
    el.speedBtn.textContent = `${SPEEDS[state.speedIndex]}×`;
  });

  el.summaryToggle.addEventListener("click", () => {
    el.summaryCard.classList.toggle("collapsed");
    el.summaryToggle.setAttribute(
      "aria-expanded",
      el.summaryCard.classList.contains("collapsed") ? "false" : "true"
    );
  });

  el.editCloseBtn.addEventListener("click", () => setView("detail"));
  el.editSaveBtn.addEventListener("click", () => saveEditedCopy("crop"));
  el.cropKeepBtn.addEventListener("click", () => saveEditedCopy("crop"));
  el.cropRemoveBtn.addEventListener("click", () => saveEditedCopy("remove"));
  el.editUndoBtn.addEventListener("click", () => {
    state.editStart = 0.15;
    state.editEnd = 0.55;
    updateEditSelection();
    toast("Selection reset");
  });
  el.editPlayBtn.addEventListener("click", () => {
    if (el.audio.paused) el.audio.play();
    else el.audio.pause();
  });
  el.editRewindBtn.addEventListener("click", () => {
    el.audio.currentTime = Math.max(0, el.audio.currentTime - 5);
  });
  el.editForwardBtn.addEventListener("click", () => {
    el.audio.currentTime = Math.min(el.audio.duration || 0, el.audio.currentTime + 10);
  });

  el.searchOpenBtn.addEventListener("click", () => {
    setView("search");
    el.searchInput.focus();
  });
  el.searchOpenBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") el.searchOpenBtn.click();
  });
  el.searchBackBtn.addEventListener("click", () => setView("home"));
  el.searchInput.addEventListener("input", () => {
    el.searchClearBtn.hidden = !el.searchInput.value;
    runSearch(el.searchInput.value);
  });
  el.searchClearBtn.addEventListener("click", () => {
    el.searchInput.value = "";
    el.searchClearBtn.hidden = true;
    el.searchResults.innerHTML = "";
    el.searchInput.focus();
  });

  el.profileBtn.addEventListener("click", () => {
    updateStorageCard();
    el.profileSheet.hidden = false;
  });
  el.profileCloseBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
  });
  el.profileSheet.addEventListener("click", (e) => {
    if (e.target === el.profileSheet) el.profileSheet.hidden = true;
  });
  el.manageNcBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
    showNcUnavailable();
  });
  el.openSettingsBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
    applySettingsLabels();
    setView("settings");
  });
  el.syncNowBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
    showNcUnavailable();
  });
  el.settingsBackBtn.addEventListener("click", () => setView("home"));

  document.querySelectorAll("[data-settings]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.settings;
      if (key === "nextcloud") showNcUnavailable();
      else if (key === "theme") {
        const i = THEME_ORDER.indexOf(state.theme);
        state.theme = THEME_ORDER[(i + 1) % THEME_ORDER.length];
        localStorage.setItem(STORAGE_THEME, state.theme);
        applyTheme();
      } else if (key === "pin") {
        openPinModal("setup");
      } else if (key === "lang") {
        const i = LANGS.findIndex((l) => l.id === state.lang);
        state.lang = LANGS[(i + 1) % LANGS.length].id;
        localStorage.setItem(STORAGE_LANG, state.lang);
        el.langSettingLabel.textContent = langLabel(state.lang);
      }
    });
  });

  el.wakeLockToggle.addEventListener("change", () => {
    state.wakeLockPref = el.wakeLockToggle.checked;
    localStorage.setItem(STORAGE_WAKE, state.wakeLockPref ? "on" : "off");
  });
  el.blackoutToggle.addEventListener("change", () => {
    state.blackoutPref = el.blackoutToggle.checked;
    localStorage.setItem(STORAGE_BLACKOUT, state.blackoutPref ? "on" : "off");
  });
  el.autoTranscribeToggle.addEventListener("change", () => {
    state.autoTranscribe = el.autoTranscribeToggle.checked;
    localStorage.setItem(STORAGE_TRANSCRIBE, state.autoTranscribe ? "on" : "off");
  });

  function applySettingsLabels() {
    el.wakeLockToggle.checked = state.wakeLockPref;
    el.blackoutToggle.checked = state.blackoutPref;
    el.autoTranscribeToggle.checked = state.autoTranscribe;
    el.langSettingLabel.textContent = langLabel(state.lang);
    el.pinStatus.textContent = state.pin ? "On" : "Off";
    el.themeSettingLabel.textContent = state.theme[0].toUpperCase() + state.theme.slice(1);
    updateSyncBadge();
  }

  el.ncCancelBtn.addEventListener("click", () => {
    el.ncModal.hidden = true;
  });
  el.ncSaveBtn.addEventListener("click", () => {
    el.ncModal.hidden = true;
    showNcUnavailable();
  });
  el.ncTestBtn.addEventListener("click", () => showNcUnavailable());

  el.pinCancelBtn.addEventListener("click", () => {
    el.pinModal.hidden = true;
    el.pinCancelBtn.hidden = false;
  });
  el.pinClearBtn.addEventListener("click", () => {
    state.pin = "";
    localStorage.removeItem(STORAGE_PIN);
    el.pinStatus.textContent = "Off";
    el.pinModal.hidden = true;
    toast("PIN cleared");
  });

  el.blackout.addEventListener("click", () => {
    if (state.pin) openPinModal("unlock");
    else exitBlackout(true);
  });

  el.recMenuBtn.addEventListener("click", () => {
    applySettingsLabels();
    setView("settings");
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    el.installBtn.hidden = false;
  });
  el.installBtn.addEventListener("click", async () => {
    if (!state.deferredPrompt) return;
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    state.deferredPrompt = null;
    el.installBtn.hidden = true;
  });

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (state.theme === "system") applyTheme();
  });

  window.addEventListener("resize", () => {
    if (state.view === "recording" && state.recView === "wave") drawLiveWave();
    if (state.view === "detail") {
      const rec = state.recordings.find((r) => r.id === state.currentId);
      if (rec) {
        const dur = el.audio.duration || 1;
        drawPeaks(el.detailWaveform, rec.peaks, (el.audio.currentTime || 0) / dur);
      }
    }
  });

  // Prevent accidental navigation away while recording
  window.addEventListener("beforeunload", (e) => {
    if (state.recording) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  /* —— Boot —— */
  buildPinPad();
  bindEditHandles();
  applyTheme();
  applySettingsLabels();
  refreshList();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
