import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, '../public/og-image.jpg');

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Outer Glow Border -->
  <rect x="20" y="20" width="1160" height="590" rx="28" fill="none" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="2" />

  <!-- Top Brand Row -->
  <g transform="translate(60, 65)">
    <!-- Icon Circle -->
    <rect x="0" y="0" width="60" height="60" rx="16" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-width="2" />
    <text x="30" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="34" text-anchor="middle" fill="#f59e0b">🎯</text>
    
    <!-- Title -->
    <text x="76" y="32" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="1">
      TEER RESULT <tspan fill="#f59e0b">LIVE</tspan>
    </text>
    <text x="76" y="52" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="13" fill="#94a3b8" letter-spacing="2">
      FASTEST MEGHALAYA ARCHERY RESULTS PORTAL
    </text>

    <!-- Domain Pill -->
    <rect x="880" y="8" width="180" height="42" rx="21" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
    <circle cx="902" cy="29" r="6" fill="#10b981" />
    <text x="920" y="35" font-family="monospace" font-weight="700" font-size="14" fill="#38bdf8">teerresultlive.in</text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(60, 175)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="#ffffff">
      Today's Live Teer Hit Numbers
    </text>
    <text x="0" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="20" fill="#94a3b8">
      Official First Round (FR) &amp; Second Round (SR) • Daily Updates
    </text>
  </g>

  <!-- 4 Game Cards Grid -->
  <g transform="translate(60, 245)">
    <!-- Card 1: Shillong -->
    <g transform="translate(0, 0)">
      <rect width="255" height="210" rx="20" fill="url(#cardGrad)" stroke="#f59e0b" stroke-opacity="0.5" stroke-width="1.5" />
      <text x="20" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#f59e0b">SHILLONG TEER</text>
      <text x="20" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Polo Ground • 3:45 / 4:45 PM</text>
      
      <!-- FR Box -->
      <rect x="20" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="71" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">1ST ROUND</text>
      <text x="71" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#f59e0b" text-anchor="middle">20</text>
      
      <!-- SR Box -->
      <rect x="133" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="184" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">2ND ROUND</text>
      <text x="184" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#10b981" text-anchor="middle">96</text>
      
      <text x="127" y="194" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#10b981" text-anchor="middle">● DECLARED</text>
    </g>

    <!-- Card 2: Khanapara -->
    <g transform="translate(275, 0)">
      <rect width="255" height="210" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
      <text x="20" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#38bdf8">KHANAPARA TEER</text>
      <text x="20" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Ri-Bhoi Border • 4:00 / 4:30 PM</text>
      
      <rect x="20" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="71" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">1ST ROUND</text>
      <text x="71" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#f59e0b" text-anchor="middle">31</text>
      
      <rect x="133" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="184" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">2ND ROUND</text>
      <text x="184" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#10b981" text-anchor="middle">42</text>
      
      <text x="127" y="194" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#10b981" text-anchor="middle">● DECLARED</text>
    </g>

    <!-- Card 3: Juwai -->
    <g transform="translate(550, 0)">
      <rect width="255" height="210" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
      <text x="20" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#a855f7">JUWAI TEER</text>
      <text x="20" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">West Jaintia • 1:45 / 2:30 PM</text>
      
      <rect x="20" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="71" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">1ST ROUND</text>
      <text x="71" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#f59e0b" text-anchor="middle">83</text>
      
      <rect x="133" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="184" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">2ND ROUND</text>
      <text x="184" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#10b981" text-anchor="middle">28</text>
      
      <text x="127" y="194" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#10b981" text-anchor="middle">● DECLARED</text>
    </g>

    <!-- Card 4: Night -->
    <g transform="translate(825, 0)">
      <rect width="255" height="210" rx="20" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
      <text x="20" y="36" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" fill="#ec4899">NIGHT TEER</text>
      <text x="20" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#64748b">Night Club • 10:30 / 11:30 PM</text>
      
      <rect x="20" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="71" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">1ST ROUND</text>
      <text x="71" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#f59e0b" text-anchor="middle">88</text>
      
      <rect x="133" y="75" width="102" height="95" rx="12" fill="#020617" stroke="#334155" stroke-width="1" />
      <text x="184" y="98" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="10" fill="#94a3b8" text-anchor="middle">2ND ROUND</text>
      <text x="184" y="145" font-family="monospace" font-weight="900" font-size="36" fill="#10b981" text-anchor="middle">86</text>
      
      <text x="127" y="194" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="11" fill="#10b981" text-anchor="middle">● DECLARED</text>
    </g>
  </g>

  <!-- Bottom Feature Bar -->
  <g transform="translate(60, 485)">
    <rect width="1080" height="75" rx="18" fill="#0f172a" stroke="#1e293b" stroke-width="1.5" />
    
    <text x="40" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#f8fafc">
      ⚡ Live Auto-Sync
    </text>
    <text x="210" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#475569">|</text>

    <text x="240" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#f8fafc">
      🎯 Target Common Numbers (House &amp; Ending)
    </text>
    <text x="635" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#475569">|</text>

    <text x="665" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#f8fafc">
      🌙 Dream Calculator
    </text>
    <text x="860" y="44" font-family="system-ui, -apple-system, sans-serif" font-size="15" fill="#475569">|</text>

    <text x="890" y="44" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#f8fafc">
      📊 10-Year Archive
    </text>
  </g>
</svg>
`;

async function generate() {
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 92 })
    .toFile(outputPath);
  console.log('Successfully created og-image.jpg at:', outputPath);
}

generate().catch(console.error);
