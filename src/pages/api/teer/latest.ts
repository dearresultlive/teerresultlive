import type { APIRoute } from 'astro';
import { getFreshTeerData, isArcheryShootingHour } from '../../../utils/getFreshTeerData';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const isForceRefresh = url.searchParams.get('refresh') === '1';

  const data = await getFreshTeerData(isForceRefresh);

  const isLiveWindow = isArcheryShootingHour();
  const cacheHeader = isForceRefresh
    ? 'no-store, no-cache, must-revalidate, max-age=0'
    : (isLiveWindow
      ? 'public, max-age=2, s-maxage=3, stale-while-revalidate=5'
      : 'public, max-age=10, s-maxage=15, stale-while-revalidate=30');

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheHeader,
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
