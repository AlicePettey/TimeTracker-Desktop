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
    updateActivity,
    splitActivity,
    addManualEntry,
    addAutoTrackedActivity,
    getTodayActivities,
    getUncodedActivities,
    generateTimesheet,
    getSummaryStats,
    exportToCSV,
    toggleTracking,
    refreshActivities
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
            {/* Refresh Button for synced activities */}
            {user && (
              <div className="flex justify-end">
                <button
                  onClick={refreshActivities}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isSyncing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        <polyline points="21 3 21 9 15 9" />
                      </svg>
                      Refresh from Desktop
                    </>
                  )}
                </button>
              </div>
            )}

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
                  onUpdate={updateActivity}
                  onSplit={splitActivity}
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
            onUpdate={updateActivity}
            onSplit={splitActivity}
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
              onUpdate={updateActivity}
              onSplit={splitActivity}
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
            <TabTrackerPanel
              state={tabTrackerState}
              settings={tabTrackerSettings}
              pendingActivities={pendingActivities}
              onUpdateSettings={updateTabTrackerSettings}
              onClearPending={clearPendingActivities}
              currentSessionDuration={currentSessionDuration}
              isTracking={isTabTracking}
            />
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
        onSync={refreshActivities}
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
