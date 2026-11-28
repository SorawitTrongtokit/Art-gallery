import type { AstroCookies } from 'astro';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { sessionClient } from './supabase';

export type Admin = { client: SupabaseClient; user: User };

export async function readAdmin(cookies: AstroCookies, request: Request, secure: boolean): Promise<Admin | undefined> {
  const client = sessionClient(cookies, request, secure);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return undefined;
  const { data: member, error: membershipError } = await client.from('catalog_admins')
    .select('user_id').eq('user_id', user.id).maybeSingle();
  if (membershipError) throw membershipError;
  if (member) return { client, user };
}

export function sameOrigin(request: Request, url: URL): boolean {
  return request.headers.get('Origin') === url.origin;
}
