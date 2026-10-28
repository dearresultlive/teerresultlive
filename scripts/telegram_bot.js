/**
 * Telegram Channel Automated Broadcaster for Teer Result Live
 * Sends instant notifications to @teerresultlive_in when new results are declared.
 */

const GAME_URLS = {
  shillong: 'https://teerresultlive.in/shillong-teer',
  khanapara: 'https://teerresultlive.in/khanapara-teer',
  juwai: 'https://teerresultlive.in/juwai-teer',
  night: 'https://teerresultlive.in/'
};

const GAME_DISPLAY_NAMES = {
  shillong: 'SHILLONG TEER',
  khanapara: 'KHANAPARA TEER',
  juwai: 'JUWAI TEER',
  night: 'SHILLONG NIGHT TEER'
};

/**
 * Format IST Date to DD-MM-YYYY
 */
function formatDateIST(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Sends a broadcast message to the Telegram channel.
 * @param {string} text - HTML formatted message text
 * @returns {Promise<boolean>}
 */
export async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID || '@teerresultlive_in';

  if (!token) {
    console.warn('⚠️ [Telegram] Missing TELEGRAM_BOT_TOKEN! Broadcast skipped.');
    console.warn('⚠️ Please add TELEGRAM_BOT_TOKEN in GitHub Settings -> Secrets and variables -> Actions -> Repository secrets.');
    return false;
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
  console.log(`[Telegram] Broadcasting message to ${channelId}...`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`[Telegram] Successfully broadcasted to ${channelId} (Message ID: ${data.result?.message_id})`);
      return true;
    } else {
      console.error(`[Telegram] Telegram API error: ${data.error_code || res.status} - ${data.description}`);
      return false;
    }
  } catch (err) {
    console.error(`[Telegram] Broadcast failed to connect: ${err.message}`);
    return false;
  }
}

/**
 * Formats and broadcasts declared Teer round results.
 */
export async function broadcastTeerResult({
  gameKey,
  gameName,
  date,
  fr,
  sr,
  frTime,
  srTime,
  roundType // 'FR_ONLY' | 'FULL'
}) {
  const displayName = GAME_DISPLAY_NAMES[gameKey] || gameName?.toUpperCase() || 'TEER RESULT';
  const gameUrl = GAME_URLS[gameKey] || 'https://teerresultlive.in/';
  const formattedDate = formatDateIST(date);

  let message = '';

  if (roundType === 'FULL') {
    message = `🎯 <b>${displayName} RESULT DECLARED</b> 🎯\n` +
      `📅 Date: <b>${formattedDate}</b>\n\n` +
      `⚡ <b>First Round (FR):</b>  <code>${fr}</code>  (${frTime || ''})\n` +
      `⚡ <b>Second Round (SR):</b> <code>${sr}</code>  (${srTime || ''})\n\n` +
      `🎯 <b>Check Target Formula & Common Numbers:</b>\n` +
      `👉 <a href="${gameUrl}">${gameUrl}</a>\n\n` +
      `⚡ <b>Fastest 0-Sec Live Ground Results:</b>\n` +
      `👉 <a href="https://teerresultlive.in/">https://teerresultlive.in/</a>`;
  } else if (roundType === 'SR_ONLY') {
    message = `🎯 <b>${displayName} 2ND ROUND RESULT</b> 🎯\n` +
      `📅 Date: <b>${formattedDate}</b>\n\n` +
      `⚡ <b>First Round (FR):</b>  <i>Shooting</i>\n` +
      `⚡ <b>Second Round (SR):</b> <code>${sr}</code>  (${srTime || ''})\n\n` +
      `🎯 <b>Target Numbers & Dream Chart:</b>\n` +
      `👉 <a href="${gameUrl}">${gameUrl}</a>\n\n` +
      `⚡ <b>Fastest 0-Sec Live Ground Results:</b>\n` +
      `👉 <a href="https://teerresultlive.in/">https://teerresultlive.in/</a>`;
  } else {
    message = `🎯 <b>${displayName} 1ST ROUND RESULT</b> 🎯\n` +
      `📅 Date: <b>${formattedDate}</b>\n\n` +
      `⚡ <b>First Round (FR):</b>  <code>${fr}</code>  (${frTime || ''})\n` +
      `⚡ <b>Second Round (SR):</b> <i>Shooting at ${srTime || 'Ground'}</i>\n\n` +
      `🎯 <b>2nd Round Target Numbers:</b>\n` +
      `👉 <a href="${gameUrl}">${gameUrl}</a>\n\n` +
      `⚡ <b>Live Ground Updates:</b>\n` +
      `👉 <a href="https://teerresultlive.in/">https://teerresultlive.in/</a>`;
  }

  return await sendTelegramMessage(message);
}
