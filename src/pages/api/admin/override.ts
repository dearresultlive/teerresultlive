import type { APIRoute } from 'astro';
import { setManualOverride } from '../../../utils/getFreshTeerData';
import liveData from '../../../data/teer_live_results.json';

export const prerender = false;

const DEFAULT_ADMIN_PIN = 'teeradmin789';
const FB_PAGE_ID = '1386286871244175';
const FB_PAGE_ACCESS_TOKEN = 'EAAZCIOwzqo1cBTIZC4Dhe3m5pssZB3C3ZByPIoXeU5V2whD0RnwvDjZBv2l1NqPWuVsHFINfJUxGJbNrcJbCnA9z3MJ282wnpXhMJlRZC1sK1mwx0JbuCx1jZChbKC1LIVTtK3XoOIaSxwd0k29O5zdz0ntpLDKVQjplAevg55515yVFTarOsb3IaVl8wFVveAnYQ8nk9Fn0ZCLT6qbk0ScU7wDc';

const GAME_NAMES: Record<string, string> = {
  shillong: 'Shillong Teer',
  khanapara: 'Khanapara Teer',
  juwai: 'Juwai Teer',
  juwai_morning: 'Juwai Morning Teer',
  night: 'Shillong Night Teer'
};

const GAME_URLS: Record<string, string> = {
  shillong: 'https://teerresultlive.in/shillong-teer',
  khanapara: 'https://teerresultlive.in/khanapara-teer',
  juwai: 'https://teerresultlive.in/juwai-teer',
  juwai_morning: 'https://teerresultlive.in/',
  night: 'https://teerresultlive.in/'
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const pin = body.pin || request.headers.get('x-admin-pin') || '';

    const validPin = (typeof process !== 'undefined' && process.env?.ADMIN_PIN) || DEFAULT_ADMIN_PIN;

    if (pin !== validPin) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Invalid Admin PIN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { gameKey, fr, sr, status, locked, broadcastFacebook, broadcastTelegram } = body;

    const game = (liveData.games as Record<string, any>)[gameKey];
    if (!gameKey || !game) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid game key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean numbers (2 digits or xx)
    const cleanFR = (fr || 'xx').trim().toLowerCase().padStart(2, '0');
    const cleanSR = (sr || 'xx').trim().toLowerCase().padStart(2, '0');
    const targetStatus = status || (cleanFR !== 'xx' && cleanSR !== 'xx' ? 'DECLARED' : (cleanFR !== 'xx' ? 'FR DECLARED' : 'UPCOMING'));

    // Update in-memory edge cache immediately so live visitors and SSR see it
    setManualOverride(gameKey, {
      fr: cleanFR,
      sr: cleanSR,
      status: targetStatus,
      locked: !!locked
    });

    const gName = GAME_NAMES[gameKey] || gameKey;
    const targetUrl = GAME_URLS[gameKey] || 'https://teerresultlive.in';

    // Broadcast to Facebook via native fetch
    let fbResult = false;
    if (broadcastFacebook && (cleanFR !== 'xx' || cleanSR !== 'xx')) {
      try {
        const caption = `🎯 ${gName} Official Result Declared!\n\n` +
          `📅 Date: ${liveData.date}\n` +
          `🏹 1st Round (FR): ${cleanFR}\n` +
          `🏹 2nd Round (SR): ${cleanSR}\n\n` +
          `⚡ Check real-time live results & previous chart:\n👉 ${targetUrl}\n\n` +
          `#${gameKey}teer #teerresultlive #shillongteer`;

        const fbRes = await fetch(`https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: caption,
            access_token: FB_PAGE_ACCESS_TOKEN
          })
        });
        const fbJson: any = await fbRes.json();
        fbResult = !!fbJson.id;
      } catch (err: any) {
        console.warn('[Admin] Facebook publish failed:', err.message);
      }
    }

    // Broadcast to Telegram via native fetch
    let tgResult = false;
    if (broadcastTelegram && (cleanFR !== 'xx' || cleanSR !== 'xx')) {
      try {
        const token = typeof process !== 'undefined' ? process.env?.TELEGRAM_BOT_TOKEN : null;
        const channelId = (typeof process !== 'undefined' ? process.env?.TELEGRAM_CHANNEL_ID : null) || '@teerresultlive_in';
        if (token) {
          const msg = `🎯 <b>${gName.toUpperCase()} RESULT</b>\n` +
            `📅 Date: <b>${liveData.date}</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ <b>1st Round (FR):</b> <code>[ ${cleanFR} ]</code>\n` +
            `⚡ <b>2nd Round (SR):</b> <code>[ ${cleanSR} ]</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👉 <a href="${targetUrl}">${targetUrl}</a>`;

          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              text: msg,
              parse_mode: 'HTML'
            })
          });
          const tgJson: any = await tgRes.json();
          tgResult = !!tgJson.ok;
        }
      } catch (err: any) {
        console.warn('[Admin] Telegram publish failed:', err.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Updated ${gName}: [${cleanFR} | ${cleanSR}]. ${fbResult ? 'Facebook post published!' : ''} ${tgResult ? 'Telegram broadcast sent!' : ''}`,
      game: {
        key: gameKey,
        fr: cleanFR,
        sr: cleanSR,
        status: targetStatus,
        locked: !!locked
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
