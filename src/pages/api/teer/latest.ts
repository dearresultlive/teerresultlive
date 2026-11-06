import type { APIRoute } from 'astro';
import { getFreshTeerData } from '../../../utils/getFreshTeerData';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const isForceRefresh = url.searchParams.has('refresh');

  const data = await getFreshTeerData(isForceRefresh);

  return new Response(JSON.stringify(data), {
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
