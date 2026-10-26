import type { APIRoute } from 'astro';
import liveData from '../../../data/teer_live_results.json';
import {
  fetchFromGoogleAppsScript,
  fetchShillongCDN,
  fetchAggregatorData
} from '../../../utils/liveTeerFetcher';

export const prerender = false;

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds edge cache

export const GET: APIRoute = async ({ request }) => {
  const now = Date.now();
  const url = new URL(request.url);
  const isForceRefresh = url.searchParams.has('refresh');

  // If cached and fresh within TTL (or within 3s throttle on manual refresh), return edge cache
  const ttl = isForceRefresh ? 3000 : CACHE_TTL_MS;
  if (cachedData && now - lastFetchTime < ttl) {
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Clone baseline data from disk
  const result = JSON.parse(JSON.stringify(liveData));

  try {
    // Multi-tier parallel fetch (Google Apps Script -> Shillong CDN -> Aggregator)
    const [gasData, shillongCDN, aggregator] = await Promise.all([
      fetchFromGoogleAppsScript(),
      fetchShillongCDN(),
      fetchAggregatorData()
    ]);

    // 1. Apply Google Apps Script Data (Highest reliability, Google Datacenter IP)
    if (gasData?.games) {
      for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
        if (gasData.games[key]) {
          const g = gasData.games[key];
          if (g.fr && g.fr !== 'xx') result.games[key].fr = g.fr;
          if (g.sr && g.sr !== 'xx') result.games[key].sr = g.sr;
          if (g.status) result.games[key].status = g.status;
        }
      }
    }

    // 2. Fallback / Augment Shillong from Direct CDN
    if (result.games.shillong.fr === 'xx' && shillongCDN?.fr && shillongCDN.fr !== 'xx') {
      result.games.shillong.fr = shillongCDN.fr;
    }
    if (result.games.shillong.sr === 'xx' && shillongCDN?.sr && shillongCDN.sr !== 'xx') {
      result.games.shillong.sr = shillongCDN.sr;
    }

    // 3. Fallback / Augment Khanapara, Juwai, Night from Aggregator
    if (aggregator) {
      for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
        if (result.games[key].fr === 'xx' && aggregator[key]?.fr && aggregator[key].fr !== 'xx') {
          result.games[key].fr = aggregator[key].fr;
        }
        if (result.games[key].sr === 'xx' && aggregator[key]?.sr && aggregator[key].sr !== 'xx') {
          result.games[key].sr = aggregator[key].sr;
        }
      }
    }

    // Compute status flags (Sunday Holiday vs Live shooting days)
    const istDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date());
    const isSunday = istDay === 'Sun';

    for (const key of ['shillong', 'khanapara', 'juwai', 'night']) {
      const g = result.games[key];
      if (isSunday) {
        g.status = 'SUNDAY OFF';
      } else if (g.fr !== 'xx' && g.sr !== 'xx') {
        g.status = 'DECLARED';
      } else if (g.fr !== 'xx') {
        g.status = 'FR DECLARED';
      } else {
        g.status = 'UPCOMING';
      }
    }

    result.updated_at = new Date().toISOString();
    cachedData = result;
    lastFetchTime = now;
  } catch (err) {
    if (!cachedData) cachedData = result;
  }

  return new Response(JSON.stringify(cachedData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

export const HEAD: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

export const ALL: APIRoute = GET;
