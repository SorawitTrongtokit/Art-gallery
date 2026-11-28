import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artworkSchema, categories, contactUrl, emptyArtwork, missingArtworkFields, pathForLegacyCategory } from '../src/lib/catalog.ts';
import { csvColumns, importDrafts, inspectCsv } from '../src/lib/csv.ts';

const header = csvColumns.join(',');
const previousImage = '6753d87d-dc83-4cfe-9425-321123bfef7d';
const newImage = 'c894630d-64fe-4c58-8885-96747540d24d';
const oldRevision = 'a5f7366f-7369-4d53-9a06-f61b78f272e5';

test('legacy links resolve all seven categories, with the old default for unrecognized codes', () => {
  for (const category of categories) assert.equal(pathForLegacyCategory(category.code), '/gallery/' + category.slug);
  for (const invalid of [null, '', '0', '-1', '99', 'free-text']) {
    assert.equal(pathForLegacyCategory(invalid), '/gallery/hugs-of-memories');
  }
});

test('drafts can be incomplete and unsafe contact URL schemes are rejected', () => {
  assert.deepEqual(missingArtworkFields(artworkSchema.parse(emptyArtwork)), ['ชื่อผลงาน', 'ผู้สร้าง', 'รูปผลงาน']);
  assert.equal(contactUrl.safeParse('https://example.com/artist').success, true);
  assert.equal(contactUrl.safeParse('mailto:contact@example.com').success, true);
  assert.equal(contactUrl.safeParse('javascript:alert(1)').success, false);
});

test('CSV handles a BOM, Thai text, quotes, line breaks and numeric category codes from Excel', () => {
  const result = inspectCsv('\uFEFF' + header + '\r\nic-001,1,"ชื่อ, ผลงาน",ผู้สร้าง,สี,ประเภท,"บรรทัดหนึ่ง\nบรรทัดสอง",รูป.JPG,ข้อความ',
    ['รูป.jpg'], new Map());
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows[0].artwork.concept, 'บรรทัดหนึ่ง\nบรรทัดสอง');
  assert.equal(result.rows[0].artwork.categoryCode, '01');
  assert.equal(result.rows[0].code, 'IC-001');
});

test('preview reports duplicate codes, wrong category, missing files and duplicate file names', () => {
  const content = [header, 'IC-001,01,งาน,ผู้สร้าง,,,,missing.jpg,', 'ic-001,01,งาน,ผู้สร้าง,,,,,', 'IC-003,08,งาน,ผู้สร้าง,,,,,'].join('\n');
  const result = inspectCsv(content, ['same.jpg', 'SAME.JPG'], new Map());
  assert.deepEqual(result.issues.map(({ line }) => line), [1, 2, 3, 4]);
});

test('reimporting an existing code preserves the current image if no file is specified', () => {
  const { rows, issues } = inspectCsv(header + '\nIC-001,02,แก้ชื่อ,ผู้สร้าง,,,,,', [],
    new Map([['IC-001', { revision: oldRevision, archived: false, imageId: previousImage }]]));
  assert.deepEqual(issues, []);
  assert.equal(rows[0].operation, 'update');
  const [draft] = importDrafts(rows, new Map([['IC-001', oldRevision]]), new Map());
  assert.equal(draft.expected, oldRevision);
  assert.equal(draft.kind === 'artwork' && draft.data.imageId, previousImage);
  assert.throws(() => importDrafts(rows, new Map(), new Map()), /ไม่ตรงกับชุด/);
});

test('an import of 144 rows requires the promised uploaded media before saving', () => {
  const records = Array.from({ length: 144 }, (_, index) => 'IC-' + (index + 1) + ',0' + (index % 7 + 1) + ',งาน,ผู้สร้าง,,,,image.webp,');
  const result = inspectCsv([header, ...records].join('\n'), ['image.webp'], new Map());
  assert.deepEqual(result.issues, []);
  const expected = new Map(result.rows.map(({ code }) => [code, null]));
  assert.throws(() => importDrafts(result.rows, expected, new Map()), /ยังอัปโหลดไม่ครบ/);
  assert.equal(importDrafts(result.rows, expected, new Map([['image.webp', newImage]])).length, 144);
});
