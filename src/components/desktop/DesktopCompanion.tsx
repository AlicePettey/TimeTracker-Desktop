import React, { useState, useEffect } from 'react';
import { Activity } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DesktopActivity extends Activity {
  source: 'desktop' | 'browser';
  processPath?: string;
}

interface SyncConfig {
  enabled: boolean;
  deviceId: string;
  deviceName: string;
  lastSync: Date | null;
  pendingCount: number;
  platform?: 'win32' | 'darwin' | 'linux';
}

interface ConnectedDevice {
  id: string;
  device_id: string;
  device_name: string;
  platform: 'win32' | 'darwin' | 'linux';
  last_used_at: string;
  created_at: string;
  is_revoked: boolean;
}

interface SyncSettings {
  syncInterval: 5 | 15 | 30;
  syncOnClose: boolean;
  syncOnIdle: boolean;
  autoSyncEnabled: boolean;
  syncOnStartup: boolean;
}

interface DesktopCompanionProps {
  onImportActivities?: (activities: DesktopActivity[]) => void;
  userId?: string;
}

// GitHub repository info - UPDATE THESE TO YOUR ACTUAL REPO
// To configure: Replace 'your-username' and 'your-repo' with your actual GitHub username and repository name
const GITHUB_OWNER = 'AlicePettey';
const GITHUB_REPO = 'TimeTracker-Desktop';
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Set this to true once you've configured your GitHub repository
const IS_REPO_CONFIGURED = true;

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body: string;
  assets: ReleaseAsset[];
}

