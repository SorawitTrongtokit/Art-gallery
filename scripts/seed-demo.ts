import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { demoDrafts } from './demo-content.ts';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error('Set ' + key + ' in .env.local');
  return value;
}

const url = new URL(required('SUPABASE_URL'));
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '56321') {
  throw new Error('Demo seeding is available only for the local Inner Child Supabase on port 56321.');
}
const key = required('SUPABASE_PUBLISHABLE_KEY');
const server = createClient(url.origin, required('DEMO_SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
const adminEmail = required('DEMO_ADMIN_EMAIL');
const adminPassword = required('DEMO_ADMIN_PASSWORD');
async function demoUser(email: string, password: string) {
  const list = await server.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (list.error) throw list.error;
  const previous = list.data.users.find((user) => user.email === email);
  if (previous) return previous;
  const created = await server.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  return created.data.user;
}
const admin = await demoUser(adminEmail, adminPassword);
const known = await server.from('catalog_admins').select('user_id').eq('user_id', admin.id).maybeSingle();
if (known.error) throw known.error;
if (!known.data) {
  const granted = await server.from('catalog_admins').insert({ user_id: admin.id });
  if (granted.error) throw granted.error;
}
if (process.env.DEMO_VIEWER_EMAIL && process.env.DEMO_VIEWER_PASSWORD) {
  await demoUser(process.env.DEMO_VIEWER_EMAIL, process.env.DEMO_VIEWER_PASSWORD);
}

const client = createClient(url.origin, key, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = await client.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
if (auth.error) throw auth.error;
const existing = await client.from('catalog_revisions').select('id').limit(1);
if (existing.error) throw existing.error;
if (existing.data.length) {
  console.log('Demo database already contains content. Existing data was kept.');
  process.exit(0);
}

const medium = await client.from('catalog_media').insert({}).select('id').single();
if (medium.error) throw medium.error;
const imageId: string = medium.data.id;
const image = await readFile(new URL('../images/background.jpg', import.meta.url));
for (const [size, longest] of [['thumb', 640], ['display', 1600]] as const) {
  const buffer = await sharp(image).resize({ width: longest, height: longest, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const upload = await client.storage.from('exhibition').upload(imageId + '/' + size + '.webp', buffer, { contentType: 'image/webp' });
  if (upload.error) throw upload.error;
}
const saved = await client.rpc('catalog_save', { p_drafts: demoDrafts(imageId), p_import_id: null });
if (saved.error) throw saved.error;
const drafts = await client.from('catalog_entries').select('id,draft_id').not('draft_id', 'is', null);
if (drafts.error) throw drafts.error;
const published = await client.rpc('catalog_change_state', {
  p_action: 'publish', p_items: drafts.data.map(({ id, draft_id }) => ({ id, expected: draft_id })),
});
if (published.error) throw published.error;
console.log('Published 144 fictional artworks, seven categories and the homepage to local Supabase.');
