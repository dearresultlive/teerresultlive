/**
 * Teer Live Result Auto-Poller
 * Fetches real-time First Round (FR) and Second Round (SR) results
 * for Shillong, Khanapara, Juwai, and Night Teer.
 * 
 * Supports:
 * 1. Direct CDN API: cdn.shillongteerground.com
 * 2. Real-time Multi-game Aggregator: teerresult.com
 * 3. Accurate Indian Standard Time (IST) Date Rollover
 * 4. Flat Schema Archival for previous_teer_archive.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { broadcastTeerResult } from './telegram_bot.js';

// Force IPv4 first to avoid IPv6 connect timeouts on Node 18+
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_DATA_PATH = path.resolve(__dirname, '../src/data/teer_live_results.json');
const ARCHIVE_PATH = path.resolve(__dirname, '../src/data/previous_teer_archive.json');

// Get current date string formatted as YYYY-MM-DD in Indian Standard Time (IST)
export function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

// Strictly validate and clean 2-digit numbers (00-99 only)
export function cleanNumber(val) {
  if (!val) return 'xx';
  const str = String(val).trim();
  if (str === '—' || str === '-' || str === 'xx' || str === '??' || str === 'null') return 'xx';
  
  // Must be strictly 1 or 2 digits (0 to 99)
  const match = str.match(/^(\d{1,2})$/);
  if (match) {
    return match[1].padStart(2, '0');
  }
  return 'xx';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      ...options,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

const GAS_SCRAPER_URL = 'https://script.google.com/macros/s/AKfycbwmWnd4UFGtupP0c_pi1wAUZ1VRifXuor3hG6WUFym2MZ2aaoPBbk4mrm47eAglgKA/exec';

// Source 0: Google Apps Script Scraper (Google Datacenter IP, 0% Cloudflare blocking)
async function fetchFromGoogleAppsScript() {
  try {
    const res = await fetchWithTimeout(GAS_SCRAPER_URL, {
      headers: { 'Accept': 'application/json' }
    }, 6000);
    if (res.ok) {
      const data = await res.json();
      if (data && data.games) return data;
    }
  } catch (err) {
    console.warn(`[GAS Poller] Google Apps Script fetch skipped: ${err.message}`);
  }
  return null;
}

// Source 1: Direct CDN API for Shillong Teer
async function fetchShillongCDN() {
  try {
    const res = await fetchWithTimeout('https://cdn.shillongteerground.com/teer/api/results/latest/index.json', {
      headers: {
        'Referer': 'https://shillongteerground.com/',
        'Origin': 'https://shillongteerground.com'
      }
    }, 6000);

    if (res.ok) {
      const data = await res.json();
      return {
        date: data.date,
        fr: cleanNumber(data.first_round),
        sr: cleanNumber(data.second_round)
      };
    }
  } catch (err) {
    console.warn(`[CDN Poller] Shillong CDN fetch skipped: ${err.message}`);
  }
  return null;
}

// Source 2: Multi-Game Aggregator for Shillong, Khanapara, Juwai, and Night Teer
async function fetchAggregatorData() {
  try {
    const res = await fetchWithTimeout('https://teerresult.com', {}, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const games = ['shillong', 'khanapara', 'juwai', 'night'];
    const extracted = {};

    // 1. Extract from Next.js server payload (most accurate)
    for (const g of games) {
      const reg = new RegExp('\\\\"id\\\\":\\\\"(' + g + ')\\\\"[\\s\\S]*?\\\\"current_date\\\\":\\\\"([^\\\\]+)\\\\"[\\s\\S]*?\\\\"is_off_day\\\\":(true|false)[\\s\\S]*?\\\\"today\\\\":(null|\\{[^\\}]+\\})[\\s\\S]*?\\\\"previous\\\\":(\\{[^\\}]+\\})');
      const m = text.match(reg);
      if (m) {
        const currentDate = m[2];
        const isOffDay = m[3] === 'true';
        const todayStr = m[4].replace(/\\"/g, '"');
        const prevStr = m[5].replace(/\\"/g, '"');
        const today = todayStr === 'null' ? null : JSON.parse(todayStr);
        const previous = JSON.parse(prevStr);

        extracted[g] = {
          currentDate,
          isOffDay,
          today: today ? {
            fr: cleanNumber(today.first_round),
            sr: cleanNumber(today.second_round)
          } : null,
          previous: previous ? {
            date: previous.date,
            fr: cleanNumber(previous.first_round),
            sr: cleanNumber(previous.second_round)
          } : null
        };
      }
    }

    return extracted;
  } catch (err) {
    console.warn(`[Aggregator Poller] TeerResult fetch skipped: ${err.message}`);
    return null;
  }
}

export async function runPoller() {
  const istNow = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${istNow} IST] Starting Teer auto-poller...`);

  if (!fs.existsSync(LIVE_DATA_PATH)) {
    console.error(`Missing live data file at ${LIVE_DATA_PATH}`);
    return;
  }

  const liveData = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, 'utf-8'));
  let archive = [];
  if (fs.existsSync(ARCHIVE_PATH)) {
    try {
      archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8'));
    } catch (e) {
      archive = [];
    }
  }

  const todayIST = getTodayIST();
  let updated = false;

  // 1. Fetch remote data sources (GAS -> Shillong CDN -> Aggregator)
  const [gasData, shillongCDN, aggregatorData] = await Promise.all([
    fetchFromGoogleAppsScript(),
    fetchShillongCDN(),
    fetchAggregatorData()
  ]);

  // 2. Day rollover check: Archive yesterday and reset for today
  // Day rollover only occurs after 7:00 AM IST (morning rollover)
  // This preserves Night Teer and yesterday's results through late-night hours (11 PM - 6:59 AM)
  const currentISTHour = parseInt(
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()),
    10
  );
  const isMorningRolloverTime = currentISTHour >= 7;

  if (liveData.date !== todayIST && isMorningRolloverTime) {
    console.log(`[Day Rollover] Current data date (${liveData.date}) is not today (${todayIST}). Archiving...`);

    // Check if yesterday's confirmed previous data is available from aggregator
    let prevDate = liveData.date;
    let prevShillongFR = liveData.games.shillong?.fr || 'xx';
    let prevShillongSR = liveData.games.shillong?.sr || 'xx';
    let prevKhanaparaFR = liveData.games.khanapara?.fr || 'xx';
    let prevKhanaparaSR = liveData.games.khanapara?.sr || 'xx';
    let prevJuwaiFR = liveData.games.juwai?.fr || 'xx';
    let prevJuwaiSR = liveData.games.juwai?.sr || 'xx';
    let prevNightFR = liveData.games.night?.fr || 'xx';
    let prevNightSR = liveData.games.night?.sr || 'xx';

    if (aggregatorData) {
      if (aggregatorData.shillong?.previous) {
        prevDate = aggregatorData.shillong.previous.date || prevDate;
        if (aggregatorData.shillong.previous.fr !== 'xx') prevShillongFR = aggregatorData.shillong.previous.fr;
        if (aggregatorData.shillong.previous.sr !== 'xx') prevShillongSR = aggregatorData.shillong.previous.sr;
      }
      if (aggregatorData.khanapara?.previous) {
        if (aggregatorData.khanapara.previous.fr !== 'xx') prevKhanaparaFR = aggregatorData.khanapara.previous.fr;
        if (aggregatorData.khanapara.previous.sr !== 'xx') prevKhanaparaSR = aggregatorData.khanapara.previous.sr;
      }
      if (aggregatorData.juwai?.previous) {
        if (aggregatorData.juwai.previous.fr !== 'xx') prevJuwaiFR = aggregatorData.juwai.previous.fr;
        if (aggregatorData.juwai.previous.sr !== 'xx') prevJuwaiSR = aggregatorData.juwai.previous.sr;
      }
      if (aggregatorData.night?.previous) {
        if (aggregatorData.night.previous.fr !== 'xx') prevNightFR = aggregatorData.night.previous.fr;
        if (aggregatorData.night.previous.sr !== 'xx') prevNightSR = aggregatorData.night.previous.sr;
      }
    }

    // Upsert into archive using FLAT schema
    const existingIndex = archive.findIndex((item) => item.date === prevDate);
    const archiveRow = {
      date: prevDate,
      shillong_fr: prevShillongFR,
      shillong_sr: prevShillongSR,
      khanapara_fr: prevKhanaparaFR,
      khanapara_sr: prevKhanaparaSR,
      juwai_fr: prevJuwaiFR,
      juwai_sr: prevJuwaiSR,
      night_fr: prevNightFR,
      night_sr: prevNightSR
    };

    if (existingIndex >= 0) {
      archive[existingIndex] = archiveRow;
    } else {
      archive.unshift(archiveRow);
    }

    // Keep top 30 historical records
    fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive.slice(0, 30), null, 2));
    console.log(`[Archive] Saved verified hit numbers for ${prevDate}`);

    // Reset live data for new day
    liveData.date = todayIST;
    const istDateObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const isSunday = istDateObj.getDay() === 0;
    const gameKeys = ['shillong', 'khanapara', 'juwai', 'night'];
    for (const key of gameKeys) {
      if (liveData.games[key]) {
        if (isSunday) {
          liveData.games[key].status = 'SUNDAY OFF';
        } else {
          liveData.games[key].fr = 'xx';
          liveData.games[key].sr = 'xx';
          liveData.games[key].status = 'UPCOMING';
        }
      }
    }
    updated = true;
  }

  // 3. Update declared numbers for Today (if announced)
  const gameKeys = ['shillong', 'khanapara', 'juwai', 'night'];

  for (const key of gameKeys) {
    const game = liveData.games[key];
    if (!game) continue;

    let targetFR = game.fr;
    let targetSR = game.sr;

    // Check Google Apps Script (highest priority, Google datacenter IP)
    if (gasData && gasData.games && gasData.games[key]) {
      const gasGame = gasData.games[key];
      if (gasGame.fr && gasGame.fr !== 'xx') targetFR = gasGame.fr;
      if (gasGame.sr && gasGame.sr !== 'xx') targetSR = gasGame.sr;
    }

    // Check Aggregator with strict date verification
    if (aggregatorData && aggregatorData[key]) {
      const agg = aggregatorData[key];
      // 1. Live active round for this date
      if (agg.currentDate === liveData.date && agg.today) {
        if (agg.today.fr !== 'xx') targetFR = agg.today.fr;
        if (agg.today.sr !== 'xx') targetSR = agg.today.sr;
      }
      // 2. Concluded round archived for this date (e.g. Night Teer concluding after midnight)
      else if (agg.previous && agg.previous.date === liveData.date) {
        if (agg.previous.fr !== 'xx') targetFR = agg.previous.fr;
        if (agg.previous.sr !== 'xx') targetSR = agg.previous.sr;
      }
    }

    // Check Shillong CDN directly
    if (key === 'shillong' && shillongCDN && shillongCDN.date === todayIST) {
      if (shillongCDN.fr !== 'xx') targetFR = shillongCDN.fr;
      if (shillongCDN.sr !== 'xx') targetSR = shillongCDN.sr;
    }

    // Update game status
    let status = 'UPCOMING';
    if (targetFR !== 'xx' && targetSR !== 'xx') {
      status = 'DECLARED';
    } else if (targetFR !== 'xx') {
      status = 'FR DECLARED';
    } else if (aggregatorData && aggregatorData[key]?.isOffDay) {
      status = 'SUNDAY OFF';
    }

    if (game.fr !== targetFR || game.sr !== targetSR || game.status !== status) {
      console.log(`[Update] ${key.toUpperCase()}: FR=${targetFR}, SR=${targetSR}, Status=${status}`);
      const oldFR = game.fr;
      const oldSR = game.sr;

      game.fr = targetFR;
      game.sr = targetSR;
      game.status = status;
      updated = true;

      // Broadcast to Telegram channel if a new confirmed number was declared
      const frJustDeclared = oldFR === 'xx' && targetFR !== 'xx';
      const srJustDeclared = oldSR === 'xx' && targetSR !== 'xx';

      if (srJustDeclared && targetFR !== 'xx') {
        try {
          await broadcastTeerResult({
            gameKey: key,
            gameName: game.name,
            date: todayIST,
            fr: targetFR,
            sr: targetSR,
            frTime: game.fr_time,
            srTime: game.sr_time,
            roundType: 'FULL'
          });
        } catch (e) {
          console.warn(`[Telegram] Broadcast failed for ${key}: ${e.message}`);
        }
      } else if (frJustDeclared) {
        try {
          await broadcastTeerResult({
            gameKey: key,
            gameName: game.name,
            date: todayIST,
            fr: targetFR,
            sr: targetSR,
            frTime: game.fr_time,
            srTime: game.sr_time,
            roundType: 'FR_ONLY'
          });
        } catch (e) {
          console.warn(`[Telegram] Broadcast failed for ${key}: ${e.message}`);
        }
      }
    }
  }

  // 4. Save live data if updated
  if (updated) {
    liveData.updated_at = new Date().toISOString();
    fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(liveData, null, 2));
    console.log(`[Success] Live data updated at ${LIVE_DATA_PATH}`);
  } else {
    console.log(`[Poller] Current live numbers are up-to-date.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPoller().catch(console.error);
}
