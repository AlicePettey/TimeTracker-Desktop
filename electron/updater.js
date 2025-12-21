/**
 * Auto-Updater Module for TimeTracker Desktop
 * 
 * Uses electron-updater to check for updates from GitHub Releases
 * and automatically download and install them.
 */

const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;
autoUpdater.allowPrerelease = false;

class AppUpdater {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.updateInfo = null;
    this.downloadProgress = 0;
    
    this.setupEventHandlers();
    this.setupIpcHandlers();
  }

  /**
   * Set the main window reference for sending update notifications
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Setup auto-updater event handlers
   */
  setupEventHandlers() {
    // Checking for updates
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      this.sendStatusToWindow('checking-for-update');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.updateAvailable = true;
      this.updateInfo = info;
      this.sendStatusToWindow('update-available', info);
      
      // Show notification to user
      this.showUpdateAvailableDialog(info);
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.updateAvailable = false;
      this.sendStatusToWindow('update-not-available', info);
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
      this.downloadProgress = progress.percent;
      this.sendStatusToWindow('download-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      });
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.updateDownloaded = true;
      this.updateInfo = info;
      this.sendStatusToWindow('update-downloaded', info);
      
      // Show notification to user
      this.showUpdateReadyDialog(info);
    });

    // Error handling
    autoUpdater.on('error', (error) => {
      log.error('Auto-updater error:', error);
      this.sendStatusToWindow('error', { message: error.message });
    });
  }

  /**
   * Setup IPC handlers for renderer process communication
   */
  setupIpcHandlers() {
    // Check for updates manually
    ipcMain.handle('check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, result };
      } catch (error) {
        log.error('Error checking for updates:', error);
        return { success: false, error: error.message };
      }
    });

    // Download update
    ipcMain.handle('download-update', async () => {
      try {
        if (this.updateAvailable) {
          await autoUpdater.downloadUpdate();
          return { success: true };
        }
        return { success: false, error: 'No update available' };
      } catch (error) {
        log.error('Error downloading update:', error);
        return { success: false, error: error.message };
      }
    });

    // Install update and restart
    ipcMain.handle('install-update', () => {
      if (this.updateDownloaded) {
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      }
      return { success: false, error: 'No update downloaded' };
    });

    // Get current update status
    ipcMain.handle('get-update-status', () => {
      return {
        updateAvailable: this.updateAvailable,
        updateDownloaded: this.updateDownloaded,
        updateInfo: this.updateInfo,
        downloadProgress: this.downloadProgress,
        currentVersion: app.getVersion()
      };
    });

    // Get app version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Set auto-download preference
    ipcMain.handle('set-auto-download', (event, enabled) => {
      autoUpdater.autoDownload = enabled;
      return { success: true };
    });

    // Set allow prerelease preference
    ipcMain.handle('set-allow-prerelease', (event, enabled) => {
      autoUpdater.allowPrerelease = enabled;
      return { success: true };
    });
  }

  /**
   * Send update status to renderer window
   */
  sendStatusToWindow(status, data = null) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  /**
   * Show dialog when update is available
   */
  async showUpdateAvailableDialog(info) {
    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version of TimeTracker Desktop is available!`,
      detail: `Version ${info.version} is ready to download.\n\nCurrent version: ${app.getVersion()}\n\nWould you like to download it now?`,
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      this.sendStatusToWindow('downloading');
      autoUpdater.downloadUpdate();
    }
  }

  /**
   * Show dialog when update is downloaded and ready to install
   */
  async showUpdateReadyDialog(info) {
    const { response } = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded successfully!',
      detail: `Version ${info.version} has been downloaded and is ready to install.\n\nThe application will restart to complete the update.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  }

  /**
   * Check for updates (called on app start and periodically)
   */
  async checkForUpdates(silent = false) {
    try {
      log.info('Checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      log.error('Error checking for updates:', error);
      if (!silent) {
        dialog.showErrorBox(
          'Update Check Failed',
          `Failed to check for updates: ${error.message}`
        );
      }
      return null;
    }
  }

  /**
   * Start periodic update checks (every 4 hours)
   */
  startPeriodicUpdateChecks(intervalHours = 4) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    // Check immediately on start (after a short delay)
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 10000); // 10 seconds after app start
    
    // Then check periodically
    setInterval(() => {
      this.checkForUpdates(true);
    }, intervalMs);
    
    log.info(`Periodic update checks started (every ${intervalHours} hours)`);
  }

  /**
   * Get the feed URL for updates
   */
  getFeedUrl() {
    return autoUpdater.getFeedURL();
  }

  /**
   * Set custom feed URL (for enterprise/self-hosted)
   */
  setFeedUrl(url) {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: url
    });
  }
}

// Export singleton instance
module.exports = new AppUpdater();
