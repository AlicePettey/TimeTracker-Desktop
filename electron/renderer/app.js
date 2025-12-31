/**
 * TimeTracker Desktop - Renderer Process (electron/renderer/app.js)
 *
 * - Plain HTML UI
 * - Uses window.electronAPI exposed by preload.js
 * - Auto-saves most settings on change/blur
 * - Uses explicit Save for Sync URL/Token
 */

/* -----------------------------
   State
-------------------------------- */
let currentTab = 'activities';
let activities = [];
let settings = {};
let isSyncing = false;
let lastTrackingStatus = null;

/* -----------------------------
   DOM helpers
-------------------------------- */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const el = {
  // Window controls
  btnMinimize: $('btn-minimize'),
  btnClose: $('btn-close'),

  // Tabs
  navTabs: $$('.nav-tab'),
  tabPanels: $$('.tab-panel'),

  // Status
  statusIndicator: $('status-indicator'),
  statusIcon: $('status-icon'),
  statusText: $('status-text'),
  statusTime: $('status-time'),
  currentAppName: $('current-app-name'),
  currentAppTitle: $('current-app-title'),

  // Activities
  activityList: $('activity-list'),

  // Sync section
  syncBadge: $('sync-badge'),
  syncInfo: $('sync-info'),
  syncUrl: $('sync-url'),
  syncToken: $('sync-token'),
  btnSaveSync: $('btn-save-sync'),
  btnSyncNow: $('btn-sync-now'),
  btnQuickSync: $('btn-quick-sync'),

  // Settings
  toggleTracking: $('toggle-tracking'),
  toggleStartup: $('toggle-startup'),
  toggleTray: $('toggle-tray'),
  toggleAutoupdate: $('toggle-autoupdate'),
  idleThreshold: $('idle-threshold'),

  // New tracking controls
  minActivityDuration: $('min-activity-duration'),
  switchDebounceSeconds: $('switch-debounce-seconds'),
  excludeApps: $('exclude-apps'),
  excludeTitles: $('exclude-titles'),

  // Version / updater
  appVersion: $('app-version'),
  updateBanner: $('update-banner'),
  updateTitle: $('update-title'),
  updateText: $('update-text'),
  updateProgress: $('update-progress'),
  updateProgressFill: $('update-progress-fill'),
  updateActions: $('update-actions'),
  btnUpdateDownload: $('btn-update-download'),
  btnUpdateInstall: $('btn-update-install'),
  btnUpdateSkip: $('btn-update-skip'),

  // Toast
  toast: $('toast'),
  toastIcon: $('toast-icon'),
  toastTitle: $('toast-title'),
  toastMessage: $('toast-message'),
};

/* -----------------------------
   Initialization
-------------------------------- */
async function init() {
  setupEventListeners();
  setupIpcListeners();

  await loadSettings();
  await loadActivities();
  await loadSyncStatus();
  await loadVersion();
  await refreshUpdateStatus();

  // Update tracking status periodically
  setInterval(updateTrackingStatus, 1000);
}

function setupEventListeners() {
  // Window controls
  el.btnMinimize?.addEventListener('click', () => window.electronAPI.minimizeWindow());
  el.btnClose?.addEventListener('click', () => window.electronAPI.closeWindow());

  // Tab navigation
  el.navTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Sync actions
  el.btnSaveSync?.addEventListener('click', saveSyncSettings);
  el.btnSyncNow?.addEventListener('click', syncNow);
  el.btnQuickSync?.addEventListener('click', syncNow);

  // Settings toggles
  el.toggleTracking?.addEventListener('change', () => toggleTracking(el.toggleTracking.checked));
  el.toggleStartup?.addEventListener('change', () => toggleStartup(el.toggleStartup.checked));
  el.toggleTray?.addEventListener('change', () => toggleTray(el.toggleTray.checked));
  el.toggleAutoupdate?.addEventListener('change', () => toggleAutoupdate(el.toggleAutoupdate.checked));

  // Idle threshold (minutes input -> seconds stored)
  el.idleThreshold?.addEventListener('change', updateIdleThreshold);

  // New tracking controls
  el.minActivityDuration?.addEventListener('change', () => updateMinActivityDuration(el.minActivityDuration.value));
  el.switchDebounceSeconds?.addEventListener('change', () => updateSwitchDebounceSeconds(el.switchDebounceSeconds.value));

  // Textareas: commit on blur (avoids spamming IPC each keystroke)
  el.excludeApps?.addEventListener('blur', () => updateExcludeApps(el.excludeApps.value));
  el.excludeTitles?.addEventListener('blur', () => updateExcludeTitles(el.excludeTitles.value));

  // Updater buttons (if present)
  el.btnUpdateDownload?.addEventListener('click', downloadUpdate);
  el.btnUpdateInstall?.addEventListener('click', installUpdate);
  el.btnUpdateSkip?.addEventListener('click', skipUpdate);
}

