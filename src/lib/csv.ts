import { parse } from 'csv-parse/sync';
import { artworkSchema, categoryCode, workCode, type Artwork, type Draft } from './catalog.ts';
import { fileKey } from './filename.ts';

export const csvColumns = [
  'code', 'category_code', 'title', 'artist', 'technique', 'type', 'concept', 'image_file', 'image_alt',
] as const;

export type ExistingArtwork = { revision: string | null; archived: boolean; imageId: string | null };
export type ImportRow = {
  line: number;
  code: string;
  filename: string;
  artwork: Artwork;
  expected: string | null;
  operation: 'add' | 'update';
};
export type ImportIssue = { line: number; message: string };

export function inspectCsv(csv: string, filenames: string[], existing: Map<string, ExistingArtwork>) {
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  let parsed: { record: string[]; info: { lines: number } }[];
  try {
    // The sync declaration does not reflect the wrapper returned by info: true.
    parsed = parse(csv, { bom: true, skip_empty_lines: true, info: true, max_record_size: 28000 }) as unknown as typeof parsed;
  } catch (error) {
    const problem = error as { lines?: number };
    return { rows, issues: [{ line: problem.lines ?? 1, message: 'อ่าน CSV ไม่ได้ ตรวจจำนวนช่องและเครื่องหมายคำพูด' }] };
  }

  const header = parsed.shift()?.record.map((name) => name.trim());
  if (!header || header.length !== csvColumns.length || new Set(header).size !== header.length ||
      csvColumns.some((name) => !header.includes(name))) {
    return { rows, issues: [{ line: 1, message: 'หัวคอลัมน์ CSV ไม่ตรงกับไฟล์ตัวอย่าง' }] };
  }
  if (parsed.length === 0 || parsed.length > 500) {
    return { rows, issues: [{ line: 1, message: 'เลือกไฟล์ที่มี 1–500 ผลงานต่อชุด' }] };
  }

  const media = new Set<string>();
  for (const filename of filenames) {
    const key = fileKey(filename);
    if (media.has(key)) issues.push({ line: 1, message: 'ชื่อไฟล์รูปซ้ำกัน ' + filename });
    media.add(key);
  }
  const used = new Set<string>();
  for (const { record, info } of parsed) {
    const line = info.lines;
    const fields = Object.fromEntries(header.map((name, index) => [name, record[index]?.trim() ?? '']));
    const code = workCode.safeParse(fields.code);
    if (!code.success) {
      issues.push({ line, message: 'รหัสผลงานไม่ถูกต้อง' });
      continue;
    }
    if (used.has(code.data)) {
      issues.push({ line, message: 'รหัสผลงานซ้ำ ' + code.data });
      continue;
    }
    used.add(code.data);
    const category = categoryCode.safeParse(fields.category_code.padStart(2, '0'));
    if (!category.success) {
      issues.push({ line, message: 'รหัสหมวดต้องอยู่ระหว่าง 01 ถึง 07' });
      continue;
    }
    const previous = existing.get(code.data);
    if (previous?.archived) {
      issues.push({ line, message: 'ผลงานอยู่ในคลัง ให้กู้คืนก่อนนำเข้า ' + code.data });
    }
    const filename = fileKey(fields.image_file);
    if (filename && !media.has(filename)) {
      issues.push({ line, message: 'หาไฟล์รูปไม่เจอ ' + fields.image_file });
    }
    const artwork = artworkSchema.safeParse({
      categoryCode: category.data,
      title: fields.title,
      artist: fields.artist,
      technique: fields.technique,
      type: fields.type,
      concept: fields.concept,
      imageId: previous?.imageId ?? null,
      imageAlt: fields.image_alt,
    });
    if (!artwork.success) {
      issues.push({ line, message: 'ข้อมูลยาวเกินกำหนด ' + String(artwork.error.issues[0]?.path[0] ?? '') });
      continue;
    }
    rows.push({
      line, code: code.data, filename, artwork: artwork.data,
      expected: previous?.revision ?? null, operation: previous ? 'update' : 'add',
    });
  }
  return { rows, issues };
}

export function importDrafts(
  rows: ImportRow[],
  expected: Map<string, string | null>,
  images: Map<string, string>,
): Draft[] {
  if (expected.size !== rows.length || rows.some((row) => !expected.has(row.code))) {
    throw new Error('รายการยืนยันไม่ตรงกับชุดที่ตรวจ กรุณาตรวจ CSV อีกครั้ง');
  }
  return rows.map((row) => {
    const imageId = row.filename ? images.get(row.filename) : row.artwork.imageId;
    if (row.filename && !imageId) throw new Error('รูปยังอัปโหลดไม่ครบ ' + row.filename);
    return {
      kind: 'artwork', key: row.code, expected: expected.get(row.code) ?? null,
      data: { ...row.artwork, imageId: imageId ?? null },
    };
  });
}
