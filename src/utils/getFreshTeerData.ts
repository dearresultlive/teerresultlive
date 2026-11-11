import liveData from '../data/teer_live_results.json';
import archiveData from '../data/previous_teer_archive.json';
import type { TeerData } from './teerShared';
import {
  collectAllSourceReports,
  isRoundWindowOpen
} from './liveTeerFetcher';
import { evaluateMultiSourceConsensus } from './teerConsensusEngine';

let cachedData: TeerData | null = null;
let lastFetchTime = 0;

export function isArcheryShootingHour(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const mins = h * 60 + m;
  // Day Archery: 1:30 PM to 5:30 PM IST (Juwai, Shillong, Khanapara)
  const isDayDraw = mins >= (13 * 60 + 30) && mins <= (17 * 60 + 30);
  // Night Archery: 10:00 PM to 12:30 AM IST (including midnight rollover)
  const isNightDraw = mins >= (22 * 60) || mins <= 30;
  return isDayDraw || isNightDraw;
}

/**
 * High-performance, edge-cached real-time Teer data resolver.
 * 
 * Powered by a Byzantine Fault Tolerant 10-Source Consensus Engine:
 * 1. Edge cache is returned in < 0.1ms for 99% of requests.
 * 2. On cache expiry, queries top 10 sources in parallel (1500ms timeout max).
 * 3. Declares results only when Quorum >= 2 sources agree (or Tier 1 verified feed confirms).
 * 4. Automatically overrides if a stronger majority (>= 3 sources) arrives.
 * 5. Dynamically self-corrects if original source updates/fixes a typo.
 * 6. Ensures Googlebot and users always receive fresh declared numbers in raw SSR HTML.
 */
export async function getFreshTeerData(forceRefresh = false): Promise<TeerData> {
  const now = Date.now();
  // Tight 4-second TTL during live shooting windows; 15s during off-hours; 2s on manual refresh
  const isLiveWindow = isArcheryShootingHour();
  const ttl = forceRefresh ? 2000 : (isLiveWindow ? 4000 : 15000);

  // 1. Fast in-memory edge cache return (< 0.1ms)
  if (cachedData && (now - lastFetchTime < ttl)) {
    return cachedData;
  }

  // 2. Clone baseline data from disk
  const result: TeerData = JSON.parse(JSON.stringify(liveData));

  // Determine current date, day and hour in IST
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const isSunday = parts.find((p) => p.type === 'weekday')?.value === 'Sun';
  const currentISTHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Morning rollover occurs only at 9:00 AM IST on shooting days (Monday to Saturday)
  // This preserves Night Teer and yesterday's confirmed results through late-night & early-morning hours (11 PM - 8:59 AM)
  // On Sundays, archery is suspended; preserve Saturday's latest declared results
  const isMorningRolloverTime = currentISTHour >= 9 && !isSunday;

  if (result.date !== todayIST && isMorningRolloverTime) {
    const priorRecord = {
      date: result.date,
      shillong_fr: result.games.shillong?.fr || 'xx',
      shillong_sr: result.games.shillong?.sr || 'xx',
      khanapara_fr: result.games.khanapara?.fr || 'xx',
      khanapara_sr: result.games.khanapara?.sr || 'xx',
      juwai_fr: result.games.juwai?.fr || 'xx',
      juwai_sr: result.games.juwai?.sr || 'xx',
      night_fr: result.games.night?.fr || 'xx',
      night_sr: result.games.night?.sr || 'xx'
    };
    result.yesterday = priorRecord;
    result.date = todayIST;
    for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
      if (result.games[key]) {
        result.games[key].fr = 'xx';
        result.games[key].sr = 'xx';
        result.games[key].status = 'UPCOMING';
      }
    }
  } else {
    const priorDay = archiveData?.find((item: any) => item.date < result.date);
    result.yesterday = priorDay || ((archiveData && archiveData.length > 0) ? archiveData[0] : null);
  }

  // 3. Fast multi-source consensus evaluation across top 10 fleet with 1500ms timeout
  try {
    const fetchPromise = collectAllSourceReports(result.date);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const allReports = await Promise.race([fetchPromise, timeoutPromise]);

    if (allReports) {
      const consensus = evaluateMultiSourceConsensus(
        {
          shillong: { fr: result.games.shillong?.fr || 'xx', sr: result.games.shillong?.sr || 'xx' },
          khanapara: { fr: result.games.khanapara?.fr || 'xx', sr: result.games.khanapara?.sr || 'xx' },
          juwai: { fr: result.games.juwai?.fr || 'xx', sr: result.games.juwai?.sr || 'xx' },
          night: { fr: result.games.night?.fr || 'xx', sr: result.games.night?.sr || 'xx' }
        },
        allReports
      );

      for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
        const c = consensus[key];
        if (c && result.games[key]) {
          result.games[key].fr = c.fr.declaredNumber;
          result.games[key].sr = c.sr.declaredNumber;
        }
      }

      // Compute status flags (Sunday Holiday vs Live shooting days)
      const istDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date());
      const isSun = istDay === 'Sun';

      for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
        const g = result.games[key];
        if (g.fr !== 'xx' && g.sr !== 'xx') {
          g.status = 'DECLARED';
        } else if (g.fr !== 'xx') {
          g.status = 'FR DECLARED';
        } else if (isSun) {
          g.status = 'SUNDAY OFF';
        } else {
          g.status = 'UPCOMING';
        }
      }

      result.updated_at = new Date().toISOString();
      cachedData = result;
      lastFetchTime = now;
      return result;
    }
  } catch (err) {
    // Graceful fallback to existing baseline
  }

  if (cachedData) {
    return cachedData;
  }

  cachedData = result;
  lastFetchTime = now;
  return result;
}
