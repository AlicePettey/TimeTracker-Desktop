const { v4: uuidv4 } = require('uuid');

// Default categorization rules for the desktop app
const DEFAULT_CATEGORIES = {
  development: {
    id: 'development',
    name: 'Development',
    color: '#3B82F6',
    isProductivity: true,
    productivityScore: 100
  },
  communication: {
    id: 'communication',
    name: 'Communication',
    color: '#8B5CF6',
    isProductivity: true,
    productivityScore: 75
  },
  meetings: {
    id: 'meetings',
    name: 'Meetings',
    color: '#F59E0B',
    isProductivity: true,
    productivityScore: 70
  },
  research: {
    id: 'research',
    name: 'Research',
    color: '#10B981',
    isProductivity: true,
    productivityScore: 85
  },
  admin: {
    id: 'admin',
    name: 'Administration',
    color: '#6B7280',
    isProductivity: true,
    productivityScore: 60
  },
  entertainment: {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#EF4444',
    isProductivity: false,
    productivityScore: 0
  },
  social: {
    id: 'social',
    name: 'Social Media',
    color: '#EC4899',
    isProductivity: false,
    productivityScore: 20
  },
  design: {
    id: 'design',
    name: 'Design',
    color: '#EC4899',
    isProductivity: true,
    productivityScore: 90
  },
  uncategorized: {
    id: 'uncategorized',
    name: 'Uncategorized',
    color: '#9CA3AF',
    isProductivity: true,
    productivityScore: 50
  }
};

