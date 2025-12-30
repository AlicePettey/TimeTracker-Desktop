// electron/main.js

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const os = require('os');
const Store = require('electron-store');
const crypto = require('crypto');

// If you have these local modules in your repo, keep them.
// If your repo uses different filenames/paths, adjust accordingly.
const tracker = require('./tracker');
const updater = require('./updater');

const store = new Store({
  name: 'timetracker',
  defaults: {
    settings: {
      trackingEnabled: true,
      autoSyncEnabled: true,
      syncIntervalMinutes: 5,
      syncOnStartup: true,
      syncOnClose: true,
      syncOnIdle: true,

      // Supabase project URL (e.g. https://xxxxx.supabase.co)
      syncUrl: '',

      // Desktop sync token issued by your generate-sync-token (web app)
      syncToken: '',

      // Supabase anon key (prefer env var, fallback to stored)
      syncAnonKey: '',

      lastSyncTime: null
    }
  }
});

let mainWindow = null;
let tray = null;

// -----------------------------
// Window / Security helpers
// -----------------------------
function isHttpUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // ✅ Diagnostics for white-screen issues
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('DID_FAIL_LOAD', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('RENDER_PROCESS_GONE', details);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('RENDER_CONSOLE', { level, message, line, sourceId });
  });

  // ✅ Prevent external navigation inside Electron
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();

    const sameOrigin = (() => {
      try {
        return new URL(url).origin === new URL(current).origin;
      } catch {
        return false;
      }
    })();

    if (!sameOrigin) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // ✅ Load renderer
  const isDev = !app.isPackaged;
  if (isDev) {
    const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', async () => {
    const settings = store.get('settings');
    if (settings?.syncOnClose) {
      try {
        await syncActivities();
      } catch (err) {
        console.error('Sync on close failed:', err);
      }
    }
  });
}


function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png'); // adjust if needed
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? undefined : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TimeTracker',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow.show();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('TimeTracker');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (!mainWindow) createWindow();
    mainWindow.show();
  });
}

function getOrCreateDeviceId() {
  let deviceId = store.get('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    store.set('deviceId', deviceId);
  }
  return deviceId;
}