const DesktopCompanion: React.FC<DesktopCompanionProps> = ({ onImportActivities, userId }) => {
  const { user, session } = useAuth();
  const [syncToken, setSyncToken] = useState<string>('');
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'download' | 'connect' | 'devices' | 'settings'>('download');
  const [latestRelease, setLatestRelease] = useState<Release | null>(null);
  const [isLoadingRelease, setIsLoadingRelease] = useState(true);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // Sync settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncInterval: 15,
    syncOnClose: true,
    syncOnIdle: true,
    autoSyncEnabled: true,
    syncOnStartup: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch latest release from GitHub
  useEffect(() => {
    const fetchLatestRelease = async () => {
      if (!IS_REPO_CONFIGURED) {
        setIsLoadingRelease(false);
        setReleaseError('Repository not configured');
        return;
      }
      
      try {
        setIsLoadingRelease(true);
        setReleaseError(null);
        const response = await fetch(LATEST_RELEASE_API);
        if (response.ok) {
          const data = await response.json();
          setLatestRelease(data);
        } else if (response.status === 404) {
          setReleaseError('No releases found. The desktop app is coming soon!');
        } else {
          setReleaseError('Unable to fetch releases. Please try again later.');
        }
      } catch (error) {
        console.error('Failed to fetch latest release:', error);
        setReleaseError('Unable to connect to GitHub. Please check your internet connection.');
      } finally {
        setIsLoadingRelease(false);
      }
    };

    fetchLatestRelease();
  }, []);

  // Fetch connected devices
  useEffect(() => {
    const fetchConnectedDevices = async () => {
      if (!user) return;
      
      setIsLoadingDevices(true);
      try {
        const { data, error } = await supabase
          .from('sync_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_revoked', false)
          .order('last_used_at', { ascending: false });

        if (error) throw error;
        setConnectedDevices(data || []);
      } catch (error) {
        console.error('Failed to fetch connected devices:', error);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchConnectedDevices();
  }, [user]);

  // Fetch sync settings from database
  useEffect(() => {
    const fetchSyncSettings = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_sync_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine for new users
          console.error('Failed to fetch sync settings:', error);
          return;
        }

        if (data) {
          setSyncSettings({
            syncInterval: data.sync_interval as 5 | 15 | 30,
            syncOnClose: data.sync_on_close,
            syncOnIdle: data.sync_on_idle,
            autoSyncEnabled: data.auto_sync_enabled,
            syncOnStartup: data.sync_on_startup
          });
        }
      } catch (error) {
        console.error('Failed to fetch sync settings:', error);
      }
    };

    fetchSyncSettings();
  }, [user]);

  // Copy token to clipboard
  const copyToken = () => {
    navigator.clipboard.writeText(syncToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Copy URL to clipboard
  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Helper to find download URL for specific platform
  const getDownloadUrl = (platform: 'windows' | 'mac' | 'linux', type?: string): string | null => {
    if (!latestRelease) return null;

    const patterns: Record<string, RegExp[]> = {
      'windows-exe': [/\.exe$/i, /setup.*\.exe$/i, /installer.*\.exe$/i],
      'windows-portable': [/portable.*\.exe$/i],
      'windows-msi': [/\.msi$/i],
      'mac-dmg': [/\.dmg$/i],
      'mac-zip': [/darwin.*\.zip$/i, /mac.*\.zip$/i],
      'linux-appimage': [/\.AppImage$/i],
      'linux-deb': [/\.deb$/i],
      'linux-rpm': [/\.rpm$/i],
    };

    const key = type ? `${platform}-${type}` : platform;
    const assetPatterns = patterns[key] || [];

    for (const pattern of assetPatterns) {
      const asset = latestRelease.assets.find(a => pattern.test(a.name));
      if (asset) return asset.browser_download_url;
    }

    return null;
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Get asset size
  const getAssetSize = (platform: 'windows' | 'mac' | 'linux', type?: string): string => {
    if (!latestRelease) return '';

    const patterns: Record<string, RegExp[]> = {
      'windows-exe': [/\.exe$/i, /setup.*\.exe$/i],
      'windows-portable': [/portable.*\.exe$/i],
      'mac-dmg': [/\.dmg$/i],
      'linux-appimage': [/\.AppImage$/i],
      'linux-deb': [/\.deb$/i],
    };

    const key = type ? `${platform}-${type}` : platform;
    const assetPatterns = patterns[key] || [];

    for (const pattern of assetPatterns) {
      const asset = latestRelease.assets.find(a => pattern.test(a.name));
      if (asset) return formatSize(asset.size);
    }

    return '';
  };

  // Generate a sync token using the edge function
  const generateSyncToken = async () => {
    if (!user || !session) {
      setTokenError('Please sign in to generate a sync token');
      return;
    }

    setIsGeneratingToken(true);
    setTokenError(null);

    try {
      // Generate a temporary device ID for this token request
      const tempDeviceId = `web-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
      
      const { data, error } = await supabase.functions.invoke('generate-sync-token', {
        body: {
          deviceId: tempDeviceId,
          deviceName: 'Desktop App',
          platform: 'win32' // Default, will be updated when desktop app connects
        }
      });

      if (error) throw error;

      if (data?.success && data?.token) {
        setSyncToken(data.token);
        // Refresh connected devices
        const { data: devices } = await supabase
          .from('sync_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_revoked', false)
          .order('last_used_at', { ascending: false });
        setConnectedDevices(devices || []);
      } else {
        throw new Error(data?.message || 'Failed to generate token');
      }
    } catch (error: any) {
      console.error('Failed to generate sync token:', error);
      setTokenError(error.message || 'Failed to generate sync token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Revoke a device token
  const revokeDevice = async (deviceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('sync_tokens')
        .update({ is_revoked: true })
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh devices list
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (error) {
      console.error('Failed to revoke device:', error);
    }
  };

  // Save sync settings
  const saveSyncSettings = async () => {
    if (!user) return;

    setIsSavingSettings(true);
    setSettingsSaved(false);

    try {
      const { error } = await supabase
        .from('user_sync_settings')
        .upsert({
          user_id: user.id,
          sync_interval: syncSettings.syncInterval,
          sync_on_close: syncSettings.syncOnClose,
          sync_on_idle: syncSettings.syncOnIdle,
          auto_sync_enabled: syncSettings.autoSyncEnabled,
          sync_on_startup: syncSettings.syncOnStartup,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save sync settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };


  const version = latestRelease?.tag_name?.replace('v', '') || '1.0.0';
  const releaseDate = latestRelease?.published_at 
    ? new Date(latestRelease.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'December 2024';

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Desktop Companion App</h1>
              <p className="text-white/80">System-wide activity tracking for Windows, Mac & Linux</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span className="font-semibold">All Applications</span>
              </div>
              <p className="text-sm text-white/70">Track time across every app on your computer</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="font-semibold">Idle Detection</span>
              </div>
              <p className="text-sm text-white/70">Automatically detect when you're away</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                <span className="font-semibold">Cloud Sync</span>
              </div>
              <p className="text-sm text-white/70">Sync activities to the web app automatically</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'download', label: 'Download', icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )},
          { id: 'connect', label: 'Connect', icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          )},
          { id: 'devices', label: 'Devices', icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )},
          { id: 'settings', label: 'Sync Settings', icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          )}
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'download' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Download Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Download for Your Platform
              </h2>
              {isLoadingRelease && (
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
            </div>

            {/* Show Coming Soon message when repo is not configured */}
            {!IS_REPO_CONFIGURED && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                      Desktop App Coming Soon
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      The desktop companion app is currently in development. Check back soon for download links, or sign up for notifications to be alerted when it's available.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {/* Windows */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Windows</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Windows 10/11 (64-bit)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {latestRelease ? (
                    <>
                      <a
                        href={getDownloadUrl('windows', 'exe') || latestRelease.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        .exe
                      </a>
                      <a
                        href={getDownloadUrl('windows', 'portable') || latestRelease.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Portable
                      </a>
                    </>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium rounded-lg">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>

              {/* macOS */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">macOS</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">macOS 10.15+ (Intel & Apple Silicon)</p>
                  </div>
                </div>
                {latestRelease ? (
                  <a
                    href={getDownloadUrl('mac', 'dmg') || latestRelease.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    .dmg
                  </a>
                ) : (
                  <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium rounded-lg">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Linux */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Linux</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ubuntu, Debian, Fedora</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {latestRelease ? (
                    <>
                      <a
                        href={getDownloadUrl('linux', 'appimage') || latestRelease.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        AppImage
                      </a>
                      <a
                        href={getDownloadUrl('linux', 'deb') || latestRelease.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        .deb
                      </a>
                    </>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium rounded-lg">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            </div>

            {latestRelease && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Version {version} • Released {releaseDate}
                </p>
                <a 
                  href={latestRelease.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Release Notes
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )}

            {/* All Releases Link - only show if repo is configured */}
            {IS_REPO_CONFIGURED && (
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View All Releases on GitHub
              </a>
            )}
          </div>


          {/* Features */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Desktop App Features
            </h2>
            
            <div className="space-y-4">
              {[
                { title: 'System-Wide Tracking', desc: 'Track time across ALL applications - browsers, IDEs, design tools, and more' },
                { title: 'Native OS Integration', desc: 'Uses native APIs for accurate window detection and idle monitoring' },
                { title: 'Automatic Idle Detection', desc: 'Detects screen lock, sleep, and user inactivity automatically' },
                { title: 'System Tray', desc: 'Runs quietly in the background with quick access from system tray' },
                { title: 'Auto-Updates', desc: 'Automatically checks for updates and installs them seamlessly' },
                { title: 'Code Signed', desc: 'Signed and notarized for Windows and macOS for your security' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Badge */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Verified & Secure</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    All releases are code-signed and verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Setup */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connect Desktop App
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Generate Sync Token</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Create a secure token to authenticate the desktop app
                  </p>
                  
                  {!user && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-3">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Please sign in to generate a sync token
                      </p>
                    </div>
                  )}

                  {tokenError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-3">
                      <p className="text-sm text-red-700 dark:text-red-400">{tokenError}</p>
                    </div>
                  )}
                  
                  {syncToken ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-mono text-sm text-gray-600 dark:text-gray-300 break-all">
                        {syncToken}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={copyToken}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {copiedToken ? (
                            <>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy Token
                            </>
                          )}
                        </button>
                        <button
                          onClick={generateSyncToken}
                          className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateSyncToken}
                      disabled={isGeneratingToken || !user}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingToken ? 'Generating...' : 'Generate Token'}
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Copy Web App URL</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    The desktop app needs this URL to sync data
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg font-mono text-sm text-gray-600 dark:text-gray-300 truncate">
                      {window.location.origin}
                    </div>
                    <button
                      onClick={copyUrl}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {copiedUrl ? (
                        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Configure Desktop App</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Open the desktop app, go to <strong>Sync</strong> tab, and paste:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      The Sync URL in the URL field
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      The Sync Token in the Token field
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                How Sync Works
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Desktop Tracks</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The desktop app monitors all your applications and logs activities locally
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Auto Sync</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Activities are automatically synced to the web app when connected
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Unified View</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      View all activities (browser + desktop) in one place, generate reports
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Keep Your Token Secure
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Your sync token is like a password. Don't share it with others. 
                    If you think it's been compromised, regenerate it immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connected Devices
          </h2>
          
          {connectedDevices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Devices Connected
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Download the desktop app and connect it to start syncing activities
              </p>
              <button
                onClick={() => setActiveTab('download')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Download Desktop App
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{device.device_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last sync: {device.last_used_at ? new Date(device.last_used_at).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full capitalize">
                      {device.platform === 'win32' ? 'Windows' : device.platform === 'darwin' ? 'macOS' : 'Linux'}
                    </span>
                    <button 
                      onClick={() => revokeDevice(device.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Revoke device access"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sync Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Auto-Sync Configuration
            </h2>
            
            {!user && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                      Sign In Required
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Please sign in to configure sync settings. Your preferences will be saved to your account.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Sync Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sync Interval
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  How often should the desktop app automatically sync activities?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 15, 30].map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setSyncSettings(prev => ({ ...prev, syncInterval: interval as 5 | 15 | 30 }))}
                      disabled={!user}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        syncSettings.syncInterval === interval
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-lg font-semibold">{interval}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">minutes</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                {/* Auto Sync Enabled */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Enable Auto-Sync</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically sync activities at the configured interval
                    </p>
                  </div>
                  <button
                    onClick={() => setSyncSettings(prev => ({ ...prev, autoSyncEnabled: !prev.autoSyncEnabled }))}
                    disabled={!user}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      syncSettings.autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      syncSettings.autoSyncEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Sync on Close */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Sync on App Close</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Sync all pending activities when closing the desktop app
                    </p>
                  </div>
                  <button
                    onClick={() => setSyncSettings(prev => ({ ...prev, syncOnClose: !prev.syncOnClose }))}
                    disabled={!user}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      syncSettings.syncOnClose ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      syncSettings.syncOnClose ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Sync on Idle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Sync When Idle</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Trigger sync when idle is detected (screen lock, inactivity)
                    </p>
                  </div>
                  <button
                    onClick={() => setSyncSettings(prev => ({ ...prev, syncOnIdle: !prev.syncOnIdle }))}
                    disabled={!user}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      syncSettings.syncOnIdle ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      syncSettings.syncOnIdle ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Sync on Startup */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Sync on Startup</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Sync pending activities when the desktop app starts
                    </p>
                  </div>
                  <button
                    onClick={() => setSyncSettings(prev => ({ ...prev, syncOnStartup: !prev.syncOnStartup }))}
                    disabled={!user}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      syncSettings.syncOnStartup ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      syncSettings.syncOnStartup ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={saveSyncSettings}
                  disabled={!user || isSavingSettings}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingSettings ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : settingsSaved ? (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Settings Saved!
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                How Auto-Sync Works
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Interval Sync</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Activities are batched and synced at your chosen interval (5, 15, or 30 minutes)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Idle Detection</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      When you step away, activities are synced before the idle period begins
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Reliable Delivery</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Failed syncs are automatically retried to ensure no data is lost
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                    Settings Sync
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    These settings are saved to your account and will be applied to all connected desktop apps. 
                    Changes take effect immediately on the desktop app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopCompanion;
