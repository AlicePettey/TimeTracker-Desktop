/**
 * TimeTracker Desktop - Renderer Process
 * 
 * Handles all UI interactions and communicates with the main process
 * through the electronAPI exposed via preload script.
 */

// State
let currentTab = 'activities';
let activities = [];
let settings = {};
let isTracking = true;
let updateStatus = null;

// DOM Elements
const elements = {
  // Status
  statusIndicator: document.getElementById('status-indicator'),
  statusIcon: document.getElementById('status-icon'),
  statusText: document.getElementById('status-text'),
  statusTime: document.getElementById('status-time'),
  currentAppName: document.getElementById('current-app-name'),
  currentAppTitle: document.getElementById('current-app-title'),
  
  // Activities
  activityList: document.getElementById('activity-list'),
  
  // Sync
  syncBadge: document.getElementById('sync-badge'),
  syncInfo: document.getElementById('sync-info'),
  syncUrl: document.getElementById('sync-url'),
  syncToken: document.getElementById('sync-token'),
  
  // Settings
  toggleTracking: document.getElementById('toggle-tracking'),
  toggleStartup: document.getElementById('toggle-startup'),
  toggleTray: document.getElementById('toggle-tray'),
  toggleAutoupdate: document.getElementById('toggle-autoupdate'),
  idleThreshold: document.getElementById('idle-threshold'),
  appVersion: document.getElementById('app-version'),
  
  // Update
  updateBanner: document.getElementById('update-banner'),
  updateTitle: document.getElementById('update-title'),
  updateText: document.getElementById('update-text'),
  updateProgress: document.getElementById('update-progress'),
  updateProgressFill: document.getElementById('update-progress-fill'),
  updateActions: document.getElementById('update-actions'),
};

// Initialize
async function init() {
  // Setup event listeners
  setupEventListeners();
  
  // Load initial data
  await loadSettings();
  await loadActivities();
  await loadSyncStatus();
  await loadVersion();
  await checkUpdateStatus();
  
  // Setup IPC listeners
  setupIpcListeners();
  
  // Update status periodically
  setInterval(updateTrackingStatus, 1000);
}

// Setup DOM event listeners
function setupEventListeners() {
  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.minimizeWindow();
  });
  
  document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });
  
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Sync buttons
  document.getElementById('btn-save-sync').addEventListener('click', saveSyncSettings);
  document.getElementById('btn-sync-now').addEventListener('click', syncNow);
  
  // Settings toggles
  elements.toggleTracking.addEventListener('click', toggleTracking);
  elements.toggleStartup.addEventListener('click', toggleStartup);
  elements.toggleTray.addEventListener('click', toggleTray);
  elements.toggleAutoupdate.addEventListener('click', toggleAutoupdate);
  
  // Idle threshold
  elements.idleThreshold.addEventListener('change', updateIdleThreshold);
  
  // Update buttons
  document.getElementById('btn-check-updates').addEventListener('click', checkForUpdates);
  document.getElementById('btn-download-update').addEventListener('click', downloadUpdate);
  document.getElementById('btn-skip-update').addEventListener('click', skipUpdate);
  
  // Release notes link
  document.getElementById('link-releases').addEventListener('click', async (e) => {
    e.preventDefault();
    const url = await window.electronAPI.getReleaseUrl();
    window.electronAPI.openExternal(url);
  });
}

// Setup IPC listeners for main process events
function setupIpcListeners() {
  // Activity logged
  window.electronAPI.onActivityLogged((activity) => {
    activities.unshift(activity);
    renderActivities();
  });
  
  // Idle events
  window.electronAPI.onIdleStarted(() => {
    updateStatusDisplay('idle');
  });
  
  window.electronAPI.onIdleEnded((duration) => {
    updateStatusDisplay('tracking');
  });
  
  // Tracking status changed
  window.electronAPI.onTrackingStatusChanged((status) => {
    isTracking = status.isTracking;
    updateStatusDisplay(isTracking ? 'tracking' : 'paused');
  });
  
  // Sync completed
  window.electronAPI.onSyncCompleted((result) => {
    if (result.success) {
      showNotification('Sync completed', `${result.synced} activities synced`);
    } else {
      showNotification('Sync failed', result.error);
    }
    loadSyncStatus();
  });
  
  // Update status
  window.electronAPI.onUpdateStatus((data) => {
    handleUpdateStatus(data);
  });
}

