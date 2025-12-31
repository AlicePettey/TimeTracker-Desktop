// electron/main.js

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

let Store;
try {
  Store = require('electron-store');
} catch (e) {
  console.warn('electron-store not available:', e);
  Store = null;
}

// Handle ICU data path for packaged apps (keep if you need it)
if (app.isPackaged) {
  const icuDataPath = path.join(process.resourcesPath, 'icudtl.dat');
  if (fs.existsSync(icuDataPath)) {
    process.env.ICU_DATA = icuDataPath;
  }
}

/* -----------------------------
   Store
-------------------------------- */
const store = Store
  ? new Store({
      name: 'timetracker-data',
      defaults: {
        activities: [],
        syncQueue: [],
        lastSyncTime: null,
        deviceId: null,
        settings: {
          // Tracking
          trackingEnabled: true,
          idleThreshold: 300,          // seconds
          minActivityDuration: 60,     // seconds
          switchDebounceSeconds: 7,    // seconds

          // NEW: filters
          excludeApps: [],
          excludeTitles: [],

          // Sync config
          syncEnabled: true,
          syncUrl: '',
          syncToken: '',
          syncAnonKey: '',

          // Desktop behavior
          startOnBoot: false,
          minimizeToTray: true,

          // Updater
          autoUpdate: true,
          allowPrerelease: false,

          // Auto-sync
          autoSyncEnabled: true,
          syncIntervalMinutes: 15,
          syncOnStartup: true,
          syncOnClose: true,
          syncOnIdle: true
        }
      }
    })
  : {
      _data: {
        activities: [],
        syncQueue: [],
        lastSyncTime: null,
        deviceId: null,
        settings: {
          trackingEnabled: true,
          idleThreshold: 300,
          minActivityDuration: 60,
          switchDebounceSeconds: 7,
          excludeApps: [],
          excludeTitles: [],
          syncEnabled: true,
          syncUrl: '',
          syncToken: '',
          syncAnonKey: '',
          startOnBoot: false,
          minimizeToTray: true,
          autoUpdate: true,
          allowPrerelease: false,
          autoSyncEnabled: true,
          syncIntervalMinutes: 15,
          syncOnStartup: true,
          syncOnClose: true,
          syncOnIdle: true
        }
      },
      get(k) {
        return this._data[k];
      },
      set(k, v) {
        this._data[k] = v;
      }
    };

/* -----------------------------
   Globals
-------------------------------- */
let mainWindow = null;
let tray = null;
let tracker = null;
let appUpdater = null;
let autoSyncTimer = null;
let isQuitting = false;

/* -----------------------------
   Helpers
-------------------------------- */
function getDeviceId() {
  let id = store.get('deviceId');
  if (!id) {
    id = uuidv4();
    store.set('deviceId', id);
  }
  return id;
}

function isSyncConfigured(settings) {
  return !!(settings && settings.syncEnabled && settings.syncUrl && settings.syncToken);
}

async function loadTracker() {
  try {
    return require('./tracker');
  } catch (err) {
    console.error('Failed to load tracker:', err);
    return null;
  }
}

async function loadUpdater() {
  try {
    return require('./updater');
  } catch (err) {
    console.error('Failed to load updater:', err);
    return null;
  }
}

function sendToRenderer(channel, payload) {
  if (mainWindow?.webContents) mainWindow.webContents.send(channel, payload);
}

/* -----------------------------
   Window
-------------------------------- */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0b0f14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load packaged renderer UI
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;

    const settings = store.get('settings') || {};

    if (settings.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
      return;
    }

    // Sync on close if configured
    if (settings.syncOnClose && isSyncConfigured(settings)) {
      try {
        await syncActivities();
      } catch (err) {
        console.warn('Sync on close failed:', err);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* -----------------------------
   Tray
-------------------------------- */
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    tray = new Tray(icon);

    tray.setToolTip('TimeTracker Desktop');
    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    updateTrayMenu();
  } catch (err) {
    console.warn('Tray creation failed:', err);
  }
}

