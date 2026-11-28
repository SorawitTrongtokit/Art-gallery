import type { AstroCookies } from 'astro';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase environment has not been configured');
  return { url, key };
}

export function publicClient() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function sessionClient(cookies: AstroCookies, request: Request, secure: boolean) {
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookieOptions: { path: '/', httpOnly: true, secure, sameSite: 'lax' },
    cookies: {
      getAll: () => {
        const header = request.headers.get('Cookie');
        if (!header) return [];
        return [...new Set(header.split(';').map((part) => part.trim().split('=')[0]).filter(Boolean))]
          .flatMap((name) => {
            const value = cookies.get(name)?.value;
            return value === undefined ? [] : [{ name, value }];
          });
      },
      setAll: (values) => {
        for (const { name, value, options } of values) cookies.set(name, value, options);
      },
    },
  });
}
