import type { APIRoute } from 'astro';
import liveData from '../../../data/teer_live_results.json';
import { fetchShillongCDN, fetchAggregatorData } from '../../../utils/liveTeerFetcher';

export const prerender = false;

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 20 * 1000; // 20 seconds cache on Cloudflare edge

export const GET: APIRoute = async () => {
  const now = Date.now();

  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=30',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Clone baseline data
  const result = JSON.parse(JSON.stringify(liveData));

  try {
    const [shillongCDN, aggregator] = await Promise.all([
      fetchShillongCDN(),
      fetchAggregatorData()
    ]);

    // Update Shillong from CDN or Aggregator
    const shillongFR = (shillongCDN?.fr && shillongCDN.fr !== 'xx') ? shillongCDN.fr : aggregator?.shillong?.fr;
    const shillongSR = (shillongCDN?.sr && shillongCDN.sr !== 'xx') ? shillongCDN.sr : aggregator?.shillong?.sr;

    if (shillongFR && shillongFR !== 'xx') result.games.shillong.fr = shillongFR;
    if (shillongSR && shillongSR !== 'xx') result.games.shillong.sr = shillongSR;
    if (result.games.shillong.fr !== 'xx' && result.games.shillong.sr !== 'xx') {
      result.games.shillong.status = 'DECLARED';
    } else if (result.games.shillong.fr !== 'xx') {
      result.games.shillong.status = 'FR DECLARED';
    }

    // Update Khanapara
    if (aggregator?.khanapara) {
      if (aggregator.khanapara.fr && aggregator.khanapara.fr !== 'xx') result.games.khanapara.fr = aggregator.khanapara.fr;
      if (aggregator.khanapara.sr && aggregator.khanapara.sr !== 'xx') result.games.khanapara.sr = aggregator.khanapara.sr;
      if (result.games.khanapara.fr !== 'xx' && result.games.khanapara.sr !== 'xx') {
        result.games.khanapara.status = 'DECLARED';
      } else if (result.games.khanapara.fr !== 'xx') {
        result.games.khanapara.status = 'FR DECLARED';
      }
    }

    // Update Juwai
    if (aggregator?.juwai) {
      if (aggregator.juwai.fr && aggregator.juwai.fr !== 'xx') result.games.juwai.fr = aggregator.juwai.fr;
      if (aggregator.juwai.sr && aggregator.juwai.sr !== 'xx') result.games.juwai.sr = aggregator.juwai.sr;
      if (result.games.juwai.fr !== 'xx' && result.games.juwai.sr !== 'xx') {
        result.games.juwai.status = 'DECLARED';
      } else if (result.games.juwai.fr !== 'xx') {
        result.games.juwai.status = 'FR DECLARED';
      }
    }

    // Update Night Teer
    if (aggregator?.night) {
      if (aggregator.night.fr && aggregator.night.fr !== 'xx') result.games.night.fr = aggregator.night.fr;
      if (aggregator.night.sr && aggregator.night.sr !== 'xx') result.games.night.sr = aggregator.night.sr;
      if (result.games.night.fr !== 'xx' && result.games.night.sr !== 'xx') {
        result.games.night.status = 'DECLARED';
      } else if (result.games.night.fr !== 'xx') {
        result.games.night.status = 'FR DECLARED';
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
