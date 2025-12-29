const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, shell } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Handle ICU data path for packaged apps
if (app.isPackaged) {
  // Set the ICU data file path explicitly for packaged apps
  const icuDataPath = path.join(process.resourcesPath, 'icudtl.dat');
  if (require('fs').existsSync(icuDataPath)) {
    process.env.ICU_DATA = icuDataPath;
  }
}

// Initialize electron store for persistent data
let Store;
try {
  Store = require('electron-store');
} catch (e) {
  console.error('Failed to load electron-store:', e);
  // Fallback to a simple in-memory store
  Store = class {
    constructor(opts) {
      this.data = opts?.defaults || {};
    }
    get(key, defaultValue) {
      const keys = key.split('.');
      let value = this.data;
      for (const k of keys) {
        value = value?.[k];
      }
      return value !== undefined ? value : defaultValue;
    }
    set(key, value) {
      if (typeof key === 'object') {
        Object.assign(this.data, key);
      } else {
        const keys = key.split('.');
        let obj = this.data;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {};
          obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
      }
    }
  };
}

const store = new Store({
  name: 'timetracker-data',
  defaults: {
    activities: [],
    settings: {
      idleThreshold: 300, // 5 minutes in seconds
      minActivityDuration: 10, // minimum 10 seconds to log
      syncEnabled: true,
      syncUrl: '',
      syncToken: '',
      startOnBoot: true,
      minimizeToTray: true,
      trackingEnabled: true,
      autoUpdate: true,
      allowPrerelease: false,
      // Auto-sync settings
      syncInterval: 15, // minutes (5, 15, or 30)
      syncOnClose: true,
      syncOnIdle: true,
      autoSyncEnabled: true,
      syncOnStartup: true,
      batchSize: 50,
      retryFailedSyncs: true,
      maxRetryAttempts: 3
    },
    syncQueue: [],
    lastSyncTime: null,
    failedSyncAttempts: 0
  }
});


// Auto-sync timer
let autoSyncTimer = null;
let isIdle = false;

let mainWindow = null;
let tray = null;
let tracker = null;
let appUpdater = null;
let isQuitting = false;

// Start auto-sync timer based on settings
function startAutoSyncTimer() {
  stopAutoSyncTimer();
  
  const settings = store.get('settings');
  if (!settings.autoSyncEnabled || !settings.syncEnabled) {
    console.log('Auto-sync disabled');
    return;
  }
  
  const intervalMs = settings.syncInterval * 60 * 1000; // Convert minutes to ms
  console.log(`Starting auto-sync timer: every ${settings.syncInterval} minutes`);
  
  autoSyncTimer = setInterval(async () => {
    const currentSettings = store.get('settings');
    if (currentSettings.autoSyncEnabled && currentSettings.syncEnabled) {
      console.log('Auto-sync triggered by timer');
      await syncActivities();
    }
  }, intervalMs);
}

// Stop auto-sync timer
function stopAutoSyncTimer() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
}

// Handle idle-based sync
function handleIdleSync() {
  const settings = store.get('settings');
  if (settings.syncOnIdle && settings.syncEnabled && !isIdle) {
    isIdle = true;
    console.log('Idle detected, triggering sync');
    syncActivities();
  }
}

// Handle idle end
function handleIdleEnd() {
  isIdle = false;
}

// Sync on app close
async function syncOnClose() {
  const settings = store.get('settings');
  if (settings.syncOnClose && settings.syncEnabled) {
    console.log('App closing, triggering final sync');
    await syncActivities();
  }
}

// Sync on startup
async function syncOnStartup() {
  const settings = store.get('settings');
  if (settings.syncOnStartup && settings.syncEnabled) {
    console.log('App starting, triggering startup sync');
    // Wait a bit for network to be ready
    setTimeout(async () => {
      await syncActivities();
    }, 5000);
  }
}


// Lazy load the tracker to handle potential module loading issues
async function loadTracker() {
  try {
    const ActivityTracker = require('./tracker');
    return ActivityTracker;
  } catch (error) {
    console.error('Failed to load tracker:', error);
    return null;
  }
}

