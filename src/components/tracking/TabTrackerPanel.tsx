import React, { useState } from 'react';
import { TabTrackerSettings, TabTrackerState } from '@/hooks/useTabTracker';
import { Activity } from '@/types';
import { formatDuration } from '@/utils/timeUtils';

interface TabTrackerPanelProps {
  state: TabTrackerState;
  settings: TabTrackerSettings;
  pendingActivities: Activity[];
  onUpdateSettings: (updates: Partial<TabTrackerSettings>) => void;
  onClearPending: () => void;
  currentSessionDuration: number;
  isTracking: boolean;
}

const TabTrackerPanel: React.FC<TabTrackerPanelProps> = ({
  state,
  settings,
  pendingActivities,
  onUpdateSettings,
  onClearPending,
  currentSessionDuration,
  isTracking
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const recentActivities = pendingActivities.slice(-5).reverse();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isTracking ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <svg 
                className={`w-5 h-5 ${isTracking ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Browser Tab Tracker
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isTracking ? 'Automatically tracking browser activity' : 'Tracking paused'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="p-4 space-y-4">
        {/* Current Session */}
        {state.currentSession && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Current Session
              </span>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                {formatDuration(currentSessionDuration)}
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400 truncate">
              {state.currentSession.title}
            </p>
          </div>
        )}

        {/* Idle Status */}
        {state.isIdle && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Idle Detected
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              No activity for {Math.floor(settings.idleTimeout / 60)} minutes
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {state.sessionsToday}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatDuration(state.totalActiveTime).split(':').slice(0, 2).join(':')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatDuration(state.totalIdleTime).split(':').slice(0, 2).join(':')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Idle</p>
          </div>
        </div>

        {/* Recent Auto-Tracked Activities */}
        {recentActivities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent Auto-Tracked
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {pendingActivities.length} total
              </span>
            </div>
            <div className="space-y-2">
              {recentActivities.map(activity => (
                <div 
                  key={activity.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${activity.isIdle ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {activity.windowTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(activity.duration)} • {activity.applicationName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Tracking Settings
          </h4>
          
          <div className="space-y-4">
            {/* Enable/Disable */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable Auto-Tracking
              </span>
              <button
                onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {/* Track Idle Time */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Track Idle Time
              </span>
              <button
                onClick={() => onUpdateSettings({ trackIdleTime: !settings.trackIdleTime })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.trackIdleTime ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.trackIdleTime ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {/* Auto-Merge Short Activities */}
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Merge Short Activities
              </span>
              <button
                onClick={() => onUpdateSettings({ autoMergeShortActivities: !settings.autoMergeShortActivities })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.autoMergeShortActivities ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span 
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.autoMergeShortActivities ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {/* Idle Timeout */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Idle Timeout: {Math.floor(settings.idleTimeout / 60)} minutes
              </label>
              <input
                type="range"
                min="60"
                max="1800"
                step="60"
                value={settings.idleTimeout}
                onChange={(e) => onUpdateSettings({ idleTimeout: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 min</span>
                <span>30 min</span>
              </div>
            </div>

            {/* Minimum Activity Duration */}
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Min Activity Duration: {settings.minimumActivityDuration} seconds
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={settings.minimumActivityDuration}
                onChange={(e) => onUpdateSettings({ minimumActivityDuration: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>

            {/* Clear Pending */}
            {pendingActivities.length > 0 && (
              <button
                onClick={onClearPending}
                className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Clear {pendingActivities.length} Pending Activities
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabTrackerPanel;