function updateTrayMenu() {
  const settings = store.get('settings') || {};
  const trackingEnabled = !!settings.trackingEnabled;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: trackingEnabled ? 'Pause Tracking' : 'Resume Tracking',
      click: async () => {
        const next = !trackingEnabled;
        store.set('settings', { ...settings, trackingEnabled: next });

        try {
          if (next) tracker?.start?.();
          else tracker?.pause?.();
        } catch {}

        sendToRenderer('tracking-status-changed', next ? 'active' : 'paused');
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Open TimeTracker',
      click: () => {
        mainWindow?.show?.();
        mainWindow?.focus?.();
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray?.setContextMenu(contextMenu);
}

/* -----------------------------
   Auto Sync
-------------------------------- */
function stopAutoSyncTimer() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
}

function startAutoSyncTimer() {
  stopAutoSyncTimer();

  const settings = store.get('settings') || {};
  if (!settings.autoSyncEnabled) return;
  if (!isSyncConfigured(settings)) return;

  const minutes = Number(settings.syncIntervalMinutes ?? 15);
  const intervalMs = Math.max(1, minutes) * 60 * 1000;

  autoSyncTimer = setInterval(async () => {
    const s = store.get('settings') || {};
    if (!s.autoSyncEnabled) return;
    if (!isSyncConfigured(s)) return;
    await syncActivities();
  }, intervalMs);
}

/* -----------------------------
   Tracker Init
-------------------------------- */
async function initializeTracker() {
  const ActivityTracker = await loadTracker();
  if (!ActivityTracker) return;

  const settings = store.get('settings') || {};

  tracker = new ActivityTracker({
    idleThreshold: settings.idleThreshold ?? 300,
    minActivityDuration: settings.minActivityDuration ?? 60,
    switchDebounceSeconds: settings.switchDebounceSeconds ?? 7,
    excludeApps: settings.excludeApps ?? [],
    excludeTitles: settings.excludeTitles ?? [],
    getSystemIdleSeconds: () => powerMonitor.getSystemIdleTime(),

    onActivity: (activity) => {
      // Persist activity (30-day rolling window)
      const activities = store.get('activities') || [];
      activities.push(activity);

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = activities.filter(a => new Date(a.startTime).getTime() > thirtyDaysAgo);
      store.set('activities', filtered);

      // Queue for sync ONLY if configured
      const latest = store.get('settings') || {};
      if (isSyncConfigured(latest)) {
        const syncQueue = store.get('syncQueue') || [];
        syncQueue.push(activity);
        store.set('syncQueue', syncQueue);
      }

      sendToRenderer('activity-logged', activity);
    },

    onIdleStart: async () => {
      sendToRenderer('idle-started');
      const s = store.get('settings') || {};
      if (s.syncOnIdle && isSyncConfigured(s)) {
        await syncActivities();
      }
    },

    onIdleEnd: (idleDuration) => {
      sendToRenderer('idle-ended', idleDuration);
    },

    onStatusChange: (status) => {
      sendToRenderer('tracking-status-changed', status);
      updateTrayMenu();
    }
  });

  if (settings.trackingEnabled) {
    setTimeout(() => tracker?.start?.(), 2000);
  }
}

/* -----------------------------
   Sync
-------------------------------- */
// Your provided syncActivities() (kept intact, only minor hardening: reads settings safely)
async function syncActivities() {
  const settings = store.get('settings') || {};

  if (!settings.syncEnabled || !settings.syncUrl || !settings.syncToken) {
    return { success: false, error: 'Sync not configured' };
  }

  const anonKey =
    settings.syncAnonKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma3ZiYXVpaXJ4dnJzZ2tpenR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzUxNTAsImV4cCI6MjA4MjUxMTE1MH0.2H-8kPyZ1GVSBbvF8Ua8if1cdGTQSrTVTZm_PnPROEw';

  if (!anonKey) {
    return { success: false, error: 'Missing Supabase anon key (SUPABASE_ANON_KEY or settings.syncAnonKey)' };
  }

  const syncQueue = store.get('syncQueue') || [];
  if (syncQueue.length === 0) return { success: true, synced: 0 };

  const deviceId = getDeviceId();
  const baseUrl = settings.syncUrl.replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/functions/v1/desktop-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': settings.syncToken,
        'x-device-id': deviceId,

        // REQUIRED for Supabase Edge Functions gateway
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        activities: syncQueue.map(a => ({
          id: a.id || null,
          applicationName: a.applicationName,
          windowTitle: a.windowTitle || '',
          startTime: a.startTime,
          endTime: a.endTime,
          duration: a.duration,
          projectId: a.projectId || null,
          taskId: a.taskId || null,
          isCoded: a.isCoded || false,
          isIdle: a.isIdle || false,
          categoryId: a.categoryId || null,
          categoryAutoAssigned: a.categoryAutoAssigned || false
        })),
        deviceId,
        deviceName: os.hostname(),
        platform: process.platform,
        timestamp: new Date().toISOString(),
        syncType: 'push'
      })
    });

    const text = await response.text();
    let result = {};
    try { result = text ? JSON.parse(text) : {}; } catch { result = { raw: text }; }

    if (!response.ok) {
      const msg = result?.error || result?.message || text || `HTTP ${response.status}`;
      throw new Error(msg);
    }

    // Success
    store.set('syncQueue', []);
    store.set('lastSyncTime', new Date().toISOString());

    sendToRenderer('sync-completed', {
      success: true,
      synced: result.syncedCount || syncQueue.length,
      syncId: result.syncId
    });

    return { success: true, synced: result.syncedCount || syncQueue.length };
  } catch (error) {
    console.error('Sync error:', error);
    sendToRenderer('sync-completed', { success: false, error: error.message });
    return { success: false, error: error.message };
  }
}

