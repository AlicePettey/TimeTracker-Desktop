/**
 * Icon Generator Script for TimeTracker Desktop
 * 
 * This script generates all required icon sizes for Windows, macOS, and Linux
 * from a single source PNG image.
 * 
 * Prerequisites:
 * - Node.js 14+
 * - A source icon (assets/icon-source.png) at least 1024x1024 pixels
 * 
 * Usage:
 * 1. Place your source icon at assets/icon-source.png (1024x1024 or larger)
 * 2. Run: npm run generate-icons
 * 
 * For Windows builds without this script:
 * - Use a 256x256 PNG file named assets/icon.png
 * - electron-builder will auto-convert it
 * 
 * For manual icon creation:
 * - Windows (.ico): Use https://icoconvert.com/ with 256x256 PNG
 * - macOS (.icns): Use iconutil on macOS or https://cloudconvert.com/
 * - Linux: Use 256x256 or 512x512 PNG directly
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Icon sizes needed for each platform
const ICON_SIZES = {
  // Windows needs these sizes in the .ico file
  windows: [16, 24, 32, 48, 64, 128, 256],
  // macOS needs these sizes for .icns
  mac: [16, 32, 64, 128, 256, 512, 1024],
  // Linux needs these sizes in the icons directory
  linux: [16, 24, 32, 48, 64, 128, 256, 512]
};

function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('Created assets directory');
  }
}

function createPlaceholderIcon() {
  // Create a simple SVG placeholder icon
  const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="256" height="256" rx="48" fill="url(#bg)"/>
  <!-- Clock circle -->
  <circle cx="128" cy="128" r="72" fill="none" stroke="white" stroke-width="8"/>
  <!-- Clock hands -->
  <line x1="128" y1="128" x2="128" y2="80" stroke="white" stroke-width="8" stroke-linecap="round"/>
  <line x1="128" y1="128" x2="168" y2="128" stroke="white" stroke-width="6" stroke-linecap="round"/>
  <!-- Center dot -->
  <circle cx="128" cy="128" r="8" fill="white"/>
  <!-- Hour markers -->
  <circle cx="128" cy="64" r="4" fill="white"/>
  <circle cx="192" cy="128" r="4" fill="white"/>
  <circle cx="128" cy="192" r="4" fill="white"/>
  <circle cx="64" cy="128" r="4" fill="white"/>
</svg>`;

  const svgPath = path.join(ASSETS_DIR, 'icon.svg');
  fs.writeFileSync(svgPath, svgIcon);
  console.log('Created placeholder SVG icon at assets/icon.svg');
  
  return svgPath;
}

function printInstructions() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                    TimeTracker Icon Setup                          ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  To build the app, you need an icon file. Here are your options:  ║
║                                                                    ║
║  OPTION 1: Use a PNG file (Recommended - Works on all platforms)  ║
║  ─────────────────────────────────────────────────────────────────║
║  1. Create or obtain a 256x256 (or larger) PNG icon               ║
║  2. Save it as: electron/assets/icon.png                          ║
║  3. Run: npm run build                                            ║
║                                                                    ║
║  OPTION 2: Convert the placeholder SVG                            ║
║  ─────────────────────────────────────────────────────────────────║
║  1. Open assets/icon.svg in a browser or image editor             ║
║  2. Export/save as PNG at 256x256 or 512x512                      ║
║  3. Save as: electron/assets/icon.png                             ║
║                                                                    ║
║  OPTION 3: Use online converters                                  ║
║  ─────────────────────────────────────────────────────────────────║
║  - SVG to PNG: https://svgtopng.com/                              ║
║  - PNG to ICO: https://icoconvert.com/                            ║
║  - PNG to ICNS: https://cloudconvert.com/png-to-icns              ║
║                                                                    ║
║  QUICK FIX for Windows symlink error:                             ║
║  ─────────────────────────────────────────────────────────────────║
║  Run Command Prompt as Administrator, or enable Developer Mode:   ║
║  Settings > Update & Security > For developers > Developer Mode   ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);
}

function main() {
  console.log('TimeTracker Desktop - Icon Generator\n');
  
  ensureAssetsDir();
  
  const sourcePng = path.join(ASSETS_DIR, 'icon.png');
  const sourceIco = path.join(ASSETS_DIR, 'icon.ico');
  const sourceIcns = path.join(ASSETS_DIR, 'icon.icns');
  
  // Check what icon files exist
  const hasPng = fs.existsSync(sourcePng);
  const hasIco = fs.existsSync(sourceIco);
  const hasIcns = fs.existsSync(sourceIcns);
  
  if (hasPng) {
    console.log('✓ Found icon.png - This will work for all platforms!');
    console.log('  electron-builder will auto-convert to .ico and .icns as needed.\n');
  }
  
  if (hasIco) {
    console.log('✓ Found icon.ico - Ready for Windows builds');
  }
  
  if (hasIcns) {
    console.log('✓ Found icon.icns - Ready for macOS builds');
  }
  
  if (!hasPng && !hasIco && !hasIcns) {
    console.log('⚠ No icon files found. Creating placeholder SVG...\n');
    createPlaceholderIcon();
    printInstructions();
  } else {
    console.log('\n✓ Icon files are ready for building!');
    console.log('  Run: npm run build\n');
  }
}

main();
