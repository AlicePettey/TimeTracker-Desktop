// electron/main.js

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
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

      // Your Supabase project URL (e.g. https://xxxxx.supabase.co)
      syncUrl: '',

      // Your generated desktop sync token (issued by your generate-sync-token function)
      syncToken: '',

      // Supabase anon/public key (required for Edge Functions routing/auth)
      // Recommended: set SUPABASE_ANON_KEY in env instead of storing it, but both work.
      syncAnonKey: '',

      lastSyncTime: null
    }
  }
});

let mainWindow = null;
let tray = null;

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

  // In dev you probably load Vite; in prod load the built index.html
  const isDev = !app.isPackaged;
  if (isDev) {
    const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', async (e) => {
    const settings = store.get('settings');
    if (settings?.syncOnClose) {
      try {
        await syncActivities();
      } catch (err) {
        // Don’t block close for sync failure.
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
    {
      label: 'Quit',
      click: () => app.quit()
    }
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
  const settings = store.get('settings');
  const anonKey = process.env.SUPABASE_ANON_KEY || settings.syncAnonKey;

  if (!anonKey) {
    throw new Error('Supabase anon key missing. Set SUPABASE_ANON_KEY or settings.syncAnonKey.');
  }

  if (!settings?.syncUrl || !settings?.syncToken) {
    console.log('Sync not configured (missing syncUrl or syncToken).');
    return { ok: false, error: 'Sync not configured' };
  }

  const deviceId = getOrCreateDeviceId();
  const syncUrl = settings.syncUrl.replace(/\/$/, '');

  // Pull from your local queue (based on how your tracker module stores it)
  // If your tracker uses a different API, adjust these calls.
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

      // REQUIRED for Supabase Edge Functions endpoint
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey
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
  let payload;
  try {
    payload = payloadText ? JSON.parse(payloadText) : {};
  } catch {
    payload = { raw: payloadText };
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || payloadText || `HTTP ${res.status}`;
    throw new Error(`desktop-sync failed: ${msg}`);
  }

  // If function returns counts, keep them.
  // Otherwise still treat as success.
  const inserted = payload?.inserted ?? payload?.counts?.inserted ?? 0;
  const updated = payload?.updated ?? payload?.counts?.updated ?? 0;

  // Clear queue on success
  if (tracker.clearSyncQueue) tracker.clearSyncQueue();

  store.set('settings.lastSyncTime', new Date().toISOString());

  return { ok: true, inserted, updated, payload };
}

// -----------------------------
// IPC handlers (renderer ↔ main)
// -----------------------------
ipcMain.handle('get-settings', async () => {
  return store.get('settings');
});

ipcMain.handle('update-settings', async (event, partial) => {
  const current = store.get('settings') || {};
  const next = { ...current, ...partial };
  store.set('settings', next);
  return next;
});

ipcMain.handle('get-device-id', async () => {
  return getOrCreateDeviceId();
});

ipcMain.handle('sync-now', async () => {
  return await syncActivities();
});

ipcMain.handle('start-tracking', async () => {
  if (tracker.start) tracker.start();
  return { ok: true };
});

ipcMain.handle('stop-tracking', async () => {
  if (tracker.stop) tracker.stop();
  return { ok: true };
});

ipcMain.handle('get-activities', async () => {
  if (tracker.getActivities) return tracker.getActivities();
  return [];
});

ipcMain.handle('get-sync-queue', async () => {
  if (tracker.getSyncQueue) return tracker.getSyncQueue();
  return [];
});

// -----------------------------
// App lifecycle
// -----------------------------
app.whenReady().then(async () => {
  createWindow();
  createTray();

  // Start auto-updater if your project uses it
  try {
    if (updater && updater.init) updater.init(mainWindow);
  } catch (e) {
    console.warn('Updater init skipped/failed:', e);
  }

  // Optionally sync on startup
  const settings = store.get('settings');
  if (settings?.syncOnStartup) {
    try {
      await syncActivities();
    } catch (err) {
      console.error('Sync on startup failed:', err);
    }
  }

  // Auto-sync timer
  setInterval(async () => {
    try {
      const s = store.get('settings');
      if (!s?.autoSyncEnabled) return;
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
  // On macOS, typical behavior is to keep app running.
  if (process.platform !== 'darwin') app.quit();
});
