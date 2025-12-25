/**
 * Preload script for TimeTracker Desktop
 * 
 * Exposes a secure API to the renderer process using contextBridge.
 * This ensures the renderer process cannot directly access Node.js APIs
 * while still allowing controlled communication with the main process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Activity Management
  getActivities: () => ipcRenderer.invoke('get-activities'),
  getTodayActivities: () => ipcRenderer.invoke('get-today-activities'),
  codeActivity: (data) => ipcRenderer.invoke('code-activity', data),
  deleteActivity: (activityId) => ipcRenderer.invoke('delete-activity', activityId),

  // Tracking Control
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  pauseTracking: () => ipcRenderer.invoke('pause-tracking'),
  getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  // Sync
  syncActivities: () => ipcRenderer.invoke('sync-activities'),
  getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
  generateSyncToken: () => ipcRenderer.invoke('generate-sync-token'),

  // Device Info
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // External Links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getReleaseUrl: () => ipcRenderer.invoke('get-release-url'),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  setAutoDownload: (enabled) => ipcRenderer.invoke('set-auto-download', enabled),
  setAllowPrerelease: (enabled) => ipcRenderer.invoke('set-allow-prerelease', enabled),

  // Event Listeners
  onActivityLogged: (callback) => {
    const subscription = (event, activity) => callback(activity);
    ipcRenderer.on('activity-logged', subscription);
    return () => ipcRenderer.removeListener('activity-logged', subscription);
  },

  onIdleStarted: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('idle-started', subscription);
    return () => ipcRenderer.removeListener('idle-started', subscription);
  },

  onIdleEnded: (callback) => {
    const subscription = (event, duration) => callback(duration);
    ipcRenderer.on('idle-ended', subscription);
    return () => ipcRenderer.removeListener('idle-ended', subscription);
  },

  onTrackingStatusChanged: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('tracking-status-changed', subscription);
    return () => ipcRenderer.removeListener('tracking-status-changed', subscription);
  },

  onSyncCompleted: (callback) => {
    const subscription = (event, result) => callback(result);
    ipcRenderer.on('sync-completed', subscription);
    return () => ipcRenderer.removeListener('sync-completed', subscription);
  },

  // Update Event Listeners
  onUpdateStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('update-status', subscription);
    return () => ipcRenderer.removeListener('update-status', subscription);
  }
});

// Log that preload script has loaded
console.log('TimeTracker Desktop preload script loaded');
