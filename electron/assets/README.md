# TimeTracker Desktop Assets

## App Icon Setup

Before building the app, you need to add an icon file.

### Quick Setup

1. Download this icon and save it as `icon.png` in this folder:
   
   **Download URL:** https://d64gsuwffb70l.cloudfront.net/694333e3290d8cee066af0cd_1766664133902_06a4a453.png

2. Or convert the included `icon.svg` to PNG using:
   - https://svgtopng.com/
   - https://cloudconvert.com/svg-to-png

### Required Files

For cross-platform builds, you only need ONE of these:

| File | Platform | Notes |
|------|----------|-------|
| `icon.png` | All | Recommended - auto-converts to other formats |
| `icon.ico` | Windows | Optional - 256x256 multi-size ICO |
| `icon.icns` | macOS | Optional - Apple icon format |

### Icon Specifications

- **Minimum size:** 256x256 pixels
- **Recommended size:** 512x512 pixels
- **Format:** PNG with transparency
- **Style:** Square with rounded corners (the OS will apply masking)

### Converting Icons

**PNG to ICO (Windows):**
- https://icoconvert.com/
- Select sizes: 16, 32, 48, 256

**PNG to ICNS (macOS):**
- https://cloudconvert.com/png-to-icns
- Or use `iconutil` on macOS

### Included Files

- `icon.svg` - Vector source icon (convert to PNG for builds)
- `README.md` - This file