// Tab switching
function switchTab(tabId) {
  currentTab = tabId;
  
  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = content.id === `tab-${tabId}` ? 'block' : 'none';
  });
}

// Load settings
async function loadSettings() {
  settings = await window.electronAPI.getSettings();
  
  // Update UI
  elements.toggleTracking.classList.toggle('active', settings.trackingEnabled);
  elements.toggleStartup.classList.toggle('active', settings.startOnBoot);
  elements.toggleTray.classList.toggle('active', settings.minimizeToTray);
  elements.toggleAutoupdate.classList.toggle('active', settings.autoUpdate !== false);
  elements.idleThreshold.value = Math.floor(settings.idleThreshold / 60);
  
  // Sync settings
  elements.syncUrl.value = settings.syncUrl || '';
  elements.syncToken.value = settings.syncToken || '';
}

// Load activities
async function loadActivities() {
  activities = await window.electronAPI.getTodayActivities();
  renderActivities();
}

// Render activities list with categories
function renderActivities() {
  if (activities.length === 0) {
    elements.activityList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h3>No activities yet</h3>
        <p>Activities will appear here as you work</p>
      </div>
    `;
    return;
  }
  
  elements.activityList.innerHTML = activities.slice(0, 50).map(activity => {
    const categoryColor = getCategoryColor(activity.categoryId);
    const categoryName = getCategoryName(activity.categoryId);
    
    return `
      <div class="activity-item">
        <div class="activity-header">
          <span class="activity-app">${escapeHtml(activity.appName || activity.applicationName || 'Unknown')}</span>
          <span class="activity-duration">${formatDuration(activity.duration)}</span>
        </div>
        <div class="activity-title">${escapeHtml(activity.windowTitle || '-')}</div>
        <div class="activity-meta">
          <span class="activity-time">${formatTime(activity.startTime)}</span>
          <span class="activity-category" style="background-color: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
            ${categoryName}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Category helpers
const CATEGORY_COLORS = {
  'development': '#3B82F6',
  'communication': '#8B5CF6',
  'design': '#EC4899',
  'meetings': '#F59E0B',
  'documentation': '#10B981',
  'research': '#06B6D4',
  'entertainment': '#EF4444',
  'social-media': '#F97316',
  'utilities': '#6B7280',
  'uncategorized': '#9CA3AF'
};

const CATEGORY_NAMES = {
  'development': 'Development',
  'communication': 'Communication',
  'design': 'Design',
  'meetings': 'Meetings',
  'documentation': 'Documentation',
  'research': 'Research',
  'entertainment': 'Entertainment',
  'social-media': 'Social Media',
  'utilities': 'Utilities',
  'uncategorized': 'Uncategorized'
};

function getCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || CATEGORY_COLORS['uncategorized'];
}

function getCategoryName(categoryId) {
  return CATEGORY_NAMES[categoryId] || 'Uncategorized';
}


// Load sync status
async function loadSyncStatus() {
  const status = await window.electronAPI.getSyncStatus();
  
  if (status.configured) {
    elements.syncBadge.textContent = 'Connected';
    elements.syncBadge.classList.remove('disconnected');
    elements.syncBadge.classList.add('connected');
    
    let info = `${status.pendingCount} activities pending`;
    if (status.lastSyncTime) {
      info += ` • Last sync: ${formatTime(status.lastSyncTime)}`;
    }
    elements.syncInfo.textContent = info;
  } else {
    elements.syncBadge.textContent = 'Not Connected';
    elements.syncBadge.classList.remove('connected');
    elements.syncBadge.classList.add('disconnected');
    elements.syncInfo.textContent = 'Configure sync to connect with the web app';
  }
}

// Load version
async function loadVersion() {
  const version = await window.electronAPI.getAppVersion();
  elements.appVersion.textContent = version;
}

// Update tracking status display
async function updateTrackingStatus() {
  const status = await window.electronAPI.getTrackingStatus();
  
  if (status.currentActivity) {
    elements.currentAppName.textContent = status.currentActivity.appName || '-';
    elements.currentAppTitle.textContent = status.currentActivity.windowTitle || 'No window title';
  }
  
  if (status.stats) {
    const hours = Math.floor(status.stats.totalTime / 3600);
    const minutes = Math.floor((status.stats.totalTime % 3600) / 60);
    elements.statusTime.textContent = `Today: ${hours}h ${minutes}m`;
  }
  
  updateStatusDisplay(status.isTracking ? 'tracking' : 'paused');
}

// Update status display
function updateStatusDisplay(state) {
  elements.statusIndicator.className = 'status-indicator ' + state;
  
  const icons = {
    tracking: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    idle: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    paused: '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>'
  };
  
  const texts = {
    tracking: 'Tracking Active',
    idle: 'Idle Detected',
    paused: 'Tracking Paused'
  };
  
  elements.statusIcon.innerHTML = icons[state] || icons.tracking;
  elements.statusText.textContent = texts[state] || 'Unknown';
}

// Toggle functions
async function toggleTracking() {
  const isActive = elements.toggleTracking.classList.toggle('active');
  if (isActive) {
    await window.electronAPI.startTracking();
  } else {
    await window.electronAPI.pauseTracking();
  }
  await window.electronAPI.updateSettings({ trackingEnabled: isActive });
}

async function toggleStartup() {
  const isActive = elements.toggleStartup.classList.toggle('active');
  await window.electronAPI.updateSettings({ startOnBoot: isActive });
}

async function toggleTray() {
  const isActive = elements.toggleTray.classList.toggle('active');
  await window.electronAPI.updateSettings({ minimizeToTray: isActive });
}

async function toggleAutoupdate() {
  const isActive = elements.toggleAutoupdate.classList.toggle('active');
  await window.electronAPI.updateSettings({ autoUpdate: isActive });
}

async function updateIdleThreshold() {
  const minutes = parseInt(elements.idleThreshold.value) || 5;
  await window.electronAPI.updateSettings({ idleThreshold: minutes * 60 });
}

// Sync functions
async function saveSyncSettings() {
  const syncUrl = elements.syncUrl.value.trim();
  const syncToken = elements.syncToken.value.trim();
  
  await window.electronAPI.updateSettings({
    syncUrl,
    syncToken,
    syncEnabled: !!(syncUrl && syncToken)
  });
  
  await loadSyncStatus();
  showNotification('Settings saved', 'Sync settings have been updated');
}

async function syncNow() {
  const result = await window.electronAPI.syncActivities();
  if (result.success) {
    showNotification('Sync completed', `${result.synced} activities synced`);
  } else {
    showNotification('Sync failed', result.error);
  }
  await loadSyncStatus();
}

// Update functions
async function checkUpdateStatus() {
  const status = await window.electronAPI.getUpdateStatus();
  if (status.updateAvailable) {
    showUpdateBanner(status.updateInfo);
  }
}

async function checkForUpdates() {
  const result = await window.electronAPI.checkForUpdates();
  if (!result.success) {
    showNotification('Update check failed', result.error);
  }
}

async function downloadUpdate() {
  elements.updateProgress.style.display = 'block';
  elements.updateActions.style.display = 'none';
  await window.electronAPI.downloadUpdate();
}

function skipUpdate() {
  elements.updateBanner.style.display = 'none';
}

function handleUpdateStatus(data) {
  switch (data.status) {
    case 'update-available':
      showUpdateBanner(data.data);
      break;
    case 'download-progress':
      elements.updateProgressFill.style.width = `${data.data.percent}%`;
      elements.updateText.textContent = `Downloading... ${Math.round(data.data.percent)}%`;
      break;
    case 'update-downloaded':
      elements.updateTitle.textContent = 'Update Ready';
      elements.updateText.textContent = 'Restart to install the update';
      elements.updateProgress.style.display = 'none';
      elements.updateActions.innerHTML = `
        <button class="btn btn-primary" onclick="installUpdate()">Restart Now</button>
        <button class="btn btn-secondary" onclick="skipUpdate()">Later</button>
      `;
      elements.updateActions.style.display = 'flex';
      break;
    case 'error':
      showNotification('Update error', data.data.message);
      elements.updateBanner.style.display = 'none';
      break;
  }
}

function showUpdateBanner(info) {
  elements.updateBanner.style.display = 'block';
  elements.updateTitle.textContent = 'Update Available';
  elements.updateText.textContent = `Version ${info.version} is available`;
  elements.updateProgress.style.display = 'none';
  elements.updateActions.style.display = 'flex';
}

async function installUpdate() {
  await window.electronAPI.installUpdate();
}

// Utility functions
function formatDuration(seconds) {
  if (!seconds) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(title, message) {
  // Simple notification - could be enhanced with a toast system
  console.log(`${title}: ${message}`);
}

// Make installUpdate available globally for onclick
window.installUpdate = installUpdate;
window.skipUpdate = skipUpdate;

// Initialize app
init();
