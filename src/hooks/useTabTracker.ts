import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity } from '@/types';
import { generateId } from '@/utils/timeUtils';

export interface TabTrackerSettings {
  enabled: boolean;
  idleTimeout: number; // in seconds
  minimumActivityDuration: number; // minimum seconds to log an activity
  trackIdleTime: boolean;
  autoMergeShortActivities: boolean;
  mergeThreshold: number; // seconds - merge activities shorter than this
}

export interface TabSession {
  id: string;
  title: string;
  url: string;
  startTime: Date;
  isActive: boolean;
  isIdle: boolean;
}

export interface TabTrackerState {
  isTracking: boolean;
  currentSession: TabSession | null;
  isIdle: boolean;
  idleStartTime: Date | null;
  lastActivityTime: Date;
  totalActiveTime: number; // seconds today
  totalIdleTime: number; // seconds today
  sessionsToday: number;
}

const DEFAULT_SETTINGS: TabTrackerSettings = {
  enabled: true,
  idleTimeout: 300, // 5 minutes
  minimumActivityDuration: 10, // 10 seconds minimum
  trackIdleTime: true,
  autoMergeShortActivities: true,
  mergeThreshold: 30 // 30 seconds
};

const STORAGE_KEY_SETTINGS = 'tabtracker_settings';
const STORAGE_KEY_PENDING = 'tabtracker_pending_activities';

// Helper to get browser/tab info
const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Browser';
};

// Helper to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
};

// Helper to clean up title
const cleanTitle = (title: string): string => {
  // Remove common suffixes
  return title
    .replace(/\s*[-–—|]\s*(Google Chrome|Firefox|Safari|Microsoft Edge).*$/i, '')
    .replace(/\s*[-–—|]\s*[^-–—|]*$/, '') // Remove last segment after separator
    .trim() || 'Untitled';
};

