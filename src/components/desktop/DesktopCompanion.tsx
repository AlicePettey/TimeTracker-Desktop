import React, { useEffect, useMemo, useState } from 'react';
import { Activity } from '@/types';
import { supabase, supabaseUrl } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
// NOTE: this import is unused in your pasted file. Keep only if you actually use it elsewhere.
// import { generateSyncTokenLocal } from "@/lib/syncTokens";

interface DesktopActivity extends Activity {
  source: 'desktop' | 'browser';
  processPath?: string;
}

/**
 * NOTE:
 * Your current generate-sync-token edge function returns:
 *   { token: string, expires_at: string }
 * and does NOT require any body fields.
 *
 * This UI supports both:
 *  - token-only rows (minimal schema)
 *  - device-aware rows (device_id/device_name/platform/last_used_at)
 * by treating those fields as optional and providing fallbacks.
 */
interface ConnectedDevice {
  id: string;

  user_id?: string;

  // Optional metadata (may not exist depending on your schema + edge function)
  device_id?: string | null;
  device_name?: string | null;
  platform?: 'win32' | 'darwin' | 'linux' | null;

  // Timestamps / status
  last_used_at?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  is_revoked?: boolean | null;
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

// GitHub repository info
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
  const { user } = useAuth();

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

  // Sync settings
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    syncInterval: 15,
    syncOnClose: true,
    syncOnIdle: true,
    autoSyncEnabled: true,
    syncOnStartup: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const effectiveUserId = useMemo(() => user?.id ?? userId, [user?.id, userId]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Never';
    return d.toLocaleString();
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const platformLabel = (platform?: ConnectedDevice['platform'] | null) => {
    if (platform === 'win32') return 'Windows';
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') return 'Linux';
    return 'Device';
  };

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

        const response = await fetch(LATEST_RELEASE_API, {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setLatestRelease(data);
        } else if (response.status === 404) {
          setReleaseError('No releases found. The desktop app is coming soon!');
        } else if (response.status === 403) {
          setReleaseError('GitHub rate limit reached. Please try again later.');
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

  // Fetch connected devices (tokens)
  useEffect(() => {
    const fetchConnectedDevices = async () => {
      if (!effectiveUserId) return;

      setIsLoadingDevices(true);
      try {
        const { data, error } = await supabase
          .from('sync_tokens')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('is_revoked', false)
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setConnectedDevices((data || []) as ConnectedDevice[]);
      } catch (error) {
        console.error('Failed to fetch connected devices:', error);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchConnectedDevices();
  }, [effectiveUserId]);

  // Fetch sync settings from database
  useEffect(() => {
    const fetchSyncSettings = async () => {
      if (!effectiveUserId) return;

      try {
        const { data, error } = await supabase
          .from('user_sync_settings')
          .select('*')
          .eq('user_id', effectiveUserId)
          .single();

        if (error && (error as any).code !== 'PGRST116') {
          // PGRST116 = no rows returned (new users)
          console.error('Failed to fetch sync settings:', error);
          return;
        }

        if (data) {
          setSyncSettings({
            syncInterval: data.sync_interval as 5 | 15 | 30,
            syncOnClose: Boolean(data.sync_on_close),
            syncOnIdle: Boolean(data.sync_on_idle),
            autoSyncEnabled: Boolean(data.auto_sync_enabled),
            syncOnStartup: Boolean(data.sync_on_startup),
          });
        }
      } catch (error) {
        console.error('Failed to fetch sync settings:', error);
      }
    };

    fetchSyncSettings();
  }, [effectiveUserId]);

  // Copy token to clipboard
  const copyToken = async () => {
    if (!syncToken) return;
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (e) {
      console.error('Failed to copy token:', e);
    }
  };

  // Copy Supabase URL to clipboard
  const copySupabaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(supabaseUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      console.error('Failed to copy URL:', e);
    }
  };

  // Helper to find download URL for specific platform
  const getDownloadUrl = (platform: 'windows' | 'mac' | 'linux', type?: string): string | null => {
    if (!latestRelease) return null;

    const patterns: Record<string, RegExp[]> = {
      'windows-exe': [/\.exe$/i, /setup.*\.exe$/i, /installer.*\.exe$/i],
      'windows-portable': [/portable.*\.exe$/i],
      'windows-msi': [/\.msi$/i],

      'mac-dmg': [/\.dmg$/i],
      'mac-zip': [/darwin.*\.zip$/i, /mac.*\.zip$/i, /\.zip$/i],

      'linux-appimage': [/\.AppImage$/i],
      'linux-deb': [/\.deb$/i],
      'linux-rpm': [/\.rpm$/i],
    };

    const key = type ? `${platform}-${type}` : platform;
    const assetPatterns = patterns[key] || [];

    for (const pattern of assetPatterns) {
      const asset = latestRelease.assets?.find((a) => pattern.test(a.name));
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
      'windows-exe': [/\.exe$/i, /setup.*\.exe$/i, /installer.*\.exe$/i],
      'windows-portable': [/portable.*\.exe$/i],
      'windows-msi': [/\.msi$/i],

      'mac-dmg': [/\.dmg$/i],
      'mac-zip': [/\.zip$/i],

      'linux-appimage': [/\.AppImage$/i],
      'linux-deb': [/\.deb$/i],
      'linux-rpm': [/\.rpm$/i],
    };

    const key = type ? `${platform}-${type}` : platform;
    const assetPatterns = patterns[key] || [];

    for (const pattern of assetPatterns) {
      const asset = latestRelease.assets?.find((a) => pattern.test(a.name));
      if (asset) return formatSize(asset.size);
    }

    return '';
  };

  // Generate a sync token using the edge function
  const generateSyncToken = async () => {
    if (!user) {
      setTokenError('Please sign in to generate a sync token');
      return;
    }

    setIsGeneratingToken(true);
    setTokenError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-sync-token', {
        body: {}, // keep empty unless your edge function actually uses fields
      });

      if (error) throw error;

      if (data?.token) {
        setSyncToken(data.token);

        // refresh device list (this query must match your actual schema)
        const { data: devices, error: devicesErr } = await supabase
          .from('sync_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('last_used_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (devicesErr) throw devicesErr;
        setConnectedDevices((devices || []) as ConnectedDevice[]);
      } else {
        throw new Error(data?.error || 'Failed to generate token');
      }
    } catch (err: any) {
      console.error('Failed to generate sync token:', err);
      setTokenError(err?.message || 'Failed to generate sync token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Revoke a device token
  const revokeDevice = async (tokenRowId: string) => {
    if (!effectiveUserId) return;

    try {
      const { error } = await supabase
        .from('sync_tokens')
        .update({ is_revoked: true })
        .eq('id', tokenRowId)
        .eq('user_id', effectiveUserId);

      if (error) throw error;

      setConnectedDevices((prev) => prev.filter((d) => d.id !== tokenRowId));
    } catch (error) {
      console.error('Failed to revoke device:', error);
    }
  };

  // Save sync settings
  const saveSyncSettings = async () => {
    if (!effectiveUserId) return;

    setIsSavingSettings(true);
    setSettingsSaved(false);

    try {
      const { error } = await supabase
        .from('user_sync_settings')
        .upsert(
          {
            user_id: effectiveUserId,
            sync_interval: syncSettings.syncInterval,
            sync_on_close: syncSettings.syncOnClose,
            sync_on_idle: syncSettings.syncOnIdle,
            auto_sync_enabled: syncSettings.autoSyncEnabled,
            sync_on_startup: syncSettings.syncOnStartup,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

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
          {
            id: 'download',
            label: 'Download',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            ),
          },
          {
            id: 'connect',
            label: 'Connect',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            ),
          },
          {
            id: 'devices',
            label: 'Devices',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            ),
          },
          {
            id: 'settings',
            label: 'Sync Settings',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            ),
          },
        ].map((tab) => (
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
      {/* --- your UI continues exactly as you had it --- */}
      {/* IMPORTANT: keep your existing tab panes here unchanged */}
      {/* I’m leaving the remainder as-is from your file, since this fix is structural. */}
      {/* Paste the rest of your component JSX below this line (unchanged) */}

      {/* Tab Content */}
      {activeTab === 'download' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ... UNCHANGED UI ... */}
          {/* (keep the rest of your original JSX exactly as it was) */}
        </div>
      )}

      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ... UNCHANGED UI ... */}
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {/* ... UNCHANGED UI ... */}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ... UNCHANGED UI ... */}
        </div>
      )}
    </div>
  );
};

export default DesktopCompanion;
