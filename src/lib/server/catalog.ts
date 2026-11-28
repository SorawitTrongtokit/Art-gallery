import type { SupabaseClient } from '@supabase/supabase-js';
import {
  artworkSchema, categorySchema, homeSchema, categoryPages, emptyArtwork, emptyHome,
  type Artwork, type Category, type Content, type Draft, type Home, type Kind, type Saved,
} from '../catalog';
import type { ExistingArtwork } from '../csv';
import { publicClient } from './supabase';

type Revision = { id: string; content: Content };
export type Entry = {
  id: string;
  key: string;
  kind: Kind;
  draft_id: string | null;
  published_id: string | null;
  archived_at: string | null;
  draft: Revision | null;
  published: Revision | null;
};

export type HistoryItem = {
  id: string;
  created_at: string;
  actor_id: string;
  action: 'save' | 'publish' | 'archive' | 'restore';
  revision_id: string | null;
  entry: { id: string; key: string; kind: Kind; archived_at: string | null; draft_id: string | null; published_id: string | null };
};

const columns = 'id,key,kind,draft_id,published_id,archived_at,' +
  'draft:catalog_revisions!catalog_entries_id_draft_id_fkey(id,content),' +
  'published:catalog_revisions!catalog_entries_id_published_id_fkey(id,content)';
const publishedColumns = 'key,revision:catalog_revisions!catalog_entries_id_published_id_fkey!inner(id,content,category_code)';

export class CatalogError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

function checked<T>({ data, error }: { data: T; error: { code?: string; message: string } | null }): T {
  if (error) throw new CatalogError(error.code ?? 'unavailable', error.message);
  return data;
}

export function activeRevision(entry: Entry | null): Revision | null {
  return entry?.draft ?? entry?.published ?? null;
}

export function expectedRevision(entry: Entry): string | null {
  return entry.draft_id ?? entry.published_id;
}

export function entryStatus(entry: Entry): string {
  if (entry.archived_at) return 'เก็บเข้าคลัง';
  if (entry.draft_id && entry.published_id) return 'เผยแพร่แล้ว · มีร่างใหม่';
  if (entry.published_id) return 'เผยแพร่แล้ว';
  return 'ร่าง';
}

export function editingArtwork(entry: Entry | null): Artwork {
  return artworkSchema.parse(activeRevision(entry)?.content ?? emptyArtwork);
}

export async function entries(client: SupabaseClient, kind: Kind): Promise<Entry[]> {
  const all: Entry[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const selected = checked(await client.from('catalog_entries').select(columns)
      .eq('kind', kind).order('key').range(offset, offset + pageSize - 1)) as unknown as Entry[];
    all.push(...selected);
    if (selected.length < pageSize) return all;
  }
}

export async function entry(client: SupabaseClient, kind: Kind, key: string): Promise<Entry | null> {
  return checked(await client.from('catalog_entries').select(columns)
    .eq('kind', kind).eq('key', key).maybeSingle()) as unknown as Entry | null;
}

export async function history(client: SupabaseClient, offset: number): Promise<HistoryItem[]> {
  return checked(await client.from('catalog_history')
    .select('id,created_at,actor_id,action,revision_id,entry:catalog_entries(id,key,kind,archived_at,draft_id,published_id)')
    .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 49)) as unknown as HistoryItem[];
}

export async function historicContent(client: SupabaseClient, id: string, revisionId: string): Promise<Content | undefined> {
  const revision = checked(await client.from('catalog_revisions').select('content').eq('entry_id', id)
    .eq('id', revisionId).maybeSingle());
  return revision?.content;
}

export async function existingArtworks(client: SupabaseClient): Promise<Map<string, ExistingArtwork>> {
  const artworks = await entries(client, 'artwork');
  return new Map(artworks.map((current) => [current.key, {
    revision: expectedRevision(current), archived: !!current.archived_at, imageId: editingArtwork(current).imageId,
  }]));
}

export async function saveDrafts(client: SupabaseClient, drafts: Draft[], batchId: string | null = null): Promise<number> {
  return checked(await client.rpc('catalog_save', { p_drafts: drafts, p_import_id: batchId })) as number;
}

export async function changeState(
  client: SupabaseClient,
  action: 'publish' | 'archive' | 'restore',
  items: { id: string; expected: string | null }[],
): Promise<number> {
  return checked(await client.rpc('catalog_change_state', { p_action: action, p_items: items })) as number;
}

async function published<T>(
  kind: Kind, decode: (input: unknown) => T, categoryCode?: string,
): Promise<Saved<T>[]> {
  const query = publicClient().from('catalog_entries').select(publishedColumns).eq('kind', kind).order('key');
  if (categoryCode) query.eq('revision.category_code', categoryCode);
  const data = checked(await query) as unknown as { key: string; revision: Revision }[];
  return data.map(({ key, revision }) => ({ id: revision.id, key, data: decode(revision.content) }));
}

export async function publicCategories() {
  return categoryPages(await published<Category>('category', (data) => categorySchema.parse(data)));
}

export async function publicHome(): Promise<Home> {
  const pages = await published<Home>('home', (data) => homeSchema.parse(data));
  return pages[0]?.data ?? emptyHome;
}

export async function publicArtworks(code: string): Promise<Saved<Artwork>[]> {
  return published<Artwork>('artwork', (data) => artworkSchema.parse(data), code);
}
