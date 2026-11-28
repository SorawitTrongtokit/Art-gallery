import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { categories, emptyArtwork } from '../../src/lib/catalog';
import { csvColumns } from '../../src/lib/csv';

const gallery = '/gallery/hugs-of-memories';
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
});

function credentials(role: 'ADMIN' | 'VIEWER') {
  const email = process.env['DEMO_' + role + '_EMAIL'];
  const password = process.env['DEMO_' + role + '_PASSWORD'];
  if (!email || !password) throw new Error('Set local demo credentials and run npm run seed:demo before the browser tests.');
  return { email, password };
}

async function signIn(page: Page, role: 'ADMIN' | 'VIEWER' = 'ADMIN') {
  const account = credentials(role);
  await page.goto('/admin/login');
  await page.getByLabel('อีเมล').fill(account.email);
  await page.getByLabel('รหัสผ่าน').fill(account.password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
}

async function photo(name: string) {
  return {
    name, mimeType: 'image/png',
    buffer: await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#7857a6' } }).png().toBuffer(),
  };
}

async function confirmAction(page: Page, name: string) {
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name, exact: true }).click();
}

async function publicPage(request: APIRequestContext, path = gallery) {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  return response.text();
}

test('the three public screens preserve legacy URLs, slides, hotspots and keyboard details', async ({ page, request }) => {
  for (const category of categories) {
    const redirect = await request.get('/art_show.html?cat=' + category.code, { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toBe('/gallery/' + category.slug);
  }
  expect((await request.get('/art_show.html?cat=99', { maxRedirects: 0 })).headers().location).toBe(gallery);
  expect((await request.get('/index.html', { maxRedirects: 0 })).headers().location).toBe('/');
  expect((await request.get('/main_menu.html', { maxRedirects: 0 })).headers().location).toBe('/room');
  expect((await request.get('/gallery/unknown')).status()).toBe(404);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Inner Child 2569', exact: true })).toBeVisible();
  expect(await page.locator('.carousel-dots').evaluate((element) => element.getBoundingClientRect().height)).toBe(8);
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await expect(page.getByRole('button', { name: 'สไลด์ที่ 2', exact: true })).toHaveAttribute('aria-current', 'true');
  await page.getByRole('link', { name: 'Start Exhibition' }).click();
  await expect(page.locator('.room-stage .hotspot')).toHaveCount(7);
  await expect(page.locator('.room-stage .hs-7 .hotspot-badge')).toHaveText('07 ภาพวัยเด็ก');
  await page.locator('.room-stage .hs-1').click();
  await expect(page).toHaveURL(new RegExp(gallery + '$'));
  const artwork = page.locator('[data-artwork="IC-001"]');
  await expect(artwork).toBeVisible();
  await expect(page.locator('#modalImg')).not.toHaveAttribute('src', /.+/);
  await artwork.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#modalImg')).toHaveJSProperty('complete', true);
  await expect.poll(() => page.locator('#modalImg').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(artwork).toBeFocused();
  for (const width of [820, 390]) {
    await page.setViewportSize({ width, height: 840 });
    await page.goto('/room');
    await page.getByRole('button', { name: 'ส่วนถัดไป' }).click();
    await expect(page.getByRole('button', { name: 'ส่วนที่ 2', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => page.locator('#roomViewport').evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
});

test('an editor can save, preview, publish, revise, archive and restore without leaking drafts', async ({ page, request }) => {
  const code = 'TEST-W-' + Date.now();
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'ภาพรวมงานนิทรรศการ' })).toBeVisible();
  await page.goto('/admin/works/new');
  await page.getByLabel('รหัสผลงาน').fill(code);
  await page.getByLabel('ชื่อผลงาน', { exact: true }).fill(code + ' ฉบับแรก');
  await page.getByLabel('ผู้สร้าง', { exact: true }).fill('ผู้ทดสอบ');
  await page.getByLabel('รูปผลงาน', { exact: false }).setInputFiles(await photo('work.png'));
  await page.getByRole('button', { name: 'บันทึกร่าง', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/admin/works/' + code + '\\?saved=1$'));
  const draftPhoto = await page.locator('.field-photo').getAttribute('src');
  expect(draftPhoto).toBeTruthy();
  expect(await publicPage(request)).not.toContain(code);
  expect((await request.get(draftPhoto!)).status()).toBe(401);
  expect((await request.get(draftPhoto!.replace('/admin/image/', '/media/'))).status()).toBe(404);
  const preview = '/admin/preview/artwork/' + code;
  const previewResponse = await request.get(preview, { maxRedirects: 0 });
  expect(previewResponse.headers().location).toBe('/admin/login');
  await page.getByRole('link', { name: 'ดูตัวอย่างร่าง' }).click();
  await expect(page.getByRole('dialog')).toContainText(code + ' ฉบับแรก');
  await expect.poll(() => page.locator('#modalImg').evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1200);
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'กลับไปแก้ไข' }).click();
  await confirmAction(page, 'เผยแพร่ฉบับร่าง');
  await expect.poll(async () => publicPage(request)).toContain(code + ' ฉบับแรก');
  await expect(page.getByText('เผยแพร่แล้ว', { exact: true })).toBeVisible();

  await page.getByLabel('ชื่อผลงาน', { exact: true }).fill(code + ' ฉบับแก้');
  await page.getByLabel('รูปผลงาน', { exact: false }).setInputFiles(await photo('replacement.png'));
  await page.getByRole('button', { name: 'บันทึกร่าง', exact: true }).click();
  await expect(page.getByText('เผยแพร่แล้ว · มีร่างใหม่')).toBeVisible();
  const replacement = (await page.locator('.field-photo').getAttribute('src'))!.replace('/admin/image/', '/media/');
  expect((await request.get(replacement)).status()).toBe(404);
  expect(await publicPage(request)).toContain(code + ' ฉบับแรก');
  expect(await publicPage(request)).not.toContain(code + ' ฉบับแก้');
  await confirmAction(page, 'เผยแพร่ฉบับร่าง');
  await expect.poll(async () => publicPage(request)).toContain(code + ' ฉบับแก้');
  expect((await request.get(replacement)).status()).toBe(200);

  await page.goto('/admin/history');
  const original = page.getByRole('row').filter({ hasText: code })
    .filter({ has: page.getByRole('cell', { name: 'เผยแพร่', exact: true }) }).last();
  page.once('dialog', (dialog) => dialog.accept());
  await original.getByRole('button', { name: 'คัดลอกเป็นร่าง' }).click();
  await expect(page.getByLabel('ชื่อผลงาน', { exact: true })).toHaveValue(code + ' ฉบับแรก');
  expect(await publicPage(request)).toContain(code + ' ฉบับแก้');

  await confirmAction(page, 'เก็บเข้าคลัง');
  await expect(page.getByRole('button', { name: 'กู้คืนเป็นร่าง' })).toBeVisible();
  await expect.poll(async () => publicPage(request)).not.toContain(code);
  expect((await request.get(replacement)).status()).toBe(404);
  await confirmAction(page, 'กู้คืนเป็นร่าง');
  await expect(page.getByRole('button', { name: 'เผยแพร่ฉบับร่าง' })).toBeVisible();
  expect(await publicPage(request)).not.toContain(code);
  await confirmAction(page, 'เก็บเข้าคลัง');
  await expect(page.getByRole('button', { name: 'กู้คืนเป็นร่าง' })).toBeVisible();
  await page.goto('/admin/history');
  await expect(page.getByRole('table')).toContainText(code);
});

test('CSV inspection, image retries, repeated import and batch publication work together', async ({ page, request, baseURL }) => {
  const reference = 'TEST-CSV-' + Date.now();
  const codes = [reference + '-A', reference + '-B'];
  const csv = {
    name: 'artworks.csv', mimeType: 'text/csv', buffer: Buffer.from([
      '\uFEFF' + csvColumns.join(','),
      codes[0] + ',01,ชิ้น CSV แรก,ผู้ทดสอบ,สี,ประเภท,"แนวคิด\nสองบรรทัด",first.png,คำอธิบาย',
      codes[1] + ',01,ชิ้น CSV สอง,ผู้ทดสอบ,สี,ประเภท,แนวคิด,second.png,',
    ].join('\r\n')),
  };
  const images = await Promise.all(['first.png', 'second.png'].map(photo));
  await signIn(page);
  await page.goto('/admin/import');
  await page.getByLabel('ไฟล์ CSV').setInputFiles(csv);
  await page.getByRole('button', { name: 'ตรวจรายการนำเข้า' }).click();
  await expect(page.getByText(/หาไฟล์รูปไม่เจอ first.png/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'ยืนยันบันทึกเป็นร่าง' })).toBeDisabled();
  await page.getByLabel('ไฟล์รูปผลงาน').setInputFiles(images);
  await page.getByRole('button', { name: 'ตรวจรายการนำเข้า' }).click();
  await expect(page.getByText('เพิ่ม 2 รายการ · อัปเดต 0 รายการ')).toBeVisible();
  let aborted = false;
  await page.route('**/storage/v1/object/upload/sign/**', async (route) => {
    if (aborted || route.request().method() !== 'PUT') return route.continue();
    aborted = true;
    await route.abort();
  });
  await page.getByRole('button', { name: 'ยืนยันบันทึกเป็นร่าง' }).click();
  await expect(page.getByText(/อัปโหลดรูปไม่สำเร็จ/)).toBeVisible();
  expect(aborted).toBe(true);
  expect(await publicPage(request)).not.toContain(reference);
  await page.unroute('**/storage/v1/object/upload/sign/**');
  await page.getByRole('button', { name: 'ยืนยันบันทึกเป็นร่าง' }).click();
  await expect(page.getByText('บันทึกร่างสำเร็จ 2 ผลงาน')).toBeVisible();
  expect(await publicPage(request)).not.toContain(reference);
  await page.getByRole('button', { name: 'ตรวจรายการนำเข้า' }).click();
  await expect(page.getByText('เพิ่ม 0 รายการ · อัปเดต 2 รายการ')).toBeVisible();
  await page.getByRole('button', { name: 'ยืนยันบันทึกเป็นร่าง' }).click();
  await expect(page.getByText('บันทึกร่างสำเร็จ 2 ผลงาน')).toBeVisible();
  await page.goto('/admin/works?q=' + reference);
  await expect(page.getByText('2 ผลงาน', { exact: true })).toBeVisible();
  const selected = await page.locator('[data-item]').evaluateAll((items) => items.map((item) => ({
    id: item.getAttribute('data-item'), expected: item.getAttribute('data-expected'),
  })));
  expect(selected).toHaveLength(2);
  const atomicFailure = await page.request.post('/admin/api/state', {
    headers: { Origin: baseURL! },
    data: { action: 'publish', items: [selected[0], { ...selected[1], expected: crypto.randomUUID() }] },
  });
  expect(atomicFailure.status()).toBe(409);
  expect(await publicPage(request)).not.toContain(reference);
  await page.getByRole('checkbox', { name: 'เลือกทุกรายการ' }).check();
  await confirmAction(page, 'เผยแพร่รายการที่เลือก');
  await expect.poll(async () => publicPage(request)).toContain(codes[1]);
  expect(await publicPage(request)).toContain(codes[0]);
  await expect(page.locator('tbody .pill').filter({ hasText: /^เผยแพร่แล้ว$/ })).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'เลือกทุกรายการ' }).check();
  await confirmAction(page, 'เก็บรายการที่เลือกเข้าคลัง');
  await expect(page.getByText('ยังไม่มีผลงานตรงกับตัวกรอง')).toBeVisible();
});

test('homepage and category revisions use the same preview and publication boundaries', async ({ page, request }) => {
  await signIn(page);
  await page.goto('/admin/content/home');
  const current = await page.getByLabel('ชื่อเรื่องราวนิทรรศการ').inputValue();
  const marker = 'ทดลองเรื่องราว ' + Date.now();
  await page.getByLabel('ชื่อเรื่องราวนิทรรศการ').fill(marker);
  await page.getByRole('button', { name: 'เพิ่มสไลด์', exact: true }).click();
  const slides = page.locator('[data-repeat="slides"] [data-repeat-row]');
  const added = slides.filter({ has: page.locator('input[data-field="title"]') }).last();
  await added.getByLabel('ชื่อสไลด์').fill('สไลด์ทดสอบ');
  await added.getByLabel('รูปสไลด์').setInputFiles(await photo('slide.png'));
  await added.getByRole('button', { name: 'เลื่อนขึ้น' }).click();
  await expect(slides.nth(await slides.count() - 2).getByLabel('ชื่อสไลด์')).toHaveValue('สไลด์ทดสอบ');
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click();
  await expect(page.getByText('บันทึกร่างแล้ว', { exact: true })).toBeVisible();
  expect(await publicPage(request, '/')).not.toContain(marker);
  await page.getByRole('link', { name: 'ดูตัวอย่างร่าง' }).click();
  await expect(page.getByRole('heading', { name: marker })).toBeVisible();
  await expect(page.locator('[data-card] h3').filter({ hasText: 'สไลด์ทดสอบ' })).toHaveCount(1);
  await page.getByRole('link', { name: 'กลับไปแก้ไข' }).click();
  await confirmAction(page, 'เผยแพร่ฉบับร่าง');
  await expect.poll(async () => publicPage(request, '/')).toContain(marker);
  await expect(page.getByText('เผยแพร่แล้ว', { exact: true })).toBeVisible();
  await page.getByLabel('ชื่อเรื่องราวนิทรรศการ').fill(current);
  await slides.nth(await slides.count() - 2).getByRole('button', { name: 'เอาออกจากร่าง' }).click();
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click();
  await expect(page.getByRole('button', { name: 'เผยแพร่ฉบับร่าง' })).toBeVisible();
  await confirmAction(page, 'เผยแพร่ฉบับร่าง');
  await expect.poll(async () => publicPage(request, '/')).not.toContain(marker);
  expect(await publicPage(request, '/')).not.toContain('สไลด์ทดสอบ');

  await page.goto('/admin/content/01');
  const initial = await page.getByLabel('คำอธิบายหมวด').inputValue();
  await page.getByLabel('คำอธิบายหมวด').fill(marker);
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click();
  await expect(page.getByText('บันทึกร่างแล้ว', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'ดูตัวอย่างร่าง' }).click();
  await expect(page.getByText(marker, { exact: true })).toBeVisible();
  expect(await publicPage(request)).not.toContain(marker);
  await page.getByRole('link', { name: 'กลับไปแก้ไข' }).click();
  await page.getByLabel('คำอธิบายหมวด').fill(initial);
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click();
  await expect(page.getByRole('button', { name: 'เผยแพร่ฉบับร่าง' })).toBeVisible();
  await confirmAction(page, 'เผยแพร่ฉบับร่าง');
  await expect(page.getByText('เผยแพร่แล้ว', { exact: true })).toBeVisible();
});

test('anonymous and signed-in non-admin users cannot use the admin routes or write through the Data API', async ({ page, request, baseURL }) => {
  const direct = await request.post('/admin/api/save', { headers: { Origin: baseURL! }, data: {} });
  expect(direct.status()).toBe(401);
  await signIn(page, 'VIEWER');
  await expect(page.getByRole('alert')).toContainText('เข้าสู่ระบบไม่สำเร็จ');
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect((await client.auth.signInWithPassword(credentials('VIEWER'))).error).toBeNull();
  const read = await client.from('catalog_revisions').select('id,content').limit(1);
  expect(read.data).toEqual([]);
  const write = await client.rpc('catalog_save', { p_drafts: [{ kind: 'artwork', key: 'TEST-DENIED', expected: null, data: emptyArtwork }] });
  expect(write.error?.code).toBe('42501');
});

test('an exhibition-sized CSV uploads and publishes 144 individually matched images', async ({ page, request }) => {
  test.setTimeout(145000);
  const run = 'TEST-FULL-' + Date.now();
  const source = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#604486' } }).png().toBuffer();
  const files = Array.from({ length: 144 }, (_, index) => ({
    name: 'art-' + (index + 1) + '.png', mimeType: 'image/png', buffer: source,
  }));
  const codes = files.map((_, index) => run + '-' + String(index + 1).padStart(3, '0'));
  const records = files.map(({ name }, index) =>
    [codes[index], categories[index % 7].code, 'ตัวอย่างชุดใหญ่', 'ผู้ทดสอบ', '', '', '', name, ''].join(','));
  await signIn(page);
  await page.goto('/admin/import');
  await page.getByLabel('ไฟล์ CSV').setInputFiles({
    name: 'full.csv', mimeType: 'text/csv', buffer: Buffer.from([csvColumns.join(','), ...records].join('\n')),
  });
  await page.getByLabel('ไฟล์รูปผลงาน').setInputFiles(files);
  await page.getByRole('button', { name: 'ตรวจรายการนำเข้า' }).click();
  await expect(page.getByText('เพิ่ม 144 รายการ · อัปเดต 0 รายการ')).toBeVisible();
  await page.getByRole('button', { name: 'ยืนยันบันทึกเป็นร่าง' }).click();
  await expect(page.getByText('บันทึกร่างสำเร็จ 144 ผลงาน')).toBeVisible({ timeout: 100000 });
  expect(await publicPage(request)).not.toContain(run);
  await page.goto('/admin/works?q=' + run);
  await expect(page.getByText('144 ผลงาน', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'เลือกทุกรายการ' }).check();
  await confirmAction(page, 'เผยแพร่รายการที่เลือก');
  await expect(page.locator('tbody .pill').filter({ hasText: /^เผยแพร่แล้ว$/ })).toHaveCount(144);
  for (const category of categories) {
    const index = Number(category.code) - 1;
    const publicHtml = await publicPage(request, '/gallery/' + category.slug);
    expect(publicHtml).toContain(codes[index]);
    expect(publicHtml).not.toContain(codes[(index + 1) % 7]);
  }
  await page.getByRole('checkbox', { name: 'เลือกทุกรายการ' }).check();
  await confirmAction(page, 'เก็บรายการที่เลือกเข้าคลัง');
  await expect(page.getByText('ยังไม่มีผลงานตรงกับตัวกรอง')).toBeVisible();
});
