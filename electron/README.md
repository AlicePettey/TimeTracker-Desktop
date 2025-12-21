# TimeTracker Desktop Companion

System-wide activity tracking application for Windows, macOS, and Linux. Tracks time across all applications with automatic idle detection and cloud sync to the TimeTracker web app.

## Features

- **System-Wide Tracking**: Monitor active windows across all applications
- **Automatic Idle Detection**: Detect when you're away from the computer
- **Cloud Sync**: Sync activities to the TimeTracker web app
- **System Tray**: Runs quietly in the background
- **Auto-Start**: Optionally start on system boot
- **Power Events**: Handle sleep, wake, lock, and unlock events
- **Auto-Updates**: Automatically check and install updates from GitHub Releases

## Installation

### Download Pre-built Installers

Download the latest release for your platform from [GitHub Releases](https://github.com/timetracker/timetracker-desktop/releases):

| Platform | Download | Notes |
|----------|----------|-------|
| Windows | `.exe` installer | Recommended for most users |
| Windows | Portable `.exe` | No installation required |
| macOS | `.dmg` installer | Universal (Intel + Apple Silicon) |
| Linux | `.AppImage` | Portable, works on most distros |
| Linux | `.deb` | For Debian/Ubuntu |
| Linux | `.rpm` | For Fedora/RHEL |

### Build from Source

```bash
# Clone the repository
git clone https://github.com/timetracker/timetracker-desktop.git
cd timetracker-desktop/electron

# Install dependencies
npm install

# Run in development mode
npm start

# Build for your platform
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Configuration

### Sync Setup

1. Open the TimeTracker web app
2. Go to **Desktop App** → **Connect** tab
3. Generate a sync token
4. Copy the web app URL and token
5. In the desktop app, go to **Sync** settings
6. Paste the URL and token
7. Enable sync

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Idle Threshold | Seconds of inactivity before marking as idle | 300 (5 min) |
| Min Activity Duration | Minimum seconds to log an activity | 10 |
| Start on Boot | Launch app when system starts | Enabled |
| Minimize to Tray | Hide to tray instead of closing | Enabled |
| Auto Update | Automatically check for updates | Enabled |

## Auto-Updates

The desktop app automatically checks for updates from GitHub Releases:

- Checks on startup and every 4 hours
- Notifies when an update is available
- Downloads in the background
- Installs on next restart

### Manual Update Check

- Click the tray icon → "Check for Updates"
- Or go to Settings → Updates → "Check Now"

## Development

### Project Structure

```
electron/
├── main.js           # Main process
├── preload.js        # Preload script (IPC bridge)
├── tracker.js        # Activity tracking module
├── updater.js        # Auto-update module
├── package.json      # Dependencies and build config
├── assets/           # Icons and images
└── renderer/         # UI files
    ├── index.html
    └── app.js
```

### Building for Release

The GitHub Actions workflow automatically builds and publishes releases:

1. Create a new tag: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. GitHub Actions will:
   - Build for Windows, macOS, and Linux
   - Sign the executables (if certificates are configured)
   - Create a GitHub Release
   - Upload all installers

### Code Signing

#### Windows

Set these secrets in GitHub:
- `WINDOWS_CERTIFICATE`: Base64-encoded .pfx certificate
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

#### macOS

Set these secrets in GitHub:
- `MACOS_CERTIFICATE`: Base64-encoded .p12 certificate
- `MACOS_CERTIFICATE_PASSWORD`: Certificate password
- `MACOS_KEYCHAIN_PASSWORD`: Temporary keychain password
- `APPLE_ID`: Apple Developer ID email
- `APPLE_ID_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

### Environment Variables

For local development with code signing:

```bash
# Windows
export CSC_LINK=/path/to/certificate.pfx
export CSC_KEY_PASSWORD=your_password

# macOS
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=XXXXXXXXXX
```

## Troubleshooting

### Windows

**App won't start**
- Make sure you have the latest Visual C++ Redistributable installed
- Try running as Administrator

**Tracking not working**
- Some apps may require the tracker to run as Administrator
- Check Windows Security settings for any blocks

### macOS

**"App is damaged" error**
- Right-click the app and select "Open"
- Or run: `xattr -cr /Applications/TimeTracker\ Desktop.app`

**Screen recording permission**
- Go to System Preferences → Security & Privacy → Privacy → Screen Recording
- Add TimeTracker Desktop to the list

**Accessibility permission**
- Go to System Preferences → Security & Privacy → Privacy → Accessibility
- Add TimeTracker Desktop to the list

### Linux

**AppImage won't run**
- Make it executable: `chmod +x TimeTracker-*.AppImage`
- Install FUSE: `sudo apt install fuse libfuse2`

**Tracking not working**
- Some window managers may not report window titles
- Try running with `--enable-logging` flag

## Privacy

- All data is stored locally first
- You control what gets synced to the cloud
- No data is sent without your explicit configuration
- Activity data includes:
  - Application name
  - Window title
  - Start/end times
  - Duration

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/timetracker/timetracker-desktop/issues)
- [Documentation](https://docs.timetracker.app)
- [Discord Community](https://discord.gg/timetracker)
