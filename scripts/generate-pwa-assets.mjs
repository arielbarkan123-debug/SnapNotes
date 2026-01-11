#!/usr/bin/env node
/**
 * Generate PWA assets from icon.svg
 * Run with: node scripts/generate-pwa-assets.mjs
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const screenshotsDir = path.join(publicDir, 'screenshots');

// Read the SVG file
const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = await fs.readFile(svgPath);

console.log('Generating PWA assets...\n');

// Generate icon-192.png
console.log('Creating icon-192.png (192x192)...');
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.join(publicDir, 'icon-192.png'));

// Generate icon-512.png
console.log('Creating icon-512.png (512x512)...');
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(publicDir, 'icon-512.png'));

// Generate maskable icon (512x512 with safe zone padding)
// Safe zone is inner 80%, so we need to add 10% padding on each side
// The icon content should be within the inner 80% circle
console.log('Creating icon-maskable.png (512x512 with safe zone)...');
const maskableSize = 512;
const safeZone = Math.floor(maskableSize * 0.8); // 409px for the icon
const padding = Math.floor((maskableSize - safeZone) / 2); // ~51px padding

// Create the icon at safe zone size
const iconForMaskable = await sharp(svgBuffer)
  .resize(safeZone, safeZone)
  .toBuffer();

// Create maskable with gradient background and centered icon
await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: { r: 79, g: 70, b: 229, alpha: 1 } // #4F46E5
  }
})
  .composite([
    {
      input: iconForMaskable,
      top: padding,
      left: padding
    }
  ])
  .png()
  .toFile(path.join(publicDir, 'icon-maskable.png'));

// Generate apple-touch-icon.png (180x180)
console.log('Creating apple-touch-icon.png (180x180)...');
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.join(publicDir, 'apple-touch-icon.png'));

// Generate favicon.ico (multi-size ICO is complex, use 32x32 PNG as favicon)
// Modern browsers support PNG favicons
console.log('Creating favicon.ico (32x32)...');
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(path.join(publicDir, 'favicon.ico'));

// Generate OG Image (1200x630)
console.log('Creating og-image.png (1200x630)...');
const ogWidth = 1200;
const ogHeight = 630;

// Create SVG for the OG image
const ogSvg = `
<svg width="${ogWidth}" height="${ogHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${ogWidth}" height="${ogHeight}" fill="url(#bgGradient)"/>

  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="200" fill="rgba(255,255,255,0.05)"/>
  <circle cx="1100" cy="530" r="300" fill="rgba(255,255,255,0.05)"/>

  <!-- Book icon (simplified from icon.svg) -->
  <g transform="translate(150, 165) scale(0.6)">
    <rect width="512" height="512" rx="96" fill="rgba(255,255,255,0.15)"/>
    <path
      d="M256 144v224M256 144c-28 16-56 32-96 32s-64-16-96-32v224c32 16 56 32 96 32s68-16 96-32M256 144c28 16 56 32 96 32s64-16 96-32v224c-32 16-56 32-96 32s-68-16-96-32"
      stroke="white"
      stroke-width="32"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
  </g>

  <!-- App name -->
  <text x="520" y="280" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="96" font-weight="700" fill="white">NoteSnap</text>

  <!-- Tagline -->
  <text x="520" y="380" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="400" fill="rgba(255,255,255,0.9)">Turn Your Notes Into Study Courses</text>

  <!-- Subtitle -->
  <text x="520" y="440" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.7)">AI-powered learning from handwritten notes</text>
</svg>
`;

await sharp(Buffer.from(ogSvg))
  .png()
  .toFile(path.join(publicDir, 'og-image.png'));

// Create screenshots directory if it doesn't exist
await fs.mkdir(screenshotsDir, { recursive: true });

// Generate a placeholder dashboard screenshot (1080x1920 for mobile)
console.log('Creating screenshots/dashboard.png (1080x1920)...');
const dashboardSvg = `
<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5"/>
      <stop offset="100%" style="stop-color:#7C3AED"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="#F9FAFB"/>

  <!-- Header -->
  <rect width="1080" height="200" fill="url(#headerGrad)"/>

  <!-- App title in header -->
  <text x="60" y="130" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="white">NoteSnap</text>

  <!-- Dashboard content area -->
  <rect x="40" y="240" width="1000" height="200" rx="24" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"/>
  <text x="80" y="320" font-family="system-ui, sans-serif" font-size="32" font-weight="600" fill="#1F2937">My Courses</text>
  <text x="80" y="380" font-family="system-ui, sans-serif" font-size="24" fill="#6B7280">3 active courses</text>

  <!-- Course card 1 -->
  <rect x="40" y="480" width="1000" height="180" rx="24" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"/>
  <rect x="60" y="500" width="140" height="140" rx="16" fill="#E0E7FF"/>
  <text x="220" y="560" font-family="system-ui, sans-serif" font-size="28" font-weight="600" fill="#1F2937">Biology Notes</text>
  <text x="220" y="610" font-family="system-ui, sans-serif" font-size="22" fill="#6B7280">12 lessons completed</text>

  <!-- Course card 2 -->
  <rect x="40" y="700" width="1000" height="180" rx="24" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"/>
  <rect x="60" y="720" width="140" height="140" rx="16" fill="#FEE2E2"/>
  <text x="220" y="780" font-family="system-ui, sans-serif" font-size="28" font-weight="600" fill="#1F2937">Math Formulas</text>
  <text x="220" y="830" font-family="system-ui, sans-serif" font-size="22" fill="#6B7280">8 lessons completed</text>

  <!-- Course card 3 -->
  <rect x="40" y="920" width="1000" height="180" rx="24" fill="white" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"/>
  <rect x="60" y="940" width="140" height="140" rx="16" fill="#D1FAE5"/>
  <text x="220" y="1000" font-family="system-ui, sans-serif" font-size="28" font-weight="600" fill="#1F2937">History Timeline</text>
  <text x="220" y="1050" font-family="system-ui, sans-serif" font-size="22" fill="#6B7280">5 lessons completed</text>

  <!-- Upload button -->
  <rect x="40" y="1160" width="1000" height="120" rx="24" fill="#4F46E5"/>
  <text x="400" y="1235" font-family="system-ui, sans-serif" font-size="32" font-weight="600" fill="white">+ Upload Notes</text>

  <!-- Bottom nav bar -->
  <rect x="0" y="1800" width="1080" height="120" fill="white" filter="drop-shadow(0 -4px 6px rgba(0,0,0,0.1))"/>
  <circle cx="270" cy="1860" r="30" fill="#4F46E5"/>
  <circle cx="540" cy="1860" r="30" fill="#E5E7EB"/>
  <circle cx="810" cy="1860" r="30" fill="#E5E7EB"/>
</svg>
`;

await sharp(Buffer.from(dashboardSvg))
  .png()
  .toFile(path.join(screenshotsDir, 'dashboard.png'));

console.log('\nAll PWA assets generated successfully!');
console.log('\nGenerated files:');
console.log('  - public/icon-192.png');
console.log('  - public/icon-512.png');
console.log('  - public/icon-maskable.png');
console.log('  - public/apple-touch-icon.png');
console.log('  - public/favicon.ico');
console.log('  - public/og-image.png');
console.log('  - public/screenshots/dashboard.png');
