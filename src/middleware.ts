import { defineMiddleware } from 'astro:middleware';
import { readAdmin } from './lib/server/auth';

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
};

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/\/$/, '');
  const adminPath = path === '/admin' || path.startsWith('/admin/');
  if (!adminPath) return next();

  if (path !== '/admin/login') {
    try {
      context.locals.admin = await readAdmin(context.cookies, context.request, context.url.protocol === 'https:');
    } catch {
      return new Response('ระบบจัดการยังไม่พร้อม กรุณาลองใหม่ในภายหลัง', { status: 503, headers: privateHeaders });
    }
    if (!context.locals.admin) {
      if (path.startsWith('/admin/api/') || path.startsWith('/admin/image/')) {
        return Response.json({ message: 'กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน' }, { status: 401, headers: privateHeaders });
      }
      return new Response(null, { status: 303, headers: { ...privateHeaders, Location: '/admin/login' } });
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(privateHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
