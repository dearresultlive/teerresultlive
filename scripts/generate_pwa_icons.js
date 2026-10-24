import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

// SVG template for app icon: Golden archery target on rich navy/amber rounded background
function createIconSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : 0;
  const innerSize = size - padding * 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Full Background -->
  <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : size * 0.22}" fill="url(#bgGrad)" />

  <!-- Inner Archery Target Graphic -->
  <g transform="translate(${padding}, ${padding})">
    <!-- Outer Gold Ring -->
    <circle cx="${innerSize / 2}" cy="${innerSize / 2}" r="${innerSize * 0.40}" fill="none" stroke="url(#goldGrad)" stroke-width="${innerSize * 0.055}" />
    
    <!-- White Inner Ring -->
    <circle cx="${innerSize / 2}" cy="${innerSize / 2}" r="${innerSize * 0.28}" fill="none" stroke="#ffffff" stroke-width="${innerSize * 0.045}" opacity="0.9" />

    <!-- Emerald Bullseye Ring -->
    <circle cx="${innerSize / 2}" cy="${innerSize / 2}" r="${innerSize * 0.16}" fill="none" stroke="#10b981" stroke-width="${innerSize * 0.04}" />

    <!-- Center Gold Hit Dot -->
    <circle cx="${innerSize / 2}" cy="${innerSize / 2}" r="${innerSize * 0.08}" fill="url(#goldGrad)" />

    <!-- Crossed Arrow Tips (Stylized Archery Accent) -->
    <path d="M ${innerSize * 0.25} ${innerSize * 0.5} L ${innerSize * 0.75} ${innerSize * 0.5}" stroke="#f59e0b" stroke-width="${innerSize * 0.025}" stroke-linecap="round" opacity="0.4" />
    <path d="M ${innerSize * 0.5} ${innerSize * 0.25} L ${innerSize * 0.5} ${innerSize * 0.75}" stroke="#f59e0b" stroke-width="${innerSize * 0.025}" stroke-linecap="round" opacity="0.4" />
  </g>
</svg>
`;
}

async function run() {
  // 1. 192x192
  await sharp(Buffer.from(createIconSvg(192)))
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 2. 512x512
  await sharp(Buffer.from(createIconSvg(512)))
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 3. 512x512 Maskable
  await sharp(Buffer.from(createIconSvg(512, true)))
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png');

  // 4. 180x180 Apple Touch Icon
  await sharp(Buffer.from(createIconSvg(180)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');
}

run().catch(console.error);
