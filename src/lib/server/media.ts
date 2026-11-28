import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CatalogError } from './catalog';
import { supabaseConfig } from './supabase';

export const mediaSizes = ['thumb', 'display'] as const;
export const mediaBucket = 'exhibition';

export async function reserveMedia(client: SupabaseClient) {
  const { data: asset, error } = await client.from('catalog_media').insert({}).select('id').single();
  if (error) throw new CatalogError(error.code, error.message);
  const storage = client.storage.from(mediaBucket);
  const sizes = await Promise.all(mediaSizes.map(async (size) => {
    const { data, error: uploadError } = await storage.createSignedUploadUrl(asset.id + '/' + size + '.webp');
    if (uploadError) throw uploadError;
    return { size, path: data.path, token: data.token };
  }));
  return { id: asset.id as string, ...supabaseConfig(), bucket: mediaBucket, sizes };
}

export async function serveImage(client: SupabaseClient, id: string | undefined, size: string | undefined) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!z.uuid().safeParse(id).success || (size !== 'thumb' && size !== 'display')) {
    return new Response(null, { status: 404, headers });
  }
  const { data: asset } = await client.from('catalog_media').select('id').eq('id', id).maybeSingle();
  if (!asset) return new Response(null, { status: 404, headers });
  const { data, error } = await client.storage.from(mediaBucket).createSignedUrl(id + '/' + size + '.webp', 300);
  if (error) return new Response(null, { status: 404, headers });
  return new Response(null, { status: 302, headers: { ...headers, Location: data.signedUrl } });
}
