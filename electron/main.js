const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, screen, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const ActivityTracker = require('./tracker');
const appUpdater = require('./updater');

// Initialize electron store for persistent data
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
      allowPrerelease: false
    },
    syncQueue: [],
    lastSyncTime: null
  }
});

let mainWindow = null;
let tray = null;
let tracker = null;
let isQuitting = false;

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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Set main window reference for updater
    appUpdater.setMainWindow(mainWindow);
    
    // Start periodic update checks if enabled
    const settings = store.get('settings');
    if (settings.autoUpdate) {
      appUpdater.startPeriodicUpdateChecks(4); // Check every 4 hours
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

// Create system tray icon
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  // Create a simple icon if file doesn't exist
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch (e) {
    // Create a simple 16x16 icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADASURBVDiNpZMxDoMwDEV/kDp07dKxN+AqHIEjcCOOwBE4AkfhCIzduqRLh0oZGhJIIFWf5Nj+/rYTQAgh/BsAcM6NjLEZgBmAMYABgB6ADoAWgAaAGoAKgBKAAoAcgAyAFIAEgBiACIAQgAAAH4APgAeAC4ADgA2ABYAFQP7/AwBYa0fG2ATABMAYwBBAD0AHQAtAA0ANQAVACUABQAZACkACQAxABEAIQACAD4AHgAuAA4ANgAWABYAFgP0GvgDxBwAAAABJRU5ErkJggg==') : trayIcon);

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
    {
      label: 'Tracking',
      submenu: [
        {
          label: 'Start Tracking',
          click: () => {
            if (tracker) tracker.start();
            updateTrayMenu();
          }
        },
        {
          label: 'Pause Tracking',
          click: () => {
            if (tracker) tracker.pause();
            updateTrayMenu();
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: () => syncActivities()
    },
    {
      label: 'Check for Updates',
      click: () => appUpdater.checkForUpdates(false)
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

  tray.setToolTip('TimeTracker Desktop');
  tray.setContextMenu(contextMenu);

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
      label: isTracking ? '⏸ Pause Tracking' : '▶ Start Tracking',
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
      click: () => appUpdater.checkForUpdates(false)
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
function initializeTracker() {
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
    },
    onIdleEnd: (idleDuration) => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('idle-ended', idleDuration);
      }
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
    tracker.start();
  }
}

// Sync activities to web app
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

  try {
    const response = await fetch(`${settings.syncUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.syncToken}`
      },
      body: JSON.stringify({
        activities: syncQueue,
        deviceId: getDeviceId(),
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      const result = await response.json();
      store.set('syncQueue', []);
      store.set('lastSyncTime', new Date().toISOString());
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('sync-completed', { success: true, synced: syncQueue.length });
      }
      
      return { success: true, synced: syncQueue.length };
    } else {
      throw new Error(`Sync failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Sync error:', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-completed', { success: false, error: error.message });
    }
    return { success: false, error: error.message };
  }
}

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
    app.setLoginItemSettings({
      openAtLogin: updatedSettings.startOnBoot,
      openAsHidden: true
    });
    
    // Update auto-update settings
    if (updatedSettings.autoUpdate !== currentSettings.autoUpdate) {
      if (updatedSettings.autoUpdate) {
        appUpdater.startPeriodicUpdateChecks(4);
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
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIpcHandlers();
  initializeTracker();
  setupPowerMonitor();

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

app.on('before-quit', () => {
  isQuitting = true;
  if (tracker) {
    tracker.stop();
  }
});

// Auto-start on boot
app.setLoginItemSettings({
  openAtLogin: store.get('settings.startOnBoot', true),
  openAsHidden: true
});
