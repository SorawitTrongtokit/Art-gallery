import { adminRequest, explain, feedback, textField } from './admin-request';
import { uploadImage } from './upload-image';

const form = document.querySelector<HTMLFormElement>('[data-work-editor]');
const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!submit || submit.disabled) return;
  const fields = new FormData(form);
  const file = form.querySelector<HTMLInputElement>('[name="photo"]')?.files?.[0];
  const controls = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
    'input,select,textarea,button',
  )].filter((control) => !control.disabled);
  controls.forEach((control) => { control.disabled = true; });
  feedback(form, file ? 'กำลังเตรียมและอัปโหลดรูป…' : 'กำลังบันทึกร่าง…');
  try {
    const imageId = file ? await uploadImage(file) : fields.has('removePhoto') ? null : form.dataset.imageId || null;
    const result = await adminRequest<{ key: string }>('save', {
      kind: 'artwork', key: textField(fields, 'code'), expected: form.dataset.expected || null,
      data: {
        categoryCode: textField(fields, 'categoryCode'), title: textField(fields, 'title'),
        artist: textField(fields, 'artist'), technique: textField(fields, 'technique'),
        type: textField(fields, 'type'), concept: textField(fields, 'concept'),
        imageAlt: textField(fields, 'imageAlt'), imageId,
      },
    });
    window.location.assign('/admin/works/' + encodeURIComponent(result.key) + '?saved=1');
  } catch (error) {
    feedback(form, explain(error), true);
    controls.forEach((control) => { control.disabled = false; });
  }
});
if (submit) submit.disabled = false;
