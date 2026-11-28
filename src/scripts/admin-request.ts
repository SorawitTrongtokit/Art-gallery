export async function adminRequest<T>(operation: string, body: unknown = {}): Promise<T> {
  const response = await fetch('/admin/api/' + operation, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? 'ระบบทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง');
  return result as T;
}

export function feedback(container: ParentNode, message: string, error = false) {
  const element = container.querySelector<HTMLElement>('[data-feedback]');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error', error);
}

export function explain(error: unknown): string {
  return error instanceof Error ? error.message : 'ระบบทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export function textField(fields: FormData, key: string): string {
  return String(fields.get(key) ?? '').trim();
}
