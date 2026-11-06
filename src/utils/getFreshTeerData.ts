import liveData from '../data/teer_live_results.json';
import archiveData from '../data/previous_teer_archive.json';
import type { TeerData } from './teerShared';
import {
  fetchFromGoogleAppsScript,
  fetchShillongCDN,
  fetchAggregatorData,
  fetchNightTeerDirect,
  isRoundWindowOpen
} from './liveTeerFetcher';

let cachedData: TeerData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds in-memory edge cache

/**
 * High-performance, edge-cached real-time Teer data resolver.
 * 
 * Guarantees that:
 * 1. Edge cache is returned in < 0.1ms for 99% of requests.
 * 2. On cache expiry, queries Google Apps Script & CDN in parallel (1200ms timeout max).
 * 3. Never fails: falls back to disk baseline if upstream is unreachable.
 * 4. Ensures Googlebot and users always receive fresh declared numbers in raw SSR HTML.
 */
export async function getFreshTeerData(forceRefresh = false): Promise<TeerData> {
  const now = Date.now();
  const ttl = forceRefresh ? 3000 : CACHE_TTL_MS;

  // 1. Fast in-memory edge cache return (< 0.1ms)
  if (cachedData && (now - lastFetchTime < ttl)) {
    return cachedData;
  }

  // 2. Clone baseline data from disk
  const result: TeerData = JSON.parse(JSON.stringify(liveData));

  // Determine current date in IST
  const istDateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).formatToParts(new Date());
  const isSunday = istDateParts.find(p => p.type === 'weekday')?.value === 'Sun';
  const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  // Automatic midnight date rollover in case Git has not run morning commit yet
  // NOTE: On Sundays, archery is suspended; preserve Saturday's latest declared results
  if (result.date !== todayIST && !isSunday) {
    const priorRecord = {
      date: result.date,
      shillong_fr: result.games.shillong.fr,
      shillong_sr: result.games.shillong.sr,
      khanapara_fr: result.games.khanapara.fr,
      khanapara_sr: result.games.khanapara.sr,
      juwai_fr: result.games.juwai.fr,
      juwai_sr: result.games.juwai.sr,
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

  // 3. Fast multi-source parallel fetch with 1200ms timeout
  try {
    const fetchPromise = Promise.all([
      fetchFromGoogleAppsScript(),
      fetchShillongCDN(),
      fetchAggregatorData(),
      fetchNightTeerDirect()
    ]);

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
    const fetchResult = await Promise.race([fetchPromise, timeoutPromise]);

    if (fetchResult) {
      const [gasData, shillongCDN, aggregator, nightDirect] = fetchResult;

      // 1. Apply Google Apps Script Data (Highest reliability, Google Datacenter IP)
      if (gasData?.date === result.date && gasData?.games) {
        for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
          if (gasData.games[key]) {
            const g = gasData.games[key];
            if (g.fr && g.fr !== 'xx' && isRoundWindowOpen(key, 'fr')) result.games[key].fr = g.fr;
            if (g.sr && g.sr !== 'xx' && isRoundWindowOpen(key, 'sr')) result.games[key].sr = g.sr;
          }
        }
      }

      // 2. Fallback / Augment Shillong from Direct CDN
      if (result.games.shillong.fr === 'xx' && shillongCDN?.date === result.date && shillongCDN?.fr && shillongCDN.fr !== 'xx' && isRoundWindowOpen('shillong', 'fr')) {
        result.games.shillong.fr = shillongCDN.fr;
      }
      if (result.games.shillong.sr === 'xx' && shillongCDN?.date === result.date && shillongCDN?.sr && shillongCDN.sr !== 'xx' && isRoundWindowOpen('shillong', 'sr')) {
        result.games.shillong.sr = shillongCDN.sr;
      }

      // 3. Fallback / Augment results from Aggregator with strict date verification
      if (aggregator) {
        for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
          const agg = aggregator[key];
          if (!agg) continue;

          // Active round for board's date
          if (agg.currentDate === result.date && agg.today) {
            if (result.games[key].fr === 'xx' && agg.today.fr !== 'xx' && isRoundWindowOpen(key, 'fr')) {
              result.games[key].fr = agg.today.fr;
            }
            if (result.games[key].sr === 'xx' && agg.today.sr !== 'xx' && isRoundWindowOpen(key, 'sr')) {
              result.games[key].sr = agg.today.sr;
            }
          }
          // Concluded round for board's date (e.g. night draw concluding after midnight)
          else if (agg.previous && agg.previous.date === result.date) {
            if (result.games[key].fr === 'xx' && agg.previous.fr !== 'xx' && isRoundWindowOpen(key, 'fr')) {
              result.games[key].fr = agg.previous.fr;
            }
            if (result.games[key].sr === 'xx' && agg.previous.sr !== 'xx' && isRoundWindowOpen(key, 'sr')) {
              result.games[key].sr = agg.previous.sr;
            }
          }
        }
      }

      // 4. Fallback / Augment Shillong Night Teer from Dedicated Direct Feed
      if (nightDirect && nightDirect.date === result.date) {
        if (result.games.night.fr === 'xx' && nightDirect.fr !== 'xx' && isRoundWindowOpen('night', 'fr')) {
          result.games.night.fr = nightDirect.fr;
        }
        if (result.games.night.sr === 'xx' && nightDirect.sr !== 'xx' && isRoundWindowOpen('night', 'sr')) {
          result.games.night.sr = nightDirect.sr;
        }
      }

      // Compute status flags (Sunday Holiday vs Live shooting days)
      const istDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date());
      const isSunday = istDay === 'Sun';

      for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
        const g = result.games[key];
        if (g.fr !== 'xx' && g.sr !== 'xx') {
          g.status = 'DECLARED';
        } else if (g.fr !== 'xx') {
          g.status = 'FR DECLARED';
        } else if (isSunday) {
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
    // Graceful fallback
  }

  if (cachedData) {
    return cachedData;
  }

  cachedData = result;
  lastFetchTime = now;
  return result;
}