// -----------------------------
// Sync Logic
// -----------------------------
async function syncActivities() {
  const settings = store.get('settings') || {};
  const anonKey = process.env.SUPABASE_ANON_KEY || settings.syncAnonKey;

  if (!anonKey) {
    throw new Error('Supabase anon key missing. Set SUPABASE_ANON_KEY or settings.syncAnonKey.');
  }

  if (!settings.syncUrl || !settings.syncToken) {
    return { ok: false, error: 'Sync not configured (missing syncUrl or syncToken).' };
  }

  const deviceId = getOrCreateDeviceId();
  const syncUrl = String(settings.syncUrl).replace(/\/$/, '');

  const syncQueue = tracker.getSyncQueue ? tracker.getSyncQueue() : [];
  if (!syncQueue || syncQueue.length === 0) {
    return { ok: true, inserted: 0, updated: 0, message: 'Nothing to sync' };
  }

  const activities = syncQueue.map((a) => ({
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
  }));

  const res = await fetch(`${syncUrl}/functions/v1/desktop-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-token': settings.syncToken,
      'x-device-id': deviceId,

      // REQUIRED for Supabase Edge Functions endpoint routing/auth
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey
    },
    body: JSON.stringify({
      activities,
      deviceId,
      deviceName: os.hostname(),
      platform: process.platform,
      timestamp: new Date().toISOString(),
      syncType: 'push'
    })
  });

  const payloadText = await res.text();
  let payload = {};
  try {
    payload = payloadText ? JSON.parse(payloadText) : {};
  } catch {
    payload = { raw: payloadText };
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || payloadText || `HTTP ${res.status}`;
    throw new Error(`desktop-sync failed: ${msg}`);
  }

  const inserted = payload?.inserted ?? payload?.counts?.inserted ?? 0;
  const updated = payload?.updated ?? payload?.counts?.updated ?? 0;

  if (tracker.clearSyncQueue) tracker.clearSyncQueue();

  const nowIso = new Date().toISOString();
  store.set('settings.lastSyncTime', nowIso);

  // Notify renderer listeners
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('sync-completed', { ok: true, inserted, updated, at: nowIso });
  }

  return { ok: true, inserted, updated, payload };
}

// -----------------------------
// IPC handlers (must match preload.js)
// -----------------------------

// Settings
ipcMain.handle('get-settings', async () => store.get('settings'));
ipcMain.handle('update-settings', async (event, partial) => {
  const current = store.get('settings') || {};
  const next = { ...current, ...(partial || {}) };
  store.set('settings', next);
  return next;
});

// Device Info
ipcMain.handle('get-device-info', async () => {
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: os.hostname(),
    platform: process.platform,
    arch: process.arch
  };
});

// Window controls
ipcMain.handle('window-minimize', async () => {
  if (mainWindow) mainWindow.minimize();
  return { ok: true };
});

ipcMain.handle('window-close', async () => {
  if (mainWindow) mainWindow.close();
  return { ok: true };
});

// External links
ipcMain.handle('open-external', async (event, url) => {
  if (!url || !isHttpUrl(url)) return { ok: false, error: 'Invalid URL' };
  await shell.openExternal(url);
  return { ok: true };
});

// Tracking Control (align with preload names)
ipcMain.handle('start-tracking', async () => {
  if (tracker.start) tracker.start();
  return { ok: true };
});

ipcMain.handle('pause-tracking', async () => {
  if (tracker.pause) tracker.pause();
  else if (tracker.stop) tracker.stop();
  return { ok: true };
});

ipcMain.handle('get-tracking-status', async () => {
  if (tracker.getStatus) return tracker.getStatus();
  return { trackingEnabled: store.get('settings')?.trackingEnabled ?? true };
});

// Activities
ipcMain.handle('get-activities', async () => {
  if (tracker.getActivities) return tracker.getActivities();
  return [];
});

// If your preload calls these, keep them so the renderer doesn’t crash.
// Implement properly if/when you wire them.
ipcMain.handle('get-today-activities', async () => {
  if (tracker.getTodayActivities) return tracker.getTodayActivities();
  return [];
});

ipcMain.handle('code-activity', async (event, data) => {
  if (tracker.codeActivity) return tracker.codeActivity(data);
  return { ok: false, error: 'codeActivity not implemented in tracker' };
});

ipcMain.handle('delete-activity', async (event, activityId) => {
  if (tracker.deleteActivity) return tracker.deleteActivity(activityId);
  return { ok: false, error: 'deleteActivity not implemented in tracker' };
});

// Sync (align with preload names)
ipcMain.handle('sync-activities', async () => {
  return await syncActivities();
});

ipcMain.handle('get-sync-status', async () => {
  const settings = store.get('settings') || {};
  return {
    configured: Boolean(settings.syncUrl && settings.syncToken),
    lastSyncTime: settings.lastSyncTime || null
  };
});

// Token generation
// NOTE: This should generally happen in the *web app* (user logged in).
// Keep this handler so UI calls don’t crash, but return a friendly message.
ipcMain.handle('generate-sync-token', async () => {
  return {
    ok: false,
    error:
      'Token generation is handled in the web app (authenticated). Copy the token into Desktop settings.'
  };
});

// Releases / Updates (safe stubs + optional hookup)
ipcMain.handle('get-release-url', async () => {
  if (updater && updater.getReleaseUrl) return updater.getReleaseUrl();
  return null;
});

// -----------------------------
// App lifecycle
// -----------------------------
app.whenReady().then(async () => {
  createWindow();
  createTray();

  try {
    if (updater && updater.init) updater.init(mainWindow);
  } catch (e) {
    console.warn('Updater init skipped/failed:', e);
  }

  const settings = store.get('settings') || {};
  if (settings.syncOnStartup) {
    try {
      await syncActivities();
    } catch (err) {
      console.error('Sync on startup failed:', err);
    }
  }

  setInterval(async () => {
    try {
      const s = store.get('settings') || {};
      if (!s.autoSyncEnabled) return;
      await syncActivities();
    } catch (err) {
      console.error('Auto-sync failed:', err);
    }
  }, Math.max(1, store.get('settings')?.syncIntervalMinutes || 5) * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
