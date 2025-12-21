import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  ClockIcon, 
  PlayIcon, 
  PauseIcon, 
  SunIcon, 
  MoonIcon,
  SettingsIcon
} from '@/components/ui/Icons';
import { TabTrackerState } from '@/hooks/useTabTracker';

interface HeaderProps {
  isTracking: boolean;
  onToggleTracking: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  logoUrl: string;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  isSyncing?: boolean;
  isTabTracking?: boolean;
  tabTrackerState?: TabTrackerState;
}

const Header: React.FC<HeaderProps> = ({
  isTracking,
  onToggleTracking,
  isDarkMode,
  onToggleDarkMode,
  logoUrl,
  user,
  onOpenAuth,
  onSignOut,
  isSyncing = false,
  isTabTracking = false,
  tabTrackerState
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getUserInitials = (user: User) => {
    const name = user.user_metadata?.full_name || user.email || '';
    if (user.user_metadata?.full_name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="TimeTracker" 
              className="w-10 h-10 rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                TimeTracker
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Activity Monitoring System
              </p>
            </div>
          </div>

          {/* Center - Tracking Status */}
          <div className="flex items-center gap-4">
            {/* Main Tracking Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isTracking 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {isTracking ? 'Tracking Active' : 'Tracking Paused'}
              </span>
            </div>

            {/* Tab Tracking Status */}
            {isTabTracking && tabTrackerState && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <svg 
                  className="w-4 h-4 text-purple-600 dark:text-purple-400" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                  {tabTrackerState.isIdle ? 'Idle' : 'Tab Active'}
                </span>
                {tabTrackerState.currentSession && !tabTrackerState.isIdle && (
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                )}
              </div>
            )}
            
            <button
              onClick={onToggleTracking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isTracking
                  ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTracking ? (
                <>
                  <PauseIcon size={18} />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon size={18} />
                  Resume
                </>
              )}
            </button>

            {/* Sync indicator */}
            {isSyncing && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Syncing...</span>
              </div>
            )}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
            
            {/* Settings */}
            <button
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <SettingsIcon size={20} />
            </button>

            {/* Current Time */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <ClockIcon size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
            </div>

            {/* User Menu / Sign In */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials(user)}
                  </div>
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.user_metadata?.full_name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                          Account
                        </div>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          Profile Settings
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          Security
                        </button>
                      </div>
                      <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onSignOut();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
