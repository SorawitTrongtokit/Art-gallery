import type { APIRoute } from 'astro';
import { serveImage } from '../../../lib/server/media';
import { publicClient } from '../../../lib/server/supabase';

export const GET: APIRoute = async ({ params }) => {
  try {
    return await serveImage(publicClient(), params.id, params.size);
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
