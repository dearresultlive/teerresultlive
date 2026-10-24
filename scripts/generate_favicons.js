import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

// Master Vector SVG (Vibrant Archery Bullseye with Arrow)
function createMasterSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.04;
  const innerSize = size - padding * 2;
  const c = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="goldCenter" cx="45%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </radialGradient>
    <linearGradient id="redRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F43F5E"/>
      <stop offset="100%" stop-color="#BE123C"/>
    </linearGradient>
    <linearGradient id="blueRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-color="#0F172A" flood-opacity="0.25"/>
    </filter>
  </defs>

  ${isMaskable ? `<rect width="${size}" height="${size}" fill="#FFFFFF"/>` : ''}

  <!-- Master Disc Base with drop shadow -->
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.48}" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="${size * 0.015}" filter="url(#dropShadow)"/>

  <!-- Outer Red Ring (Standard FITA Olympic / Traditional Archery) -->
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.43}" fill="url(#redRing)"/>

  <!-- Inner White Ring -->
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.32}" fill="#FFFFFF"/>

  <!-- Inner Blue Ring -->
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.22}" fill="url(#blueRing)"/>

  <!-- Gold Bullseye Core -->
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.12}" fill="url(#goldCenter)"/>
  <circle cx="${c}" cy="${c}" r="${innerSize * 0.035}" fill="#FFFFFF" opacity="0.9"/>

  <!-- 45-degree Bamboo Arrow Penetrating Center -->
  <g>
    <!-- Dark Outline Shaft -->
    <line x1="${c - innerSize * 0.38}" y1="${c + innerSize * 0.38}" x2="${c}" y2="${c}" stroke="#0F172A" stroke-width="${innerSize * 0.06}" stroke-linecap="round"/>
    <!-- Crisp White Shaft Highlight -->
    <line x1="${c - innerSize * 0.36}" y1="${c + innerSize * 0.36}" x2="${c - innerSize * 0.02}" y2="${c + innerSize * 0.02}" stroke="#FFFFFF" stroke-width="${innerSize * 0.025}" stroke-linecap="round"/>
    <!-- Golden Fletching Tail -->
    <path d="M ${c - innerSize * 0.41} ${c + innerSize * 0.41} L ${c - innerSize * 0.33} ${c + innerSize * 0.38} L ${c - innerSize * 0.36} ${c + innerSize * 0.46} Z" fill="#F59E0B"/>
    <path d="M ${c - innerSize * 0.41} ${c + innerSize * 0.41} L ${c - innerSize * 0.38} ${c + innerSize * 0.33} L ${c - innerSize * 0.46} ${c + innerSize * 0.36} Z" fill="#F43F5E"/>
    <!-- Impact Point Center Pin -->
    <circle cx="${c}" cy="${c}" r="${innerSize * 0.03}" fill="#0F172A"/>
  </g>
</svg>
`;
}

async function generate() {
  console.log('Generating high-visibility favicons & PWA app icons...');

  // 1. Write public/favicon.svg (Standard vector for modern browsers)
  const masterSvg = createMasterSvg(128, false);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterSvg);
  console.log('✓ Created public/favicon.svg');

  // 2. 192x192 PWA Icon
  await sharp(Buffer.from(createMasterSvg(192, false)))
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Created public/icon-192.png');

  // 3. 512x512 PWA Icon
  await sharp(Buffer.from(createMasterSvg(512, false)))
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Created public/icon-512.png');

  // 4. 512x512 Maskable PWA Icon
  await sharp(Buffer.from(createMasterSvg(512, true)))
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ Created public/icon-maskable-512.png');

  // 5. 180x180 Apple Touch Icon
  await sharp(Buffer.from(createMasterSvg(180, false)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 6. 32x32 Favicon PNG (also used for favicon.ico)
  await sharp(Buffer.from(createMasterSvg(32, false)))
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created public/favicon-32x32.png');

  // 7. 48x48 Favicon PNG
  await sharp(Buffer.from(createMasterSvg(48, false)))
    .png()
    .toFile(path.join(publicDir, 'favicon.ico')); // Modern browsers support PNG inside ICO
  console.log('✓ Created public/favicon.ico');
}

generate().catch(console.error);
