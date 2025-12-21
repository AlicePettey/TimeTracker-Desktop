// Category and Rule types for activity categorization

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isProductivity: boolean; // true = productive, false = distraction
  productivityScore: number; // 0-100 productivity score
  isDefault: boolean; // built-in category
  order: number;
}

export interface CategoryRule {
  id: string;
  categoryId: string;
  type: 'app' | 'title' | 'url' | 'combined';
  matchType: 'contains' | 'exact' | 'startsWith' | 'endsWith' | 'regex';
  appPattern?: string;
  titlePattern?: string;
  urlPattern?: string;
  priority: number; // higher priority rules are checked first
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface CategorizedActivity {
  activityId: string;
  categoryId: string;
  autoAssigned: boolean; // true if assigned by rule, false if manual
  ruleId?: string; // which rule assigned it
  confidence: number; // 0-100 confidence score
  overriddenAt?: string; // when manually overridden
}

export interface ProductivityStats {
  totalTime: number;
  productiveTime: number;
  distractingTime: number;
  uncategorizedTime: number;
  productivityScore: number;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    color: string;
    totalSeconds: number;
    percentage: number;
    isProductivity: boolean;
  }[];
  topApps: {
    appName: string;
    categoryId: string;
    totalSeconds: number;
    percentage: number;
  }[];
  hourlyBreakdown: {
    hour: number;
    productiveSeconds: number;
    distractingSeconds: number;
    uncategorizedSeconds: number;
  }[];
  dailyTrend: {
    date: string;
    productivityScore: number;
    totalSeconds: number;
    productiveSeconds: number;
  }[];
}

export interface CategorySettings {
  autoCategorizationEnabled: boolean;
  showProductivityNotifications: boolean;
  productivityGoal: number; // target productivity percentage
  focusTimeGoal: number; // target focus time in seconds per day
  breakReminders: boolean;
  breakInterval: number; // minutes between break reminders
}

// Default categories
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'development',
    name: 'Development',
    color: '#3B82F6',
    icon: 'code',
    isProductivity: true,
    productivityScore: 100,
    isDefault: true,
    order: 1
  },
  {
    id: 'communication',
    name: 'Communication',
    color: '#8B5CF6',
    icon: 'message-circle',
    isProductivity: true,
    productivityScore: 70,
    isDefault: true,
    order: 2
  },
  {
    id: 'design',
    name: 'Design',
    color: '#EC4899',
    icon: 'palette',
    isProductivity: true,
    productivityScore: 100,
    isDefault: true,
    order: 3
  },
  {
    id: 'meetings',
    name: 'Meetings',
    color: '#F59E0B',
    icon: 'users',
    isProductivity: true,
    productivityScore: 60,
    isDefault: true,
    order: 4
  },
  {
    id: 'documentation',
    name: 'Documentation',
    color: '#10B981',
    icon: 'file-text',
    isProductivity: true,
    productivityScore: 90,
    isDefault: true,
    order: 5
  },
  {
    id: 'research',
    name: 'Research',
    color: '#06B6D4',
    icon: 'search',
    isProductivity: true,
    productivityScore: 80,
    isDefault: true,
    order: 6
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: '#EF4444',
    icon: 'play-circle',
    isProductivity: false,
    productivityScore: 10,
    isDefault: true,
    order: 7
  },
  {
    id: 'social-media',
    name: 'Social Media',
    color: '#F97316',
    icon: 'share-2',
    isProductivity: false,
    productivityScore: 15,
    isDefault: true,
    order: 8
  },
  {
    id: 'utilities',
    name: 'Utilities',
    color: '#6B7280',
    icon: 'settings',
    isProductivity: true,
    productivityScore: 50,
    isDefault: true,
    order: 9
  },
  {
    id: 'uncategorized',
    name: 'Uncategorized',
    color: '#9CA3AF',
    icon: 'help-circle',
    isProductivity: true,
    productivityScore: 50,
    isDefault: true,
    order: 100
  }
];