function setupIpcListeners() {
  // Activity logged in main process
  if (window.electronAPI?.onActivityLogged) {
    window.electronAPI.onActivityLogged((activity) => {
      activities.unshift(activity);
      renderActivities();
      // update top status quickly
      updateCurrentActivityDisplay(activity);
    });
  }

  if (window.electronAPI?.onTrackingStatusChanged) {
    window.electronAPI.onTrackingStatusChanged((status) => {
      lastTrackingStatus = status;
      renderTrackingStatus(status);
    });
  }

  if (window.electronAPI?.onSyncCompleted) {
    window.electronAPI.onSyncCompleted(() => {
      isSyncing = false;
      updateSyncButtons();
      loadSyncStatus();
    });
  }

  if (window.electronAPI?.onUpdateStatus) {
    window.electronAPI.onUpdateStatus((data) => {
      handleUpdateStatus(data);
    });
  }
}

/* -----------------------------
   Tabs
-------------------------------- */
function switchTab(tabName) {
  if (!tabName) return;
  currentTab = tabName;

  // nav active
  el.navTabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));

  // panel active
  el.tabPanels.forEach((p) => p.classList.toggle('active', p.dataset.panel === tabName));
}

/* -----------------------------
   Load + Render
-------------------------------- */
async function loadSettings() {
  settings = (await window.electronAPI.getSettings()) || {};

  // toggles
  if (el.toggleTracking) el.toggleTracking.checked = !!settings.trackingEnabled;
  if (el.toggleStartup) el.toggleStartup.checked = !!settings.startOnBoot;
  if (el.toggleTray) el.toggleTray.checked = !!settings.minimizeToTray;
  if (el.toggleAutoupdate) el.toggleAutoupdate.checked = !!settings.autoUpdateEnabled;

  // idle threshold: stored in seconds; UI shows minutes
  if (el.idleThreshold) {
    const seconds = Number.isFinite(settings.idleThreshold) ? settings.idleThreshold : 300;
    el.idleThreshold.value = String(Math.max(1, Math.round(seconds / 60)));
  }

  // new tracking controls
  if (el.minActivityDuration) el.minActivityDuration.value = String(settings.minActivityDuration ?? 60);
  if (el.switchDebounceSeconds) el.switchDebounceSeconds.value = String(settings.switchDebounceSeconds ?? 7);

  if (el.excludeApps) {
    el.excludeApps.value = Array.isArray(settings.excludeApps) ? settings.excludeApps.join('\n') : '';
  }
  if (el.excludeTitles) {
    el.excludeTitles.value = Array.isArray(settings.excludeTitles) ? settings.excludeTitles.join('\n') : '';
  }

  // sync fields
  if (el.syncUrl) el.syncUrl.value = settings.syncUrl ?? '';
  if (el.syncToken) el.syncToken.value = settings.syncToken ?? '';

  updateSyncButtons();
}

async function loadActivities() {
  try {
    activities = (await window.electronAPI.getActivities()) || [];
  } catch (e) {
    console.error('Failed to load activities', e);
    activities = [];
  }
  renderActivities();
}

