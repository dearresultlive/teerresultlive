/**
 * Facebook Page Automated Broadcaster for Teer Result Live
 * Automatically publishes new round results to the official Facebook Page (ID: 1386286871244175).
 */

const PAGE_ID = process.env.FB_PAGE_ID || '1386286871244175';
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || 'EAAZCIOwzqo1cBTJMXTe6IaSsEdYVRjR2bao6OpenrTZA8j5mH0zBOtc9zFoVEVf8uNgijbrcyKwEVuksGZBhZCZA7iV52nncriuZCZA4oTsIFDkmGQeFRfNhpnRHKhWmbc6MCFZAyRDS7vjs0Ixc5V9GR6aalkMAklCZAJVBdxzdIhOBSDZCLt2RxZCgTuDA9sTZCuPYzhG5QD9UrymH2peqXgs5kO9mvMs7Ta2KKIgljtZB8LIhI9g0wJIUGfXAN';

const GAME_NAMES = {
  shillong: 'Shillong Teer',
  khanapara: 'Khanapara Teer',
  juwai: 'Juwai Teer',
  juwai_morning: 'Juwai Morning Teer',
  night: 'Shillong Night Teer'
};

const GAME_URLS = {
  shillong: 'https://teerresultlive.in/shillong-teer',
  khanapara: 'https://teerresultlive.in/khanapara-teer',
  juwai: 'https://teerresultlive.in/juwai-teer',
  juwai_morning: 'https://teerresultlive.in/',
  night: 'https://teerresultlive.in/'
};

/**
 * Format Date to DD/MM/YYYY
 */
function formatDateIST(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Publishes a post to the Facebook Page feed.
 */
export async function sendFacebookMessage(message) {
  if (!PAGE_ACCESS_TOKEN) {
    console.warn('[Facebook] Missing FB_PAGE_ACCESS_TOKEN, skipping post.');
    return false;
  }

  const endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: PAGE_ACCESS_TOKEN
      })
    });

    const data = await res.json();
    if (data.id) {
      console.log(`[Facebook] Successfully posted! Post ID: ${data.id}`);
      return true;
    } else {
      console.error('[Facebook] API returned error:', data.error ? data.error.message : data);
      return false;
    }
  } catch (err) {
    console.error('[Facebook] Network error during post:', err.message);
    return false;
  }
}

/**
 * Broadcasts Teer results to Facebook Page.
 * @param {Object} options
 * @param {string} options.gameKey - 'shillong' | 'khanapara' | 'juwai' | 'juwai_morning' | 'night'
 * @param {string} options.gameName - Name of the game
 * @param {string} options.date - Date in YYYY-MM-DD
 * @param {string} options.fr - First Round number
 * @param {string} options.sr - Second Round number
 * @param {string} options.frTime - Scheduled FR time
 * @param {string} options.srTime - Scheduled SR time
 * @param {'FR_ONLY' | 'FULL' | 'SR_ONLY'} options.roundType
 */
export async function broadcastFacebookTeerResult({
  gameKey,
  gameName,
  date,
  fr,
  sr,
  frTime,
  srTime,
  roundType
}) {
  const gName = gameName || GAME_NAMES[gameKey] || gameKey.toUpperCase();
  const formattedDate = formatDateIST(date);
  const targetUrl = GAME_URLS[gameKey] || 'https://teerresultlive.in';

  let postText = '';

  if (roundType === 'FR_ONLY') {
    postText = `🎯 ${gName} 1st Round Result Declared!

📅 Date: ${formattedDate}
🏹 1st Round (FR): ${fr}
⏳ 2nd Round (SR): Awaiting (${srTime || 'Soon'})

⚡ Check 2nd Round real-time live refresh on:
👉 ${targetUrl}

#${gameKey}teer #${gameKey}result #teerresultlive #shillongteer #khanaparateer`;
  } else {
    // FULL or SR_ONLY
    postText = `🎯 ${gName} Official Result Declared!

📅 Date: ${formattedDate}
🏹 1st Round (FR): ${fr}
🏹 2nd Round (SR): ${sr}

⚡ Previous results, common numbers & target formulas on:
👉 ${targetUrl}

#${gameKey}teer #${gameKey}result #teerresultlive #shillongteer #khanaparateer`;
  }

  return sendFacebookMessage(postText);
}