export const useTabTracker = (
  onActivityComplete: (activity: Activity) => void,
  isGlobalTrackingEnabled: boolean = true
) => {
  const [settings, setSettings] = useState<TabTrackerSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [state, setState] = useState<TabTrackerState>({
    isTracking: false,
    currentSession: null,
    isIdle: false,
    idleStartTime: null,
    lastActivityTime: new Date(),
    totalActiveTime: 0,
    totalIdleTime: 0,
    sessionsToday: 0
  });

  const [pendingActivities, setPendingActivities] = useState<Activity[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((a: any) => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime)
        }));
      }
    } catch {}
    return [];
  });

  // Refs for tracking
  const sessionRef = useRef<TabSession | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTitleRef = useRef<string>(document.title);
  const isIdleRef = useRef<boolean>(false);
  const idleStartRef = useRef<Date | null>(null);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Save pending activities to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pendingActivities));
  }, [pendingActivities]);

  // Complete current session and create activity
  const completeSession = useCallback((isIdle: boolean = false) => {
    const session = sessionRef.current;
    if (!session) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    // Only log if duration meets minimum threshold
    if (duration >= settings.minimumActivityDuration) {
      const activity: Activity = {
        id: generateId(),
        applicationName: getBrowserInfo(),
        windowTitle: `${cleanTitle(session.title)} - ${extractDomain(session.url)}`,
        startTime: session.startTime,
        endTime,
        duration,
        isCoded: false,
        isIdle: isIdle || session.isIdle
      };

      // Check if we should merge with previous activity
      if (settings.autoMergeShortActivities && pendingActivities.length > 0) {
        const lastActivity = pendingActivities[pendingActivities.length - 1];
        const timeSinceLast = (session.startTime.getTime() - lastActivity.endTime.getTime()) / 1000;
        
        if (
          timeSinceLast < settings.mergeThreshold &&
          lastActivity.windowTitle === activity.windowTitle &&
          !lastActivity.isCoded
        ) {
          // Merge with previous activity
          const mergedActivity = {
            ...lastActivity,
            endTime: activity.endTime,
            duration: lastActivity.duration + duration + Math.floor(timeSinceLast)
          };
          
          setPendingActivities(prev => [...prev.slice(0, -1), mergedActivity]);
          onActivityComplete(mergedActivity);
          sessionRef.current = null;
          return;
        }
      }

      setPendingActivities(prev => [...prev, activity]);
      onActivityComplete(activity);
      
      setState(prev => ({
        ...prev,
        sessionsToday: prev.sessionsToday + 1,
        totalActiveTime: prev.totalActiveTime + (isIdle ? 0 : duration),
        totalIdleTime: prev.totalIdleTime + (isIdle ? duration : 0)
      }));
    }

    sessionRef.current = null;
  }, [settings, pendingActivities, onActivityComplete]);

  // Start a new session
  const startSession = useCallback(() => {
    const newSession: TabSession = {
      id: generateId(),
      title: document.title || 'Untitled',
      url: window.location.href,
      startTime: new Date(),
      isActive: !document.hidden,
      isIdle: false
    };

    sessionRef.current = newSession;
    lastTitleRef.current = document.title;

    setState(prev => ({
      ...prev,
      currentSession: newSession,
      isTracking: true
    }));
  }, []);

  // Handle title change
  const handleTitleChange = useCallback(() => {
    const newTitle = document.title;
    if (newTitle !== lastTitleRef.current && sessionRef.current) {
      // Complete current session and start new one
      completeSession();
      startSession();
    }
  }, [completeSession, startSession]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!settings.enabled || !isGlobalTrackingEnabled) return;

    if (document.hidden) {
      // Tab became hidden - complete session
      if (sessionRef.current) {
        completeSession();
      }
    } else {
      // Tab became visible - start new session
      startSession();
      // Reset idle state
      isIdleRef.current = false;
      idleStartRef.current = null;
      setState(prev => ({ ...prev, isIdle: false, idleStartTime: null }));
    }
  }, [settings.enabled, isGlobalTrackingEnabled, completeSession, startSession]);

  // Handle user activity (reset idle timer)
  const handleUserActivity = useCallback(() => {
    if (!settings.enabled || !isGlobalTrackingEnabled) return;

    const now = new Date();
    setState(prev => ({ ...prev, lastActivityTime: now }));

    // If was idle, complete idle session and start active session
    if (isIdleRef.current && sessionRef.current) {
      completeSession(true);
      startSession();
      isIdleRef.current = false;
      idleStartRef.current = null;
      setState(prev => ({ ...prev, isIdle: false, idleStartTime: null }));
    }

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (settings.trackIdleTime && sessionRef.current) {
        // User went idle
        isIdleRef.current = true;
        idleStartRef.current = new Date();
        
        // Complete active session
        completeSession();
        
        // Start idle session
        const idleSession: TabSession = {
          id: generateId(),
          title: 'Idle',
          url: window.location.href,
          startTime: new Date(),
          isActive: false,
          isIdle: true
        };
        sessionRef.current = idleSession;
        
        setState(prev => ({
          ...prev,
          isIdle: true,
          idleStartTime: new Date(),
          currentSession: idleSession
        }));
      }
    }, settings.idleTimeout * 1000);
  }, [settings, isGlobalTrackingEnabled, completeSession, startSession]);

  // Initialize tracking
  useEffect(() => {
    if (!settings.enabled || !isGlobalTrackingEnabled) {
      // Clean up if tracking is disabled
      if (sessionRef.current) {
        completeSession();
      }
      return;
    }

    // Start initial session if tab is visible
    if (!document.hidden) {
      startSession();
    }

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('keydown', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('touchstart', handleUserActivity);

    // Set up title observer
    const titleObserver = new MutationObserver(() => {
      handleTitleChange();
    });

    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }

    // Periodic check for title changes (fallback)
    activityIntervalRef.current = setInterval(() => {
      if (document.title !== lastTitleRef.current) {
        handleTitleChange();
      }
    }, 1000);

    // Initial activity trigger
    handleUserActivity();

    return () => {
      // Clean up
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleUserActivity);
      document.removeEventListener('keydown', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('touchstart', handleUserActivity);
      
      titleObserver.disconnect();
      
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }

      // Complete any ongoing session
      if (sessionRef.current) {
        completeSession();
      }
    };
  }, [settings.enabled, isGlobalTrackingEnabled, handleVisibilityChange, handleUserActivity, handleTitleChange, startSession, completeSession]);

  // Handle page unload - save current session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current) {
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - sessionRef.current.startTime.getTime()) / 1000);
        
        if (duration >= settings.minimumActivityDuration) {
          const activity: Activity = {
            id: generateId(),
            applicationName: getBrowserInfo(),
            windowTitle: `${cleanTitle(sessionRef.current.title)} - ${extractDomain(sessionRef.current.url)}`,
            startTime: sessionRef.current.startTime,
            endTime,
            duration,
            isCoded: false,
            isIdle: sessionRef.current.isIdle
          };
          
          // Save to localStorage for recovery
          const pending = [...pendingActivities, activity];
          localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pending));
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingActivities, settings.minimumActivityDuration]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<TabTrackerSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear pending activities
  const clearPendingActivities = useCallback(() => {
    setPendingActivities([]);
    localStorage.removeItem(STORAGE_KEY_PENDING);
  }, []);

  // Get current session duration
  const getCurrentSessionDuration = useCallback((): number => {
    if (!sessionRef.current) return 0;
    return Math.floor((new Date().getTime() - sessionRef.current.startTime.getTime()) / 1000);
  }, []);

  // Force complete current session
  const forceCompleteSession = useCallback(() => {
    if (sessionRef.current) {
      completeSession();
      startSession();
    }
  }, [completeSession, startSession]);

  return {
    state,
    settings,
    pendingActivities,
    updateSettings,
    clearPendingActivities,
    getCurrentSessionDuration,
    forceCompleteSession,
    isTracking: settings.enabled && isGlobalTrackingEnabled && state.isTracking
  };
};
