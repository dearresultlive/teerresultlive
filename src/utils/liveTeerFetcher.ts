// Browser & Cloudflare Worker compatible live Teer result fetcher
import type { SourceReport } from './teerConsensusEngine';

export const GAS_SCRAPER_URL = 'https://script.google.com/macros/s/AKfycbwmWnd4UFGtupP0c_pi1wAUZ1VRifXuor3hG6WUFym2MZ2aaoPBbk4mrm47eAglgKA/exec';

// Strictly validate and clean 2-digit numbers (00-99 only)
// Get current minutes since midnight in Indian Standard Time (IST)
export function getISTCurrentMinutes(d: Date = new Date()): number {
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
export function isRoundWindowOpen(gameKey: string, round: 'fr' | 'sr', now: Date = new Date()): boolean {
  const cur = getISTCurrentMinutes(now);
  // Early morning guard (12:00 AM - 7:00 AM): Day draws not running; night teer concluded
  if (cur < 7 * 60) {
    return gameKey === 'night';
  }
  // Earliest allowable draw times in IST (matches official grounds with 5-min buffer)
  const EARLIEST_MINUTES: Record<string, { fr: number; sr: number }> = {
    juwai: { fr: 13 * 60 + 15, sr: 14 * 60 + 0 },    // 1:35 PM / 2:20 PM (Jowai timing)
    shillong: { fr: 15 * 60 + 30, sr: 16 * 60 + 30 }, // 3:30 PM / 4:30 PM (Polo Ground real shooting start)
    khanapara: { fr: 15 * 60 + 45, sr: 16 * 60 + 15 },// 3:45 PM / 4:15 PM (Khanapara real shooting start)
    night: { fr: 22 * 60 + 15, sr: 23 * 60 + 15 }     // 10:15 PM / 11:15 PM (Night Archery real shooting start)
  };
  const limits = EARLIEST_MINUTES[gameKey];
  if (!limits) return true;
  return cur >= limits[round];
}

export function cleanNumber(val: any): string {
  if (val === undefined || val === null) return 'xx';
  const str = String(val).trim().toLowerCase();
  if (!str || str === '—' || str === '-' || str === '--' || str === '---' || str === 'xx' || str === '??' || str === 'null' || str === 'undefined' || str === 'nan') return 'xx';
  const match = str.match(/^(\d{1,2})$/);
  return match ? match[1].padStart(2, '0') : 'xx';
}

// Source 1: Google Apps Script Web App (Hosted on Google datacenter, immune to Cloudflare bot blocks)
export async function fetchFromGoogleAppsScript(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(GAS_SCRAPER_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.games) {
        return data;
      }
    }
  } catch (err: any) {
    // console.warn('GAS fetch skipped:', err.message);
  }
  return null;
}

// Source 2: Direct CDN API for Shillong Teer
export async function fetchShillongCDN(): Promise<{ date: string; fr: string; sr: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://cdn.shillongteerground.com/teer/api/results/latest/index.json', {
      signal: controller.signal,
      headers: {
        'Referer': 'https://shillongteerground.com/',
        'Origin': 'https://shillongteerground.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      return {
        date: data.date,
        fr: cleanNumber(data.first_round),
        sr: cleanNumber(data.second_round)
      };
    }
  } catch (err: any) {
    // console.warn('CDN fetch skipped:', err.message);
  }
  return null;
}

export interface AggregatorGame {
  currentDate: string;
  isOffDay: boolean;
  today: { fr: string; sr: string } | null;
  previous: { date: string; fr: string; sr: string } | null;
}

// Source 3: Multi-Game Aggregator for Shillong, Khanapara, Juwai, and Night Teer
export async function fetchAggregatorData(): Promise<Record<string, AggregatorGame> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://teerresult.com', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();

    const games = ['shillong', 'khanapara', 'juwai', 'night'];
    const extracted: Record<string, AggregatorGame> = {};

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
  } catch (err: any) {
    // console.warn('Aggregator fetch skipped:', err.message);
    return null;
  }
}

// Source 4: Dedicated Shillong Night Teer Direct Feed (nightteer.com)
export async function fetchNightTeerDirect(): Promise<{ date: string; fr: string; sr: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://nightteer.com', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    const dateMatch = text.match(/<h2>\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*<\/h2>/i);
    let date = '';
    if (dateMatch) {
      date = dateMatch[3] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0');
    }
    const rowMatch = text.match(/<tr style="[^"]*background-color:\s*cream[^"]*">\s*<td align="center">\s*(\d{1,2}|xx|\?\?)\s*<\/td>\s*<td align="center">\s*(\d{1,2}|xx|\?\?)\s*<\/td>/i);
    if (date && rowMatch) {
      return {
        date,
        fr: cleanNumber(rowMatch[1]),
        sr: cleanNumber(rowMatch[2])
      };
    }
  } catch (err: any) {
    // skip
  }
  return null;
}