// Default rules for auto-categorization
export const DEFAULT_RULES: CategoryRule[] = [
  // Development
  { id: 'dev-vscode', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Visual Studio Code', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-vscode2', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Code', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-intellij', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'IntelliJ', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-webstorm', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'WebStorm', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-pycharm', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'PyCharm', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-sublime', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Sublime Text', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-atom', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Atom', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-xcode', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Xcode', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-android', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Android Studio', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-terminal', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Terminal', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-iterm', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'iTerm', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-cmd', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'cmd.exe', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-powershell', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'PowerShell', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-github-title', categoryId: 'development', type: 'title', matchType: 'contains', titlePattern: 'GitHub', priority: 70, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-gitlab-title', categoryId: 'development', type: 'title', matchType: 'contains', titlePattern: 'GitLab', priority: 70, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-bitbucket-title', categoryId: 'development', type: 'title', matchType: 'contains', titlePattern: 'Bitbucket', priority: 70, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-stackoverflow', categoryId: 'development', type: 'title', matchType: 'contains', titlePattern: 'Stack Overflow', priority: 70, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-vim', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'vim', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-neovim', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'nvim', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'dev-cursor', categoryId: 'development', type: 'app', matchType: 'contains', appPattern: 'Cursor', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Communication
  { id: 'comm-slack', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Slack', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-teams', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Microsoft Teams', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-discord', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Discord', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-outlook', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Outlook', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-gmail', categoryId: 'communication', type: 'title', matchType: 'contains', titlePattern: 'Gmail', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-mail', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Mail', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-telegram', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'Telegram', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'comm-whatsapp', categoryId: 'communication', type: 'app', matchType: 'contains', appPattern: 'WhatsApp', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Design
  { id: 'design-figma', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Figma', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-figma-title', categoryId: 'design', type: 'title', matchType: 'contains', titlePattern: 'Figma', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-sketch', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Sketch', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-photoshop', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Photoshop', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-illustrator', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Illustrator', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-xd', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Adobe XD', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-canva', categoryId: 'design', type: 'title', matchType: 'contains', titlePattern: 'Canva', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-invision', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'InVision', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'design-affinity', categoryId: 'design', type: 'app', matchType: 'contains', appPattern: 'Affinity', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Meetings
  { id: 'meet-zoom', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'zoom', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-meet', categoryId: 'meetings', type: 'title', matchType: 'contains', titlePattern: 'Google Meet', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-webex', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'Webex', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-skype', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'Skype', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-facetime', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'FaceTime', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-around', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'Around', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'meet-loom', categoryId: 'meetings', type: 'app', matchType: 'contains', appPattern: 'Loom', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Documentation
  { id: 'doc-notion', categoryId: 'documentation', type: 'app', matchType: 'contains', appPattern: 'Notion', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-notion-title', categoryId: 'documentation', type: 'title', matchType: 'contains', titlePattern: 'Notion', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-confluence', categoryId: 'documentation', type: 'title', matchType: 'contains', titlePattern: 'Confluence', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-gdocs', categoryId: 'documentation', type: 'title', matchType: 'contains', titlePattern: 'Google Docs', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-word', categoryId: 'documentation', type: 'app', matchType: 'contains', appPattern: 'Microsoft Word', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-obsidian', categoryId: 'documentation', type: 'app', matchType: 'contains', appPattern: 'Obsidian', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-evernote', categoryId: 'documentation', type: 'app', matchType: 'contains', appPattern: 'Evernote', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-bear', categoryId: 'documentation', type: 'app', matchType: 'contains', appPattern: 'Bear', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'doc-coda', categoryId: 'documentation', type: 'title', matchType: 'contains', titlePattern: 'Coda', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Research
  { id: 'research-chrome', categoryId: 'research', type: 'app', matchType: 'contains', appPattern: 'Google Chrome', priority: 30, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'research-firefox', categoryId: 'research', type: 'app', matchType: 'contains', appPattern: 'Firefox', priority: 30, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'research-safari', categoryId: 'research', type: 'app', matchType: 'contains', appPattern: 'Safari', priority: 30, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'research-edge', categoryId: 'research', type: 'app', matchType: 'contains', appPattern: 'Microsoft Edge', priority: 30, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'research-brave', categoryId: 'research', type: 'app', matchType: 'contains', appPattern: 'Brave', priority: 30, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Entertainment
  { id: 'ent-youtube', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'YouTube', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-netflix', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'Netflix', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-spotify', categoryId: 'entertainment', type: 'app', matchType: 'contains', appPattern: 'Spotify', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-twitch', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'Twitch', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-prime', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'Prime Video', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-disney', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'Disney+', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-hulu', categoryId: 'entertainment', type: 'title', matchType: 'contains', titlePattern: 'Hulu', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'ent-apple-music', categoryId: 'entertainment', type: 'app', matchType: 'contains', appPattern: 'Music', priority: 70, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Social Media
  { id: 'social-twitter', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'Twitter', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-x', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: '/ X', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-facebook', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'Facebook', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-instagram', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'Instagram', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-linkedin', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'LinkedIn', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-reddit', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'Reddit', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'social-tiktok', categoryId: 'social-media', type: 'title', matchType: 'contains', titlePattern: 'TikTok', priority: 100, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  
  // Utilities
  { id: 'util-finder', categoryId: 'utilities', type: 'app', matchType: 'exact', appPattern: 'Finder', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'util-explorer', categoryId: 'utilities', type: 'app', matchType: 'contains', appPattern: 'Explorer', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'util-settings', categoryId: 'utilities', type: 'app', matchType: 'contains', appPattern: 'Settings', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'util-preferences', categoryId: 'utilities', type: 'app', matchType: 'contains', appPattern: 'Preferences', priority: 80, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'util-1password', categoryId: 'utilities', type: 'app', matchType: 'contains', appPattern: '1Password', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
  { id: 'util-lastpass', categoryId: 'utilities', type: 'app', matchType: 'contains', appPattern: 'LastPass', priority: 90, isEnabled: true, isDefault: true, createdAt: new Date().toISOString() },
];
