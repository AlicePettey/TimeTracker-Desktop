import React, { useState, useEffect, useCallback } from 'react';
import { useTimeTracker } from '@/hooks/useTimeTracker';
import { useTabTracker } from '@/hooks/useTabTracker';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import DashboardView from '@/components/dashboard/DashboardView';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import ProjectManager from '@/components/projects/ProjectManager';
import TimesheetExport from '@/components/reports/TimesheetExport';
import QuickTimer from '@/components/dashboard/QuickTimer';
import ManualEntry from '@/components/dashboard/ManualEntry';
import AuthModal from '@/components/auth/AuthModal';
import TabTrackerPanel from '@/components/tracking/TabTrackerPanel';
import DesktopCompanion from '@/components/desktop/DesktopCompanion';
import CategoryManager from '@/components/categories/CategoryManager';
import ProductivityInsights from '@/components/categories/ProductivityInsights';
import { Activity } from '@/types';

type View = 'dashboard' | 'activities' | 'uncoded' | 'projects' | 'reports' | 'tracking' | 'desktop' | 'categories' | 'insights';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/694333e3290d8cee066af0cd_1766011978410_5857fc31.png';

const AppLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [currentSessionDuration, setCurrentSessionDuration] = useState(0);

  const {
    user,
    isLoading: authLoading,
    error: authError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError
  } = useAuth();

  const {
    projects,
    activities,
    isTracking,
    isLoading,
    isSyncing,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    deleteTask,
    codeActivity,
    uncodeActivity,
    bulkCodeActivities,
    deleteActivity,
    bulkDeleteActivities,
    addManualEntry,
    addAutoTrackedActivity,
    getTodayActivities,
    getUncodedActivities,
    generateTimesheet,
    getSummaryStats,
    exportToCSV,
    toggleTracking
  } = useTimeTracker(user);


  // Callback for when tab tracker completes an activity
  const handleActivityComplete = useCallback((activity: Activity) => {
    if (isTracking) {
      addAutoTrackedActivity(activity);
    }
  }, [isTracking, addAutoTrackedActivity]);

  // Tab tracker hook
  const {
    state: tabTrackerState,
    settings: tabTrackerSettings,
    pendingActivities,
    updateSettings: updateTabTrackerSettings,
    clearPendingActivities,
    getCurrentSessionDuration,
    isTracking: isTabTracking
  } = useTabTracker(handleActivityComplete, isTracking);

  // Update current session duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSessionDuration(getCurrentSessionDuration());
    }, 1000);
    return () => clearInterval(interval);
  }, [getCurrentSessionDuration]);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Close auth modal on successful sign in
  useEffect(() => {
    if (user && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [user, isAuthModalOpen]);

  const stats = getSummaryStats();
  const todayActivities = getTodayActivities();
  const uncodedActivities = getUncodedActivities();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading TimeTracker...</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Sync Status Banner */}
            {!user && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        <polyline points="21 3 21 9 15 9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                        Sync Your Data
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Sign in to sync your time tracking data across all your devices.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DashboardView
                  activities={activities}
                  projects={projects}
                  stats={stats}
                  onCode={codeActivity}
                  onUncode={uncodeActivity}
                  onDelete={deleteActivity}
                  todayActivities={todayActivities}
                />
              </div>
              <div className="space-y-6">
                <QuickTimer
                  projects={projects}
                  onSaveTimer={addManualEntry}
                />
                <ManualEntry
                  projects={projects}
                  onAddEntry={addManualEntry}
                />
              </div>
            </div>
          </div>
        );

      
      case 'activities':
        return (
          <ActivityFeed
            activities={activities}
            projects={projects}
            onCode={codeActivity}
            onUncode={uncodeActivity}
            onDelete={deleteActivity}
            onBulkCode={bulkCodeActivities}
            onBulkDelete={bulkDeleteActivities}
            title="All Activities"
            showUncodedOnly={false}
          />
        );

      
      case 'uncoded':
        return (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    {stats.uncodedCount} Uncoded Activities
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    These activities will be automatically archived after 30 days. 
                    Assign them to projects to include in your timesheets.
                  </p>
                </div>
              </div>
            </div>
            
            <ActivityFeed
              activities={uncodedActivities}
              projects={projects}
              onCode={codeActivity}
              onUncode={uncodeActivity}
              onDelete={deleteActivity}
              onBulkCode={bulkCodeActivities}
              onBulkDelete={bulkDeleteActivities}
              title="Uncoded Activities (30 Day Buffer)"
              showUncodedOnly={true}
              maxDays={30}
            />
          </div>
        );
      

      case 'projects':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectManager
              projects={projects}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
            />
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Statistics</h3>
                <div className="space-y-4">
                  {projects.filter(p => !p.isArchived).slice(0, 6).map(project => {
                    const projectActivities = activities.filter(a => a.projectId === project.id);
                    const totalSeconds = projectActivities.reduce((sum, a) => sum + a.duration, 0);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    
                    return (
                      <div key={project.id} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {project.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {hours}h {minutes}m
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all"
                              style={{ 
                                width: `${Math.min((totalSeconds / (40 * 3600)) * 100, 100)}%`,
                                backgroundColor: project.color
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Pro Tip</h3>
                <p className="text-sm opacity-90">
                  Create projects for each client or major work area. Add tasks within projects 
                  to track time at a granular level. Use keyboard shortcuts for faster coding!
                </p>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="opacity-70">Quick Code:</span>
                    <span className="ml-2 font-mono bg-white/20 px-2 py-0.5 rounded">Ctrl+K</span>
                  </div>
                  <div>
                    <span className="opacity-70">New Project:</span>
                    <span className="ml-2 font-mono bg-white/20 px-2 py-0.5 rounded">Ctrl+N</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'reports':
        return (
          <TimesheetExport
            generateTimesheet={generateTimesheet}
            exportToCSV={exportToCSV}
          />
        );

      case 'tracking':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <TabTrackerPanel
                state={tabTrackerState}
                settings={tabTrackerSettings}
                pendingActivities={pendingActivities}
                onUpdateSettings={updateTabTrackerSettings}
                onClearPending={clearPendingActivities}
                currentSessionDuration={currentSessionDuration}
                isTracking={isTabTracking}
              />
              
              {/* Browser Extension Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Browser Tab Tracking
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      This app uses the Page Visibility API and document.title to automatically 
                      track which browser tabs are active and for how long.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                        Page Visibility API
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                        Title Monitoring
                      </span>
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                        Idle Detection
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* How It Works */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  How Auto-Tracking Works
                </h3>
                <div className="space-y-4">
                  {[
                    { num: '1', title: 'Tab Focus Detection', desc: 'Uses the Page Visibility API to detect when you switch between browser tabs.' },
                    { num: '2', title: 'Title Monitoring', desc: 'Monitors document.title changes to track what page you\'re viewing.' },
                    { num: '3', title: 'Idle Detection', desc: 'Detects when you\'re away from the computer using mouse/keyboard activity.' },
                    { num: '4', title: 'Auto-Logging', desc: 'Activities are automatically logged and can be assigned to projects later.' }
                  ].map(step => (
                    <div key={step.num} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{step.num}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{step.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking Stats */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-4">Today's Tracking Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-3xl font-bold">{tabTrackerState.sessionsToday}</p>
                    <p className="text-sm opacity-80">Sessions Tracked</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-3xl font-bold">
                      {Math.floor(tabTrackerState.totalActiveTime / 3600)}h {Math.floor((tabTrackerState.totalActiveTime % 3600) / 60)}m
                    </p>
                    <p className="text-sm opacity-80">Active Time</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-3xl font-bold">
                      {Math.floor(tabTrackerState.totalIdleTime / 60)}m
                    </p>
                    <p className="text-sm opacity-80">Idle Time</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-3xl font-bold">{pendingActivities.length}</p>
                    <p className="text-sm opacity-80">Pending Activities</p>
                  </div>
                </div>
              </div>

              {/* Desktop App CTA */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                      Need System-Wide Tracking?
                    </h4>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-2">
                      Download our desktop app to track ALL applications on your computer.
                    </p>
                    <button
                      onClick={() => setCurrentView('desktop')}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      Get Desktop App
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'desktop':
        return <DesktopCompanion userId={user?.id} />;

      case 'categories':
        return <CategoryManager />;

      case 'insights':
        return <ProductivityInsights activities={activities} />;
      
      default:
        return null;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'activities': return 'All Activities';
      case 'uncoded': return 'Uncoded Activities';
      case 'projects': return 'Projects';
      case 'reports': return 'Timesheets';
      case 'tracking': return 'Browser Tab Tracking';
      case 'desktop': return 'Desktop App';
      case 'categories': return 'Activity Categories';
      case 'insights': return 'Productivity Insights';
      default: return '';
    }
  };

  const getViewDescription = () => {
    switch (currentView) {
      case 'dashboard': return 'Overview of your time tracking activity';
      case 'activities': return 'View and manage all tracked activities';
      case 'uncoded': return 'Activities waiting to be assigned to projects';
      case 'projects': return 'Manage your projects and tasks';
      case 'reports': return 'Generate and export timesheet reports';
      case 'tracking': return 'Automatic browser tab activity monitoring';
      case 'desktop': return 'Download and connect the desktop companion app for system-wide tracking';
      case 'categories': return 'Manage categories and rules for automatic activity classification';
      case 'insights': return 'Analyze your productivity patterns and time distribution';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        isTracking={isTracking}
        onToggleTracking={toggleTracking}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        logoUrl={LOGO_URL}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        isSyncing={isSyncing}
        isTabTracking={isTabTracking}
        tabTrackerState={tabTrackerState}
      />
      
      <div className="flex">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          stats={{
            todayTotal: stats.todayTotal,
            uncodedCount: stats.uncodedCount,
            projectCount: stats.projectCount
          }}
          isTabTracking={isTabTracking}
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getViewTitle()}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {getViewDescription()}
            </p>
          </div>
          
          {renderView()}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          clearError();
        }}
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        error={authError}
        isLoading={authLoading}
      />
    </div>
  );
};

export default AppLayout;
