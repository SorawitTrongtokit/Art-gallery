import { adminRequest, explain, feedback } from './admin-request';

const prompts: Record<string, string> = {
  publish: 'เผยแพร่ฉบับร่างที่เลือกให้ผู้ชมเห็นหรือไม่?',
  archive: 'เก็บรายการที่เลือกเข้าคลังและนำออกจากแกลเลอรีหรือไม่?',
  restore: 'กู้รายการที่เลือกกลับมาเป็นฉบับร่างหรือไม่?',
};

for (const root of document.querySelectorAll<HTMLElement>('[data-state-controls]')) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-state]')];
  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const action = button.dataset.state ?? '';
      if (!window.confirm(prompts[action])) return;
      buttons.forEach((control) => { control.disabled = true; });
      feedback(root, 'กำลังบันทึก…');
      try {
        await adminRequest('state', { action, items: [{ id: root.dataset.id, expected: root.dataset.expected || null }] });
        window.location.assign(root.dataset.after ?? window.location.href);
      } catch (error) {
        feedback(root, explain(error), true);
        buttons.forEach((control) => { control.disabled = false; });
      }
    });
    button.disabled = false;
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-bulk]')) {
  const items = [...root.querySelectorAll<HTMLInputElement>('[data-item]')];
  const toggle = root.querySelector<HTMLInputElement>('[data-select-all]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-bulk-action]')];
  function updateSelection() {
    const selected = items.filter((item) => item.checked);
    if (toggle) {
      toggle.checked = items.length > 0 && selected.length === items.length;
      toggle.indeterminate = selected.length > 0 && selected.length < items.length;
    }
    buttons.forEach((button) => { button.disabled = selected.length === 0; });
  }
  toggle?.addEventListener('change', () => {
    items.forEach((item) => { item.checked = toggle.checked; });
    updateSelection();
  });
  items.forEach((item) => item.addEventListener('change', updateSelection));
  buttons.forEach((button) => button.addEventListener('click', async () => {
    const action = button.dataset.bulkAction ?? '';
    const selected = items.filter((item) => item.checked);
    if (action === 'publish' && selected.some((item) => item.dataset.ready !== 'yes')) {
      feedback(root, 'เลือกเฉพาะรายการที่มีร่างและข้อมูลครบก่อนเผยแพร่', true);
      return;
    }
    if (!selected.length || !window.confirm(prompts[action] + ' (' + selected.length + ' รายการ)')) return;
    buttons.forEach((control) => { control.disabled = true; });
    feedback(root, 'กำลังบันทึก…');
    try {
      await adminRequest('state', { action, items: selected.map((item) => ({ id: item.dataset.item, expected: item.dataset.expected || null })) });
      window.location.reload();
    } catch (error) {
      feedback(root, explain(error), true);
      updateSelection();
    }
  }));
  updateSelection();
}