// Default categorization rules
const DEFAULT_RULES = [
  // Development
  { categoryId: 'development', type: 'app', pattern: 'Visual Studio Code', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Code', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'IntelliJ', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'WebStorm', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'PyCharm', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Terminal', matchType: 'contains' },
  { categoryId: 'development', type: 'title', pattern: 'GitHub', matchType: 'contains' },
  { categoryId: 'development', type: 'title', pattern: 'Stack Overflow', matchType: 'contains' },

  // Communication
  { categoryId: 'communication', type: 'app', pattern: 'Slack', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Teams', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Outlook', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Mail', matchType: 'equals' },
  { categoryId: 'communication', type: 'title', pattern: 'Gmail', matchType: 'contains' },

  // Meetings
  { categoryId: 'meetings', type: 'title', pattern: 'Meet', matchType: 'contains' },
  { categoryId: 'meetings', type: 'title', pattern: 'Zoom', matchType: 'contains' },
  { categoryId: 'meetings', type: 'title', pattern: 'Teams Meeting', matchType: 'contains' },

  // Research
  { categoryId: 'research', type: 'title', pattern: 'Wikipedia', matchType: 'contains' },
  { categoryId: 'research', type: 'title', pattern: 'Google Scholar', matchType: 'contains' },
  { categoryId: 'research', type: 'title', pattern: 'Documentation', matchType: 'contains' },
  { categoryId: 'research', type: 'title', pattern: 'Docs', matchType: 'contains' },

  // Admin
  { categoryId: 'admin', type: 'app', pattern: 'Excel', matchType: 'contains' },
  { categoryId: 'admin', type: 'app', pattern: 'Word', matchType: 'contains' },
  { categoryId: 'admin', type: 'app', pattern: 'PowerPoint', matchType: 'contains' },
  { categoryId: 'admin', type: 'title', pattern: 'Calendar', matchType: 'contains' },

  // Entertainment
  { categoryId: 'entertainment', type: 'title', pattern: 'YouTube', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Netflix', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Hulu', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Disney', matchType: 'contains' },

  // Social
  { categoryId: 'social', type: 'title', pattern: 'Facebook', matchType: 'contains' },
  { categoryId: 'social', type: 'title', pattern: 'Twitter', matchType: 'contains' },
  { categoryId: 'social', type: 'title', pattern: 'LinkedIn', matchType: 'contains' },
  { categoryId: 'social', type: 'title', pattern: 'Instagram', matchType: 'contains' }
];

class ActivityTracker {
  constructor(options = {}) {
    this.options = {
      // Thresholds are in seconds
      idleThreshold: options.idleThreshold || 300, // 5 minutes
      minActivityDuration: options.minActivityDuration || 60, // 60 seconds
      pollInterval: options.pollInterval || 1000, // 1 second

      // System idle provider (Electron: powerMonitor.getSystemIdleTime)
      getSystemIdleSeconds: options.getSystemIdleSeconds || null,

      // Noise controls
      switchDebounceSeconds: (options.switchDebounceSeconds ?? 7),
      excludeApps: options.excludeApps || [],
      excludeTitles: options.excludeTitles || [],

      onActivity: options.onActivity || (() => {}),
      onIdleStart: options.onIdleStart || (() => {}),
      onIdleEnd: options.onIdleEnd || (() => {}),
      onStatusChange: options.onStatusChange || (() => {}),
      autoCategorize: options.autoCategorize !== false // Enable by default
    };

    this.isTracking = false;
    this.isPaused = false;
    this.isIdle = false;
    this.pollTimer = null;

    // Legacy fallback only (when no getSystemIdleSeconds)
    this.lastActivityTime = Date.now();

    // For debounce between activity switches
    this.lastSwitchTime = 0;

    this.currentActivity = null;
    this.rules = [...DEFAULT_RULES];
    this.categories = { ...DEFAULT_CATEGORIES };

    this.activeWinLoaded = false;
    this.activeWinLoadError = null;
    this.activeWin = null;

    this.loadActiveWin();
  }

  async loadActiveWin() {
    try {
      // active-win is an ESM module in v8+, need dynamic import
      const activeWinModule = await import('active-win');
      this.activeWin = activeWinModule.default || activeWinModule.activeWindow || activeWinModule;
      this.activeWinLoaded = true;
      console.log('active-win loaded successfully');
    } catch (error) {
      console.error('Failed to load active-win:', error.message);
      this.activeWinLoadError = error;
      // Use mock implementation
      this.activeWin = this.createMockActiveWin();
    }
  }

  createMockActiveWin() {
    return async () => {
      // Return null to simulate no active window
      return null;
    };
  }

  start() {
    if (this.isTracking) return;

    this.isTracking = true;
    this.isPaused = false;
    this.isIdle = false;

    this.options.onStatusChange('running');
    this.startPolling();
  }

  stop() {
    this.isTracking = false;
    this.isPaused = false;
    this.isIdle = false;

    this.stopPolling();

    // Finalize any current activity
    if (this.currentActivity) {
      this.finalizeActivity();
    }

    this.options.onStatusChange('stopped');
  }

  pause() {
    if (!this.isTracking || this.isPaused) return;

    this.isPaused = true;
    this.stopPolling();

    if (this.currentActivity) {
      this.finalizeActivity();
    }

    this.options.onStatusChange('paused');
  }

  resume() {
    if (!this.isTracking || !this.isPaused) return;

    this.isPaused = false;
    this.options.onStatusChange('running');
    this.startPolling();
  }

  startPolling() {
    this.stopPolling();

    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.options.pollInterval);

    // poll immediately as well
    this.poll();
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async poll() {
    if (!this.isTracking || this.isPaused || !this.activeWin) return;

    try {
      const windowInfo = await this.activeWin();

      if (!windowInfo) {
        this.handleNoWindow();
        return;
      }

      const now = Date.now();

      // Check for idle first (exclusive state)
      this.checkIdle(now);
      if (this.isIdle) return;

      // Process window info
      const appName = windowInfo.owner?.name || 'Unknown';
      const windowTitle = windowInfo.title || 'Untitled';
      const processPath = windowInfo.owner?.path || '';

      // Exclusions: if excluded, close any open activity and do not start a new one
      if (this.isExcluded(appName, windowTitle)) {
        if (this.currentActivity) {
          this.finalizeActivity();
        }
        return;
      }

      // Check if this is a new activity or continuation
      if (this.shouldStartNewActivity(appName, windowTitle)) {
        const debounceMs = (this.options.switchDebounceSeconds ?? 7) * 1000;
        const sinceLastSwitch = now - (this.lastSwitchTime || 0);

        // Debounce rapid switching: treat as same segment and optionally update metadata
        if (this.currentActivity && !this.currentActivity.isIdle && sinceLastSwitch < debounceMs) {
          this.currentActivity.applicationName = appName;
          this.currentActivity.windowTitle = windowTitle;
          this.currentActivity.processPath = processPath;
        } else {
          // Finalize previous activity
          if (this.currentActivity) {
            this.finalizeActivity();
          }

          // Categorize the new activity
          const categorization = this.options.autoCategorize
            ? this.categorizeActivity(appName, windowTitle)
            : { categoryId: 'uncategorized', autoAssigned: true, confidence: 50 };

          // Start new activity
          this.currentActivity = {
            id: uuidv4(),
            applicationName: appName,
            windowTitle: windowTitle,
            processPath: processPath,
            startTime: new Date(now).toISOString(),
            endTime: null,
            duration: 0,
            projectId: null,
            taskId: null,
            isCoded: false,
            isIdle: false,
            source: 'desktop',
            categoryId: categorization.categoryId,
            categoryAutoAssigned: categorization.autoAssigned,
            categoryConfidence: categorization.confidence
          };

          this.lastSwitchTime = now;
        }
      }

      // Update current activity duration
      if (this.currentActivity) {
        this.currentActivity.duration = Math.floor(
          (now - new Date(this.currentActivity.startTime).getTime()) / 1000
        );
      }

      // IMPORTANT:
      // Do not treat polling as "user activity". Real idle is handled by getSystemIdleSeconds().
      // Keep lastActivityTime for legacy fallback only (updated by handleUserActivity()).

    } catch (error) {
      console.error('Error polling active window:', error);
    }
  }

  shouldStartNewActivity(appName, windowTitle) {
    if (!this.currentActivity) return true;

    // New activity if app changed
    if (this.currentActivity.applicationName !== appName) return true;

    // New activity if window title significantly changed
    // (ignore minor changes like tab counts, timestamps, etc.)
    const currentTitle = this.normalizeTitle(this.currentActivity.windowTitle);
    const newTitle = this.normalizeTitle(windowTitle);

    if (currentTitle !== newTitle) return true;

    return false;
  }

  normalizeTitle(title) {
    // Remove common dynamic parts from titles
    return title
      .replace(/\(\d+\)/g, '') // Remove counts like (3)
      .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '') // Remove timestamps
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  handleNoWindow() {
    // No active window - might be locked screen or something temporary
    if (this.currentActivity) {
      this.finalizeActivity();
    }
  }

  isExcluded(appName, windowTitle) {
    const apps = this.options.excludeApps || [];
    const titles = this.options.excludeTitles || [];
    const a = (appName || '').toLowerCase();
    const t = (windowTitle || '').toLowerCase();

    return apps.some(x => a.includes(String(x).toLowerCase())) ||
           titles.some(x => t.includes(String(x).toLowerCase()));
  }

  checkIdle(now) {
    // Prefer real system idle time if provided (Electron: powerMonitor.getSystemIdleTime)
    if (this.options.getSystemIdleSeconds) {
      const idleSeconds = this.options.getSystemIdleSeconds();
      const isIdleNow = idleSeconds >= this.options.idleThreshold;

      // Active → Idle
      if (!this.isIdle && isIdleNow) {
        this.isIdle = true;
        if (this.options.onIdleStart) this.options.onIdleStart();

        // Finalize any current non-idle activity
        if (this.currentActivity) {
          this.finalizeActivity();
        }

        // Start idle activity anchored to actual idle start time
        this.currentActivity = {
          id: uuidv4(),
          applicationName: 'System',
          windowTitle: 'Idle',
          processPath: '',
          startTime: new Date(now - idleSeconds * 1000).toISOString(),
          endTime: null,
          duration: 0,
          projectId: null,
          taskId: null,
          isCoded: false,
          isIdle: true,
          source: 'desktop',
          categoryId: 'uncategorized',
          categoryAutoAssigned: true,
          categoryConfidence: 100
        };

        return;
      }

      // Idle → Active
      if (this.isIdle && !isIdleNow) {
        this.isIdle = false;

        // Finalize idle activity
        if (this.currentActivity && this.currentActivity.isIdle) {
          this.finalizeActivity();
        }

        if (this.options.onIdleEnd) {
          this.options.onIdleEnd(idleSeconds);
        }
      }

      return;
    }

    // Fallback mode (less accurate): uses internal lastActivityTime
    const idleTimeMs = now - this.lastActivityTime;

    // Active → Idle
    if (!this.isIdle && idleTimeMs >= this.options.idleThreshold * 1000) {
      this.isIdle = true;
      if (this.options.onIdleStart) this.options.onIdleStart();

      if (this.currentActivity) {
        this.finalizeActivity();
      }

      this.currentActivity = {
        id: uuidv4(),
        applicationName: 'System',
        windowTitle: 'Idle',
        processPath: '',
        startTime: new Date(this.lastActivityTime).toISOString(),
        endTime: null,
        duration: 0,
        projectId: null,
        taskId: null,
        isCoded: false,
        isIdle: true,
        source: 'desktop',
        categoryId: 'uncategorized',
        categoryAutoAssigned: true,
        categoryConfidence: 100
      };
    }
  }

  handleUserActivity() {
    // Legacy fallback: only meaningful when we don't have a real system idle provider.
    if (this.options.getSystemIdleSeconds) return;

    if (this.isIdle) {
      const idleDurationMs = Date.now() - this.lastActivityTime;
      this.isIdle = false;

      // Finalize idle activity
      if (this.currentActivity && this.currentActivity.isIdle) {
        this.finalizeActivity();
      }

      if (this.options.onIdleEnd) {
        this.options.onIdleEnd(Math.floor(idleDurationMs / 1000));
      }
    }

    this.lastActivityTime = Date.now();
  }

  finalizeActivity() {
    if (!this.currentActivity) return;

    const now = new Date();
    this.currentActivity.endTime = now.toISOString();

    const startTime = new Date(this.currentActivity.startTime).getTime();
    const endTime = now.getTime();
    this.currentActivity.duration = Math.floor((endTime - startTime) / 1000);

    // Filter out short activities (applies to all, including idle)
    if (this.currentActivity.duration < this.options.minActivityDuration) {
      this.currentActivity = null;
      return;
    }

    // Send activity to callback
    this.options.onActivity(this.currentActivity);

    // Reset current activity
    this.currentActivity = null;
  }

  categorizeActivity(appName, windowTitle) {
    const app = (appName || '').toLowerCase();
    const title = (windowTitle || '').toLowerCase();

    // Find the first matching rule
    for (const rule of this.rules) {
      const value = rule.type === 'app' ? app : title;
      const pattern = rule.pattern.toLowerCase();

      if (rule.matchType === 'equals' && value === pattern) {
        return { categoryId: rule.categoryId, autoAssigned: true, confidence: 90 };
      }

      if (rule.matchType === 'contains' && value.includes(pattern)) {
        return { categoryId: rule.categoryId, autoAssigned: true, confidence: 80 };
      }
    }

    // Default category
    return { categoryId: 'uncategorized', autoAssigned: true, confidence: 50 };
  }

  // Categories & rules management
  getCategories() {
    return Object.values(this.categories);
  }

  getRules() {
    return this.rules;
  }

  addRule(rule) {
    this.rules.unshift(rule);
  }

  removeRule(index) {
    if (index >= 0 && index < this.rules.length) {
      this.rules.splice(index, 1);
    }
  }

  updateRule(index, rule) {
    if (index >= 0 && index < this.rules.length) {
      this.rules[index] = rule;
    }
  }

  updateSettings(settings) {
    if (settings.idleThreshold !== undefined) {
      this.options.idleThreshold = settings.idleThreshold;
    }
    if (settings.minActivityDuration !== undefined) {
      this.options.minActivityDuration = settings.minActivityDuration;
    }
    if (settings.pollInterval !== undefined) {
      this.options.pollInterval = settings.pollInterval;
      // Restart polling with new interval
      if (this.isTracking && !this.isPaused) {
        this.stopPolling();
        this.startPolling();
      }
    }
    if (settings.autoCategorize !== undefined) {
      this.options.autoCategorize = settings.autoCategorize;
    }
    if (settings.switchDebounceSeconds !== undefined) {
      this.options.switchDebounceSeconds = settings.switchDebounceSeconds;
    }
    if (settings.excludeApps !== undefined) {
      this.options.excludeApps = settings.excludeApps || [];
    }
    if (settings.excludeTitles !== undefined) {
      this.options.excludeTitles = settings.excludeTitles || [];
    }
  }
}

module.exports = ActivityTracker;