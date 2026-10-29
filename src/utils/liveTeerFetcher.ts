// Browser & Cloudflare Worker compatible live Teer result fetcher

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
    juwai: { fr: 13 * 60 + 40, sr: 14 * 60 + 25 },    // 1:40 PM / 2:25 PM
    shillong: { fr: 15 * 60 + 40, sr: 16 * 60 + 40 }, // 3:40 PM / 4:40 PM
    khanapara: { fr: 15 * 60 + 55, sr: 16 * 60 + 25 },// 3:55 PM / 4:25 PM
    night: { fr: 22 * 60 + 20, sr: 23 * 60 + 20 }     // 10:20 PM / 11:20 PM
  };
  const limits = EARLIEST_MINUTES[gameKey];
  if (!limits) return true;
  return cur >= limits[round];
}

export function cleanNumber(val: any): string {
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