// Lazy load the updater
async function loadUpdater() {
  try {
    const updater = require('./updater');
    return updater;
  } catch (error) {
    console.error('Failed to load updater:', error);
    return null;
  }
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // Required for some native modules
    },
    icon: getIconPath(),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', async () => {
    mainWindow.show();
    
    // Initialize updater after window is ready
    appUpdater = await loadUpdater();
    if (appUpdater) {
      appUpdater.setMainWindow(mainWindow);
      
      // Start periodic update checks if enabled
      const settings = store.get('settings');
      if (settings.autoUpdate) {
        appUpdater.startPeriodicUpdateChecks(4); // Check every 4 hours
      }
    }
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('settings.minimizeToTray')) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Get the appropriate icon path based on platform
function getIconPath() {
  const fs = require('fs');
  const assetsDir = path.join(__dirname, 'assets');
  
  // Try platform-specific icons first, then fall back to PNG
  const iconOptions = process.platform === 'win32' 
    ? ['icon.ico', 'icon.png'] 
    : process.platform === 'darwin'
    ? ['icon.icns', 'icon.png']
    : ['icon.png'];
  
  for (const iconName of iconOptions) {
    const iconPath = path.join(assetsDir, iconName);
    try {
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    } catch (e) {
      // Continue to next option
    }
  }
  
  return undefined;
}


// Create a default tray icon
function createDefaultTrayIcon() {
  // Create a simple 16x16 blue square icon
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    canvas[offset] = 59;     // R (blue color)
    canvas[offset + 1] = 130; // G
    canvas[offset + 2] = 246; // B
    canvas[offset + 3] = 255; // A
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// Create system tray icon
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  let trayIcon;
  try {
    if (require('fs').existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    }
  } catch (e) {
    // Ignore
  }

  // Use default icon if file doesn't exist or is empty
  if (!trayIcon || trayIcon.isEmpty()) {
    trayIcon = createDefaultTrayIcon();
  }

  // Resize for tray (16x16 on most platforms)
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);

  updateTrayMenu();

  tray.setToolTip('TimeTracker Desktop');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  
  const isTracking = tracker ? tracker.isTracking : false;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TimeTracker',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: isTracking ? 'Pause Tracking' : 'Start Tracking',
      click: () => {
        if (tracker) {
          if (isTracking) {
            tracker.pause();
          } else {
            tracker.start();
          }
        }
        updateTrayMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: () => syncActivities()
    },
    {
      label: 'Check for Updates',
      click: () => {
        if (appUpdater) {
          appUpdater.checkForUpdates(false);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`TimeTracker Desktop - ${isTracking ? 'Tracking' : 'Paused'}`);
}

// Initialize activity tracker
async function initializeTracker() {
  const ActivityTracker = await loadTracker();
  if (!ActivityTracker) {
    console.error('Could not initialize tracker');
    return;
  }

  const settings = store.get('settings');
  
  tracker = new ActivityTracker({
    idleThreshold: settings.idleThreshold,
    minActivityDuration: settings.minActivityDuration,
    onActivity: (activity) => {
      // Save activity to store
      const activities = store.get('activities') || [];
      activities.push(activity);
      
      // Keep only last 30 days of activities
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredActivities = activities.filter(a => new Date(a.startTime).getTime() > thirtyDaysAgo);
      store.set('activities', filteredActivities);
      
      // Add to sync queue
      if (settings.syncEnabled) {
        const syncQueue = store.get('syncQueue') || [];
        syncQueue.push(activity);
        store.set('syncQueue', syncQueue);
      }
      
      // Notify renderer
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('activity-logged', activity);
      }
    },
    onIdleStart: () => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('idle-started');
      }
      // Trigger sync on idle if enabled
      handleIdleSync();
    },
    onIdleEnd: (idleDuration) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('idle-ended', idleDuration);
      }
      // Reset idle state
      handleIdleEnd();
    },
    onStatusChange: (status) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('tracking-status-changed', status);
      }
      updateTrayMenu();
    }
  });

  // Start tracking if enabled
  if (settings.trackingEnabled) {
    // Wait a bit for active-win to initialize
    setTimeout(() => {
      if (tracker) tracker.start();
    }, 2000);
  }
}



