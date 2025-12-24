import React, { useState, useEffect } from 'react';
import { Activity } from '@/types';

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
}

interface DesktopCompanionProps {
  onImportActivities?: (activities: DesktopActivity[]) => void;
  userId?: string;
}

// GitHub repository info - UPDATE THESE TO YOUR ACTUAL REPO
// To configure: Replace 'your-username' and 'your-repo' with your actual GitHub username and repository name
const GITHUB_OWNER = 'AlicePettey';
const GITHUB_REPO = 'timetracker';
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
  const [syncToken, setSyncToken] = useState<string>('');
  const [connectedDevices, setConnectedDevices] = useState<SyncConfig[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'download' | 'connect' | 'devices'>('download');
  const [latestRelease, setLatestRelease] = useState<Release | null>(null);
  const [isLoadingRelease, setIsLoadingRelease] = useState(true);
  const [releaseError, setReleaseError] = useState<string | null>(null);

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

  // Generate a sync token for connecting desktop app
  const generateSyncToken = () => {
    setIsGeneratingToken(true);
    // Generate a secure token
    const token = `tt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
    setSyncToken(token);
    setIsGeneratingToken(false);
    
    // In a real app, this would be saved to the database
    localStorage.setItem('desktopSyncToken', token);
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (err) {
      console.error('Failed to copy token:', err);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Load existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('desktopSyncToken');
    if (savedToken) {
      setSyncToken(savedToken);
    }
  }, []);

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
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
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
          )}
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
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
                      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.18-.264-.12-.135-.27-.2-.47-.2-.085 0-.155.003-.236.006h-.004c-.149.135-.217.135-.347.202-.18.066-.36.135-.48.135-.12 0-.18-.067-.18-.2s.06-.135.12-.135c.06 0 .12 0 .18-.066.06-.066.06-.135.06-.2 0-.066 0-.135-.06-.2-.06-.135-.18-.2-.36-.2-.12 0-.24.066-.36.135-.12.066-.18.135-.24.2-.06.066-.12.135-.12.2-.06.066-.06.135-.06.2 0 .135.06.2.18.2h.24c.06 0 .12.066.12.135s-.06.135-.12.2c-.06.066-.12.135-.18.135-.06 0-.12 0-.18-.066a9.32 9.32 0 01-.18-.2l-.18-.2-.18-.2-.18-.2c-.06-.066-.12-.135-.18-.135s-.12.066-.18.135l-.18.2-.18.2-.18.2-.18.2c-.06.066-.12.135-.18.135s-.12-.066-.18-.135l-.18-.2-.18-.2-.18-.2-.18-.2c-.06-.066-.12-.135-.18-.135s-.12.066-.18.135l-.18.2-.18.2-.18.2-.18.2c-.06.066-.12.135-.18.135s-.12-.066-.18-.135l-.18-.2-.18-.2-.18-.2-.18-.2c-.06-.066-.12-.135-.18-.135s-.12.066-.18.135l-.18.2-.18.2-.18.2-.18.2c-.06.066-.12.135-.18.135h-.24c.12 0 .18-.066.18-.2 0-.066 0-.135-.06-.2 0-.066-.06-.135-.12-.2-.06-.066-.12-.135-.24-.2-.12-.066-.24-.135-.36-.135-.18 0-.3.066-.36.2-.06.066-.06.135-.06.2 0 .066 0 .135.06.2 0 .066.06.135.18.066.06 0 .12 0 .12.135s-.06.135-.18.2c-.12 0-.24-.066-.36-.135-.12-.066-.24-.066-.48-.135-.13-.066-.22-.066-.35-.2v.002c-.18-.6.2-1.004 1.23-1.537.07-.008.14-.04.21-.067a3.288 3.288 0 01.02-1.67c.28-1.185 1.058-2.223 1.65-2.757.11 0 .1.135-.12.335-.54.499-1.737 2.295-1.09 3.966.19-.046.36-.069.52-.064.25-1.365.81-2.49 1.1-3.024.54-.998 1.38-3.056 1.74-4.473z"/>
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

            {/* Notify Me Section - shown when no releases */}
            {!latestRelease && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300">Get Notified</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      We'll let you know when the desktop app is ready for download.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Notify Me
                  </button>
                </div>
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
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">System-Wide Tracking</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Track time across ALL applications - browsers, IDEs, design tools, and more
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Native OS Integration</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Uses native APIs for accurate window detection and idle monitoring
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Automatic Idle Detection</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Detects screen lock, sleep, and user inactivity automatically
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">System Tray</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Runs quietly in the background with quick access from system tray
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Auto-Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically checks for updates and installs them seamlessly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Code Signed</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Signed and notarized for Windows and macOS for your security
                  </p>
                </div>
              </div>
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
                      disabled={isGeneratingToken}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
              {connectedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{device.deviceName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last sync: {device.lastSync ? new Date(device.lastSync).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {device.pendingCount > 0 && (
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                        {device.pendingCount} pending
                      </span>
                    )}
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
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
    </div>
  );
};

export default DesktopCompanion;
