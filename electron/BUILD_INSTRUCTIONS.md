# TimeTracker Desktop - Build Instructions

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

## Quick Start

```bash
cd electron
npm install
npm run build
```

## Icon Setup (Required Before Building)

The app requires an icon file to build successfully. You have several options:

### Option 1: Convert the SVG (Recommended)

1. Open `assets/icon.svg` in a browser
2. Take a screenshot or use an online converter:
   - https://svgtopng.com/
   - https://cloudconvert.com/svg-to-png
3. Save as `assets/icon.png` (256x256 or 512x512)

### Option 2: Use Your Own Icon

1. Create a PNG icon at least 256x256 pixels (512x512 recommended)
2. Save it as `assets/icon.png`

### Option 3: Platform-Specific Icons

For best results on each platform:

- **Windows**: `assets/icon.ico` (256x256, use https://icoconvert.com/)
- **macOS**: `assets/icon.icns` (use iconutil or https://cloudconvert.com/png-to-icns)
- **Linux**: `assets/icon.png` (256x256 or 512x512)

## Build Commands

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows (.exe installer + portable)
npm run build:mac    # macOS (.dmg + .zip)
npm run build:linux  # Linux (.AppImage + .deb)

# Build for all platforms (requires macOS for .dmg)
npm run build:all
```

## Troubleshooting

### Windows: "Cannot create symbolic link" Error

This error occurs when electron-builder tries to extract winCodeSign files that contain macOS symlinks.

**Solution 1: Clear Cache and Rebuild (Recommended)**

The `package.json` has been configured to skip code signing (`signAndEditExecutable: false`), but you may need to clear the corrupted cache first:

```powershell
# Delete the electron-builder cache
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache"

# Or using cmd
rmdir /s /q %LOCALAPPDATA%\electron-builder\Cache

# Then rebuild
npm run build
```

**Solution 2: Enable Developer Mode**

If you want to enable code signing later:

1. Open Windows Settings
2. Go to "System" > "For developers" (Windows 11) or "Update & Security" > "For developers" (Windows 10)
3. Enable "Developer Mode"
4. Restart your terminal and try again

**Solution 3: Run as Administrator**

1. Right-click on Command Prompt or PowerShell
2. Select "Run as administrator"
3. Navigate to the electron folder and run `npm run build`

**Note:** The current configuration disables code signing for development builds. For production releases that require code signing, you'll need either Developer Mode enabled or to run as Administrator.


### Linux: "EOF" or ICNS Conversion Error

This happens when building Linux from Windows or when icon files are missing/corrupted.

**Solution:**
1. Ensure you have `assets/icon.png` (not just .ico or .icns)
2. The PNG should be at least 256x256 pixels
3. Clear the cache and rebuild:
```bash
rm -rf ~/.cache/electron-builder
npm run build:linux
```

### macOS: Code Signing Errors

For local development without signing:
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:mac
```

For distribution, you'll need an Apple Developer certificate.

### Native Module Errors (active-win)

If you get errors about `active-win`:

```bash
# Rebuild native modules
npm run postinstall

# Or manually rebuild
./node_modules/.bin/electron-rebuild
```

### General Build Failures

1. Clear all caches:
```bash
# Windows
rmdir /s /q node_modules
rmdir /s /q dist
del package-lock.json
npm install
npm run build

# macOS/Linux
rm -rf node_modules dist package-lock.json
npm install
npm run build
```

2. Check Node.js version:
```bash
node --version  # Should be 18+
npm --version   # Should be 9+
```

## Output Files

After a successful build, find your installers in the `dist` folder:

### Windows
- `TimeTracker Desktop-1.0.0-win-x64.exe` - NSIS installer
- `TimeTracker Desktop-1.0.0-win-x64-portable.exe` - Portable version

### macOS
- `TimeTracker Desktop-1.0.0-mac-universal.dmg` - Disk image
- `TimeTracker Desktop-1.0.0-mac-universal.zip` - Zipped app

### Linux
- `TimeTracker Desktop-1.0.0-x64.AppImage` - Universal Linux app
- `timetracker-desktop_1.0.0_amd64.deb` - Debian/Ubuntu package

## Development

```bash
# Run in development mode with logging
npm run dev

# Run normally
npm start
```

## Auto-Update Configuration

The app is configured to auto-update from GitHub Releases. To enable:

1. Create a GitHub repository
2. Update `package.json` with your repo details:
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "timetracker-desktop"
}
```
3. Create a GitHub personal access token with `repo` scope
4. Set the `GH_TOKEN` environment variable
5. Run `npm run release` to build and publish

## Support

For issues, please check:
1. This troubleshooting guide
2. electron-builder documentation: https://www.electron.build/
3. Create an issue in the repository