/* -----------------------------
   App lifecycle
-------------------------------- */
app.on('ready', async () => {
  createWindow();
  createTray();

  await initializeTracker();

  // Updater (optional)
  const Updater = await loadUpdater();
  if (Updater) {
    try {
      appUpdater = new Updater({ store, mainWindow });
      const settings = store.get('settings') || {};
      if (appUpdater?.setAllowPrerelease) appUpdater.setAllowPrerelease(!!settings.allowPrerelease);
      if (settings.autoUpdate) appUpdater?.checkForUpdates?.();
    } catch (err) {
      console.warn('Updater init failed:', err);
    }
  }

  startAutoSyncTimer();

  // Sync on startup if configured
  const settings = store.get('settings') || {};
  if (settings.syncOnStartup && isSyncConfigured(settings)) {
    setTimeout(() => syncActivities(), 5000);
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

/* -----------------------------
   IPC
-------------------------------- */
ipcMain.handle('get-settings', () => store.get('settings') || {});

ipcMain.handle('update-settings', (event, newSettings = {}) => {
  const current = store.get('settings') || {};

  // Normalize + protect types
  const updated = {
    ...current,
    ...newSettings,

    // tracking numbers
    idleThreshold: Number(newSettings.idleThreshold ?? current.idleThreshold ?? 300),
    minActivityDuration: Number(newSettings.minActivityDuration ?? current.minActivityDuration ?? 60),
    switchDebounceSeconds: Number(newSettings.switchDebounceSeconds ?? current.switchDebounceSeconds ?? 7),

    // arrays
    excludeApps: Array.isArray(newSettings.excludeApps) ? newSettings.excludeApps : (current.excludeApps ?? []),
    excludeTitles: Array.isArray(newSettings.excludeTitles) ? newSettings.excludeTitles : (current.excludeTitles ?? []),

    // normalize updater key (some UIs send autoUpdateEnabled)
    autoUpdate: (newSettings.autoUpdate ?? newSettings.autoUpdateEnabled ?? current.autoUpdate ?? true)
  };

  store.set('settings', updated);

  // Hot-apply tracker settings immediately
  if (tracker?.updateSettings) {
    tracker.updateSettings({
      idleThreshold: updated.idleThreshold,
      minActivityDuration: updated.minActivityDuration,
      switchDebounceSeconds: updated.switchDebounceSeconds,
      excludeApps: updated.excludeApps,
      excludeTitles: updated.excludeTitles
    });
  }

  // Auto-sync timer should respond to any sync settings changes
  startAutoSyncTimer();

  return updated;
});

ipcMain.handle('get-activities', () => store.get('activities') || []);

ipcMain.handle('get-tracking-status', () => {
  const s = store.get('settings') || {};
  return { trackingEnabled: !!s.trackingEnabled };
});

ipcMain.handle('start-tracking', () => {
  const s = store.get('settings') || {};
  store.set('settings', { ...s, trackingEnabled: true });
  tracker?.start?.();
  updateTrayMenu();
  return true;
});

ipcMain.handle('pause-tracking', () => {
  const s = store.get('settings') || {};
  store.set('settings', { ...s, trackingEnabled: false });
  tracker?.pause?.();
  updateTrayMenu();
  return true;
});

ipcMain.handle('sync-activities', async () => {
  return await syncActivities();
});

ipcMain.handle('get-sync-status', () => {
  const queue = store.get('syncQueue') || [];
  return {
    pendingCount: queue.length,
    lastSyncTime: store.get('lastSyncTime') || null
  };
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize?.();
  return true;
});

ipcMain.handle('close-window', () => {
  if (!mainWindow) return true;
  isQuitting = true;
  mainWindow.close();
  return true;
});

ipcMain.handle('get-app-version', () => app.getVersion());

// Optional: open external links safely from renderer
ipcMain.handle('open-external', (e, url) => {
  if (typeof url === 'string' && url.startsWith('http')) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

// Updater passthroughs (only if your updater exposes these)
ipcMain.handle('get-update-status', () => appUpdater?.getStatus?.() || { status: 'idle' });
ipcMain.handle('check-for-updates', () => appUpdater?.checkForUpdates?.() || { status: 'idle' });
ipcMain.handle('download-update', () => appUpdater?.downloadUpdate?.() || { status: 'idle' });
ipcMain.handle('install-update', () => appUpdater?.installUpdate?.() || { status: 'idle' });

ipcMain.handle('set-allow-prerelease', (e, enabled) => {
  const current = store.get('settings') || {};
  store.set('settings', { ...current, allowPrerelease: !!enabled });
  if (appUpdater?.setAllowPrerelease) appUpdater.setAllowPrerelease(!!enabled);
  return true;
});