// Source 5: Multi-Game Fallback Feed from teerresulttoday.org
export async function fetchFromTeerResultToday(targetDate?: string): Promise<{
  shillong?: { fr: string; sr: string };
  juwai?: { fr: string; sr: string };
  khanapara?: { fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://teerresulttoday.org', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const tDate = targetDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const [y, m, d] = tDate.split('-');
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const expectedDate = `${parseInt(d, 10)} ${monthsFull[parseInt(m, 10) - 1]} ${y}`; // e.g. "11 November 2026"

    const result: {
      shillong: { fr: string; sr: string };
      juwai: { fr: string; sr: string };
      khanapara: { fr: string; sr: string };
    } = {
      shillong: { fr: 'xx', sr: 'xx' },
      juwai: { fr: 'xx', sr: 'xx' },
      khanapara: { fr: 'xx', sr: 'xx' }
    };

    const cards = [...html.matchAll(/<span class="trs-result-date">([^<]+)<\/span>[\s\S]*?<table[^>]*class="[^"]*trs-table[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)];
    for (const card of cards) {
      const cardDate = card[1].trim();
      if (cardDate !== expectedDate) continue; // Skip stale yesterday boards!

      const tableContent = card[2];
      let gameKey: 'shillong' | 'juwai' | 'khanapara' | null = null;
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
  } catch (err: any) {
    return null;
  }
}


// Source 6: Dedicated Official Khanapara Feed (khanaparateer.org)
export async function fetchKhanaparaOrg(): Promise<{ fr: string; sr: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://khanaparateer.org', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    // Check if page corresponds to today's date
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const [year, month, day] = today.split('-');
    const dayInt = parseInt(day, 10);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const curMonth = monthNames[parseInt(month, 10) - 1];
    
    // Check if title or header contains today's date
    const hasToday = html.includes(`${curMonth} ${dayInt}, ${year}`) || html.includes(`${dayInt} ${curMonth} ${year}`);
    if (!hasToday) return null;

    // Check Table 0: <div class=today-blue-circle> XX </div>
    const circleMatches = [...html.matchAll(/class=["']?today-blue-circle["']?[^>]*>([\s\S]*?)<\/div>/gi)];
    if (circleMatches.length >= 1) {
      const fr = cleanNumber(circleMatches[0][1].replace(/<[^>]+>/g, '').trim());
      const sr = circleMatches.length >= 2 ? cleanNumber(circleMatches[1][1].replace(/<[^>]+>/g, '').trim()) : 'xx';
      if (fr !== 'xx' || sr !== 'xx') {
        return { fr, sr };
      }
    }
  } catch (err: any) {
    // skip
  }
  return null;
}

// Source 0 (Ultra High-Speed): Direct Real-Time JSON API from instantteerresults.in
export async function fetchFromInstantTeerResults(): Promise<{
  date?: string;
  shillong?: { fr: string; sr: string };
  khanapara?: { fr: string; sr: string };
  juwai?: { fr: string; sr: string };
  night?: { fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://instantteerresults.in/results.json?_t=' + Date.now(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data || !data.date) return null;

    const parseGame = (g: any) => ({
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
  } catch (e) {
    return null;
  }
}

// Source 7: TeerResults.net Table Parser (Shillong)
export async function fetchTeerResultsNet(targetDate?: string): Promise<{
  shillong?: { date: string; fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://teerresults.net', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const tDate = targetDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const [year, month, day] = tDate.split('-');
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expectedShortDate = `${parseInt(day, 10)} ${monthsShort[parseInt(month, 10) - 1]} ${year}`.toLowerCase(); // e.g. "11 nov 2026"

    const m = html.match(/Shillong Teer Result Today[\s\S]*?Date:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})[\s\S]*?<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (m) {
      const rawDate = m[1].trim();
      // Date verification: must match today's date!
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
export async function fetchTeerGroundCom(): Promise<{
  shillong?: { date: string; fr: string; sr: string };
  khanapara?: { date: string; fr: string; sr: string };
  juwai?: { date: string; fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://teerground.com', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const blocks = [...html.matchAll(/(Shillong|Khanapara|Juwai)<!-- -->\s*Teer Result[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/gi)];
    const result: any = {};
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
export async function fetchTeerTargetCom(targetDate?: string): Promise<{
  shillong?: { date: string; fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://teertarget.com', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    clearTimeout(timeout);
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

/**
 * Collects reports from all 10 sources across all games for the consensus engine.
 */

// Source 10: Dedicated Ultra-Fast Feed from teerresults.com (Juwai, Shillong, Khanapara, Night)
export async function fetchFromTeerResultsDotCom(targetDate?: string): Promise<{
  juwai?: { date: string; fr: string; sr: string };
  shillong?: { date: string; fr: string; sr: string };
  khanapara?: { date: string; fr: string; sr: string };
  night?: { date: string; fr: string; sr: string };
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://www.teerresults.com/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const expectedDate = targetDate
      ? targetDate.split('-').reverse().join('-')
      : new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata' }).format(new Date()).replace(/\//g, '-');

    if (!html.includes(expectedDate)) return null;

    const result: any = {};
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    const tables = [...html.matchAll(tableRegex)];

    for (const t of tables) {
      const tableHtml = t[0];
      let gameKey: string | null = null;
      if (/Juwai\s*Teer/i.test(tableHtml)) gameKey = 'juwai';
      else if (/Shillong\s*Teer/i.test(tableHtml)) gameKey = 'shillong';
      else if (/Khanapara\s*Teer/i.test(tableHtml)) gameKey = 'khanapara';
      else if (/Night\s*Teer/i.test(tableHtml)) gameKey = 'night';

      if (!gameKey) continue;

      const rows = [...tableHtml.matchAll(/<tr>[\s\S]*?<\/tr>/gi)];
      if (rows.length >= 3) {
        const resultRow = rows[2][0];
        const cells = [...resultRow.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        if (cells.length >= 2) {
          const fr = cleanNumber(cells[0][1].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim());
          const sr = cleanNumber(cells[1][1].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim());
          if (fr !== 'xx' || sr !== 'xx') {
            result[gameKey] = {
              date: targetDate || expectedDate.split('-').reverse().join('-'),
              fr,
              sr
            };
          }
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    return null;
  }
}

export async function collectAllSourceReports(targetDate: string): Promise<Record<string, SourceReport[]>> {
  const reports: Record<string, SourceReport[]> = {
    shillong: [],
    khanapara: [],
    juwai: [],
    night: []
  };

  const results = await Promise.allSettled([
    fetchFromInstantTeerResults(),     // 0. InstantTeer API (Tier 1)
    fetchShillongCDN(),                // 1. Polo Ground CDN (Tier 1)
    fetchFromTeerResultToday(targetDate),        // 2. TeerResultToday (Tier 2)
    fetchAggregatorData(),             // 3. TeerResult Aggregator (Tier 2)
    fetchKhanaparaOrg(),               // 4. KhanaparaTeer.org (Tier 2)
    fetchNightTeerDirect(),            // 5. NightTeer.com (Tier 2)
    fetchTeerResultsNet(targetDate),   // 6. TeerResults.net (Tier 2)
    fetchTeerGroundCom(),              // 7. TeerGround.com (Tier 2)
    fetchTeerTargetCom(targetDate),    // 8. TeerTarget.com (Tier 2)
    fetchFromGoogleAppsScript(),       // 9. Google Apps Script Proxy (Tier 2)
    fetchFromTeerResultsDotCom(targetDate) // 10. TeerResults.com Ultra-Fast Juwai/Multi-Game (Tier 2)
  ]);

  const [
    instantRes,
    cdnRes,
    teerTodayRes,
    aggRes,
    khanaparaRes,
    nightDirectRes,
    netRes,
    groundRes,
    targetRes,
    gasRes,
    teerResultsComRes
  ] = results.map(r => r.status === 'fulfilled' ? r.value : null);

  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const isToday = targetDate === todayIST;

  const addReport = (game: string, source: string, tier: 1 | 2, fr: string, sr: string) => {
    if (!reports[game]) return;
    const cleanFR = (isToday && !isRoundWindowOpen(game, 'fr')) ? 'xx' : cleanNumber(fr);
    const cleanSR = (isToday && !isRoundWindowOpen(game, 'sr')) ? 'xx' : cleanNumber(sr);
    if (cleanFR !== 'xx' || cleanSR !== 'xx') {
      reports[game].push({
        source,
        tier,
        fr: cleanFR,
        sr: cleanSR
      });
    }
  };

  // 1. InstantTeer (Tier 1 verified machine feed)
  if (instantRes && instantRes.date === targetDate) {
    if (instantRes.shillong) addReport('shillong', 'instantteer_api', 1, instantRes.shillong.fr, instantRes.shillong.sr);
    if (instantRes.khanapara) addReport('khanapara', 'instantteer_api', 1, instantRes.khanapara.fr, instantRes.khanapara.sr);
    if (instantRes.juwai) addReport('juwai', 'instantteer_api', 1, instantRes.juwai.fr, instantRes.juwai.sr);
    if (instantRes.night) addReport('night', 'instantteer_api', 1, instantRes.night.fr, instantRes.night.sr);
  }

  // 2. Polo Ground CDN (Tier 1 direct machine feed)
  if (cdnRes && cdnRes.date === targetDate) {
    addReport('shillong', 'polo_ground_cdn', 1, cdnRes.fr, cdnRes.sr);
  }

  // 3. TeerResultToday (Tier 2 web scraper)
  if (teerTodayRes) {
    if (teerTodayRes.shillong) addReport('shillong', 'teerresulttoday', 2, teerTodayRes.shillong.fr, teerTodayRes.shillong.sr);
    if (teerTodayRes.khanapara) addReport('khanapara', 'teerresulttoday', 2, teerTodayRes.khanapara.fr, teerTodayRes.khanapara.sr);
    if (teerTodayRes.juwai) addReport('juwai', 'teerresulttoday', 2, teerTodayRes.juwai.fr, teerTodayRes.juwai.sr);
  }

  // 4. TeerResult Aggregator (Tier 2)
  if (aggRes) {
    for (const g of ['shillong', 'khanapara', 'juwai', 'night']) {
      const agg = aggRes[g];
      if (agg?.currentDate === targetDate && agg.today) {
        addReport(g, 'teerresult_agg', 2, agg.today.fr, agg.today.sr);
      } else if (agg?.previous?.date === targetDate) {
        addReport(g, 'teerresult_agg', 2, agg.previous.fr, agg.previous.sr);
      }
    }
  }

  // 5. KhanaparaTeer.org Official Direct Feed (Tier 1 Fast-Track)
  if (khanaparaRes) {
    addReport('khanapara', 'khanaparateer_org', 1, khanaparaRes.fr, khanaparaRes.sr);
  }

  // 6. NightTeer.com Official Direct Feed (Tier 1 Fast-Track)
  if (nightDirectRes && nightDirectRes.date === targetDate) {
    addReport('night', 'nightteer_direct', 1, nightDirectRes.fr, nightDirectRes.sr);
  }

  // 7. TeerResults.net (Tier 2)
  if (netRes && netRes.shillong) {
    addReport('shillong', 'teerresults_net', 2, netRes.shillong.fr, netRes.shillong.sr);
  }

  // 8. TeerGround.com (Tier 2)
  if (groundRes) {
    if (groundRes.shillong && groundRes.shillong.date === targetDate) addReport('shillong', 'teerground_com', 2, groundRes.shillong.fr, groundRes.shillong.sr);
    if (groundRes.khanapara && groundRes.khanapara.date === targetDate) addReport('khanapara', 'teerground_com', 2, groundRes.khanapara.fr, groundRes.khanapara.sr);
    if (groundRes.juwai && groundRes.juwai.date === targetDate) addReport('juwai', 'teerground_com', 2, groundRes.juwai.fr, groundRes.juwai.sr);
  }

  // 9. TeerTarget.com (Tier 2)
  if (targetRes && targetRes.shillong) {
    addReport('shillong', 'teertarget_com', 2, targetRes.shillong.fr, targetRes.shillong.sr);
  }

  // 10. Google Apps Script Proxy (Tier 2)
  if (gasRes && gasRes.date === targetDate && gasRes.games) {
    for (const g of ['shillong', 'khanapara', 'juwai', 'night']) {
      if (gasRes.games[g]) {
        addReport(g, 'gas_datacenter', 2, gasRes.games[g].fr, gasRes.games[g].sr);
      }
    }
  }

  
  // 11. TeerResults.com Ultra-Fast Trusted VIP Feed (Juwai, Shillong, Khanapara, Night) - Tier 1 Fast-Track
  if (teerResultsComRes) {
    if (teerResultsComRes.juwai) addReport('juwai', 'teerresults_com', 1, teerResultsComRes.juwai.fr, teerResultsComRes.juwai.sr);
    if (teerResultsComRes.shillong) addReport('shillong', 'teerresults_com', 1, teerResultsComRes.shillong.fr, teerResultsComRes.shillong.sr);
    if (teerResultsComRes.khanapara) addReport('khanapara', 'teerresults_com', 1, teerResultsComRes.khanapara.fr, teerResultsComRes.khanapara.sr);
    if (teerResultsComRes.night) addReport('night', 'teerresults_com', 1, teerResultsComRes.night.fr, teerResultsComRes.night.sr);
  }

  return reports;
}
