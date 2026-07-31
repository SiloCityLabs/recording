import { RecDB } from "./db.js";
import { Nextcloud } from "./nextcloud.js";
import { OfflineTranscription } from "./offline-transcription.js";
import {
  formatDuration,
  escapeHtml,
  formatTitle,
  formatLongDate,
  monthLabel,
  buildSummary,
  resamplePeaks,
  audioBufferToWav,
  sliceBuffer,
  removeRange,
  micErrorMessage,
  browserProbeFailMessage,
  formatBytes,
  uid,
} from "./rec-lib.js";

(() => {
  "use strict";

  window.RecDB = RecDB;
  window.Nextcloud = Nextcloud;
  window.OfflineTranscription = OfflineTranscription;

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
    retranscribeMenuBtn: document.getElementById("retranscribeMenuBtn"),
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
    offlineTranscribeSub: document.getElementById("offlineTranscribeSub"),
    offlineTranscribeBtn: document.getElementById("offlineTranscribeBtn"),
    offlineTranscribeToggle: document.getElementById("offlineTranscribeToggle"),
    offlineTranscribeSwitchWrap: document.getElementById("offlineTranscribeSwitchWrap"),
    offlineTranscribeProgress: document.getElementById("offlineTranscribeProgress"),
    offlineTranscribeProgressFill: document.getElementById("offlineTranscribeProgressFill"),
    offlineTranscribeProgressLabel: document.getElementById("offlineTranscribeProgressLabel"),
    langModal: document.getElementById("langModal"),
    langModalSub: document.getElementById("langModalSub"),
    langOptions: document.getElementById("langOptions"),
    langCancelBtn: document.getElementById("langCancelBtn"),
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
    speechNetworkFailed: false,
    offlineTranscribingId: null,
    retranscribeAbort: null,
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

  function hideToast() {
    el.toast.hidden = true;
    el.toast.classList.remove("is-sticky");
    el.toastAction.hidden = true;
    el.toastAction.onclick = null;
  }

  /**
   * @param {string} msg
   * @param {{ label: string, onClick: function } | { sticky?: boolean, duration?: number }} [opts]
   *   Undo actions use `{ label, onClick }`. Sticky progress uses `{ sticky: true }`.
   */
  function toast(msg, opts) {
    el.toastMsg.textContent = msg;
    const isUndo = !!(opts && typeof opts.onClick === "function" && opts.label);
    const sticky = !!(opts && opts.sticky && !isUndo);
    if (isUndo) {
      el.toastAction.textContent = opts.label;
      el.toastAction.hidden = false;
      el.toastAction.onclick = () => {
        hideToast();
        opts.onClick();
      };
    } else {
      el.toastAction.hidden = true;
      el.toastAction.onclick = null;
    }
    el.toast.classList.toggle("is-sticky", sticky);
    el.toast.hidden = false;
    clearTimeout(toast._t);
    if (sticky) return;
    toast._t = setTimeout(hideToast, isUndo ? 6000 : opts?.duration || 2800);
  }

  function stickyToast(msg) {
    toast(msg, { sticky: true });
  }

  // Every clock string in the UI goes through here, so it must never be able to
  // emit NaN/Infinity even when handed a media element's unresolved duration.
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
  const CLOUD_ON_SVG = `<svg class="rec-card-cloud is-synced" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`;

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
      const cloudSvg = rec.synced ? CLOUD_ON_SVG : CLOUD_OFF_SVG;
      const cloudLabel = rec.synced ? "Backed up to Nextcloud" : "Not backed up";
      btn.innerHTML = `
        <div class="rec-card-head">
          <span class="rec-card-cloud-wrap" title="${cloudLabel}" aria-label="${cloudLabel}">${cloudSvg}</span>
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

  function ncErrorMessage(err) {
    const msg = err?.message || String(err || "");
    // Browsers surface CORS / network blocks as TypeError with a generic message.
    if (err?.name === "TypeError" || /Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return "Connection failed — enable CORS on your Nextcloud (see CORS.md)";
    }
    return msg || "Nextcloud request failed";
  }

  function updateSyncBadge() {
    const on = !!(state.nc.enabled && state.nc.url && state.nc.username && state.nc.appPassword);
    el.syncBadge.hidden = false;
    el.syncBadge.classList.toggle("off", !on);
    el.syncBadge.title = on ? "Nextcloud sync on" : "Nextcloud sync off";
    el.syncBadge.innerHTML = on
      ? `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M24 15c0-2.64-2.05-4.78-4.65-4.96A7.49 7.49 0 0 0 12 4c-.7 0-1.37.1-2 .29L20.36 14.66A4.98 4.98 0 0 1 24 15zM3.71 4.56 2.29 5.97l2.6 2.6A5.98 5.98 0 0 0 0 14c0 3.31 2.69 6 6 6h11.17l2.86 2.86 1.41-1.41L3.71 4.56z"/></svg>`;
    if (el.ncStatus) el.ncStatus.textContent = on ? "On" : "Off — requires CORS on your server";
  }

  async function measureCacheBreakdown() {
    const out = { appBytes: 0, modelBytes: 0, modelLabel: "", modelInstalled: false };
    if (!("caches" in window)) return out;
    const names = await caches.keys();
    for (const name of names) {
      const isTranscription = name.startsWith("recorder-transcription-");
      let bucket = 0;
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      for (const req of reqs) {
        const res = await cache.match(req);
        if (!res) continue;
        try {
          const buf = await res.clone().arrayBuffer();
          bucket += buf.byteLength;
        } catch {
          /* ignore */
        }
      }
      if (isTranscription) out.modelBytes += bucket;
      else out.appBytes += bucket;
    }
    const api = offlineApi();
    if (api) {
      try {
        const info = await api.getInstalledInfo();
        if (info) {
          out.modelInstalled = true;
          if (info.label) out.modelLabel = info.label;
          // Responses that refuse arrayBuffer() leave the measured size at 0;
          // the recorded download size still describes what is on the device.
          if (!out.modelBytes) out.modelBytes = info.bytes || 0;
        }
      } catch {
        /* ignore */
      }
    }
    return out;
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
    const [cacheParts, recBytes] = await Promise.all([
      measureCacheBreakdown(),
      measureRecordingBytes(),
    ]);
    const pct = quota ? Math.min(100, (usage / quota) * 100) : 0;
    el.storageFill.style.width = `${pct.toFixed(1)}%`;
    el.storageLabel.textContent = state.nc.enabled ? "Local + Nextcloud" : "Site data";
    const totalLabel = quota
      ? `${formatBytes(usage)} / ${formatBytes(quota)}`
      : formatBytes(usage);
    if (el.storageTotal) {
      el.storageTotal.textContent = totalLabel;
      el.storageTotal.hidden = false;
    }
    if (el.storageRows) {
      const modelName = cacheParts.modelLabel
        ? `Offline model (${cacheParts.modelLabel})`
        : "Offline model";
      const modelValue =
        cacheParts.modelBytes > 0
          ? formatBytes(cacheParts.modelBytes)
          : cacheParts.modelInstalled
            ? "Installed"
            : "Not downloaded";
      el.storageRows.innerHTML = `
        <div class="storage-row"><span>Recordings</span><span>${state.recordings.length} · ${formatBytes(recBytes)}</span></div>
        <div class="storage-row"><span>App cache</span><span>${formatBytes(cacheParts.appBytes)}</span></div>
        <div class="storage-row"><span>${escapeHtml(modelName)}</span><span>${escapeHtml(modelValue)}</span></div>
        <div class="storage-row"><span>Browser total</span><span>${totalLabel}</span></div>`;
    }
    if (state.nc.username) {
      const letter = state.nc.username[0].toUpperCase();
      if (el.avatarLetter) el.avatarLetter.textContent = letter;
      if (el.sheetAvatar) el.sheetAvatar.textContent = letter;
      if (el.sheetHello) el.sheetHello.textContent = `Hi, ${state.nc.username}`;
    }
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
  /** Give up restarting live speech after this many consecutive network errors. */
  const RECOG_NETWORK_GIVE_UP = 2;
  let recogWanted = false;
  let recogInstance = null;
  let recogRestartTimer = 0;
  let recogWatchdog = 0;
  let recogHalted = "";
  let recogNetworkStrikes = 0;

  function speechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function offlineApi() {
    return window.OfflineTranscription || null;
  }

  function offlineReady() {
    const api = offlineApi();
    return !!(api && api.isEnabled() && api.isInstalledCached(state.lang));
  }

  /** Browser live mode XOR offline mode — never both. */
  function setBrowserTranscribe(on) {
    state.autoTranscribe = !!on;
    localStorage.setItem(STORAGE_TRANSCRIBE, state.autoTranscribe ? "on" : "off");
    if (el.autoTranscribeToggle) el.autoTranscribeToggle.checked = state.autoTranscribe;
  }

  function setOfflineTranscribe(on) {
    const api = offlineApi();
    if (!api) return;
    api.setEnabled(!!on);
    if (el.offlineTranscribeToggle) el.offlineTranscribeToggle.checked = !!on;
  }

  function enforceExclusiveModes() {
    // If offline is enabled, browser live must be off.
    if (offlineApi()?.isEnabled() && state.autoTranscribe) {
      setBrowserTranscribe(false);
    }
  }

  /**
   * Brief SpeechRecognition probe after the user enables browser mode.
   * Succeeds on a stable start; fails on missing API, permission, or network/service errors.
   */
  function probeBrowserSpeech() {
    if (!speechSupported()) {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    return new Promise((resolve) => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.lang = state.lang;
      let settled = false;
      let started = false;
      let confirmTimer = 0;
      const done = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        clearTimeout(confirmTimer);
        try {
          rec.onstart = null;
          rec.onerror = null;
          rec.onend = null;
          rec.abort();
        } catch {
          /* ignore */
        }
        resolve(result);
      };
      const timeout = setTimeout(() => {
        done(started ? { ok: true } : { ok: false, reason: "timeout" });
      }, 4500);
      rec.onstart = () => {
        started = true;
        // Catch immediate network/service failures that fire right after start.
        confirmTimer = setTimeout(() => done({ ok: true }), 1400);
      };
      rec.onerror = (ev) => {
        const err = ev?.error || "";
        if (err === "no-speech" || err === "aborted") {
          if (started) done({ ok: true });
          return;
        }
        done({ ok: false, reason: err || "error" });
      };
      try {
        rec.start();
      } catch {
        done({ ok: false, reason: "start-failed" });
      }
    });
  }

  async function refreshOfflineInstalledFlag() {
    const api = offlineApi();
    if (!api) return false;
    try {
      return await api.isOfflineModelInstalled(state.lang);
    } catch {
      return false;
    }
  }

  function offlineRecordingNote() {
    return "Offline mode: this recording will be transcribed privately on-device after you stop.";
  }

  function setLangPill(text) {
    if (!el.langPill) return;
    el.langPill.hidden = false;
    el.langPill.textContent = text;
  }

  function haltRecognition(reason) {
    recogHalted = reason || "halted";
    recogWanted = false;
    if (recogRestartTimer) {
      window.clearTimeout(recogRestartTimer);
      recogRestartTimer = 0;
    }
    if (recogWatchdog) {
      window.clearInterval(recogWatchdog);
      recogWatchdog = 0;
    }
  }

  function startRecognition() {
    stopRecognition();
    state.transcriptNote = "";
    state.speechNetworkFailed = false;
    recogNetworkStrikes = 0;

    // Exclusive offline mode — no live browser speech.
    if (offlineReady() && !state.autoTranscribe) {
      setLangPill("Offline after stop");
      state.transcriptNote = offlineRecordingNote();
      renderLiveTranscript();
      return;
    }

    if (!state.autoTranscribe) {
      if (el.langPill) el.langPill.hidden = true;
      state.transcriptNote = "Transcription is off — enable Browser or Offline in Settings.";
      renderLiveTranscript();
      return;
    }

    if (!speechSupported()) {
      setLangPill("Transcript unavailable");
      state.transcriptNote =
        "This browser has no Web Speech API. Switch to Offline transcription in Settings, or use Chrome / Edge.";
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
      // Keep a stable offline/network note if we already know the service is down.
      if (!state.speechNetworkFailed) {
        state.transcriptNote = "";
        setLangPill(`${langLabel(state.lang)} ›`);
      }
      renderLiveTranscript();
    };

    rec.onresult = (ev) => {
      recogNetworkStrikes = 0;
      state.speechNetworkFailed = false;
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
      setLangPill(`${langLabel(state.lang)} ›`);
      renderLiveTranscript();
    };

    rec.onerror = (ev) => {
      const err = ev?.error || "";
      // Permission failures stop immediately. Persistent network failure stops
      // the restart loop so the lang pill does not flicker.
      if (err === "not-allowed" || err === "service-not-allowed") {
        haltRecognition(err);
        setLangPill("Transcript blocked");
        state.transcriptNote = "Speech recognition was denied microphone access.";
      } else if (err === "audio-capture") {
        setLangPill("Transcript mic busy");
      } else if (err === "network") {
        state.speechNetworkFailed = true;
        recogNetworkStrikes += 1;
        setLangPill("Transcript offline");
        state.transcriptNote =
          "Browser speech service is unreachable. Try again later, or switch to Offline transcription in Settings.";
        if (recogNetworkStrikes >= RECOG_NETWORK_GIVE_UP) {
          haltRecognition("network");
        }
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
    recogNetworkStrikes = 0;
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
      setRecView(state.autoTranscribe || offlineReady() ? "text" : "wave");
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
        // Kick off local transcription after the audio is safely stored.
        queueMicrotask(() => {
          maybeOfflineTranscribe(rec.id).catch((err) => console.error(err));
        });
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

  function shouldOfflineTranscribe() {
    const api = offlineApi();
    // Offline mode is exclusive — run after every save while it is enabled.
    return !!(api && api.isEnabled() && api.isInstalledCached(state.lang));
  }

  async function maybeOfflineTranscribe(id) {
    const api = offlineApi();
    if (!api) return;
    await refreshOfflineInstalledFlag();
    const rec = await RecDB.get(id);
    if (!rec || !shouldOfflineTranscribe()) return;
    if (state.offlineTranscribingId === id || api.isTranscribing()) return;
    await runOfflineTranscribe(rec, { reason: "auto" });
  }

  async function runOfflineTranscribe(rec, { reason } = {}) {
    const api = offlineApi();
    if (!api) return;
    if (state.offlineTranscribingId) {
      toast("Already transcribing a recording");
      return;
    }
    state.offlineTranscribingId = rec.id;
    const ac = new AbortController();
    state.retranscribeAbort = ac;

    const stickyProgress = (msg) => {
      stickyToast(msg);
    };

    try {
      stickyProgress(reason === "manual" ? "Transcribing on-device…" : "Transcribing on-device…");
      if (state.currentId === rec.id && state.view === "detail") {
        setDetailView("text");
      }
      const result = await api.transcribeAudioBlob(rec.blob, {
        signal: ac.signal,
        lang: state.lang,
        onProgress: (p) => {
          if (p.phase === "decode") stickyProgress("Decoding audio…");
          else if (p.phase === "load") stickyProgress("Loading offline model…");
          else if (p.phase === "recognize") {
            const partial = (p.partial || "").trim();
            stickyProgress(partial ? `Transcribing… ${partial}` : "Transcribing on-device…");
          }
        },
      });
      // Re-read so we do not clobber title/favorite/sync edits made meanwhile.
      const fresh = await RecDB.get(rec.id);
      if (!fresh) {
        hideToast();
        return;
      }
      if (!result.text) {
        toast("No speech detected in on-device transcription");
        if (state.currentId === fresh.id) renderDetailTranscript(fresh);
        return;
      }
      fresh.transcript = result.text;
      fresh.segments = result.segments || [{ t: 0, text: result.text, speaker: 1 }];
      fresh.summary = buildSummary(fresh.transcript);
      await RecDB.put(fresh);
      await refreshList();
      if (state.currentId === fresh.id) {
        renderDetailTranscript(fresh);
        if (fresh.summary?.length) {
          el.summaryCard.hidden = false;
          el.summaryList.innerHTML = fresh.summary.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
        }
      }
      toast("On-device transcript saved");
    } catch (err) {
      if (err?.name === "AbortError") {
        toast("Transcription cancelled");
      } else {
        console.error(err);
        toast(err?.message || "On-device transcription failed — recording kept");
      }
      if (state.currentId === rec.id) {
        const fresh = await RecDB.get(rec.id);
        if (fresh) renderDetailTranscript(fresh);
      }
    } finally {
      if (state.offlineTranscribingId === rec.id) state.offlineTranscribingId = null;
      if (state.retranscribeAbort === ac) state.retranscribeAbort = null;
    }
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
      const api = offlineApi();
      let hint = "No transcript.";
      if (state.offlineTranscribingId === rec.id) {
        hint = "Transcribing on-device…";
      } else if (api?.isInstalledCached(state.lang) && api.isEnabled()) {
        hint += " Use “Transcribe again” for on-device transcription.";
      } else {
        hint += " Enable Offline transcription in Settings for on-device transcripts.";
      }
      el.detailTranscript.innerHTML = `<p style="color:var(--text-muted)">${escapeHtml(hint)}</p>`;
      return;
    }
    el.detailTranscript.innerHTML = segs
      .map(
        (s) => `
      <div class="speaker-block" data-t="${s.t}">
        <div class="speaker-head"><span class="speaker-dot"></span> Speaker ${s.speaker || 1} · ${formatDuration(s.t || 0)}</div>
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

  /* —— Nextcloud —— */
  async function maybeAutoSync(rec) {
    if (!state.nc.enabled) return;
    try {
      await syncOne(rec);
    } catch (err) {
      console.warn(err);
    }
  }

  async function syncOne(rec) {
    const ext = (rec.mimeType || "").includes("mp4")
      ? "m4a"
      : (rec.mimeType || "").includes("wav")
        ? "wav"
        : "webm";
    const name = `${rec.id}.${ext}`;
    await Nextcloud.upload(state.nc, name, rec.blob, rec.mimeType);
    if (rec.transcript) {
      const meta = new Blob(
        [
          JSON.stringify(
            { title: rec.title, transcript: rec.transcript, createdAt: rec.createdAt },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      await Nextcloud.upload(state.nc, `${rec.id}.json`, meta, "application/json");
    }
    rec.synced = true;
    rec.syncName = name;
    await RecDB.put(rec);
    await refreshList();
  }

  async function syncAll() {
    if (!state.nc.enabled) {
      openNcModal();
      return;
    }
    toast("Syncing…");
    let ok = 0;
    for (const rec of state.recordings) {
      if (rec.synced) continue;
      try {
        await syncOne(rec);
        ok++;
      } catch (err) {
        toast(ncErrorMessage(err));
        return;
      }
    }
    toast(ok ? `Synced ${ok}` : "Already up to date");
  }

  function openNcModal() {
    const cfg = state.nc;
    el.ncUrl.value = cfg.url || "";
    el.ncUser.value = cfg.username || "";
    el.ncPass.value = cfg.appPassword || "";
    el.ncFolder.value = cfg.folder || "/Recorder";
    el.ncEnabled.checked = !!cfg.enabled;
    el.ncModal.hidden = false;
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
    // Local-only delete: keep Nextcloud copies so users can free phone storage.
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
    if (state.offlineTranscribingId) {
      toast("Transcription already in progress");
      return;
    }

    const api = offlineApi();
    await refreshOfflineInstalledFlag();
    if (!(api && api.isEnabled() && api.isInstalledCached(state.lang))) {
      toast("Install Offline transcription in Settings to re-transcribe");
      return;
    }

    el.detailMenu.hidden = true;
    await runOfflineTranscribe(rec, { reason: "manual" });
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
    el.menuMetaSync.textContent = rec.synced ? "Backed up to Nextcloud" : "Not backed up";
    el.speedBtn.textContent = `${SPEEDS[state.speedIndex]}×`;
    await refreshOfflineInstalledFlag();
    if (el.retranscribeMenuBtn) {
      el.retranscribeMenuBtn.hidden = !offlineReady();
    }
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
      } else if (action === "retranscribe") retranscribe();
      else if (action === "sync") {
        const rec = await RecDB.get(state.currentId);
        if (!rec) return;
        if (!state.nc.enabled) openNcModal();
        else {
          try {
            await syncOne(rec);
            toast("Uploaded");
          } catch (err) {
            toast(ncErrorMessage(err));
          }
        }
      }
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
    openNcModal();
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
    syncAll();
  });
  el.settingsBackBtn.addEventListener("click", () => {
    const back = state.settingsReturnView;
    setView(back && el.views[back] ? back : "home");
    state.settingsReturnView = null;
  });

  document.querySelectorAll("[data-settings]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.settings;
      if (key === "nextcloud") openNcModal();
      else if (key === "theme") {
        const i = THEME_ORDER.indexOf(state.theme);
        state.theme = THEME_ORDER[(i + 1) % THEME_ORDER.length];
        localStorage.setItem(STORAGE_THEME, state.theme);
        applyTheme();
      } else if (key === "pin") {
        openPinModal("setup");
      } else if (key === "lang") {
        openLangModal();
      }
    });
  });

  async function openLangModal() {
    if (!el.langModal || !el.langOptions) return;
    const api = offlineApi();
    if (api) await api.refreshKnownBytes();
    const installed = api ? await api.getInstalledInfo() : null;
    el.langOptions.innerHTML = "";
    for (const lang of LANGS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lang-option" + (lang.id === state.lang ? " is-selected" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", lang.id === state.lang ? "true" : "false");
      const downloadBytes = api ? api.approximateDownloadBytes(lang.id) : 0;
      const sizeLabel = api ? api.formatBytes(downloadBytes) : "";
      btn.innerHTML = `
        <span class="lang-option-label">${escapeHtml(lang.label)}</span>
        <span class="lang-option-meta">${escapeHtml(sizeLabel ? `Offline ~${sizeLabel}` : "")}</span>`;
      btn.addEventListener("click", () => selectTranscriptionLanguage(lang.id));
      el.langOptions.appendChild(btn);
    }
    if (el.langModalSub) {
      if (installed) {
        el.langModalSub.textContent = `Live browser transcription and the optional offline model. Offline model installed: ${installed.label} (~${(api && api.formatBytes(installed.bytes)) || "—"}). Switching to another language replaces it.`;
      } else {
        el.langModalSub.textContent =
          "Used for live browser transcription and the optional offline model. Download size depends on the language.";
      }
    }
    el.langModal.hidden = false;
  }

  function closeLangModal() {
    if (el.langModal) el.langModal.hidden = true;
  }

  async function selectTranscriptionLanguage(nextId) {
    if (!LANGS.some((l) => l.id === nextId)) return;
    if (nextId === state.lang) {
      closeLangModal();
      return;
    }

    const api = offlineApi();
    const nextLabel = langLabel(nextId);
    if (api) {
      const installed = await api.getInstalledInfo();
      const nextModel = api.langEntry(nextId).modelId;
      if (installed && installed.modelId !== nextModel) {
        const oldSize = api.formatBytes(installed.bytes || api.approximateDownloadBytes(installed.lang));
        const newSize = api.formatBytes(api.approximateDownloadBytes(nextId));
        const ok = confirm(
          `Switching to ${nextLabel} will replace the offline ${installed.label} model (~${oldSize} stored) with a ${nextLabel} model (about ${newSize} download). Continue?`
        );
        if (!ok) return;
        try {
          await api.deleteOfflineModel();
          toast("Offline model removed — download the new language in Settings");
          updateStorageCard();
        } catch (err) {
          console.error(err);
          toast("Could not remove the offline model");
          return;
        }
      }
    }

    state.lang = nextId;
    localStorage.setItem(STORAGE_LANG, state.lang);
    el.langSettingLabel.textContent = langLabel(state.lang);
    closeLangModal();
    await refreshOfflineInstalledFlag();
    await refreshOfflineTranscribeUi();
  }

  el.langCancelBtn?.addEventListener("click", closeLangModal);
  el.langModal?.addEventListener("click", (e) => {
    if (e.target === el.langModal) closeLangModal();
  });

  el.wakeLockToggle.addEventListener("change", () => {
    state.wakeLockPref = el.wakeLockToggle.checked;
    localStorage.setItem(STORAGE_WAKE, state.wakeLockPref ? "on" : "off");
  });
  el.blackoutToggle.addEventListener("change", () => {
    state.blackoutPref = el.blackoutToggle.checked;
    localStorage.setItem(STORAGE_BLACKOUT, state.blackoutPref ? "on" : "off");
  });
  el.autoTranscribeToggle.addEventListener("change", async () => {
    const turnOn = el.autoTranscribeToggle.checked;
    if (!turnOn) {
      setBrowserTranscribe(false);
      toast("Browser transcription off");
      return;
    }

    // Probe before committing — leave off + toast if the API/service fails.
    el.autoTranscribeToggle.disabled = true;
    stickyToast("Checking browser transcription…");
    const probe = await probeBrowserSpeech();
    el.autoTranscribeToggle.disabled = false;
    if (!probe.ok) {
      setBrowserTranscribe(false);
      toast(browserProbeFailMessage(probe.reason));
      return;
    }

    setOfflineTranscribe(false);
    setBrowserTranscribe(true);
    toast("Browser transcription on");
    refreshOfflineTranscribeUi();
  });

  let offlineUiBusy = false;

  async function refreshOfflineTranscribeUi() {
    const api = offlineApi();
    if (!api || !el.offlineTranscribeSub) return;
    const status = await api.getStatus(state.lang);
    const sizeLabel = api.formatBytes(status.downloadBytes);
    const storedLabel = api.formatBytes(status.storedBytes);
    const langName = status.langLabel || langLabel(state.lang);

    el.offlineTranscribeProgress.hidden = true;
    el.offlineTranscribeBtn.disabled = offlineUiBusy;

    if (!status.supported) {
      el.offlineTranscribeSwitchWrap.hidden = true;
      el.offlineTranscribeBtn.hidden = true;
      el.offlineTranscribeSub.textContent = `Unavailable on this device: ${status.unsupportedReasons.join("; ")}.`;
      return;
    }

    if (status.installed) {
      el.offlineTranscribeSwitchWrap.hidden = false;
      el.offlineTranscribeToggle.checked = status.enabled;
      el.offlineTranscribeBtn.hidden = false;
      el.offlineTranscribeBtn.textContent = "Delete offline model";
      el.offlineTranscribeBtn.classList.add("danger-text");
      el.offlineTranscribeSub.textContent = status.enabled
        ? `${status.modelLabel} · ~${storedLabel || sizeLabel} stored. Transcripts run on-device after each recording (browser live transcription is off).`
        : `${status.modelLabel} is installed (~${storedLabel || sizeLabel}) but off. Enable to use on-device transcription instead of the browser.`;
      return;
    }

    if (status.installedInfo && status.conflicts) {
      el.offlineTranscribeSwitchWrap.hidden = true;
      el.offlineTranscribeBtn.hidden = false;
      el.offlineTranscribeBtn.textContent = "Download and enable";
      el.offlineTranscribeBtn.classList.remove("danger-text");
      const oldSize = api.formatBytes(status.installedInfo.bytes || 0);
      el.offlineTranscribeSub.textContent = `Current language is ${langName} (~${sizeLabel}). An offline ${status.installedInfo.label} model (~${oldSize || "—"}) is still stored — change language back or download ${langName} to replace it.`;
      return;
    }

    el.offlineTranscribeSwitchWrap.hidden = true;
    el.offlineTranscribeBtn.hidden = false;
    el.offlineTranscribeBtn.textContent = "Download and enable";
    el.offlineTranscribeBtn.classList.remove("danger-text");
    el.offlineTranscribeSub.textContent = `Transcribe privately on this device after recording (instead of browser live transcription). ${langName} model — one-time download of approximately ${sizeLabel}.`;
  }

  el.offlineTranscribeToggle?.addEventListener("change", () => {
    const api = offlineApi();
    if (!api) return;
    const turnOn = el.offlineTranscribeToggle.checked;
    if (turnOn) {
      setBrowserTranscribe(false);
      setOfflineTranscribe(true);
      toast("Offline transcription on — browser live off");
    } else {
      setOfflineTranscribe(false);
      toast("Offline transcription off");
    }
    refreshOfflineTranscribeUi();
  });

  el.offlineTranscribeBtn?.addEventListener("click", async () => {
    const api = offlineApi();
    if (!api || offlineUiBusy) return;
    const status = await api.getStatus(state.lang);
    if (status.installed) {
      if (!confirm("Delete the offline transcription model from this device?")) return;
      offlineUiBusy = true;
      try {
        await api.deleteOfflineModel();
        toast("Offline model deleted");
        updateStorageCard();
      } catch (err) {
        console.error(err);
        toast("Could not delete offline model");
      } finally {
        offlineUiBusy = false;
        await refreshOfflineTranscribeUi();
      }
      return;
    }

    // Replacing a different-language install: clear first so download starts clean.
    if (status.installedInfo && status.conflicts) {
      const ok = confirm(
        `Download ${status.langLabel} (~${api.formatBytes(status.downloadBytes)}) and replace the stored ${status.installedInfo.label} model?`
      );
      if (!ok) return;
    }

    offlineUiBusy = true;
    el.offlineTranscribeBtn.disabled = true;
    el.offlineTranscribeProgress.hidden = false;
    el.offlineTranscribeProgressFill.style.width = "0%";
    el.offlineTranscribeProgressLabel.textContent = `Downloading ${status.langLabel}…`;
    try {
      await api.downloadOfflineModel((p) => {
        const pct = Math.round((p.overall || 0) * 100);
        el.offlineTranscribeProgressFill.style.width = `${pct}%`;
        if (p.phase === "download") {
          const rec = api.formatBytes(p.received || 0);
          const tot = api.formatBytes(p.total || status.downloadBytes);
          el.offlineTranscribeProgressLabel.textContent = `Downloading ${status.langLabel}… ${pct}% (${rec} / ${tot})`;
        } else if (p.phase === "done") {
          el.offlineTranscribeProgressLabel.textContent = "Installed";
          el.offlineTranscribeProgressFill.style.width = "100%";
        }
      }, state.lang);
      setBrowserTranscribe(false);
      toast(`${status.langLabel} offline transcription ready — browser live off`);
      updateStorageCard();
    } catch (err) {
      console.error(err);
      if (err?.name === "AbortError") toast("Download cancelled");
      else if (/quota|storage|QuotaExceeded/i.test(String(err?.name || err?.message || ""))) {
        toast("Not enough storage for the offline model");
      } else {
        toast(err?.message || "Download failed — try again");
      }
    } finally {
      offlineUiBusy = false;
      await refreshOfflineTranscribeUi();
    }
  });

  function applySettingsLabels() {
    el.wakeLockToggle.checked = state.wakeLockPref;
    el.blackoutToggle.checked = state.blackoutPref;
    el.autoTranscribeToggle.checked = state.autoTranscribe;
    el.langSettingLabel.textContent = langLabel(state.lang);
    el.pinStatus.textContent = state.pin ? "On" : "Off";
    el.themeSettingLabel.textContent = state.theme[0].toUpperCase() + state.theme.slice(1);
    updateSyncBadge();
    refreshOfflineTranscribeUi();
  }

  el.ncCancelBtn.addEventListener("click", () => {
    el.ncModal.hidden = true;
  });
  el.ncSaveBtn.addEventListener("click", () => {
    state.nc = {
      enabled: el.ncEnabled.checked,
      url: el.ncUrl.value.trim(),
      username: el.ncUser.value.trim(),
      appPassword: el.ncPass.value,
      folder: el.ncFolder.value.trim() || "/Recorder",
    };
    Nextcloud.saveConfig(state.nc);
    el.ncModal.hidden = true;
    updateSyncBadge();
    updateStorageCard();
    toast("Nextcloud settings saved");
  });
  el.ncTestBtn.addEventListener("click", async () => {
    const cfg = {
      enabled: true,
      url: el.ncUrl.value.trim(),
      username: el.ncUser.value.trim(),
      appPassword: el.ncPass.value,
      folder: el.ncFolder.value.trim() || "/Recorder",
    };
    try {
      await Nextcloud.test(cfg);
      toast("Connected");
    } catch (err) {
      toast(ncErrorMessage(err));
    }
  });

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
    else if (el.langModal && !el.langModal.hidden) closeLangModal();
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
  enforceExclusiveModes();
  applySettingsLabels();
  refreshList();
  refreshOfflineInstalledFlag().then(() => {
    enforceExclusiveModes();
    applySettingsLabels();
  });

  if ("serviceWorker" in navigator) {
    // A first install also claims this page, and reloading then throws away a
    // perfectly fresh shell — plus any recording that just started.
    const hadController = !!navigator.serviceWorker.controller;

    function askSwToPruneCaches() {
      const ctrl = navigator.serviceWorker.controller;
      if (ctrl) ctrl.postMessage({ type: "CLEAR_OBSOLETE_CACHES" });
    }

    navigator.serviceWorker
      .register("./sw.js", { type: "module" })
      .then((reg) => {
        // Pick up new deploys without waiting for the browser's 24h check.
        const poke = () => {
          try {
            reg.update();
          } catch {
            /* ignore */
          }
        };
        poke();
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) {
            poke();
            askSwToPruneCaches();
          }
        });
        askSwToPruneCaches();
      })
      .catch(() => {});

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
