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
let isSyncing = false;
let expandedGroups = new Set();

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

  // Toast
  toast: document.getElementById('toast'),
  toastIcon: document.getElementById('toast-icon'),
  toastTitle: document.getElementById('toast-title'),
  toastMessage: document.getElementById('toast-message'),

  // Sync buttons
  btnSyncNow: document.getElementById('btn-sync-now'),
  btnQuickSync: document.getElementById('btn-quick-sync'),
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
  elements.btnSyncNow.addEventListener('click', syncNow);
  elements.btnQuickSync.addEventListener('click', syncNow);
  
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
  
  // Release notes link - updated URL
  document.getElementById('link-releases').addEventListener('click', (e) => {
    e.preventDefault();
    window.electronAPI.openExternal('https://github.com/AlicePettey/TimeTracker-Desktop/releases');
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
    isSyncing = false;
    updateSyncButtonState();
    
    if (result.success) {
      showToast('success', 'Sync Complete', `${result.synced} activities synced successfully`);
    } else {
      showToast('error', 'Sync Failed', result.error || 'Unknown error occurred');
    }
    loadSyncStatus();
  });
  
  // Update status
  window.electronAPI.onUpdateStatus((data) => {
    handleUpdateStatus(data);
  });
}

// Toast notification system
function showToast(type, title, message) {
  const toast = elements.toast;
  const toastIcon = elements.toastIcon;
  
  // Set type class
  toast.className = 'toast ' + type;
  
  // Set icon based on type
  if (type === 'success') {
    toastIcon.innerHTML = `
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    `;
  } else if (type === 'error') {
    toastIcon.innerHTML = `
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    `;
  }
  
  // Set content
  elements.toastTitle.textContent = title;
  elements.toastMessage.textContent = message;
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Update sync button state
function updateSyncButtonState() {
  const syncingClass = 'syncing';
  
  if (isSyncing) {
    elements.btnSyncNow.classList.add(syncingClass);
    elements.btnQuickSync.classList.add(syncingClass);
    elements.btnSyncNow.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        <polyline points="21 3 21 9 15 9"/>
      </svg>
      Syncing...
    `;
    elements.btnQuickSync.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        <polyline points="21 3 21 9 15 9"/>
      </svg>
      Syncing...
    `;
  } else {
    elements.btnSyncNow.classList.remove(syncingClass);
    elements.btnQuickSync.classList.remove(syncingClass);
    elements.btnSyncNow.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        <polyline points="21 3 21 9 15 9"/>
      </svg>
      Sync Now
    `;
    elements.btnQuickSync.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        <polyline points="21 3 21 9 15 9"/>
      </svg>
      Sync to Web App
    `;
  }
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

// Render activities list with collapsible groups
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
  
  // Group activities by app name
  const groupedActivities = {};
  activities.slice(0, 100).forEach(activity => {
    const appName = activity.appName || activity.applicationName || 'Unknown';
    if (!groupedActivities[appName]) {
      groupedActivities[appName] = {
        activities: [],
        totalDuration: 0,
        categoryId: activity.categoryId
      };
    }
    groupedActivities[appName].activities.push(activity);
    groupedActivities[appName].totalDuration += activity.duration || 0;
  });
  
  // Render grouped activities
  elements.activityList.innerHTML = Object.entries(groupedActivities).map(([appName, group]) => {
    const isExpanded = expandedGroups.has(appName);
    const categoryColor = getCategoryColor(group.categoryId);
    const categoryName = getCategoryName(group.categoryId);
    
    return `
      <div class="activity-group ${isExpanded ? 'expanded' : ''}" data-app="${escapeHtml(appName)}">
        <div class="activity-group-header" onclick="toggleActivityGroup('${escapeHtml(appName)}')">
          <div class="activity-group-info">
            <div class="activity-group-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div>
              <div class="activity-group-name">${escapeHtml(appName)}</div>
              <div class="activity-group-count">${group.activities.length} session${group.activities.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div class="activity-group-right">
            <span class="activity-category" style="background-color: ${categoryColor}20; color: ${categoryColor}; border: 1px solid ${categoryColor}40;">
              ${categoryName}
            </span>
            <span class="activity-group-duration">${formatDuration(group.totalDuration)}</span>
            <svg class="activity-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
        <div class="activity-group-items">
          ${group.activities.map(activity => `
            <div class="activity-item">
              <div class="activity-header">
                <span class="activity-title">${escapeHtml(activity.windowTitle || '-')}</span>
                <span class="activity-duration">${formatDuration(activity.duration)}</span>
              </div>
              <div class="activity-meta">
                <span class="activity-time">${formatTime(activity.startTime)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Toggle activity group expansion
function toggleActivityGroup(appName) {
  if (expandedGroups.has(appName)) {
    expandedGroups.delete(appName);
  } else {
    expandedGroups.add(appName);
  }
  renderActivities();
}

// Make toggleActivityGroup available globally
window.toggleActivityGroup = toggleActivityGroup;

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
  showToast('success', 'Settings Saved', 'Sync settings have been updated');
}

async function syncNow() {
  if (isSyncing) return;
  
  isSyncing = true;
  updateSyncButtonState();
  
  const result = await window.electronAPI.syncActivities();
  
  isSyncing = false;
  updateSyncButtonState();
  
  if (result.success) {
    showToast('success', 'Sync Complete', `${result.synced} activities synced successfully`);
  } else {
    showToast('error', 'Sync Failed', result.error || 'Unknown error occurred');
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
    showToast('error', 'Update Check Failed', result.error || 'Could not check for updates');
  } else {
    showToast('success', 'Up to Date', 'You are running the latest version');
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
      showToast('success', 'Update Ready', 'Restart the app to install the update');
      break;
    case 'error':
      showToast('error', 'Update Error', data.data.message);
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

// Make functions available globally for onclick handlers
window.installUpdate = installUpdate;
window.skipUpdate = skipUpdate;

// Initialize app
init();
