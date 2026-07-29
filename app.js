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
    storageLabel: document.getElementById("storageLabel"),
    storageTotal: document.getElementById("storageTotal"),
    storageRows: document.getElementById("storageRows"),
    storageToggle: document.getElementById("storageToggle"),
    detailVizCard: document.getElementById("detailVizCard"),
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
    toastMsg: document.getElementById("toastMsg"),
    toastAction: document.getElementById("toastAction"),
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
    settingsReturnView: null,
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
    transcriptNote: "",
    raf: 0,
    // playback
    objectUrl: null,
    seeking: false,
    cardProgress: {},
    currentDurationMs: 0,
    durationProbe: false,
    durationProbeCleanup: null,
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

  function hideToast() {
    el.toast.hidden = true;
    el.toastAction.hidden = true;
    el.toastAction.onclick = null;
  }

  function toast(msg, action) {
    el.toastMsg.textContent = msg;
    if (action) {
      el.toastAction.textContent = action.label;
      el.toastAction.hidden = false;
      el.toastAction.onclick = () => {
        hideToast();
        action.onClick();
      };
    } else {
      el.toastAction.hidden = true;
      el.toastAction.onclick = null;
    }
    el.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(hideToast, action ? 6000 : 1800);
  }

  // Every clock string in the UI goes through here, so it must never be able to
  // emit NaN/Infinity even when handed a media element's unresolved duration.
  function formatDuration(ms, withTenths = false) {
    const n = Number(ms);
    const total = Number.isFinite(n) && n > 0 ? n / 1000 : 0;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const mm = Number.isFinite(m) ? String(m).padStart(2, "0") : "00";
    const ss = Number.isFinite(s) ? String(s).padStart(2, "0") : "00";
    if (withTenths) {
      const t = Math.floor((total % 1) * 10);
      return `${mm}:${ss}.${Number.isFinite(t) ? t : 0}`;
    }
    return `${mm}:${ss}`;
  }

  // MediaRecorder webm blobs report duration Infinity (Chromium) or NaN until
  // metadata resolves, so the persisted durationMs is the authoritative value.
  function audioDurationSec() {
    const d = el.audio.duration;
    if (Number.isFinite(d) && d > 0) return d;
    const stored = Number(state.currentDurationMs);
    if (Number.isFinite(stored) && stored > 0) return stored / 1000;
    const rec = state.recordings.find((r) => r.id === state.currentId);
    const ms = Number(rec?.durationMs);
    if (Number.isFinite(ms) && ms > 0) return ms / 1000;
    return 0;
  }

  function audioCurrentSec() {
    if (state.durationProbe) return 0;
    const c = Number(el.audio.currentTime);
    if (!Number.isFinite(c) || c < 0) return 0;
    const dur = audioDurationSec();
    return dur > 0 ? Math.min(c, dur) : c;
  }

  function formatTitle(ts) {
    const d = new Date(ts);
    const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${day} at ${time}`;
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

  function setThemeColor(color) {
    if (el.themeColor) el.themeColor.setAttribute("content", color);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    el.themeSettingLabel.textContent = state.theme[0].toUpperCase() + state.theme.slice(1);
    if (el.blackout && !el.blackout.hidden) return;
    setThemeColor(resolvedTheme() === "light" ? "#f7f5fa" : "#0b0e14");
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

  const CLOUD_OFF_SVG = `<svg class="rec-card-cloud" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3.27 2 2 3.27l2.72 2.72A6.5 6.5 0 0 0 6 19h11.73l3 3L22 20.73 3.27 2zM6 17a4.5 4.5 0 0 1-.33-8.99l9.99 9.99H6zm13.35-6.96A7.49 7.49 0 0 0 12 4c-1.48 0-2.85.44-4.01 1.17l1.46 1.46A5.4 5.4 0 0 1 12 6a5.5 5.5 0 0 1 5.5 5.5v.5H19a3 3 0 0 1 2.07 5.17l1.42 1.42A5 5 0 0 0 19.35 10.04z"/></svg>`;

  const TRASH_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M15 4V3H9v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5zm2 15H7V6h10v13zM9 8h2v9H9V8zm4 0h2v9h-2V8z"/></svg>`;

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
      btn.dataset.id = rec.id;
      const title = escapeHtml(rec.title || formatTitle(rec.createdAt));
      const date = new Date(rec.createdAt).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      btn.innerHTML = `
        <div class="rec-card-head">
          ${CLOUD_OFF_SVG}
          <span class="rec-card-title">${title}</span>
          ${rec.favorite ? `<span class="rec-card-star" aria-label="Favorite">★</span>` : ""}
          <span class="rec-card-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          </span>
        </div>
        <div class="rec-card-meta">
          <span class="rec-card-date">${date}</span>
          <span class="rec-card-dur">${formatDuration(rec.durationMs || 0)}</span>
        </div>
        <div class="rec-card-track"><span class="rec-card-remaining"></span></div>`;
      applyCardProgress(btn, state.cardProgress[rec.id] || 0);
      btn.addEventListener("click", () => openDetail(rec.id));

      const row = document.createElement("div");
      row.className = "rec-swipe";
      row.dataset.id = rec.id;
      const bg = document.createElement("div");
      bg.className = "rec-swipe-bg";
      bg.setAttribute("aria-hidden", "true");
      bg.innerHTML = `${TRASH_SVG}${TRASH_SVG}`;
      row.append(bg, btn);
      attachSwipeToDelete(row, btn, rec.id);
      container.appendChild(row);
    });
  }

  const SWIPE_LOCK_PX = 10;
  const SWIPE_MIN_PX = 72;
  const SWIPE_RATIO = 0.4;

  function attachSwipeToDelete(row, card, id) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let locked = false;

    function reset() {
      pointerId = null;
      dx = 0;
      locked = false;
      row.classList.remove("swiping");
    }

    // Swallow the click that a browser dispatches after a drag, and consume the
    // flag so a later keyboard activation still opens the recording.
    card.addEventListener(
      "click",
      (ev) => {
        if (card.dataset.swiped !== "1") return;
        delete card.dataset.swiped;
        ev.preventDefault();
        ev.stopPropagation();
      },
      true
    );

    card.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      delete card.dataset.swiped;
      pointerId = ev.pointerId;
      startX = ev.clientX;
      startY = ev.clientY;
      dx = 0;
      locked = false;
      row.classList.remove("snapping");
    });

    card.addEventListener("pointermove", (ev) => {
      if (ev.pointerId !== pointerId) return;
      const mx = ev.clientX - startX;
      const my = ev.clientY - startY;
      if (!locked) {
        // Let a vertical drag scroll the list instead of swiping the card.
        if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > SWIPE_LOCK_PX) {
          reset();
          return;
        }
        if (Math.abs(mx) < SWIPE_LOCK_PX) return;
        locked = true;
        row.classList.add("swiping");
        try {
          card.setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
      }
      dx = mx;
      card.style.transform = `translateX(${dx}px)`;
    });

    card.addEventListener("pointerup", (ev) => {
      if (ev.pointerId !== pointerId) return;
      const width = row.offsetWidth || 1;
      const committed = locked && Math.abs(dx) >= Math.max(SWIPE_MIN_PX, width * SWIPE_RATIO);
      // The click that follows this pointerup must not open the recording.
      if (locked) card.dataset.swiped = "1";
      row.classList.add("snapping");
      if (committed) {
        card.style.transform = `translateX(${dx > 0 ? width : -width}px)`;
        swipeDelete(row, id);
      } else {
        card.style.transform = "";
      }
      reset();
    });

    card.addEventListener("pointercancel", (ev) => {
      if (ev.pointerId !== pointerId) return;
      row.classList.add("snapping");
      card.style.transform = "";
      reset();
    });
  }

  async function swipeDelete(row, id) {
    const rec = await RecDB.get(id);
    if (!rec) {
      await refreshList();
      return;
    }
    const height = row.offsetHeight;
    row.classList.add("removing");
    row.style.height = `${height}px`;
    requestAnimationFrame(() => {
      row.style.height = "0";
      row.style.marginBottom = "0";
      row.style.opacity = "0";
    });
    await RecDB.remove(id);
    if (state.currentId === id) {
      stopAudio();
      state.currentId = null;
    }
    delete state.cardProgress[id];
    await new Promise((r) => setTimeout(r, 190));
    await refreshList();
    if (state.view === "search") runSearch(el.searchInput.value);
    toast("Recording deleted", {
      label: "Undo",
      onClick: async () => {
        await RecDB.put(rec);
        await refreshList();
        if (state.view === "search") runSearch(el.searchInput.value);
        toast("Recording restored");
      },
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
    el.storageLabel.textContent = "Site data";
    const totalLabel = quota
      ? `${formatBytes(usage)} / ${formatBytes(quota)}`
      : formatBytes(usage);
    if (el.storageTotal) {
      el.storageTotal.textContent = totalLabel;
      el.storageTotal.hidden = false;
    }
    if (el.storageRows) {
      el.storageRows.innerHTML = `
        <div class="storage-row"><span>Recordings</span><span>${state.recordings.length} · ${formatBytes(recBytes)}</span></div>
        <div class="storage-row"><span>App cache</span><span>${formatBytes(cacheBytes)}</span></div>
        <div class="storage-row"><span>Browser total</span><span>${totalLabel}</span></div>`;
    }
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
  const RECOG_RESTART_MS = 350;
  const RECOG_WATCHDOG_MS = 2500;
  let recogWanted = false;
  let recogInstance = null;
  let recogRestartTimer = 0;
  let recogWatchdog = 0;
  let recogHalted = "";

  function speechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function setLangPill(text) {
    if (!el.langPill) return;
    el.langPill.hidden = false;
    el.langPill.textContent = text;
  }

  function startRecognition() {
    stopRecognition();
    state.transcriptNote = "";
    if (!state.autoTranscribe) {
      if (el.langPill) el.langPill.hidden = true;
      state.transcriptNote = "Auto transcribe is off — turn it on in Settings.";
      renderLiveTranscript();
      return;
    }
    if (!speechSupported()) {
      setLangPill("Transcript unavailable");
      state.transcriptNote =
        "This browser has no Web Speech API, so live transcript is unavailable. Chrome, Edge, and Safari support it.";
      renderLiveTranscript();
      return;
    }
    recogWanted = true;
    recogHalted = "";
    spawnRecognition();
    // Chrome ends sessions on its own (silence, network blips, throttling) and a
    // failed restart fires no further events, so poll the desired state instead.
    recogWatchdog = window.setInterval(() => {
      if (recogWanted && !recogInstance && !recogRestartTimer) spawnRecognition();
    }, RECOG_WATCHDOG_MS);
  }

  function spawnRecognition() {
    if (!recogWanted || recogInstance || recogHalted) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = state.lang;

    rec.onstart = () => {
      state.transcriptNote = "";
      setLangPill(`${langLabel(state.lang)} ›`);
      renderLiveTranscript();
    };

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

    rec.onerror = (ev) => {
      const err = ev?.error || "";
      // Only a permission failure is worth giving up on; everything else gets
      // another session from onend.
      if (err === "not-allowed" || err === "service-not-allowed") {
        recogHalted = err;
        recogWanted = false;
        setLangPill("Transcript blocked");
        state.transcriptNote = "Speech recognition was denied microphone access.";
      } else if (err === "audio-capture") {
        setLangPill("Transcript mic busy");
      } else if (err === "network") {
        setLangPill("Transcript offline");
      }
      renderLiveTranscript();
    };

    rec.onend = () => {
      if (recogInstance === rec) {
        recogInstance = null;
        state.recognition = null;
      }
      scheduleRecognitionRestart();
    };

    recogInstance = rec;
    state.recognition = rec;
    try {
      rec.start();
    } catch {
      // InvalidStateError while a previous session is still tearing down.
      recogInstance = null;
      state.recognition = null;
      scheduleRecognitionRestart(600);
    }
  }

  function scheduleRecognitionRestart(delay = RECOG_RESTART_MS) {
    if (!recogWanted || recogHalted || recogRestartTimer) return;
    recogRestartTimer = window.setTimeout(() => {
      recogRestartTimer = 0;
      spawnRecognition();
    }, delay);
  }

  function stopRecognition() {
    recogWanted = false;
    if (recogRestartTimer) {
      window.clearTimeout(recogRestartTimer);
      recogRestartTimer = 0;
    }
    if (recogWatchdog) {
      window.clearInterval(recogWatchdog);
      recogWatchdog = 0;
    }
    const rec = recogInstance;
    recogInstance = null;
    state.recognition = null;
    if (!rec) return;
    rec.onend = null;
    rec.onerror = null;
    rec.onstart = null;
    try {
      // stop() keeps onresult alive so trailing words still reach the transcript.
      rec.stop();
    } catch {
      /* ignore */
    }
  }

  function renderLiveTranscript() {
    if (!el.liveTranscript) return;
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
    if (!html) {
      const note = state.transcriptNote || "Listening for speech…";
      html = `<p style="color:var(--text-muted)">${escapeHtml(note)}</p>`;
    }
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
    const label = el.detailVizCard?.querySelector(".viz-label");
    if (label) label.hidden = mode !== "wave";
  }

  /* —— Recording —— */
  let startingRecording = false;
  let pendingShellReload = false;

  function applyPendingShellReload() {
    if (!pendingShellReload || state.recording) return;
    pendingShellReload = false;
    location.reload();
  }

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
      state.transcriptNote = "";
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

      // Start speech first so Chrome can attach to the mic before MediaRecorder
      startRecognition();
      await new Promise((r) => setTimeout(r, 60));

      state.mediaRecorder.start(250);
      state.recording = true;
      state.startedAt = performance.now();
      if (el.recTitle) el.recTitle.textContent = formatTitle(Date.now());
      el.recDot?.classList.remove("paused");
      const pauseLabel = el.pauseBtn?.querySelector("span");
      if (pauseLabel) pauseLabel.textContent = "Pause";
      setView("recording");
      setRecView(state.autoTranscribe && speechSupported() ? "text" : "wave");
      await requestWakeLock();
      cancelAnimationFrame(state.raf);
      state.raf = requestAnimationFrame(loopVisual);
      if (state.blackoutPref) enterBlackout();
    } catch (err) {
      console.error(err);
      state.mediaStream?.getTracks().forEach((t) => t.stop());
      state.mediaStream = null;
      try {
        if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
          state.mediaRecorder.ondataavailable = null;
          state.mediaRecorder.onerror = null;
          state.mediaRecorder.stop();
        }
      } catch {
        /* ignore */
      }
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
    applyPendingShellReload();
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
    state.currentDurationMs = Number(rec.durationMs) > 0 ? Number(rec.durationMs) : 0;
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
    updatePlayUi();
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
    cancelDurationProbe();
    el.audio.pause();
    el.audio.removeAttribute("src");
    el.audio.load();
  }

  function cancelDurationProbe() {
    if (state.durationProbeCleanup) state.durationProbeCleanup();
    state.durationProbeCleanup = null;
    state.durationProbe = false;
  }

  // Seeking far past the end forces Chromium to demux the real duration of a
  // MediaRecorder webm blob; without it audio.duration stays Infinity and
  // seeking is unreliable for the whole first playback.
  function probeDuration() {
    if (state.durationProbe) return;
    const d = el.audio.duration;
    if (Number.isFinite(d) && d > 0) return;
    if (!el.audio.currentSrc && !el.audio.src) return;
    state.durationProbe = true;
    const finish = () => {
      cancelDurationProbe();
      try {
        el.audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      updatePlayUi();
    };
    const onDurationChange = () => {
      if (Number.isFinite(el.audio.duration) && el.audio.duration > 0) finish();
    };
    const timer = setTimeout(() => {
      if (state.durationProbe) finish();
    }, 2000);
    state.durationProbeCleanup = () => {
      clearTimeout(timer);
      el.audio.removeEventListener("durationchange", onDurationChange);
    };
    el.audio.addEventListener("durationchange", onDurationChange);
    try {
      el.audio.currentTime = 1e101;
    } catch {
      finish();
    }
  }

  function updatePlayUi() {
    const playing = !el.audio.paused && !el.audio.ended;
    el.playBtnLabel.textContent = playing ? "Pause" : "Play";
    const playIcon = el.playBtn.querySelector(".icon-play");
    const pauseIcon = el.playBtn.querySelector(".icon-pause");
    if (playIcon) playIcon.hidden = playing;
    if (pauseIcon) pauseIcon.hidden = !playing;
    const dur = audioDurationSec();
    const cur = audioCurrentSec();
    const ratio = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;
    if (!state.seeking) {
      el.seekBar.value = String(Math.round(ratio * 1000));
    }
    el.playTime.textContent = formatDuration(cur * 1000);
    el.remainTime.textContent = `-${formatDuration(Math.max(0, (dur - cur) * 1000))}`;
    const rec = state.recordings.find((r) => r.id === state.currentId);
    if (rec && dur > 0) {
      drawPeaks(el.detailWaveform, rec.peaks, ratio);
      setCardProgress(state.currentId, ratio);
    }
  }

  function applyCardProgress(card, ratio) {
    const remaining = card.querySelector(".rec-card-remaining");
    if (!remaining) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    remaining.style.left = `${clamped * 100}%`;
    // Material-style gap between the played and remaining segments
    remaining.style.marginLeft = clamped > 0.01 ? "4px" : "0";
    remaining.hidden = clamped >= 0.999;
  }

  function setCardProgress(id, ratio) {
    if (!id) return;
    const clamped = Math.max(0, Math.min(1, ratio || 0));
    state.cardProgress[id] = clamped;
    document
      .querySelectorAll(`.rec-card[data-id="${id}"]`)
      .forEach((card) => applyCardProgress(card, clamped));
  }

  el.audio.addEventListener("timeupdate", updatePlayUi);
  el.audio.addEventListener("ended", updatePlayUi);
  el.audio.addEventListener("play", updatePlayUi);
  el.audio.addEventListener("pause", updatePlayUi);
  el.audio.addEventListener("durationchange", updatePlayUi);
  el.audio.addEventListener("loadedmetadata", () => {
    probeDuration();
    updatePlayUi();
  });

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
  const PIN_OK = "OK";
  const PIN_DEL = "⌫";

  function buildPinPad() {
    el.pinPad.innerHTML = "";
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", PIN_OK, "0", PIN_DEL];
    keys.forEach((k) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = k === PIN_OK ? "pin-key pin-key-ok" : "pin-key";
      btn.textContent = k;
      if (k === PIN_OK) btn.setAttribute("aria-label", "Confirm PIN");
      if (k === PIN_DEL) btn.setAttribute("aria-label", "Delete last digit");
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

  function setPinMode(mode) {
    state.pinMode = mode;
    state.pinBuffer = "";
    if (mode === "setup") {
      state.pinConfirm = "";
      el.pinModalTitle.textContent = "Set PIN";
      el.pinModalSub.textContent = "Choose 4–8 digits, then press OK.";
      el.pinClearBtn.hidden = !state.pin;
      el.pinCancelBtn.hidden = false;
    } else if (mode === "confirm") {
      el.pinModalTitle.textContent = "Confirm PIN";
      el.pinModalSub.textContent = "Enter the same PIN again.";
      el.pinClearBtn.hidden = true;
      el.pinCancelBtn.hidden = false;
    } else {
      state.pinConfirm = "";
      el.pinModalTitle.textContent = "Enter PIN";
      el.pinModalSub.textContent = "Unlock to leave blackout.";
      el.pinClearBtn.hidden = true;
      // Unlock must not be dismissible, otherwise the PIN protects nothing.
      el.pinCancelBtn.hidden = true;
    }
    renderPinDots();
  }

  function openPinModal(mode) {
    setPinMode(mode);
    el.pinModal.hidden = false;
  }

  function closePinModal() {
    el.pinModal.hidden = true;
    state.pinBuffer = "";
    state.pinConfirm = "";
    el.pinCancelBtn.hidden = false;
  }

  function submitPin() {
    if (state.pinMode === "setup") {
      if (state.pinBuffer.length < 4) {
        toast("Use at least 4 digits");
        return;
      }
      state.pinConfirm = state.pinBuffer;
      setPinMode("confirm");
      return;
    }
    if (state.pinMode === "confirm") {
      if (state.pinBuffer === state.pinConfirm) {
        state.pin = state.pinBuffer;
        localStorage.setItem(STORAGE_PIN, state.pin);
        el.pinStatus.textContent = "On";
        closePinModal();
        toast("PIN saved");
      } else {
        toast("PINs did not match");
        setPinMode("setup");
      }
      return;
    }
    if (state.pinBuffer === state.pin) {
      closePinModal();
      exitBlackout(true);
      state.unlockResolver?.();
      state.unlockResolver = null;
    } else {
      toast("Wrong PIN");
      state.pinBuffer = "";
      renderPinDots();
    }
  }

  function onPinKey(k) {
    if (k === PIN_DEL) {
      state.pinBuffer = state.pinBuffer.slice(0, -1);
      renderPinDots();
      return;
    }
    if (k === PIN_OK) {
      submitPin();
      return;
    }
    if (state.pinBuffer.length >= 8) return;
    state.pinBuffer += k;
    renderPinDots();
    // Auto-submit only where the target length is already known.
    if (state.pinMode === "confirm" && state.pinBuffer.length === state.pinConfirm.length) submitPin();
    else if (state.pinMode === "unlock" && state.pinBuffer.length === state.pin.length) submitPin();
  }

  let blackoutTookFullscreen = false;

  function enterBlackout() {
    el.blackout.hidden = false;
    el.blackout.classList.add("show-hint");
    clearTimeout(enterBlackout._t);
    enterBlackout._t = setTimeout(() => el.blackout.classList.remove("show-hint"), 1800);
    // A lit status bar or browser toolbar defeats the point of a blackout, so
    // black out the theme colour and claim the whole screen while it is up.
    setThemeColor("#000000");
    const root = document.documentElement;
    if (!document.fullscreenElement && typeof root.requestFullscreen === "function") {
      root
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          blackoutTookFullscreen = true;
        })
        .catch(() => {
          /* No transient activation or unsupported — overlay still covers the page. */
        });
    }
  }

  function exitBlackout(force) {
    if (!force && state.pin) {
      openPinModal("unlock");
      return;
    }
    el.blackout.hidden = true;
    applyTheme();
    if (blackoutTookFullscreen && document.fullscreenElement && typeof document.exitFullscreen === "function") {
      document.exitFullscreen().catch(() => {});
    }
    blackoutTookFullscreen = false;
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
    const rec = await RecDB.get(state.currentId);
    if (!rec) return;
    if (!speechSupported()) {
      toast("Speech recognition not supported in this browser");
      return;
    }
    if (!state.objectUrl) {
      toast("Open the recording first");
      return;
    }

    setDetailView("text");
    el.detailTranscript.innerHTML = `<p style="color:var(--text-muted)">Playing audio for transcription… use speakers (not headphones) so the mic can hear it.</p>`;
    toast("Re-transcribe: play aloud so the mic can hear it");

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = state.lang;

    let finalText = "";
    const segments = [];
    const startedAt = performance.now();

    recognition.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          const chunk = r[0].transcript.trim();
          if (!chunk) continue;
          finalText = `${finalText} ${chunk}`.trim();
          segments.push({
            t: Math.max(0, (performance.now() - startedAt)),
            text: chunk,
            speaker: 1,
          });
        } else {
          interim += r[0].transcript;
        }
      }
      const live = finalText + (interim ? ` ${interim}` : "");
      el.detailTranscript.innerHTML = live
        ? `<div class="speaker-block"><div class="speaker-head"><span class="speaker-dot"></span> Transcript</div><div>${escapeHtml(live.trim())}</div></div>`
        : `<p style="color:var(--text-muted)">Listening…</p>`;
    };

    recognition.onerror = (ev) => {
      if (ev?.error === "not-allowed") toast("Allow microphone to re-transcribe");
    };

    const finish = async () => {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        /* ignore */
      }
      el.audio.removeEventListener("ended", finish);
      if (!finalText.trim()) {
        toast("No speech detected — try again with volume up");
        renderDetailTranscript(rec);
        return;
      }
      rec.transcript = finalText.trim();
      rec.segments = segments;
      rec.summary = buildSummary(rec.transcript);
      await RecDB.put(rec);
      await refreshList();
      renderDetailTranscript(rec);
      if (rec.summary?.length) {
        el.summaryCard.hidden = false;
        el.summaryList.innerHTML = rec.summary.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
      }
      toast("Transcript saved");
    };

    recognition.onend = () => {
      /* keep going until audio ends */
      if (!el.audio.paused && !el.audio.ended) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      recognition.start();
      el.audio.currentTime = 0;
      await el.audio.play();
      el.audio.addEventListener("ended", finish, { once: true });
    } catch (err) {
      console.error(err);
      toast("Could not start re-transcribe");
      renderDetailTranscript(rec);
    }
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
    el.audio.currentTime = Math.max(0, audioCurrentSec() - 5);
    updatePlayUi();
  });
  el.forwardBtn.addEventListener("click", () => {
    const dur = audioDurationSec();
    const next = audioCurrentSec() + 10;
    el.audio.currentTime = dur > 0 ? Math.min(dur, next) : next;
    updatePlayUi();
  });
  el.seekBar.addEventListener("input", () => {
    state.seeking = true;
  });
  el.seekBar.addEventListener("change", () => {
    cancelDurationProbe();
    const dur = audioDurationSec();
    const ratio = Number(el.seekBar.value) / 1000;
    if (dur > 0 && Number.isFinite(ratio)) {
      el.audio.currentTime = Math.max(0, Math.min(1, ratio)) * dur;
    }
    state.seeking = false;
    updatePlayUi();
  });

  if (el.storageToggle) {
    el.storageToggle.addEventListener("click", () => {
      const next = el.storageToggle.getAttribute("aria-expanded") !== "true";
      el.storageToggle.setAttribute("aria-expanded", next ? "true" : "false");
      el.storageToggle.classList.toggle("expanded", next);
      if (el.storageRows) el.storageRows.hidden = !next;
    });
  }

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
  function openSettings() {
    // Remember where we came from — leaving settings must not abandon an
    // in-progress recording or an open recording detail.
    state.settingsReturnView = state.view === "settings" ? "home" : state.view;
    applySettingsLabels();
    setView("settings");
  }

  el.openSettingsBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
    openSettings();
  });
  el.syncNowBtn.addEventListener("click", () => {
    el.profileSheet.hidden = true;
    showNcUnavailable();
  });
  el.settingsBackBtn.addEventListener("click", () => {
    const back = state.settingsReturnView;
    setView(back && el.views[back] ? back : "home");
    state.settingsReturnView = null;
  });

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

  el.pinCancelBtn.addEventListener("click", closePinModal);
  el.pinClearBtn.addEventListener("click", () => {
    state.pin = "";
    localStorage.removeItem(STORAGE_PIN);
    el.pinStatus.textContent = "Off";
    closePinModal();
    toast("PIN cleared");
  });

  el.blackout.addEventListener("click", () => {
    if (state.pin) openPinModal("unlock");
    else exitBlackout(true);
  });

  document.addEventListener("keydown", (e) => {
    if (!el.pinModal.hidden) {
      if (/^[0-9]$/.test(e.key)) onPinKey(e.key);
      else if (e.key === "Backspace") onPinKey(PIN_DEL);
      else if (e.key === "Enter") onPinKey(PIN_OK);
      // Escape must not dismiss the blackout unlock prompt.
      else if (e.key === "Escape" && state.pinMode !== "unlock") closePinModal();
      else return;
      e.preventDefault();
      return;
    }
    if (e.key !== "Escape") return;
    if (!el.ncModal.hidden) el.ncModal.hidden = true;
    else if (!el.detailMenu.hidden) el.detailMenu.hidden = true;
    else if (!el.profileSheet.hidden) el.profileSheet.hidden = true;
    else if (!el.blackout.hidden && !state.pin) exitBlackout(true);
  });

  el.recMenuBtn.addEventListener("click", openSettings);

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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) applyPendingShellReload();
  });

  // The user can leave fullscreen with a system gesture; don't try to exit twice.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) blackoutTookFullscreen = false;
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
    // A first install also claims this page, and reloading then throws away a
    // perfectly fresh shell — plus any recording that just started.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type !== "SW_UPDATED" || !hadController) return;
      const key = "recorder.swReloaded." + (event.data.cache || "");
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      if (state.recording) {
        pendingShellReload = true;
        return;
      }
      location.reload();
    });
  }
})();
