import sharp from 'sharp';

/**
 * Generates an ultra-premium 1080x1080 PNG graphics card buffer for Facebook / Instagram / Telegram.
 */
export async function generateTeerGraphicsCard({
  gameName = 'Shillong Teer',
  dateFormatted = '16/11/2026',
  fr = '19',
  sr = '45',
  statusText = 'OFFICIAL RESULT DECLARED'
}) {
  const isFrOnly = sr === 'xx' || !sr;
  const frDisplay = fr || 'xx';
  const srDisplay = sr && sr !== 'xx' ? sr : 'WAITING';

  const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#062e24" />
    </linearGradient>

    <!-- Card Gradient -->
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
    </linearGradient>

    <!-- Gold Accent Gradient -->
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>

    <!-- Emerald Glow -->
    <linearGradient id="emerald" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="url(#bg)" />

  <!-- Outer Border Frame -->
  <rect x="24" y="24" width="1032" height="1032" rx="36" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.4" />
  <rect x="34" y="34" width="1012" height="1012" rx="28" fill="none" stroke="#334155" stroke-width="1.5" opacity="0.6" />

  <!-- Decorative Target Circles in Background -->
  <circle cx="540" cy="540" r="480" fill="none" stroke="#1e293b" stroke-width="1.5" opacity="0.3" />
  <circle cx="540" cy="540" r="360" fill="none" stroke="#1e293b" stroke-width="1.5" opacity="0.4" />
  <circle cx="540" cy="540" r="240" fill="none" stroke="#059669" stroke-width="1" opacity="0.15" stroke-dasharray="8 6" />

  <!-- HEADER BRANDING -->
  <g transform="translate(0, 80)">
    <!-- Bullseye Icon -->
    <circle cx="540" cy="30" r="32" fill="#ef4444" />
    <circle cx="540" cy="30" r="24" fill="#ffffff" />
    <circle cx="540" cy="30" r="16" fill="#ef4444" />
    <circle cx="540" cy="30" r="8" fill="#ffffff" />
    <circle cx="540" cy="30" r="3" fill="#ef4444" />

    <!-- Brand Name -->
    <text x="540" y="105" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="34" fill="#ffffff" letter-spacing="4">
      TEER RESULT LIVE
    </text>
    
    <!-- Verified Badge & Live Status -->
    <rect x="360" y="125" width="360" height="36" rx="18" fill="#047857" opacity="0.3" stroke="#10b981" stroke-width="1.5" />
    <text x="540" y="149" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="16" fill="#34d399" letter-spacing="3">
      ● OFFICIAL VERIFIED RESULT
    </text>
  </g>

  <!-- GAME NAME & DATE -->
  <g transform="translate(0, 290)">
    <text x="540" y="45" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="56" fill="url(#gold)" letter-spacing="2">
      ${gameName.toUpperCase()}
    </text>
    
    <text x="540" y="95" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="24" fill="#94a3b8" letter-spacing="4">
      DATE: ${dateFormatted}
    </text>
  </g>

  <!-- RESULT CARDS -->
  <g transform="translate(0, 440)">
    <!-- 1st Round Card (Left) -->
    <g transform="translate(80, 0)">
      <rect width="420" height="340" rx="28" fill="url(#cardBg)" stroke="#f59e0b" stroke-width="3" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.5))" />
      
      <!-- Card Header -->
      <path d="M 0 28 Q 0 0 28 0 L 392 0 Q 420 0 420 28 L 420 70 L 0 70 Z" fill="#b45309" opacity="0.3" />
      <text x="210" y="46" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="24" fill="#fbbf24" letter-spacing="2">
        FIRST ROUND (FR)
      </text>

      <!-- Winning Number -->
      <text x="210" y="220" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="140" fill="#ffffff">
        ${frDisplay}
      </text>

      <rect x="130" y="270" width="160" height="34" rx="17" fill="#065f46" />
      <text x="210" y="293" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="15" fill="#a7f3d0" letter-spacing="1.5">
        DECLARED
      </text>
    </g>

    <!-- 2nd Round Card (Right) -->
    <g transform="translate(580, 0)">
      <rect width="420" height="340" rx="28" fill="url(#cardBg)" stroke="${isFrOnly ? '#475569' : '#f59e0b'}" stroke-width="${isFrOnly ? '2' : '3'}" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.5))" />
      
      <!-- Card Header -->
      <path d="M 0 28 Q 0 0 28 0 L 392 0 Q 420 0 420 28 L 420 70 L 0 70 Z" fill="${isFrOnly ? '#334155' : '#b45309'}" opacity="0.3" />
      <text x="210" y="46" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="24" fill="${isFrOnly ? '#94a3b8' : '#fbbf24'}" letter-spacing="2">
        SECOND ROUND (SR)
      </text>

      <!-- Winning Number -->
      <text x="210" y="${isFrOnly ? '205' : '220'}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${isFrOnly ? '52' : '140'}" fill="${isFrOnly ? '#64748b' : '#ffffff'}">
        ${srDisplay}
      </text>

      <rect x="130" y="270" width="160" height="34" rx="17" fill="${isFrOnly ? '#1e293b' : '#065f46'}" />
      <text x="210" y="293" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="15" fill="${isFrOnly ? '#94a3b8' : '#a7f3d0'}" letter-spacing="1.5">
        ${isFrOnly ? 'AWAITING' : 'DECLARED'}
      </text>
    </g>
  </g>

  <!-- FOOTER ACTION BAR -->
  <g transform="translate(0, 850)">
    <rect x="100" y="0" width="880" height="90" rx="45" fill="url(#emerald)" filter="drop-shadow(0 10px 20px rgba(16,185,129,0.3))" />
    
    <text x="540" y="42" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="26" fill="#ffffff" letter-spacing="1.5">
      ⚡ 0-SECOND FAST LIVE REFRESH ON WEBSITE
    </text>
    <text x="540" y="72" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="22" fill="#fef08a" letter-spacing="3">
      👉 https://teerresultlive.in
    </text>
  </g>

  <!-- COPYRIGHT -->
  <text x="540" y="1010" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="16" fill="#64748b" letter-spacing="1">
    © Teer Result Live • All Archery Results Verified with KHASA Official
  </text>
</svg>
`;

  return sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer();
}
