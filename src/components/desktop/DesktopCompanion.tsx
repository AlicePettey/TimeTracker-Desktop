import React, { useEffect, useMemo, useState } from 'react';
import { Activity } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DesktopActivity extends Activity {
  source: 'desktop' | 'browser';
  processPath?: string;
}

/**
 * Your schema may vary slightly. These are treated as optional to prevent runtime crashes.
 * This supports either:
 * - minimal token rows
 * - device-aware token rows
 */
interface ConnectedDevice {
  id: string;
  user_id?: string;

  device_id?: string | null;
  device_name?: string | null;
  platform?: 'win32' | 'darwin' | 'linux' | null;

  created_at?: string | null;
  last_seen_at?: string | null;
  is_revoked?: boolean | null;
}

type SyncSettingsState = {
  syncInterval: number;
  syncOnClose: boolean;
  syncOnIdle: boolean;
  autoSyncEnabled: boolean;
  syncOnStartup: boolean;
};

type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  published_at: string;
  assets: GithubReleaseAsset[];
};

const DEFAULT_SETTINGS: SyncSettingsState = {
  syncInterval: 5,
  syncOnClose: true,
  syncOnIdle: true,
  autoSyncEnabled: true,
  syncOnStartup: true,
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function pickAsset(assets: GithubReleaseAsset[], matcher: (name: string) => boolean) {
  return assets.find((a) => matcher(a.name))?.browser_download_url || '';
}

function detectPlatformFromName(name: string) {
  const n = name.toLowerCase();
  if (n.includes('win') || n.endsWith('.exe')) return 'Windows';
  if (n.includes('mac') || n.includes('darwin') || n.endsWith('.dmg') || n.endsWith('.pkg')) return 'macOS';
  if (n.includes('linux') || n.endsWith('.appimage') || n.endsWith('.deb') || n.endsWith('.rpm')) return 'Linux';
  return 'Other';
}

const DesktopCompanion: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'download' | 'token' | 'devices' | 'settings'>('overview');

  // token generation UI
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string>('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [tokenSuccess, setTokenSuccess] = useState<boolean>(false);

  // devices UI
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState<string>('');

  // settings UI
  const [syncSettings, setSyncSettings] = useState<SyncSettingsState>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // release / downloads UI
  const [latestRelease, setLatestRelease] = useState<GithubRelease | null>(null);
  const [releaseError, setReleaseError] = useState<string>('');
  const [isLoadingRelease, setIsLoadingRelease] = useState(false);

  const effectiveUserId = user?.id || '';

  // -----------------------------
  // Fetch: Sync settings
  // -----------------------------
  useEffect(() => {
    if (!effectiveUserId) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_sync_settings')
        .select('*')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (error) {
        // Don’t hard fail the UI for settings load
        console.warn('Failed to load sync settings:', error);
        return;
      }

      if (data) {
        setSyncSettings({
          syncInterval: typeof data.sync_interval === 'number' ? data.sync_interval : DEFAULT_SETTINGS.syncInterval,
          syncOnClose: !!data.sync_on_close,
          syncOnIdle: !!data.sync_on_idle,
          autoSyncEnabled: !!data.auto_sync_enabled,
          syncOnStartup: !!data.sync_on_startup,
        });
      }
    };

    fetchSettings();
  }, [effectiveUserId]);

  // -----------------------------
  // Fetch: Connected devices (sync_tokens)
  // -----------------------------
  const fetchDevices = async () => {
    if (!effectiveUserId) return;

    setIsLoadingDevices(true);
    setDevicesError('');

    try {
      const { data, error } = await supabase
        .from('sync_tokens')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as ConnectedDevice[];
      const notRevoked = rows.filter((d) => !d.is_revoked);
      setConnectedDevices(notRevoked);
    } catch (e: any) {
      console.error('Failed to load devices:', e);
      setDevicesError(e?.message || 'Failed to load connected devices.');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (!effectiveUserId) return;
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId]);

  // -----------------------------
  // Fetch: Latest GitHub release (optional)
  // -----------------------------
  useEffect(() => {
    const owner = import.meta.env.VITE_DESKTOP_RELEASE_OWNER as string | undefined;
    const repo = import.meta.env.VITE_DESKTOP_RELEASE_REPO as string | undefined;

    // If you haven’t set these env vars, we simply won’t show “latest release”
    if (!owner || !repo) return;

    const fetchRelease = async () => {
      setIsLoadingRelease(true);
      setReleaseError('');

      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        if (!res.ok) throw new Error(`GitHub API error: HTTP ${res.status}`);
        const json = (await res.json()) as GithubRelease;
        setLatestRelease(json);
      } catch (e: any) {
        console.warn('Release fetch failed:', e);
        setReleaseError(e?.message || 'Failed to fetch latest release.');
      } finally {
        setIsLoadingRelease(false);
      }
    };

    fetchRelease();
  }, []);

  const downloadLinks = useMemo(() => {
    if (!latestRelease?.assets?.length) {
      return {
        windows: '',
        mac: '',
        linux: '',
        other: [] as GithubReleaseAsset[],
      };
    }

    const assets = latestRelease.assets;

    const windows = pickAsset(assets, (n) => n.toLowerCase().endsWith('.exe') || n.toLowerCase().includes('win'));
    const mac = pickAsset(assets, (n) => n.toLowerCase().endsWith('.dmg') || n.toLowerCase().endsWith('.pkg') || n.toLowerCase().includes('mac'));
    const linux = pickAsset(
      assets,
      (n) =>
        n.toLowerCase().endsWith('.appimage') ||
        n.toLowerCase().endsWith('.deb') ||
        n.toLowerCase().endsWith('.rpm') ||
        n.toLowerCase().includes('linux')
    );

    const other = assets.filter((a) => ![windows, mac, linux].includes(a.browser_download_url));

    return { windows, mac, linux, other };
  }, [latestRelease]);

  // -----------------------------
  // Actions: Generate token (Edge Function)
  // -----------------------------
  const generateToken = async () => {
    if (!effectiveUserId) return;

    setIsGeneratingToken(true);
    setTokenError('');
    setTokenSuccess(false);

    try {
      // Calls your edge function: functions/generate-sync-token
      // verify_jwt = true, so user must be signed in (your web app is)
      const { data, error } = await supabase.functions.invoke('generate-sync-token', {
        body: {
          device_name: navigator?.platform || 'Desktop',
          platform: navigator?.userAgent || 'unknown',
          requested_at: new Date().toISOString(),
        },
      });

      if (error) throw error;

      const token = (data as any)?.token as string | undefined;
      const expires_at = (data as any)?.expires_at as string | undefined;

      if (!token) {
        throw new Error('Token function did not return a token.');
      }

      setGeneratedToken(token);
      setTokenExpiresAt(expires_at || '');
      setTokenSuccess(true);

      // refresh devices list (new token row usually appears here)
      await fetchDevices();

      setTimeout(() => setTokenSuccess(false), 2500);
    } catch (e: any) {
      console.error('Generate token failed:', e);
      setTokenError(e?.message || 'Failed to generate a sync token.');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const copyToken = async () => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      setTokenSuccess(true);
      setTimeout(() => setTokenSuccess(false), 1500);
    } catch {
      // fallback: do nothing, user can manually copy
    }
  };

  // -----------------------------
  // Actions: Revoke device token row
  // -----------------------------
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

  // -----------------------------
  // Actions: Save sync settings
  // -----------------------------
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

  const version = latestRelease?.tag_name?.replace(/^v/i, '') || '1.0.0';
  const releaseDate = latestRelease?.published_at
    ? new Date(latestRelease.published_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  // If user isn't signed in, token/devices/settings should prompt.
  const signedIn = !!effectiveUserId;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl p-8 text-white relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
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
              <p className="text-white/80">System-wide activity tracking for Windows, macOS, and Linux</p>
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'download', label: 'Download' },
          { key: 'token', label: 'Generate Token' },
          { key: 'devices', label: 'Connected Devices' },
          { key: 'settings', label: 'Sync Settings' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-medium border transition',
              activeTab === t.key ? 'bg-black text-white border-black' : 'bg-white border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              The Desktop Companion runs in the background and records system-wide activity, even when your browser is
              closed. Activities can be synced securely to your account using a one-time generated sync token.
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>Install the desktop app for your operating system.</li>
              <li>Generate a sync token from this page (requires sign-in).</li>
              <li>Paste the token into the desktop app settings to authorize syncing.</li>
              <li>Activities upload through your Supabase Edge Function (desktop-sync).</li>
            </ul>

            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-900">Security model</div>
              <p className="text-sm text-gray-700 mt-1">
                Desktop devices do not use your Supabase user session. They authenticate using a device token that your
                account issues and can revoke at any time.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'download' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Download Desktop App</h2>
              <p className="text-gray-600 text-sm">
                Latest release: <span className="font-medium">{version}</span> {releaseDate !== '—' ? `(${releaseDate})` : ''}
              </p>
              {!latestRelease && (
                <p className="text-xs text-gray-500 mt-1">
                  If you don’t see downloads here, set <code className="px-1 py-0.5 bg-gray-100 rounded">VITE_DESKTOP_RELEASE_OWNER</code> and{' '}
                  <code className="px-1 py-0.5 bg-gray-100 rounded">VITE_DESKTOP_RELEASE_REPO</code> in your web app env.
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {isLoadingRelease && <span>Checking for latest release…</span>}
              {releaseError && <span className="text-red-600">{releaseError}</span>}
            </div>
          </div>

          {latestRelease?.assets?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={downloadLinks.windows || '#'}
                target="_blank"
                rel="noreferrer"
                className={[
                  'rounded-2xl border p-5 transition',
                  downloadLinks.windows ? 'hover:bg-gray-50 border-gray-200' : 'opacity-50 cursor-not-allowed border-gray-100',
                ].join(' ')}
                onClick={(e) => {
                  if (!downloadLinks.windows) e.preventDefault();
                }}
              >
                <div className="font-semibold">Windows</div>
                <div className="text-sm text-gray-600 mt-1">Download .exe installer</div>
              </a>

              <a
                href={downloadLinks.mac || '#'}
                target="_blank"
                rel="noreferrer"
                className={[
                  'rounded-2xl border p-5 transition',
                  downloadLinks.mac ? 'hover:bg-gray-50 border-gray-200' : 'opacity-50 cursor-not-allowed border-gray-100',
                ].join(' ')}
                onClick={(e) => {
                  if (!downloadLinks.mac) e.preventDefault();
                }}
              >
                <div className="font-semibold">macOS</div>
                <div className="text-sm text-gray-600 mt-1">Download .dmg or .pkg</div>
              </a>

              <a
                href={downloadLinks.linux || '#'}
                target="_blank"
                rel="noreferrer"
                className={[
                  'rounded-2xl border p-5 transition',
                  downloadLinks.linux ? 'hover:bg-gray-50 border-gray-200' : 'opacity-50 cursor-not-allowed border-gray-100',
                ].join(' ')}
                onClick={(e) => {
                  if (!downloadLinks.linux) e.preventDefault();
                }}
              >
                <div className="font-semibold">Linux</div>
                <div className="text-sm text-gray-600 mt-1">AppImage / .deb / .rpm</div>
              </a>
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
              No release assets found yet. If your desktop binaries are attached to GitHub Releases, set the env vars noted above.
            </div>
          )}

          {latestRelease?.assets?.length ? (
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="font-semibold mb-2">All release assets</div>
              <div className="space-y-2">
                {latestRelease.assets.map((a) => (
                  <a
                    key={a.browser_download_url}
                    href={a.browser_download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-gray-50 border border-gray-100"
                  >
                    <div className="text-sm font-medium text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-500">{detectPlatformFromName(a.name)}</div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">Next step</div>
            <p className="text-sm text-gray-700 mt-1">
              After installing, go to <span className="font-medium">Generate Token</span> and create a sync token for your device.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'token' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Generate a Desktop Sync Token</h2>

          {!signedIn && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
              Please sign in to generate a token.
            </div>
          )}

          {signedIn && (
            <>
              <p className="text-gray-700">
                This token authorizes your desktop app to sync. You can revoke it anytime in <span className="font-medium">Connected Devices</span>.
              </p>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={generateToken}
                  disabled={isGeneratingToken}
                  className={[
                    'px-4 py-2 rounded-xl font-medium text-sm transition',
                    isGeneratingToken ? 'bg-gray-300 text-gray-700' : 'bg-black text-white hover:bg-gray-900',
                  ].join(' ')}
                >
                  {isGeneratingToken ? 'Generating…' : 'Generate Token'}
                </button>

                {generatedToken && (
                  <button
                    onClick={copyToken}
                    className="px-4 py-2 rounded-xl font-medium text-sm border border-gray-200 hover:bg-gray-50"
                  >
                    Copy Token
                  </button>
                )}
              </div>

              {tokenError && <div className="text-sm text-red-600">{tokenError}</div>}

              {generatedToken && (
                <div className="rounded-2xl border border-gray-200 p-5 space-y-2">
                  <div className="text-sm font-semibold">Your token</div>
                  <div className="font-mono text-xs break-all bg-gray-50 border border-gray-200 rounded-xl p-3">
                    {generatedToken}
                  </div>
                  <div className="text-xs text-gray-600">
                    {tokenExpiresAt ? `Expires: ${formatDate(tokenExpiresAt)}` : 'Expiry not provided by function.'}
                  </div>
                  {tokenSuccess && <div className="text-xs text-green-600">Copied / generated successfully.</div>}
                </div>
              )}

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                Paste this token into the desktop app settings under <span className="font-medium">Sync Token</span>.
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold">Connected Devices</h2>
              <p className="text-sm text-gray-600">Revoke access for any desktop device token.</p>
            </div>

            <button
              onClick={fetchDevices}
              className="px-4 py-2 rounded-xl font-medium text-sm border border-gray-200 hover:bg-gray-50"
              disabled={!signedIn || isLoadingDevices}
            >
              {isLoadingDevices ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {!signedIn && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
              Please sign in to view connected devices.
            </div>
          )}

          {devicesError && <div className="text-sm text-red-600">{devicesError}</div>}

          {signedIn && (
            <>
              {connectedDevices.length === 0 ? (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                  No connected devices yet. Generate a token to connect a desktop app.
                </div>
              ) : (
                <div className="space-y-3">
                  {connectedDevices.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-gray-200 p-5 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {d.device_name || 'Desktop Device'}{' '}
                          {d.platform ? <span className="text-xs text-gray-500">({d.platform})</span> : null}
                        </div>
                        <div className="text-xs text-gray-600">
                          Device ID: <span className="font-mono">{d.device_id || '—'}</span>
                        </div>
                        <div className="text-xs text-gray-600">Created: {formatDate(d.created_at)}</div>
                        <div className="text-xs text-gray-600">Last seen: {formatDate(d.last_seen_at)}</div>
                      </div>

                      <button
                        onClick={() => revokeDevice(d.id)}
                        className="px-3 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Sync Settings</h2>

          {!signedIn && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-900">
              Please sign in to manage sync settings.
            </div>
          )}

          {signedIn && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="rounded-2xl border border-gray-200 p-4 space-y-2">
                  <div className="font-medium text-sm">Sync interval (minutes)</div>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={syncSettings.syncInterval}
                    onChange={(e) =>
                      setSyncSettings((s) => ({
                        ...s,
                        syncInterval: Math.max(1, Math.min(120, Number(e.target.value || 5))),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200"
                  />
                  <div className="text-xs text-gray-500">Controls how often the desktop app auto-syncs.</div>
                </label>

                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  {[
                    { key: 'autoSyncEnabled', label: 'Auto sync enabled' },
                    { key: 'syncOnStartup', label: 'Sync on startup' },
                    { key: 'syncOnClose', label: 'Sync on close' },
                    { key: 'syncOnIdle', label: 'Sync on idle' },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={(syncSettings as any)[opt.key]}
                        onChange={(e) => setSyncSettings((s) => ({ ...s, [opt.key]: e.target.checked } as any))}
                        className="h-4 w-4"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={saveSyncSettings}
                  disabled={isSavingSettings}
                  className={[
                    'px-4 py-2 rounded-xl font-medium text-sm transition',
                    isSavingSettings ? 'bg-gray-300 text-gray-700' : 'bg-black text-white hover:bg-gray-900',
                  ].join(' ')}
                >
                  {isSavingSettings ? 'Saving…' : 'Save settings'}
                </button>

                {settingsSaved && <span className="text-sm text-green-600">Saved.</span>}
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                These settings are stored in <span className="font-mono">user_sync_settings</span> and used by your desktop
                app to determine auto-sync behavior.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DesktopCompanion;