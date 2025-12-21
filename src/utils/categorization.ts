// Categorization engine for automatic activity classification

import { Activity } from '@/types';
import { 
  Category, 
  CategoryRule, 
  CategorizedActivity, 
  ProductivityStats,
  DEFAULT_CATEGORIES,
  DEFAULT_RULES
} from '@/types/categories';

export class CategorizationEngine {
  private categories: Category[];
  private rules: CategoryRule[];
  private categorizedActivities: Map<string, CategorizedActivity>;

  constructor(
    customCategories: Category[] = [],
    customRules: CategoryRule[] = []
  ) {
    // Merge default and custom categories
    this.categories = [...DEFAULT_CATEGORIES];
    customCategories.forEach(custom => {
      const existingIndex = this.categories.findIndex(c => c.id === custom.id);
      if (existingIndex >= 0) {
        this.categories[existingIndex] = custom;
      } else {
        this.categories.push(custom);
      }
    });

    // Merge default and custom rules
    this.rules = [...DEFAULT_RULES];
    customRules.forEach(custom => {
      const existingIndex = this.rules.findIndex(r => r.id === custom.id);
      if (existingIndex >= 0) {
        this.rules[existingIndex] = custom;
      } else {
        this.rules.push(custom);
      }
    });

    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);

    this.categorizedActivities = new Map();
  }

  // Categorize a single activity
  categorize(activity: Activity): CategorizedActivity {
    // Check if already manually categorized
    const existing = this.categorizedActivities.get(activity.id);
    if (existing && !existing.autoAssigned) {
      return existing;
    }

    const appName = activity.applicationName || '';
    const windowTitle = activity.windowTitle || '';

    let matchedRule: CategoryRule | null = null;
    let confidence = 0;

    // Find matching rule
    for (const rule of this.rules) {
      if (!rule.isEnabled) continue;

      const match = this.matchRule(rule, appName, windowTitle);
      if (match.matched && match.confidence > confidence) {
        matchedRule = rule;
        confidence = match.confidence;
        
        // If we found a high-confidence match, stop searching
        if (confidence >= 90) break;
      }
    }

    const result: CategorizedActivity = {
      activityId: activity.id,
      categoryId: matchedRule?.categoryId || 'uncategorized',
      autoAssigned: true,
      ruleId: matchedRule?.id,
      confidence: confidence || 50
    };

    this.categorizedActivities.set(activity.id, result);
    return result;
  }

  // Match a rule against app name and window title
  private matchRule(
    rule: CategoryRule, 
    appName: string, 
    windowTitle: string
  ): { matched: boolean; confidence: number } {
    const appLower = appName.toLowerCase();
    const titleLower = windowTitle.toLowerCase();

    let matched = false;
    let confidence = 0;

    switch (rule.type) {
      case 'app':
        if (rule.appPattern) {
          const result = this.matchPattern(appLower, rule.appPattern.toLowerCase(), rule.matchType);
          matched = result.matched;
          confidence = result.confidence;
        }
        break;

      case 'title':
        if (rule.titlePattern) {
          const result = this.matchPattern(titleLower, rule.titlePattern.toLowerCase(), rule.matchType);
          matched = result.matched;
          confidence = result.confidence;
        }
        break;

      case 'combined':
        let appMatch = { matched: true, confidence: 100 };
        let titleMatch = { matched: true, confidence: 100 };

        if (rule.appPattern) {
          appMatch = this.matchPattern(appLower, rule.appPattern.toLowerCase(), rule.matchType);
        }
        if (rule.titlePattern) {
          titleMatch = this.matchPattern(titleLower, rule.titlePattern.toLowerCase(), rule.matchType);
        }

        matched = appMatch.matched && titleMatch.matched;
        confidence = (appMatch.confidence + titleMatch.confidence) / 2;
        break;
    }

    // Adjust confidence based on rule priority
    if (matched) {
      confidence = Math.min(100, confidence + (rule.priority / 10));
    }

    return { matched, confidence };
  }

  // Match a pattern against text
  private matchPattern(
    text: string, 
    pattern: string, 
    matchType: CategoryRule['matchType']
  ): { matched: boolean; confidence: number } {
    let matched = false;
    let confidence = 0;

    switch (matchType) {
      case 'exact':
        matched = text === pattern;
        confidence = matched ? 100 : 0;
        break;

      case 'contains':
        matched = text.includes(pattern);
        if (matched) {
          // Higher confidence if pattern is a larger portion of text
          confidence = Math.min(100, 60 + (pattern.length / text.length) * 40);
        }
        break;

      case 'startsWith':
        matched = text.startsWith(pattern);
        confidence = matched ? 90 : 0;
        break;

      case 'endsWith':
        matched = text.endsWith(pattern);
        confidence = matched ? 90 : 0;
        break;

      case 'regex':
        try {
          const regex = new RegExp(pattern, 'i');
          matched = regex.test(text);
          confidence = matched ? 85 : 0;
        } catch {
          matched = false;
          confidence = 0;
        }
        break;
    }

    return { matched, confidence };
  }

  // Manually categorize an activity
  manualCategorize(activityId: string, categoryId: string): CategorizedActivity {
    const result: CategorizedActivity = {
      activityId,
      categoryId,
      autoAssigned: false,
      confidence: 100,
      overriddenAt: new Date().toISOString()
    };

    this.categorizedActivities.set(activityId, result);
    return result;
  }

  // Bulk categorize activities
  categorizeAll(activities: Activity[]): Map<string, CategorizedActivity> {
    activities.forEach(activity => this.categorize(activity));
    return this.categorizedActivities;
  }

  // Get category for an activity
  getActivityCategory(activityId: string): Category | null {
    const categorized = this.categorizedActivities.get(activityId);
    if (!categorized) return null;
    return this.categories.find(c => c.id === categorized.categoryId) || null;
  }

  // Get all categories
  getCategories(): Category[] {
    return [...this.categories].sort((a, b) => a.order - b.order);
  }

  // Get category by ID
  getCategoryById(id: string): Category | undefined {
    return this.categories.find(c => c.id === id);
  }

  // Add or update a category
  upsertCategory(category: Category): void {
    const existingIndex = this.categories.findIndex(c => c.id === category.id);
    if (existingIndex >= 0) {
      this.categories[existingIndex] = category;
    } else {
      this.categories.push(category);
    }
  }

  // Delete a category
  deleteCategory(categoryId: string): boolean {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category || category.isDefault) return false;

    this.categories = this.categories.filter(c => c.id !== categoryId);
    
    // Re-categorize activities that were in this category
    this.categorizedActivities.forEach((cat, activityId) => {
      if (cat.categoryId === categoryId) {
        cat.categoryId = 'uncategorized';
        cat.autoAssigned = true;
      }
    });

    return true;
  }

  // Get all rules
  getRules(): CategoryRule[] {
    return [...this.rules];
  }

  // Get rules for a category
  getRulesForCategory(categoryId: string): CategoryRule[] {
    return this.rules.filter(r => r.categoryId === categoryId);
  }

  // Add or update a rule
  upsertRule(rule: CategoryRule): void {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
    // Re-sort by priority
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  // Delete a rule
  deleteRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule || rule.isDefault) return false;

    this.rules = this.rules.filter(r => r.id !== ruleId);
    return true;
  }

  // Toggle rule enabled state
  toggleRule(ruleId: string): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return false;
    rule.isEnabled = !rule.isEnabled;
    return true;
  }

  // Calculate productivity stats
  calculateProductivityStats(
    activities: Activity[],
    startDate?: Date,
    endDate?: Date
  ): ProductivityStats {
    // Filter activities by date range
    let filteredActivities = activities;
    if (startDate || endDate) {
      filteredActivities = activities.filter(a => {
        const activityDate = new Date(a.startTime);
        if (startDate && activityDate < startDate) return false;
        if (endDate && activityDate > endDate) return false;
        return true;
      });
    }

    // Categorize all activities
    this.categorizeAll(filteredActivities);

    // Calculate totals
    let totalTime = 0;
    let productiveTime = 0;
    let distractingTime = 0;
    let uncategorizedTime = 0;

    const categoryTotals: Map<string, number> = new Map();
    const appTotals: Map<string, { categoryId: string; seconds: number }> = new Map();
    const hourlyData: Map<number, { productive: number; distracting: number; uncategorized: number }> = new Map();
    const dailyData: Map<string, { productive: number; total: number }> = new Map();

    // Initialize hourly data
    for (let i = 0; i < 24; i++) {
      hourlyData.set(i, { productive: 0, distracting: 0, uncategorized: 0 });
    }

    filteredActivities.forEach(activity => {
      if (activity.isIdle) return; // Skip idle time

      const duration = activity.duration;
      totalTime += duration;

      const categorized = this.categorizedActivities.get(activity.id);
      const category = categorized 
        ? this.categories.find(c => c.id === categorized.categoryId)
        : null;

      const categoryId = category?.id || 'uncategorized';
      const isProductive = category?.isProductivity ?? true;

      // Category totals
      categoryTotals.set(categoryId, (categoryTotals.get(categoryId) || 0) + duration);

      // Productivity totals
      if (categoryId === 'uncategorized') {
        uncategorizedTime += duration;
      } else if (isProductive) {
        productiveTime += duration;
      } else {
        distractingTime += duration;
      }

      // App totals
      const appKey = activity.applicationName;
      const existing = appTotals.get(appKey);
      if (existing) {
        existing.seconds += duration;
      } else {
        appTotals.set(appKey, { categoryId, seconds: duration });
      }

      // Hourly breakdown
      const hour = new Date(activity.startTime).getHours();
      const hourData = hourlyData.get(hour)!;
      if (categoryId === 'uncategorized') {
        hourData.uncategorized += duration;
      } else if (isProductive) {
        hourData.productive += duration;
      } else {
        hourData.distracting += duration;
      }

      // Daily breakdown
      const dateKey = new Date(activity.startTime).toISOString().split('T')[0];
      const dayData = dailyData.get(dateKey) || { productive: 0, total: 0 };
      dayData.total += duration;
      if (isProductive && categoryId !== 'uncategorized') {
        dayData.productive += duration;
      }
      dailyData.set(dateKey, dayData);
    });

    // Calculate productivity score
    const productivityScore = totalTime > 0 
      ? Math.round((productiveTime / (totalTime - uncategorizedTime)) * 100) || 0
      : 0;

    // Build category breakdown
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([categoryId, seconds]) => {
        const category = this.categories.find(c => c.id === categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Unknown',
          color: category?.color || '#9CA3AF',
          totalSeconds: seconds,
          percentage: totalTime > 0 ? Math.round((seconds / totalTime) * 100) : 0,
          isProductivity: category?.isProductivity ?? true
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    // Build top apps
    const topApps = Array.from(appTotals.entries())
      .map(([appName, data]) => ({
        appName,
        categoryId: data.categoryId,
        totalSeconds: data.seconds,
        percentage: totalTime > 0 ? Math.round((data.seconds / totalTime) * 100) : 0
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 10);

    // Build hourly breakdown
    const hourlyBreakdown = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        productiveSeconds: data.productive,
        distractingSeconds: data.distracting,
        uncategorizedSeconds: data.uncategorized
      }))
      .sort((a, b) => a.hour - b.hour);

    // Build daily trend
    const dailyTrend = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        productivityScore: data.total > 0 ? Math.round((data.productive / data.total) * 100) : 0,
        totalSeconds: data.total,
        productiveSeconds: data.productive
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalTime,
      productiveTime,
      distractingTime,
      uncategorizedTime,
      productivityScore,
      categoryBreakdown,
      topApps,
      hourlyBreakdown,
      dailyTrend
    };
  }

  // Export configuration
  exportConfig(): { categories: Category[]; rules: CategoryRule[] } {
    return {
      categories: this.categories.filter(c => !c.isDefault),
      rules: this.rules.filter(r => !r.isDefault)
    };
  }

  // Import configuration
  importConfig(config: { categories?: Category[]; rules?: CategoryRule[] }): void {
    if (config.categories) {
      config.categories.forEach(c => this.upsertCategory({ ...c, isDefault: false }));
    }
    if (config.rules) {
      config.rules.forEach(r => this.upsertRule({ ...r, isDefault: false }));
    }
  }

  // Get categorization for activity
  getCategorization(activityId: string): CategorizedActivity | undefined {
    return this.categorizedActivities.get(activityId);
  }

  // Clear all categorizations (for re-processing)
  clearCategorizations(): void {
    this.categorizedActivities.clear();
  }
}

// Singleton instance
let engineInstance: CategorizationEngine | null = null;

export function getCategorizationEngine(
  customCategories?: Category[],
  customRules?: CategoryRule[]
): CategorizationEngine {
  if (!engineInstance || customCategories || customRules) {
    engineInstance = new CategorizationEngine(customCategories, customRules);
  }
  return engineInstance;
}

// Helper to format duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Helper to get category icon component name
export function getCategoryIconName(iconId: string): string {
  const iconMap: Record<string, string> = {
    'code': 'Code',
    'message-circle': 'MessageCircle',
    'palette': 'Palette',
    'users': 'Users',
    'file-text': 'FileText',
    'search': 'Search',
    'play-circle': 'PlayCircle',
    'share-2': 'Share2',
    'settings': 'Settings',
    'help-circle': 'HelpCircle'
  };
  return iconMap[iconId] || 'HelpCircle';
}
