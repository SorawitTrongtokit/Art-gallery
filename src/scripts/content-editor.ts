import { adminRequest, explain, feedback, textField } from './admin-request';
import { uploadImage } from './upload-image';

function rows(group: ParentNode) {
  return Array.from(group.querySelectorAll<HTMLElement>('[data-repeat-row]'));
}

for (const group of document.querySelectorAll<HTMLElement>('[data-repeat]')) {
  const container = group.querySelector('[data-repeat-items]')!;
  const template = group.querySelector<HTMLTemplateElement>('[data-repeat-template]')!;
  const add = group.querySelector<HTMLButtonElement>('[data-add-row]')!;
  function refresh() {
    const items = rows(container);
    items.forEach((row, index) => {
      row.querySelector('[data-row-label]')!.textContent = group.dataset.singular + ' ' + (index + 1);
      row.querySelector<HTMLButtonElement>('[data-move="up"]')!.disabled = index === 0;
      row.querySelector<HTMLButtonElement>('[data-move="down"]')!.disabled = index === items.length - 1;
    });
    add.disabled = items.length >= Number(group.dataset.max);
  }
  add.addEventListener('click', () => {
    container.append(template.content.cloneNode(true));
    refresh();
    rows(container).at(-1)?.querySelector('input')?.focus();
  });
  container.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const row = event.target.closest<HTMLElement>('[data-repeat-row]');
    if (!row) return;
    if (event.target.hasAttribute('data-remove-row')) {
      row.remove();
      add.focus();
    } else if (event.target.dataset.move === 'up') {
      if (row.previousElementSibling) container.insertBefore(row, row.previousElementSibling);
    } else if (event.target.dataset.move === 'down') {
      if (row.nextElementSibling) container.insertBefore(row.nextElementSibling, row);
    }
    refresh();
  });
  refresh();
}

function field(row: HTMLElement, name: string): string {
  return row.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-field="' + name + '"]')?.value.trim() ?? '';
}

async function readHome(form: HTMLFormElement, fields: FormData) {
  const slides = [];
  for (const row of rows(form.querySelector('[data-repeat="slides"]')!)) {
    const file = row.querySelector<HTMLInputElement>('[data-field="photo"]')?.files?.[0];
    const remove = row.querySelector<HTMLInputElement>('[data-field="removePhoto"]')?.checked;
    const imageId = file ? await uploadImage(file) : remove ? null : row.dataset.imageId || null;
    slides.push({
      title: field(row, 'title'), tag: field(row, 'tag'), text: field(row, 'text'), imageAlt: field(row, 'imageAlt'), imageId,
    });
  }
  return {
    storyTitle: textField(fields, 'storyTitle'), storyIntro: textField(fields, 'storyIntro'),
    contactTitle: textField(fields, 'contactTitle'), contactText: textField(fields, 'contactText'), slides,
    steps: rows(form.querySelector('[data-repeat="steps"]')!).map((row) => ({ title: field(row, 'title'), text: field(row, 'text') })),
    contacts: rows(form.querySelector('[data-repeat="contacts"]')!).map((row) => ({ label: field(row, 'label'), url: field(row, 'url') })),
  };
}

const editor = document.querySelector<HTMLFormElement>('[data-content-editor]');
const submit = editor?.querySelector<HTMLButtonElement>('button[type="submit"]');
editor?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!submit || submit.disabled) return;
  const fields = new FormData(editor);
  const controls = [...editor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>('input,textarea,button')]
    .filter((control) => !control.disabled);
  controls.forEach((control) => { control.disabled = true; });
  feedback(editor, 'กำลังเตรียมรูปและบันทึกร่าง…');
  try {
    const data = editor.dataset.kind === 'home' ? await readHome(editor, fields) : {
      thTitle: textField(fields, 'thTitle'), enTitle: textField(fields, 'enTitle'),
      symbol: textField(fields, 'symbol'), description: textField(fields, 'description'), poem: textField(fields, 'poem'),
    };
    await adminRequest('save', { kind: editor.dataset.kind, key: editor.dataset.key, expected: editor.dataset.expected || null, data });
    window.location.assign(window.location.pathname + '?saved=1');
  } catch (error) {
    feedback(editor, explain(error), true);
    controls.forEach((control) => { control.disabled = false; });
  }
});
if (submit) submit.disabled = false;
