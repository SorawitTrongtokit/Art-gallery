import { z } from 'zod';

export const categories = [
  { code: '01', slug: 'hugs-of-memories', enTitle: 'Hugs of Memories', thTitle: 'น้องเน่า', symbol: '🧸' },
  { code: '02', slug: 'tiny-treasures', enTitle: 'Tiny Treasures', thTitle: 'ตุ๊กตาโมเดล', symbol: '🤖' },
  { code: '03', slug: 'adventures-in-childhood', enTitle: 'Adventures in Childhood', thTitle: 'การละเล่น', symbol: '⚽' },
  { code: '04', slug: 'moods-with-toys', enTitle: 'Moods with Toys', thTitle: 'ของเล่น', symbol: '🧩' },
  { code: '05', slug: 'enjoy-the-pixels', enTitle: 'Enjoy the Pixels', thTitle: 'เกม', symbol: '🎮' },
  { code: '06', slug: 'travel-through-tunes', enTitle: 'Travel Through Tunes', thTitle: 'หนัง', symbol: '📺' },
  { code: '07', slug: 'soon-to-be-yesterday', enTitle: 'Soon to Be Yesterday', thTitle: 'ภาพวัยเด็ก/ ชุดเด็ก', symbol: '👗' },
] as const;

export const categoryCode = z.enum(['01', '02', '03', '04', '05', '06', '07']);
export const workCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{0,39}$/, 'ใช้ตัวอักษรอังกฤษ ตัวเลข หรือขีดกลาง');
const short = z.string().trim().max(240);
const long = z.string().trim().max(12000);
const imageId = z.uuid().nullable();

export const artworkSchema = z.strictObject({
  categoryCode,
  title: short,
  artist: short,
  technique: short,
  type: short,
  concept: long,
  imageId,
  imageAlt: short,
});
export const categorySchema = z.strictObject({
  enTitle: short,
  thTitle: short,
  symbol: z.string().trim().max(24),
  description: long,
  poem: long,
});

export const contactUrl = z.string().trim().max(1000).refine((value) => {
  if (!value) return true;
  try {
    return ['https:', 'mailto:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'ใช้ลิงก์ HTTPS หรือ mailto:');

export const homeSchema = z.strictObject({
  storyTitle: short,
  storyIntro: long,
  steps: z.array(z.strictObject({ title: short, text: long })).max(16),
  contactTitle: short,
  contactText: long,
  contacts: z.array(z.strictObject({ label: short, url: contactUrl })).max(16),
  slides: z.array(z.strictObject({ tag: short, title: short, text: long, imageId, imageAlt: short })).max(30),
});

export const revisionId = z.uuid().nullable();
const identity = { expected: revisionId };
export const draftSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...identity, kind: z.literal('artwork'), key: workCode, data: artworkSchema }),
  z.strictObject({ ...identity, kind: z.literal('category'), key: categoryCode, data: categorySchema }),
  z.strictObject({ ...identity, kind: z.literal('home'), key: z.literal('home'), data: homeSchema }),
]);

export type Draft = z.infer<typeof draftSchema>;
export type Artwork = z.infer<typeof artworkSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CategoryCode = z.infer<typeof categoryCode>;
export type Home = z.infer<typeof homeSchema>;
export type Kind = Draft['kind'];
export type Content = Draft['data'];
export type Saved<T> = { id: string; key: string; data: T };
export type CategoryPage = Category & { code: CategoryCode; slug: string };

export const emptyArtwork: Artwork = {
  categoryCode: '01', title: '', artist: '', technique: '', type: '', concept: '', imageId: null, imageAlt: '',
};

export const emptyHome: Home = {
  storyTitle: '', storyIntro: '', steps: [], contactTitle: '', contactText: '', contacts: [], slides: [],
};

export function categoryPages(overrides: Saved<Category>[]): CategoryPage[] {
  const byCode = new Map(overrides.map((revision) => [revision.key, revision.data]));
  return categories.map(({ code, slug, enTitle, thTitle, symbol }) => ({
    ...(byCode.get(code) ?? { enTitle, thTitle, symbol, description: '', poem: '' }),
    code,
    slug,
  }));
}

export function pathForLegacyCategory(value: string | null): string {
  const category = categories[Number.parseInt(value ?? '', 10) - 1] ?? categories[0];
  return '/gallery/' + category.slug;
}

export function missingArtworkFields(artwork: Artwork): string[] {
  return [
    ...(!artwork.title ? ['ชื่อผลงาน'] : []),
    ...(!artwork.artist ? ['ผู้สร้าง'] : []),
    ...(!artwork.imageId ? ['รูปผลงาน'] : []),
  ];
}

export function imagePath(id: string, size: 'thumb' | 'display', preview = false): string {
  return (preview ? '/admin/image/' : '/media/') + id + '/' + size;
}
