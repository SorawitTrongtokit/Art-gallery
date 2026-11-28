import type { APIRoute } from 'astro';
import { serveImage } from '../../../../lib/server/media';

export const GET: APIRoute = ({ locals, params }) => locals.admin
  ? serveImage(locals.admin.client, params.id, params.size)
  : new Response(null, { status: 401 });
