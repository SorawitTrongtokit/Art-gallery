import type { ImportIssue, ImportRow } from '../lib/csv';
import { fileKey } from '../lib/filename';
import { adminRequest, explain, feedback } from './admin-request';
import { uploadImage } from './upload-image';

type Preview = { rows: ImportRow[]; issues: ImportIssue[] };
const form = document.querySelector<HTMLFormElement>('[data-import-form]');
const review = document.querySelector<HTMLElement>('[data-import-review]');

if (form && review) {
  const csvInput = form.querySelector<HTMLInputElement>('[name="csv"]')!;
  const photoInput = form.querySelector<HTMLInputElement>('[name="photos"]')!;
  const inspect = form.querySelector<HTMLButtonElement>('[data-inspect]')!;
  const commit = review.querySelector<HTMLButtonElement>('[data-import-commit]')!;
  const success = review.querySelector<HTMLElement>('[data-import-success]')!;
  const issueList = review.querySelector('[data-import-issues]')!;
  const table = review.querySelector('[data-import-rows]')!;
  const summary = review.querySelector('[data-import-summary]')!;
  let selection: { preview: Preview; csv: string; photos: File[]; batchId: string } | undefined;
  let busy = false;

  function setBusy(value: boolean) {
    busy = value;
    csvInput.disabled = value;
    photoInput.disabled = value;
    inspect.disabled = value;
    commit.disabled = value || !selection || selection.preview.issues.length > 0 || !selection.preview.rows.length;
  }

  form.addEventListener('change', () => {
    if (busy) return;
    selection = undefined;
    review.hidden = true;
    success.hidden = true;
    setBusy(false);
    feedback(form, '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = csvInput.files?.[0];
    if (!input || busy) return;
    const photos = Array.from(photoInput.files ?? []);
    selection = undefined;
    review.hidden = true;
    success.hidden = true;
    setBusy(true);
    feedback(form, 'กำลังตรวจ CSV และชื่อไฟล์…');
    try {
      if (input.size > 3000000) throw new Error('ไฟล์ CSV ใหญ่เกินไป กรุณาแบ่งเป็นหลายชุด');
      const csv = new TextDecoder('utf-8', { fatal: true }).decode(await input.arrayBuffer());
      const preview = await adminRequest<Preview>('inspect-import', { csv, filenames: photos.map((file) => file.name) });
      selection = { preview, csv, photos, batchId: crypto.randomUUID() };
      summary.textContent = 'เพิ่ม ' + preview.rows.filter(({ operation }) => operation === 'add').length +
        ' รายการ · อัปเดต ' + preview.rows.filter(({ operation }) => operation === 'update').length + ' รายการ';
      issueList.replaceChildren(...preview.issues.map(({ line, message }) => {
        const item = document.createElement('li');
        item.textContent = 'บรรทัด ' + line + ' · ' + message;
        return item;
      }));
      table.replaceChildren(...preview.rows.map((row) => {
        const element = document.createElement('tr');
        for (const text of [row.line, row.code, row.artwork.title || 'ยังไม่มีชื่อ', row.artwork.categoryCode,
          row.filename || (row.artwork.imageId ? 'ใช้รูปเดิม' : 'ยังไม่มีรูป'), row.operation === 'add' ? 'เพิ่ม' : 'อัปเดตร่าง']) {
          element.insertCell().textContent = String(text);
        }
        return element;
      }));
      feedback(form, '');
      feedback(review, preview.issues.length ? 'แก้รายการที่แจ้งและตรวจใหม่ก่อนยืนยัน' : '');
      review.hidden = false;
    } catch (error) {
      feedback(form, error instanceof TypeError ? 'อ่านไฟล์ไม่ได้ กรุณาบันทึก CSV เป็น UTF-8 และลองใหม่' : explain(error), true);
    } finally {
      setBusy(false);
    }
  });

  commit.addEventListener('click', async () => {
    if (!selection || busy || selection.preview.issues.length) return;
    const { csv, photos, preview, batchId } = selection;
    const expected = preview.rows.map(({ code, expected }) => ({ code, revision: expected }));
    const requiredNames = new Set(preview.rows.map(({ filename }) => filename).filter(Boolean));
    const files = photos.filter(({ name }) => requiredNames.has(fileKey(name)));
    setBusy(true);
    try {
      const images: { filename: string; id: string }[] = [];
      for (let offset = 0; offset < files.length; offset += 3) {
        feedback(review, 'กำลังอัปโหลดรูป ' + offset + ' / ' + files.length);
        const result = await Promise.allSettled(files.slice(offset, offset + 3).map(async (file) => ({
          filename: file.name, id: await uploadImage(file),
        })));
        const failed = result.find((item) => item.status === 'rejected');
        if (failed) throw failed.reason;
        for (const item of result) if (item.status === 'fulfilled') images.push(item.value);
      }
      feedback(review, 'กำลังบันทึกฉบับร่างทั้งชุด…');
      const result = await adminRequest<{ count: number }>('commit-import', { csv, images, expected, batchId });
      feedback(review, 'บันทึกร่างสำเร็จ ' + result.count + ' ผลงาน');
      selection = undefined;
      success.hidden = false;
    } catch (error) {
      feedback(review, explain(error), true);
    } finally {
      setBusy(false);
    }
  });
  setBusy(false);
}