// Sync activities to web app using Supabase Edge Function
async function syncActivities() {
  const settings = store.get('settings');
  
  if (!settings.syncEnabled || !settings.syncUrl || !settings.syncToken) {
    console.log('Sync not configured');
    return { success: false, error: 'Sync not configured' };
  }

  const syncQueue = store.get('syncQueue') || [];
  
  if (syncQueue.length === 0) {
    console.log('Nothing to sync');
    return { success: true, synced: 0 };
  }

  const deviceId = getDeviceId();

  try {
    // Use the Supabase Edge Function endpoint
    const syncUrl = settings.syncUrl.replace(/\/$/, ''); // Remove trailing slash
    const response = await fetch(`${syncUrl}/functions/v1/desktop-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-token': settings.syncToken,
        'x-device-id': deviceId
      },
      body: JSON.stringify({
        activities: syncQueue.map(a => ({
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
        deviceId: deviceId,
        deviceName: require('os').hostname(),
        platform: process.platform,
        timestamp: new Date().toISOString(),
        syncType: 'push'
      })
    });

    const result = await response.json();
    const anonKey = settings.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
        throw new Error('Supabase anon key is missing. Set settings.supabaseAnonKey or SUPABASE_ANON_KEY.');
    }
    const response = await fetch(`${syncUrl}/functions/v1/desktop-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'x-sync-token': settings.syncToken,
        'x-device-id': deviceId
      },
      body: JSON.stringify({ ... })
      }
    );

    if (response.ok && result.success) {
      // Clear synced activities from queue
      store.set('syncQueue', []);
      store.set('lastSyncTime', new Date().toISOString());
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('sync-completed', { 
          success: true, 
          synced: result.syncedCount || syncQueue.length,
          syncId: result.syncId
        });
      }
      
      console.log(`Sync completed: ${result.syncedCount} activities synced`);
      return { success: true, synced: result.syncedCount || syncQueue.length };
    } else if (response.status === 429) {
      // Rate limited
      console.warn('Sync rate limited:', result.message);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('sync-completed', { 
          success: false, 
          error: 'Rate limited. Please try again later.',
          retryAfter: response.headers.get('X-RateLimit-Reset')
        });
      }
      return { success: false, error: 'Rate limited' };
    } else {
      throw new Error(result.message || `Sync failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Sync error:', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-completed', { success: false, error: error.message });
    }
    return { success: false, error: error.message };
  }
}

const anonKey = process.env.SUPABASE_ANON_KEY;
if (!anonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY');
}

const response = await fetch(`${syncUrl}/functions/v1/desktop-sync`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',

    // ✅ REQUIRED by Supabase Edge gateway
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,

    // ✅ Your desktop auth layer
    'x-sync-token': settings.syncToken,
    'x-device-id': deviceId
  },
  body: JSON.stringify({
    activities: syncQueue.map(a => ({
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
    deviceName: require('os').hostname(),
    platform: process.platform,
    timestamp: new Date().toISOString(),
    syncType: 'push'
  })
});


function getDeviceId() {
  let deviceId = store.get('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    store.set('deviceId', deviceId);
  }
  return deviceId;
}

// IPC Handlers
function setupIpcHandlers() {
  // Get all activities
  ipcMain.handle('get-activities', () => {
    return store.get('activities') || [];
  });

  // Get today's activities
  ipcMain.handle('get-today-activities', () => {
    const activities = store.get('activities') || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activities.filter(a => new Date(a.startTime) >= today);
  });

  // Get settings
  ipcMain.handle('get-settings', () => {
    return store.get('settings');
  });

  // Update settings
  ipcMain.handle('update-settings', (event, newSettings) => {
    const currentSettings = store.get('settings');
    const updatedSettings = { ...currentSettings, ...newSettings };
    store.set('settings', updatedSettings);
    
    // Update tracker settings
    if (tracker) {
      tracker.updateSettings({
        idleThreshold: updatedSettings.idleThreshold,
        minActivityDuration: updatedSettings.minActivityDuration
      });
    }
    
    // Update auto-start setting
    try {
      app.setLoginItemSettings({
        openAtLogin: updatedSettings.startOnBoot,
        openAsHidden: true
      });
    } catch (e) {
      console.error('Failed to set login item settings:', e);
    }
    
    // Update auto-update settings
    if (appUpdater && updatedSettings.autoUpdate !== currentSettings.autoUpdate) {
      if (updatedSettings.autoUpdate) {
        appUpdater.startPeriodicUpdateChecks(4);
      }
    }
    
    // Update auto-sync timer if sync settings changed
    if (updatedSettings.autoSyncEnabled !== currentSettings.autoSyncEnabled ||
        updatedSettings.syncInterval !== currentSettings.syncInterval ||
        updatedSettings.syncEnabled !== currentSettings.syncEnabled) {
      if (updatedSettings.autoSyncEnabled && updatedSettings.syncEnabled) {
        startAutoSyncTimer();
      } else {
        stopAutoSyncTimer();
      }
    }
    
    return updatedSettings;
  });



  // Start tracking
  ipcMain.handle('start-tracking', () => {
    if (tracker) {
      tracker.start();
      return true;
    }
    return false;
  });

  // Pause tracking
  ipcMain.handle('pause-tracking', () => {
    if (tracker) {
      tracker.pause();
      return true;
    }
    return false;
  });

  // Get tracking status
  ipcMain.handle('get-tracking-status', () => {
    return {
      isTracking: tracker ? tracker.isTracking : false,
      currentActivity: tracker ? tracker.getCurrentActivity() : null,
      stats: tracker ? tracker.getStats() : null
    };
  });

  // Sync activities
  ipcMain.handle('sync-activities', async () => {
    return await syncActivities();
  });

  // Get sync status
  ipcMain.handle('get-sync-status', () => {
    const settings = store.get('settings');
    const syncQueue = store.get('syncQueue') || [];
    const lastSyncTime = store.get('lastSyncTime');
    
    return {
      enabled: settings.syncEnabled,
      configured: !!(settings.syncUrl && settings.syncToken),
      pendingCount: syncQueue.length,
      lastSyncTime
    };
  });

  // Window controls
  ipcMain.handle('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window-close', () => {
    if (mainWindow) mainWindow.close();
  });

  // Code activity (assign to project/task)
  ipcMain.handle('code-activity', (event, { activityId, projectId, taskId }) => {
    const activities = store.get('activities') || [];
    const index = activities.findIndex(a => a.id === activityId);
    
    if (index !== -1) {
      activities[index].projectId = projectId;
      activities[index].taskId = taskId;
      activities[index].isCoded = true;
      store.set('activities', activities);
      return activities[index];
    }
    return null;
  });

  // Delete activity
  ipcMain.handle('delete-activity', (event, activityId) => {
    const activities = store.get('activities') || [];
    const filtered = activities.filter(a => a.id !== activityId);
    store.set('activities', filtered);
    return true;
  });

  // Get device info
  ipcMain.handle('get-device-info', () => {
    return {
      deviceId: getDeviceId(),
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion()
    };
  });

  // Generate sync token
  ipcMain.handle('generate-sync-token', () => {
    const token = uuidv4() + '-' + Date.now().toString(36);
    return token;
  });

  // Open external URL
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
  });

  // Get release notes URL
  ipcMain.handle('get-release-url', () => {
    return 'https://github.com/timetracker/timetracker-desktop/releases';
  });
}

// Power monitor events
function setupPowerMonitor() {
  powerMonitor.on('suspend', () => {
    console.log('System suspended');
    if (tracker) tracker.handleSuspend();
  });

  powerMonitor.on('resume', () => {
    console.log('System resumed');
    if (tracker) tracker.handleResume();
  });

  powerMonitor.on('lock-screen', () => {
    console.log('Screen locked');
    if (tracker) tracker.handleLock();
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('Screen unlocked');
    if (tracker) tracker.handleUnlock();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();
  setupIpcHandlers();
  await initializeTracker();
  setupPowerMonitor();
  
  // Start auto-sync timer
  startAutoSyncTimer();
  
  // Sync on startup if enabled
  syncOnStartup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on Windows/Linux, minimize to tray
    if (!store.get('settings.minimizeToTray')) {
      app.quit();
    }
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  
  // Stop auto-sync timer
  stopAutoSyncTimer();
  
  // Sync on close if enabled
  await syncOnClose();
  
  if (tracker) {
    tracker.stop();
  }
});



// Auto-start on boot
try {
  app.setLoginItemSettings({
    openAtLogin: store.get('settings.startOnBoot', true),
    openAsHidden: true
  });
} catch (e) {
  console.error('Failed to set login item settings:', e);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