function renderActivities() {
  if (!el.activityList) return;

  const list = activities.slice(0, 200); // keep UI snappy
  if (list.length === 0) {
    el.activityList.innerHTML = `<div class="empty-state">No activities yet.</div>`;
    return;
  }

  el.activityList.innerHTML = list
    .map((a) => {
      const start = a.startTime ? formatTime(a.startTime) : '--';
      const dur = Number.isFinite(a.duration) ? formatDuration(a.duration) : '--';
      const app = escapeHtml(a.applicationName || 'Unknown');
      const title = escapeHtml(a.windowTitle || '');
      const coded = a.isCoded ? 'coded' : 'uncoded';
      const idle = a.isIdle ? 'idle' : '';

      return `
        <div class="activity-row ${coded} ${idle}">
          <div class="activity-meta">
            <div class="activity-app">${app}</div>
            <div class="activity-title">${title}</div>
          </div>
          <div class="activity-side">
            <div class="activity-time">${start}</div>
            <div class="activity-duration">${dur}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

async function loadSyncStatus() {
  try {
    const status = await window.electronAPI.getSyncStatus();
    renderSyncStatus(status);
  } catch (e) {
    console.error('Failed to load sync status', e);
    renderSyncStatus(null);
  }
}

function renderSyncStatus(status) {
  if (!el.syncBadge || !el.syncInfo) return;

  const enabled = !!(settings.syncUrl && settings.syncToken);
  if (!enabled) {
    el.syncBadge.textContent = 'Not Connected';
    el.syncBadge.className = 'badge badge-warn';
    el.syncInfo.textContent = 'Enter Sync URL + Sync Token, then click Save & Connect.';
    return;
  }

  // status can vary; keep it resilient
  el.syncBadge.textContent = status?.connected ? 'Connected' : 'Connected';
  el.syncBadge.className = 'badge badge-ok';

  const last = status?.lastSyncAt ? formatTime(status.lastSyncAt) : '—';
  const queued = Number.isFinite(status?.queueSize) ? status.queueSize : '—';
  el.syncInfo.textContent = `Last Sync: ${last}, Queue: ${queued}`;
}

async function loadVersion() {
  try {
    const v = await window.electronAPI.getAppVersion();
    if (el.appVersion) el.appVersion.textContent = v ? `v${v}` : '';
  } catch {
    // ignore
  }
}

/* -----------------------------
   Tracking Status + Display
-------------------------------- */
async function updateTrackingStatus() {
  try {
    const status = await window.electronAPI.getTrackingStatus();
    lastTrackingStatus = status;
    renderTrackingStatus(status);
  } catch {
    // ignore
  }
}

function renderTrackingStatus(status) {
  // status shape can vary; keep defensive
  const trackingEnabled = !!settings.trackingEnabled;

  if (el.statusText) {
    el.statusText.textContent = trackingEnabled ? 'Tracking Active' : 'Tracking Paused';
  }
  if (el.statusTime) {
    el.statusTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Some implementations send { currentActivity: {...} }
  const current = status?.currentActivity;
  if (current) updateCurrentActivityDisplay(current);
}

function updateCurrentActivityDisplay(activity) {
  if (el.currentAppName) el.currentAppName.textContent = activity.applicationName || '—';
  if (el.currentAppTitle) el.currentAppTitle.textContent = activity.windowTitle || '—';
}

/* -----------------------------
   Settings commits
-------------------------------- */
async function toggleTracking(enabled) {
  settings.trackingEnabled = !!enabled;

  // commit setting
  await window.electronAPI.updateSettings({ trackingEnabled: !!enabled });

  // start/pause tracking
  try {
    if (enabled) await window.electronAPI.startTracking();
    else await window.electronAPI.pauseTracking();
  } catch (e) {
    console.error('toggleTracking error', e);
  }
}

async function toggleStartup(enabled) {
  settings.startOnBoot = !!enabled;
  await window.electronAPI.updateSettings({ startOnBoot: !!enabled });
}

async function toggleTray(enabled) {
  settings.minimizeToTray = !!enabled;
  await window.electronAPI.updateSettings({ minimizeToTray: !!enabled });
}

async function toggleAutoupdate(enabled) {
  settings.autoUpdateEnabled = !!enabled;
  await window.electronAPI.updateSettings({ autoUpdateEnabled: !!enabled });
}

async function updateIdleThreshold() {
  const minutes = parseInt(el.idleThreshold?.value, 10);
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;

  if (el.idleThreshold) el.idleThreshold.value = String(safeMinutes);

  // Store seconds in settings
  await window.electronAPI.updateSettings({ idleThreshold: safeMinutes * 60 });
}

async function updateMinActivityDuration(value) {
  const seconds = parseInt(value, 10);
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;

  if (el.minActivityDuration) el.minActivityDuration.value = String(safe);

  await window.electronAPI.updateSettings({ minActivityDuration: safe });
}

async function updateSwitchDebounceSeconds(value) {
  const seconds = parseInt(value, 10);
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 7;

  if (el.switchDebounceSeconds) el.switchDebounceSeconds.value = String(safe);

  await window.electronAPI.updateSettings({ switchDebounceSeconds: safe });
}

function parseLines(text) {
  return (text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function updateExcludeApps(text) {
  const list = parseLines(text);
  await window.electronAPI.updateSettings({ excludeApps: list });
}

async function updateExcludeTitles(text) {
  const list = parseLines(text);
  await window.electronAPI.updateSettings({ excludeTitles: list });
}

/* -----------------------------
   Sync
-------------------------------- */
async function saveSyncSettings() {
  const syncUrl = (el.syncUrl?.value || '').trim();
  const syncToken = (el.syncToken?.value || '').trim();
  const syncEnabled = !!(syncUrl && syncToken);

  await window.electronAPI.updateSettings({
    syncUrl,
    syncToken,
    syncEnabled,
  });

  // refresh local settings copy
  await loadSettings();
  await loadSyncStatus();

  showToast('success', 'Settings Saved', syncEnabled ? 'Sync connection updated.' : 'Sync disabled (missing URL or token).');
}

async function syncNow() {
  if (isSyncing) return;

  isSyncing = true;
  updateSyncButtons();

  try {
    const result = await window.electronAPI.syncActivities();
    showToast('success', 'Sync Complete', result?.message || 'Activities synced successfully.');
    await loadSyncStatus();
  } catch (e) {
    console.error('syncNow error', e);
    showToast('error', 'Sync Failed', e?.message || 'Unable to sync activities.');
  } finally {
    isSyncing = false;
    updateSyncButtons();
  }
}

function updateSyncButtons() {
  const syncingClass = 'syncing';

  const setBtn = (btn, syncing) => {
    if (!btn) return;
    btn.classList.toggle(syncingClass, syncing);
    btn.disabled = syncing;
    btn.innerHTML = syncing
      ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          <polyline points="21 3 21 9 15 9"></polyline>
        </svg>
        Syncing...
      `
      : `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          <polyline points="21 3 21 9 15 9"></polyline>
        </svg>
        Sync Now
      `;
  };

  setBtn(el.btnSyncNow, isSyncing);
  // quick sync can keep shorter label
  if (el.btnQuickSync) {
    el.btnQuickSync.classList.toggle(syncingClass, isSyncing);
    el.btnQuickSync.disabled = isSyncing;
    el.btnQuickSync.textContent = isSyncing ? 'Syncing…' : 'Sync';
  }
}

/* -----------------------------
   Updates
-------------------------------- */
async function refreshUpdateStatus() {
  try {
    const status = await window.electronAPI.getUpdateStatus();
    handleUpdateStatus(status);
  } catch {
    // ignore
  }
}

async function checkForUpdates() {
  try {
    await window.electronAPI.checkForUpdates();
  } catch (e) {
    showToast('error', 'Update Check Failed', e?.message || 'Unable to check for updates.');
  }
}

async function downloadUpdate() {
  try {
    await window.electronAPI.downloadUpdate();
  } catch (e) {
    showToast('error', 'Download Failed', e?.message || 'Unable to download update.');
  }
}

async function installUpdate() {
  try {
    await window.electronAPI.installUpdate();
  } catch (e) {
    showToast('error', 'Install Failed', e?.message || 'Unable to install update.');
  }
}

function skipUpdate() {
  // purely UI; main may manage actual skip logic
  if (el.updateBanner) el.updateBanner.classList.remove('show');
}

function handleUpdateStatus(data) {
  // data shapes vary by updater implementation; keep defensive
  if (!el.updateBanner) return;

  const status = data?.status || data?.state || null;

  // Hide when idle
  if (!status || status === 'idle' || status === 'checking') {
    el.updateBanner.classList.remove('show');
    return;
  }

  el.updateBanner.classList.add('show');

  if (el.updateTitle) el.updateTitle.textContent = 'Update';
  if (el.updateText) el.updateText.textContent = '';

  if (status === 'update-available') {
    if (el.updateTitle) el.updateTitle.textContent = 'Update Available';
    if (el.updateText) el.updateText.textContent = 'A new version is available. Download to install.';
    if (el.updateProgress) el.updateProgress.style.display = 'none';
    if (el.updateActions) el.updateActions.style.display = 'flex';
    if (el.btnUpdateDownload) el.btnUpdateDownload.style.display = 'inline-flex';
    if (el.btnUpdateInstall) el.btnUpdateInstall.style.display = 'none';
  }

  if (status === 'download-progress') {
    const percent = data?.percent ?? data?.data?.percent ?? 0;
    if (el.updateTitle) el.updateTitle.textContent = 'Downloading Update';
    if (el.updateText) el.updateText.textContent = `Downloading… ${Math.round(percent)}%`;
    if (el.updateProgress) el.updateProgress.style.display = 'block';
    if (el.updateProgressFill) el.updateProgressFill.style.width = `${percent}%`;
    if (el.updateActions) el.updateActions.style.display = 'flex';
    if (el.btnUpdateDownload) el.btnUpdateDownload.style.display = 'none';
    if (el.btnUpdateInstall) el.btnUpdateInstall.style.display = 'none';
  }

  if (status === 'update-downloaded') {
    if (el.updateTitle) el.updateTitle.textContent = 'Update Ready';
    if (el.updateText) el.updateText.textContent = 'Restart to install the update.';
    if (el.updateProgress) el.updateProgress.style.display = 'none';
    if (el.updateActions) el.updateActions.style.display = 'flex';
    if (el.btnUpdateDownload) el.btnUpdateDownload.style.display = 'none';
    if (el.btnUpdateInstall) el.btnUpdateInstall.style.display = 'inline-flex';
  }

  if (status === 'error') {
    if (el.updateTitle) el.updateTitle.textContent = 'Update Error';
    if (el.updateText) el.updateText.textContent = data?.message || 'An update error occurred.';
  }
}

/* -----------------------------
   Toast
-------------------------------- */
function showToast(type, title, message) {
  if (!el.toast || !el.toastTitle || !el.toastMessage) return;

  el.toast.classList.remove('show', 'success', 'error', 'info', 'warn');
  el.toast.classList.add(type || 'info');

  el.toastTitle.textContent = title || '';
  el.toastMessage.textContent = message || '';

  el.toast.classList.add('show');

  // auto-hide
  setTimeout(() => {
    el.toast?.classList.remove('show');
  }, 3500);
}

/* -----------------------------
   Formatting helpers
-------------------------------- */
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

/* -----------------------------
   Global hooks (optional)
-------------------------------- */
window.installUpdate = installUpdate;
window.skipUpdate = skipUpdate;
window.checkForUpdates = checkForUpdates;

/* -----------------------------
   Start
-------------------------------- */
init();