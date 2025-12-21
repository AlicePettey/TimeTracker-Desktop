import React from 'react';
import { 
  BarChartIcon, 
  ClockIcon, 
  FolderIcon, 
  AlertCircleIcon,
  CalendarIcon,
  LayersIcon
} from '@/components/ui/Icons';

type View = 'dashboard' | 'activities' | 'uncoded' | 'projects' | 'reports' | 'tracking' | 'desktop' | 'categories' | 'insights';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  stats: {
    todayTotal: number;
    uncodedCount: number;
    projectCount: number;
  };
  isTabTracking?: boolean;
}

// Tab tracking icon component
const TabTrackingIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

// Desktop icon component
const DesktopIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// Categories icon component
const CategoriesIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

// Insights icon component
const InsightsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, stats, isTabTracking = false }) => {
  const formatHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const navItems = [
    { 
      id: 'dashboard' as View, 
      label: 'Dashboard', 
      icon: BarChartIcon,
      badge: null
    },
    { 
      id: 'activities' as View, 
      label: 'All Activities', 
      icon: ClockIcon,
      badge: null
    },
    { 
      id: 'uncoded' as View, 
      label: 'Uncoded', 
      icon: AlertCircleIcon,
      badge: stats.uncodedCount > 0 ? stats.uncodedCount : null,
      badgeColor: 'bg-amber-500'
    },
    { 
      id: 'projects' as View, 
      label: 'Projects', 
      icon: FolderIcon,
      badge: stats.projectCount,
      badgeColor: 'bg-blue-500'
    },
    { 
      id: 'reports' as View, 
      label: 'Timesheets', 
      icon: CalendarIcon,
      badge: null
    },
    { 
      id: 'tracking' as View, 
      label: 'Tab Tracking', 
      icon: TabTrackingIcon,
      badge: isTabTracking ? 'ON' : null,
      badgeColor: 'bg-green-500'
    },
    { 
      id: 'categories' as View, 
      label: 'Categories', 
      icon: CategoriesIcon,
      badge: null,
      badgeColor: 'bg-purple-500'
    },
    { 
      id: 'insights' as View, 
      label: 'Productivity', 
      icon: InsightsIcon,
      badge: 'NEW',
      badgeColor: 'bg-indigo-500'
    },
    { 
      id: 'desktop' as View, 
      label: 'Desktop App', 
      icon: DesktopIcon,
      badge: null,
      badgeColor: 'bg-purple-500'
    },
  ];


  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-64px)] sticky top-16">
      <div className="p-4">
        {/* Today's Summary */}
        <div className="mb-6 p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
          <p className="text-sm opacity-80">Today's Tracked Time</p>
          <p className="text-2xl font-bold mt-1">{formatHours(stats.todayTotal)}</p>
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-sm">
            <span className="opacity-80">Tab Tracking</span>
            <span className={`flex items-center gap-1.5 font-medium ${isTabTracking ? 'text-green-300' : 'text-white/60'}`}>
              <span className={`w-2 h-2 rounded-full ${isTabTracking ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
              {isTabTracking ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon size={20} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge !== null && (
                <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${item.badgeColor || 'bg-gray-500'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">This Week</span>
              <span className="font-medium text-gray-900 dark:text-white">32h 45m</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">This Month</span>
              <span className="font-medium text-gray-900 dark:text-white">128h 15m</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Coding Rate</span>
              <span className="font-medium text-green-600 dark:text-green-400">87%</span>
            </div>
          </div>
        </div>

        {/* Desktop App Promo */}
        <div className="mt-6 p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            <DesktopIcon size={16} />
            <span>Desktop App</span>
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            Track all apps system-wide with our native desktop companion
          </p>
          <button 
            onClick={() => onViewChange('desktop')}
            className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            Learn more
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
