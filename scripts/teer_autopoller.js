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
import { resolveRoundConsensus, evaluateMultiSourceConsensus } from '../src/utils/teerConsensusEngine.js';

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

// Get current hour in IST (0 to 23) safely avoiding 24-hour midnight formatting anomalies
export function getISTHour(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === 'hour');
  return parseInt(hourPart ? hourPart.value : '0', 10);
}

// Get current minutes since midnight in Indian Standard Time (IST)
export function getISTCurrentMinutes(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

// Strict time window validator to protect against stale upstream cache declaring rounds early
export function isRoundWindowOpen(gameKey, round, now = new Date()) {
  const cur = getISTCurrentMinutes(now);
  // Early morning guard (12:00 AM - 7:00 AM): Day draws not running; night teer concluded
  if (cur < 7 * 60) {
    return gameKey === 'night';
  }
  // Earliest allowable draw times in IST (matches official grounds with 5-min buffer)
  const EARLIEST_MINUTES = {
    juwai: { fr: 13 * 60 + 35, sr: 14 * 60 + 20 },    // 1:35 PM / 2:20 PM
    shillong: { fr: 15 * 60 + 30, sr: 16 * 60 + 30 }, // 3:30 PM / 4:30 PM
    khanapara: { fr: 15 * 60 + 45, sr: 16 * 60 + 15 },// 3:45 PM / 4:15 PM
    night: { fr: 22 * 60 + 15, sr: 23 * 60 + 15 }     // 10:15 PM / 11:15 PM
  };
  const limits = EARLIEST_MINUTES[gameKey];
  if (!limits) return true;
  return cur >= limits[round];
}


// Strictly validate and clean 2-digit numbers (00-99 only)
export function cleanNumber(val) {
  if (val === undefined || val === null) return 'xx';
  const str = String(val).trim().toLowerCase();
  if (!str || str === '—' || str === '-' || str === '--' || str === '---' || str === 'xx' || str === '??' || str === 'null' || str === 'undefined' || str === 'nan') return 'xx';
  const match = str.match(/^(\d{1,2})$/);
  return match ? match[1].padStart(2, '0') : 'xx';
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


// Source 3: Dedicated Shillong Night Teer Direct Feed (nightteer.com)
async function fetchNightTeerDirect() {
  try {
    const res = await fetchWithTimeout('https://nightteer.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, 6000);
    if (!res.ok) return null;
    const text = await res.text();
    const dateMatch = text.match(/<h2>\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/h2>/i);
    let date = '';
    if (dateMatch) {
      date = dateMatch[3] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0');
    }
    const rowMatch = text.match(/<tr style="[^"]*background-color:\s*cream[^"]*">\s*<td align="center">([\s\S]*?)<\/td>\s*<td align="center">([\s\S]*?)<\/td>/i);
    if (date && rowMatch) {
      const fr = cleanNumber(rowMatch[1].replace(/<[^>]+>/g, '').trim());
      const sr = cleanNumber(rowMatch[2].replace(/<[^>]+>/g, '').trim());
      if (fr !== 'xx' || sr !== 'xx') {
        return { date, fr, sr };
      }
    }
  } catch (err) {
    console.warn('[Night Poller] Direct night teer fetch skipped:', err.message);
  }
  return null;
}


// Source 4: Multi-Game Fallback Feed from teerresulttoday.org
async function fetchFromTeerResultToday(targetDate) {
  try {
    const res = await fetchWithTimeout('https://teerresulttoday.org', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, 6000);
    if (!res.ok) return null;
    const html = await res.text();

    const tDate = targetDate || getTodayIST();
    const [y, m, d] = tDate.split('-');
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const expectedDate = `${parseInt(d, 10)} ${monthsFull[parseInt(m, 10) - 1]} ${y}`;

    const result = {
      shillong: { fr: 'xx', sr: 'xx' },
      juwai: { fr: 'xx', sr: 'xx' },
      khanapara: { fr: 'xx', sr: 'xx' }
    };

    const cards = [...html.matchAll(/<span class="trs-result-date">([^<]+)<\/span>[\s\S]*?<table[^>]*class="[^"]*trs-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
    for (const card of cards) {
      const cardDate = card[1].trim();
      if (cardDate !== expectedDate) continue; // Skip stale yesterday boards!

      const tableContent = card[2];
      let gameKey = null;
      if (/Shillong/i.test(tableContent)) gameKey = 'shillong';
      else if (/Juwai/i.test(tableContent)) gameKey = 'juwai';
      else if (/Khanapara/i.test(tableContent)) gameKey = 'khanapara';

      if (!gameKey) continue;

      const rows = [...tableContent.matchAll(/<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)];
      if (rows.length >= 2) {
        result[gameKey].fr = cleanNumber(rows[1][1].replace(/<[^>]+>/g, '').trim());
        result[gameKey].sr = cleanNumber(rows[1][2].replace(/<[^>]+>/g, '').trim());
      }
    }
    return result;
  } catch (err) {
    return null;
  }
}


// Source 5: Dedicated Official Khanapara Feed (khanaparateer.org)
async function fetchKhanaparaOrg() {
  try {
    const res = await fetchWithTimeout('https://khanaparateer.org', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, 5000);
    if (!res.ok) return null;
    const html = await res.text();
    const today = getTodayIST();
    const [year, month, day] = today.split('-');
    const dayInt = parseInt(day, 10);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const curMonth = monthNames[parseInt(month, 10) - 1];
    const hasToday = html.includes(`${curMonth} ${dayInt}, ${year}`) || html.includes(`${dayInt} ${curMonth} ${year}`);
    if (!hasToday) return null;

    const circleMatches = [...html.matchAll(/class=["']?today-blue-circle["']?[^>]*>([\s\S]*?)<\/div>/gi)];
    if (circleMatches.length >= 1) {
      const fr = cleanNumber(circleMatches[0][1].replace(/<[^>]+>/g, '').trim());
      const sr = circleMatches.length >= 2 ? cleanNumber(circleMatches[1][1].replace(/<[^>]+>/g, '').trim()) : 'xx';
      if (fr !== 'xx' || sr !== 'xx') {
        return { fr, sr };
      }
    }
  } catch (e) {}
  return null;
}


// Source 6: Direct Real-Time Multi-Game JSON API (instantteerresults.in/results.json)
async function fetchFromInstantTeerResults() {
  try {
    const res = await fetchWithTimeout('https://instantteerresults.in/results.json?_t=' + Date.now(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, 5000);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.date) return null;

    const parseGame = (g) => ({
      fr: cleanNumber(g?.fr),
      sr: cleanNumber(g?.sr)
    });

    return {
      date: data.date,
      shillong: parseGame(data.shillong),
      khanapara: parseGame(data.khanapara),
      juwai: parseGame(data.juwai),
      night: parseGame(data.night)
    };
  } catch (e) {}
  return null;
}


// Source 7: TeerResults.net Table Parser (Shillong)
async function fetchTeerResultsNet(targetDate) {
  try {
    const res = await fetchWithTimeout('https://teerresults.net', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, 5000);
    if (!res.ok) return null;
    const html = await res.text();

    const tDate = targetDate || getTodayIST();
    const [year, month, day] = tDate.split('-');
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expectedShortDate = `${parseInt(day, 10)} ${monthsShort[parseInt(month, 10) - 1]} ${year}`.toLowerCase();

    const m = html.match(/Shillong Teer Result Today[\s\S]*?Date:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})[\s\S]*?<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (m) {
      const rawDate = m[1].trim();
      if (rawDate.toLowerCase().replace(/\s+/g, ' ') !== expectedShortDate) {
        return null;
      }
      const fr = cleanNumber(m[2].replace(/<[^>]+>/g, '').trim());
      const sr = cleanNumber(m[3].replace(/<[^>]+>/g, '').trim());
      if (fr !== 'xx' || sr !== 'xx') {
        return {
          shillong: {
            date: rawDate,
            fr,
            sr
          }
        };
      }
    }
  } catch (e) {}
  return null;
}

// Source 8: TeerGround.com Live Feeder (Shillong, Khanapara, Juwai)
async function fetchTeerGroundCom() {
  try {
    const res = await fetchWithTimeout('https://teerground.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, 5000);
    if (!res.ok) return null;
    const html = await res.text();
    const blocks = [...html.matchAll(/(Shillong|Khanapara|Juwai)<!-- -->\s*Teer Result[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/gi)];
    const result = {};
    for (const b of blocks) {
      const game = b[1].toLowerCase();
      const table = b[2];
      const dateMatch = table.match(/(\d{4}-\d{2}-\d{2})/);
      const rowMatch = table.match(/<tbody>\s*<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
      if (rowMatch) {
        const fr = cleanNumber(rowMatch[1].replace(/<[^>]+>/g, '').trim());
        const sr = cleanNumber(rowMatch[2].replace(/<[^>]+>/g, '').trim());
        if (fr !== 'xx' || sr !== 'xx') {
          result[game] = {
            date: dateMatch ? dateMatch[1] : '',
            fr,
            sr
          };
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {}
  return null;
}

// Source 9: TeerTarget.com Live Hits (Shillong)
async function fetchTeerTargetCom(targetDate) {
  try {
    const res = await fetchWithTimeout('https://teertarget.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, 5000);
    if (!res.ok) return null;
    const html = await res.text();
    const todayParts = targetDate
      ? targetDate.split('-').reverse().join('-')
      : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata' }).format(new Date()).replace(/\//g, '-');

    if (!html.includes(todayParts)) return null;

    const rowMatch = html.match(new RegExp(todayParts + '\\s*<\\/td>\\s*<td[^>]*>\\s*([\\s\\S]*?)\\s*<\\/td>\\s*<td[^>]*>\\s*([\\s\\S]*?)\\s*<\\/td>', 'i'));
    if (rowMatch) {
      const fr = cleanNumber(rowMatch[1].replace(/<[^>]+>/g, '').trim());
      const sr = cleanNumber(rowMatch[2].replace(/<[^>]+>/g, '').trim());
      if (fr !== 'xx' || sr !== 'xx') {
        return {
          shillong: {
            date: targetDate || todayParts,
            fr,
            sr
          }
        };
      }
    }
  } catch (e) {}
  return null;
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
  const [
    gasData,
    shillongCDN,
    aggregatorData,
    nightDirect,
    teerTodayData,
    khanaparaOrgData,
    instantData,
    netData,
    groundData,
    targetData
  ] = await Promise.all([
    fetchFromGoogleAppsScript(),
    fetchShillongCDN(),
    fetchAggregatorData(),
    fetchNightTeerDirect(),
    fetchFromTeerResultToday(todayIST),
    fetchKhanaparaOrg(),
    fetchFromInstantTeerResults(),
    fetchTeerResultsNet(todayIST),
    fetchTeerGroundCom(),
    fetchTeerTargetCom(todayIST)
  ]);

  // 2. Day rollover check: Archive yesterday and reset for today
  // Day rollover only occurs after 7:00 AM IST (morning rollover)
  // This preserves Night Teer and yesterday's results through late-night hours (11 PM - 6:59 AM)
  const currentISTHour = getISTHour();
  const istDateObj = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const isSunday = istDateObj.getDay() === 0;

  // Morning rollover occurs only at 9:00 AM IST on shooting days (Monday to Saturday)
  // On Sunday, archery grounds are closed under KHASA rules.
  // We keep Saturday's verified results active all day Sunday so visitors can see the latest numbers!
  const isMorningRolloverTime = currentISTHour >= 9 && !isSunday;

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

  // 3. Update declared numbers for Today using 10-Source Byzantine Fault Tolerant Consensus Engine
  const gameKeys = ['shillong', 'khanapara', 'juwai', 'night'];

  // Collect reports across all 10 sources
  const allReports = {
    shillong: [],
    khanapara: [],
    juwai: [],
    night: []
  };

  const isToday = liveData.date === todayIST;
  const addReport = (game, source, tier, fr, sr) => {
    if (!allReports[game]) return;
    const cleanFR = (isToday && !isRoundWindowOpen(game, 'fr')) ? 'xx' : cleanNumber(fr);
    const cleanSR = (isToday && !isRoundWindowOpen(game, 'sr')) ? 'xx' : cleanNumber(sr);
    if (cleanFR !== 'xx' || cleanSR !== 'xx') {
      allReports[game].push({ source, tier, fr: cleanFR, sr: cleanSR });
    }
  };

  // 1. InstantTeer API (Tier 1 verified machine feed)
  if (instantData && instantData.date === liveData.date) {
    if (instantData.shillong) addReport('shillong', 'instantteer_api', 1, instantData.shillong.fr, instantData.shillong.sr);
    if (instantData.khanapara) addReport('khanapara', 'instantteer_api', 1, instantData.khanapara.fr, instantData.khanapara.sr);
    if (instantData.juwai) addReport('juwai', 'instantteer_api', 1, instantData.juwai.fr, instantData.juwai.sr);
    if (instantData.night) addReport('night', 'instantteer_api', 1, instantData.night.fr, instantData.night.sr);
  }

  // 2. Polo Ground CDN (Tier 1 direct machine feed)
  if (shillongCDN && shillongCDN.date === liveData.date) {
    addReport('shillong', 'polo_ground_cdn', 1, shillongCDN.fr, shillongCDN.sr);
  }

  // 3. TeerResultToday (Tier 2)
  if (teerTodayData) {
    if (teerTodayData.shillong) addReport('shillong', 'teerresulttoday', 2, teerTodayData.shillong.fr, teerTodayData.shillong.sr);
    if (teerTodayData.khanapara) addReport('khanapara', 'teerresulttoday', 2, teerTodayData.khanapara.fr, teerTodayData.khanapara.sr);
    if (teerTodayData.juwai) addReport('juwai', 'teerresulttoday', 2, teerTodayData.juwai.fr, teerTodayData.juwai.sr);
  }

  // 4. TeerResult Aggregator (Tier 2)
  if (aggregatorData) {
    for (const g of gameKeys) {
      const agg = aggregatorData[g];
      if (agg?.currentDate === liveData.date && agg.today) {
        addReport(g, 'teerresult_agg', 2, agg.today.fr, agg.today.sr);
      } else if (agg?.previous?.date === liveData.date) {
        addReport(g, 'teerresult_agg', 2, agg.previous.fr, agg.previous.sr);
      }
    }
  }

  // 5. KhanaparaTeer.org (Tier 2)
  if (khanaparaOrgData) {
    addReport('khanapara', 'khanaparateer_org', 2, khanaparaOrgData.fr, khanaparaOrgData.sr);
  }

  // 6. NightTeer.com Direct (Tier 2)
  if (nightDirect && nightDirect.date === liveData.date) {
    addReport('night', 'nightteer_direct', 2, nightDirect.fr, nightDirect.sr);
  }

  // 7. TeerResults.net (Tier 2)
  if (netData && netData.shillong) {
    addReport('shillong', 'teerresults_net', 2, netData.shillong.fr, netData.shillong.sr);
  }

  // 8. TeerGround.com (Tier 2)
  if (groundData) {
    if (groundData.shillong && groundData.shillong.date === liveData.date) addReport('shillong', 'teerground_com', 2, groundData.shillong.fr, groundData.shillong.sr);
    if (groundData.khanapara && groundData.khanapara.date === liveData.date) addReport('khanapara', 'teerground_com', 2, groundData.khanapara.fr, groundData.khanapara.sr);
    if (groundData.juwai && groundData.juwai.date === liveData.date) addReport('juwai', 'teerground_com', 2, groundData.juwai.fr, groundData.juwai.sr);
  }

  // 9. TeerTarget.com (Tier 2)
  if (targetData && targetData.shillong) {
    addReport('shillong', 'teertarget_com', 2, targetData.shillong.fr, targetData.shillong.sr);
  }

  // 10. Google Apps Script Proxy (Tier 2)
  if (gasData && gasData.date === liveData.date && gasData.games) {
    for (const g of gameKeys) {
      if (gasData.games[g]) {
        addReport(g, 'gas_datacenter', 2, gasData.games[g].fr, gasData.games[g].sr);
      }
    }
  }

  for (const key of gameKeys) {
    const game = liveData.games[key];
    if (!game) continue;

    const cFR = resolveRoundConsensus(key, 'fr', game.fr, allReports[key]);
    const cSR = resolveRoundConsensus(key, 'sr', game.sr, allReports[key]);

    let targetFR = cFR.declaredNumber;
    let targetSR = cSR.declaredNumber;

    if (cFR.status !== 'PENDING' || cSR.status !== 'PENDING') {
      console.log(`[Consensus ${key.toUpperCase()}] FR=${targetFR} (status: ${cFR.status}, votes: ${cFR.voteCount}, sources: [${cFR.sources.join(', ')}]) | SR=${targetSR} (status: ${cSR.status}, votes: ${cSR.voteCount}, sources: [${cSR.sources.join(', ')}])`);
    }

    // Physical safeguard: Only prevent premature updates for today's upcoming rounds
    if (liveData.date === todayIST) {
      if (game.fr === 'xx' && !isRoundWindowOpen(key, 'fr')) targetFR = 'xx';
      if (game.sr === 'xx' && !isRoundWindowOpen(key, 'sr')) targetSR = 'xx';
    }

    let status = 'UPCOMING';
    if (targetFR !== 'xx' && targetSR !== 'xx') {
      status = 'DECLARED';
    } else if (targetFR !== 'xx') {
      status = 'FR DECLARED';
    } else if (isSunday || (aggregatorData && aggregatorData[key]?.isOffDay)) {
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

      // Broadcast to Telegram channel if a new confirmed number was declared or revised
      const frJustDeclared = oldFR === 'xx' && targetFR !== 'xx';
      const srJustDeclared = oldSR === 'xx' && targetSR !== 'xx';
      const frRevised = oldFR !== 'xx' && targetFR !== 'xx' && oldFR !== targetFR;
      const srRevised = oldSR !== 'xx' && targetSR !== 'xx' && oldSR !== targetSR;

      if (frRevised || srRevised) {
        try {
          await broadcastTeerResult({
            gameKey: key,
            gameName: game.name,
            date: liveData.date || todayIST,
            fr: targetFR,
            sr: targetSR,
            frTime: game.fr_time,
            srTime: game.sr_time,
            roundType: 'UPDATE'
          });
        } catch (e) {
          console.warn(`[Telegram] Broadcast failed for ${key}: ${e.message}`);
        }
      } else if (srJustDeclared) {
        try {
          await broadcastTeerResult({
            gameKey: key,
            gameName: game.name,
            date: liveData.date || todayIST,
            fr: targetFR,
            sr: targetSR,
            frTime: game.fr_time,
            srTime: game.sr_time,
            roundType: targetFR !== 'xx' ? 'FULL' : 'SR_ONLY'
          });
        } catch (e) {
          console.warn(`[Telegram] Broadcast failed for ${key}: ${e.message}`);
        }
      } else if (frJustDeclared) {
        try {
          await broadcastTeerResult({
            gameKey: key,
            gameName: game.name,
            date: liveData.date || todayIST,
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
