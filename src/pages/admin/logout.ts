import type { APIRoute } from 'astro';
import { sameOrigin } from '../../lib/server/auth';

export const POST: APIRoute = async ({ locals, request, url, redirect }) => {
  if (!sameOrigin(request, url)) return new Response(null, { status: 403 });
  const result = await locals.admin?.client.auth.signOut({ scope: 'local' });
  if (result?.error) return new Response('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง', { status: 503 });
  return redirect('/admin/login', 303);
};
