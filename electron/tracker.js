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
    productivityScore: 70
  },
  design: {
    id: 'design',
    name: 'Design',
    color: '#EC4899',
    isProductivity: true,
    productivityScore: 100
  },
  meetings: {
    id: 'meetings',
    name: 'Meetings',
    color: '#F59E0B',
    isProductivity: true,
    productivityScore: 60
  },
  documentation: {
    id: 'documentation',
    name: 'Documentation',
    color: '#10B981',
    isProductivity: true,
    productivityScore: 90
  },
  research: {
    id: 'research',
    name: 'Research',
    color: '#06B6D4',
    isProductivity: true,
    productivityScore: 80
  },
  entertainment: {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#EF4444',
    isProductivity: false,
    productivityScore: 10
  },
  'social-media': {
    id: 'social-media',
    name: 'Social Media',
    color: '#F97316',
    isProductivity: false,
    productivityScore: 15
  },
  utilities: {
    id: 'utilities',
    name: 'Utilities',
    color: '#6B7280',
    isProductivity: true,
    productivityScore: 50
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
  { categoryId: 'development', type: 'app', pattern: 'Sublime Text', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Xcode', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Android Studio', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Terminal', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'iTerm', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'cmd.exe', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'PowerShell', matchType: 'contains' },
  { categoryId: 'development', type: 'app', pattern: 'Cursor', matchType: 'contains' },
  { categoryId: 'development', type: 'title', pattern: 'GitHub', matchType: 'contains' },
  { categoryId: 'development', type: 'title', pattern: 'GitLab', matchType: 'contains' },
  { categoryId: 'development', type: 'title', pattern: 'Stack Overflow', matchType: 'contains' },
  
  // Communication
  { categoryId: 'communication', type: 'app', pattern: 'Slack', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Microsoft Teams', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Discord', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Outlook', matchType: 'contains' },
  { categoryId: 'communication', type: 'title', pattern: 'Gmail', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Mail', matchType: 'contains' },
  { categoryId: 'communication', type: 'app', pattern: 'Telegram', matchType: 'contains' },
  
  // Design
  { categoryId: 'design', type: 'app', pattern: 'Figma', matchType: 'contains' },
  { categoryId: 'design', type: 'title', pattern: 'Figma', matchType: 'contains' },
  { categoryId: 'design', type: 'app', pattern: 'Sketch', matchType: 'contains' },
  { categoryId: 'design', type: 'app', pattern: 'Photoshop', matchType: 'contains' },
  { categoryId: 'design', type: 'app', pattern: 'Illustrator', matchType: 'contains' },
  { categoryId: 'design', type: 'app', pattern: 'Adobe XD', matchType: 'contains' },
  { categoryId: 'design', type: 'title', pattern: 'Canva', matchType: 'contains' },
  
  // Meetings
  { categoryId: 'meetings', type: 'app', pattern: 'zoom', matchType: 'contains' },
  { categoryId: 'meetings', type: 'title', pattern: 'Google Meet', matchType: 'contains' },
  { categoryId: 'meetings', type: 'app', pattern: 'Webex', matchType: 'contains' },
  { categoryId: 'meetings', type: 'app', pattern: 'Skype', matchType: 'contains' },
  { categoryId: 'meetings', type: 'app', pattern: 'FaceTime', matchType: 'contains' },
  
  // Documentation
  { categoryId: 'documentation', type: 'app', pattern: 'Notion', matchType: 'contains' },
  { categoryId: 'documentation', type: 'title', pattern: 'Notion', matchType: 'contains' },
  { categoryId: 'documentation', type: 'title', pattern: 'Confluence', matchType: 'contains' },
  { categoryId: 'documentation', type: 'title', pattern: 'Google Docs', matchType: 'contains' },
  { categoryId: 'documentation', type: 'app', pattern: 'Microsoft Word', matchType: 'contains' },
  { categoryId: 'documentation', type: 'app', pattern: 'Obsidian', matchType: 'contains' },
  
  // Entertainment
  { categoryId: 'entertainment', type: 'title', pattern: 'YouTube', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Netflix', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'app', pattern: 'Spotify', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Twitch', matchType: 'contains' },
  { categoryId: 'entertainment', type: 'title', pattern: 'Prime Video', matchType: 'contains' },
  
  // Social Media
  { categoryId: 'social-media', type: 'title', pattern: 'Twitter', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: '/ X', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: 'Facebook', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: 'Instagram', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: 'LinkedIn', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: 'Reddit', matchType: 'contains' },
  { categoryId: 'social-media', type: 'title', pattern: 'TikTok', matchType: 'contains' },
  
  // Utilities
  { categoryId: 'utilities', type: 'app', pattern: 'Finder', matchType: 'exact' },
  { categoryId: 'utilities', type: 'app', pattern: 'Explorer', matchType: 'contains' },
  { categoryId: 'utilities', type: 'app', pattern: 'Settings', matchType: 'contains' },
  
  // Research (browsers - low priority, will be overridden by title rules)
  { categoryId: 'research', type: 'app', pattern: 'Google Chrome', matchType: 'contains', priority: 10 },
  { categoryId: 'research', type: 'app', pattern: 'Firefox', matchType: 'contains', priority: 10 },
  { categoryId: 'research', type: 'app', pattern: 'Safari', matchType: 'contains', priority: 10 },
  { categoryId: 'research', type: 'app', pattern: 'Microsoft Edge', matchType: 'contains', priority: 10 },
  { categoryId: 'research', type: 'app', pattern: 'Brave', matchType: 'contains', priority: 10 },
];

/**
 * ActivityTracker - System-wide activity tracking module with categorization
 * Uses active-win to monitor active windows across all applications
 */
class ActivityTracker {
  constructor(options = {}) {
    this.options = {
      idleThreshold: options.idleThreshold || 300, // 5 minutes
      minActivityDuration: options.minActivityDuration || 10, // 10 seconds
      pollInterval: options.pollInterval || 1000, // 1 second
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
    this.idleTimer = null;
    this.lastActivityTime = Date.now();
    
    this.currentActivity = null;
    this.stats = {
      totalTrackedTime: 0,
      totalIdleTime: 0,
      activitiesLogged: 0,
      sessionsToday: 0,
      productiveTime: 0,
      distractingTime: 0
    };

    // Categorization
    this.categories = { ...DEFAULT_CATEGORIES };
    this.rules = [...DEFAULT_RULES];
    this.customRules = [];
    this.manualOverrides = new Map(); // activityId -> categoryId

    // Lazy load active-win (it's an ES module in newer versions)
    this.activeWin = null;
    this.loadActiveWin();
  }

  async loadActiveWin() {
    try {
      // Try to dynamically import active-win
      const activeWinModule = await import('active-win');
      this.activeWin = activeWinModule.default || activeWinModule;
    } catch (error) {
      console.error('Failed to load active-win:', error);
      // Fallback to a mock implementation for development
      this.activeWin = this.createMockActiveWin();
    }
  }

  createMockActiveWin() {
    // Mock implementation for when active-win is not available
    return async () => {
      return {
        title: 'Unknown Window',
        owner: {
          name: 'Unknown Application',
          path: '',
          processId: 0
        },
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        memoryUsage: 0
      };
    };
  }

  // Categorization methods
  categorizeActivity(appName, windowTitle) {
    const appLower = (appName || '').toLowerCase();
    const titleLower = (windowTitle || '').toLowerCase();

    // Check custom rules first (higher priority)
    for (const rule of this.customRules) {
      if (this.matchRule(rule, appLower, titleLower)) {
        return {
          categoryId: rule.categoryId,
          autoAssigned: true,
          confidence: 90
        };
      }
    }

    // Check default rules
    let bestMatch = null;
    let bestPriority = -1;

    for (const rule of this.rules) {
      const priority = rule.priority || 50;
      if (this.matchRule(rule, appLower, titleLower) && priority > bestPriority) {
        bestMatch = rule;
        bestPriority = priority;
      }
    }

    if (bestMatch) {
      return {
        categoryId: bestMatch.categoryId,
        autoAssigned: true,
        confidence: Math.min(90, 50 + bestPriority)
      };
    }

    return {
      categoryId: 'uncategorized',
      autoAssigned: true,
      confidence: 50
    };
  }

  matchRule(rule, appLower, titleLower) {
    const pattern = (rule.pattern || '').toLowerCase();
    const target = rule.type === 'app' ? appLower : titleLower;

    switch (rule.matchType) {
      case 'exact':
        return target === pattern;
      case 'contains':
        return target.includes(pattern);
      case 'startsWith':
        return target.startsWith(pattern);
      case 'endsWith':
        return target.endsWith(pattern);
      case 'regex':
        try {
          return new RegExp(pattern, 'i').test(target);
        } catch {
          return false;
        }
      default:
        return target.includes(pattern);
    }
  }

  // Manual categorization
  setActivityCategory(activityId, categoryId) {
    this.manualOverrides.set(activityId, categoryId);
  }

  getActivityCategory(activityId) {
    return this.manualOverrides.get(activityId);
  }

  // Custom rules management
  addCustomRule(rule) {
    this.customRules.push({
      ...rule,
      id: rule.id || `custom-${Date.now()}`,
      isCustom: true
    });
  }

  removeCustomRule(ruleId) {
    this.customRules = this.customRules.filter(r => r.id !== ruleId);
  }

  getCustomRules() {
    return [...this.customRules];
  }

  setCustomRules(rules) {
    this.customRules = rules.map(r => ({ ...r, isCustom: true }));
  }

  // Category management
  getCategories() {
    return { ...this.categories };
  }

  addCategory(category) {
    this.categories[category.id] = category;
  }

  start() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.isPaused = false;
    this.lastActivityTime = Date.now();
    
    this.startPolling();
    this.options.onStatusChange({ isTracking: true, isPaused: false });
    
    console.log('Activity tracking started');
  }

  pause() {
    if (!this.isTracking || this.isPaused) return;
    
    this.isPaused = true;
    this.stopPolling();
    
    // Save current activity if any
    if (this.currentActivity) {
      this.finalizeActivity();
    }
    
    this.options.onStatusChange({ isTracking: true, isPaused: true });
    console.log('Activity tracking paused');
  }

  resume() {
    if (!this.isTracking || !this.isPaused) return;
    
    this.isPaused = false;
    this.lastActivityTime = Date.now();
    this.startPolling();
    
    this.options.onStatusChange({ isTracking: true, isPaused: false });
    console.log('Activity tracking resumed');
  }

  stop() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.isPaused = false;
    this.stopPolling();
    
    // Save current activity if any
    if (this.currentActivity) {
      this.finalizeActivity();
    }
    
    this.options.onStatusChange({ isTracking: false, isPaused: false });
    console.log('Activity tracking stopped');
  }

  startPolling() {
    if (this.pollTimer) return;
    
    this.pollTimer = setInterval(() => this.poll(), this.options.pollInterval);
    this.poll(); // Initial poll
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
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
      
      // Check for idle
      this.checkIdle(now);
      
      // Process window info
      const appName = windowInfo.owner?.name || 'Unknown';
      const windowTitle = windowInfo.title || 'Untitled';
      const processPath = windowInfo.owner?.path || '';

      // Check if this is a new activity or continuation
      if (this.shouldStartNewActivity(appName, windowTitle)) {
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
          startTime: new Date().toISOString(),
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
      }
      
      // Update current activity duration
      if (this.currentActivity) {
        this.currentActivity.duration = Math.floor(
          (now - new Date(this.currentActivity.startTime).getTime()) / 1000
        );
      }
      
      this.lastActivityTime = now;
      
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
    // No active window - might be idle or locked screen
    if (this.currentActivity) {
      this.finalizeActivity();
    }
  }

  checkIdle(now) {
    const idleTime = now - this.lastActivityTime;
    
    if (!this.isIdle && idleTime >= this.options.idleThreshold * 1000) {
      // User went idle
      this.isIdle = true;
      this.options.onIdleStart();
      
      // Finalize current activity before idle
      if (this.currentActivity) {
        this.finalizeActivity();
      }
      
      // Start idle activity
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
    if (this.isIdle) {
      const idleDuration = Date.now() - this.lastActivityTime;
      this.isIdle = false;
      
      // Finalize idle activity
      if (this.currentActivity && this.currentActivity.isIdle) {
        this.finalizeActivity();
      }
      
      this.options.onIdleEnd(Math.floor(idleDuration / 1000));
    }
    
    this.lastActivityTime = Date.now();
  }

  finalizeActivity() {
    if (!this.currentActivity) return;
    
    const now = new Date();
    this.currentActivity.endTime = now.toISOString();
    this.currentActivity.duration = Math.floor(
      (now.getTime() - new Date(this.currentActivity.startTime).getTime()) / 1000
    );
    
    // Check for manual override
    const manualCategory = this.manualOverrides.get(this.currentActivity.id);
    if (manualCategory) {
      this.currentActivity.categoryId = manualCategory;
      this.currentActivity.categoryAutoAssigned = false;
      this.currentActivity.categoryConfidence = 100;
    }
    
    // Only log if meets minimum duration
    if (this.currentActivity.duration >= this.options.minActivityDuration) {
      this.options.onActivity({ ...this.currentActivity });
      this.stats.activitiesLogged++;
      
      if (this.currentActivity.isIdle) {
        this.stats.totalIdleTime += this.currentActivity.duration;
      } else {
        this.stats.totalTrackedTime += this.currentActivity.duration;
        
        // Update productivity stats
        const category = this.categories[this.currentActivity.categoryId];
        if (category) {
          if (category.isProductivity) {
            this.stats.productiveTime += this.currentActivity.duration;
          } else {
            this.stats.distractingTime += this.currentActivity.duration;
          }
        }
      }
    }
    
    this.currentActivity = null;
  }

  // System event handlers
  handleSuspend() {
    if (this.currentActivity) {
      this.finalizeActivity();
    }
    this.pause();
  }

  handleResume() {
    this.resume();
  }

  handleLock() {
    if (this.currentActivity) {
      this.finalizeActivity();
    }
    
    // Start locked screen activity
    this.currentActivity = {
      id: uuidv4(),
      applicationName: 'System',
      windowTitle: 'Screen Locked',
      processPath: '',
      startTime: new Date().toISOString(),
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

  handleUnlock() {
    if (this.currentActivity) {
      this.finalizeActivity();
    }
    this.handleUserActivity();
  }

  // Getters
  getCurrentActivity() {
    if (!this.currentActivity) return null;
    
    return {
      ...this.currentActivity,
      duration: Math.floor(
        (Date.now() - new Date(this.currentActivity.startTime).getTime()) / 1000
      )
    };
  }

  getStats() {
    const productivityScore = this.stats.totalTrackedTime > 0
      ? Math.round((this.stats.productiveTime / this.stats.totalTrackedTime) * 100)
      : 0;
    
    return { 
      ...this.stats,
      productivityScore
    };
  }

  // Settings update
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
  }
}

module.exports = ActivityTracker;
