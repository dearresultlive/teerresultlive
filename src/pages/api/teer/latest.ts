import type { APIRoute } from 'astro';
import liveData from '../../../data/teer_live_results.json';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(liveData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=10, s-maxage=15, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
