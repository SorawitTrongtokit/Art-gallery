import { createClient } from '@supabase/supabase-js';
import { adminRequest } from './admin-request';

type Size = 'thumb' | 'display';
type Reservation = { id: string; url: string; key: string; bucket: string; sizes: { size: Size; path: string; token: string }[] };
type StagedUpload = { reservation: Reservation; blobs: Record<Size, Blob>; uploaded: Set<Size> };
const uploads = new WeakMap<File, StagedUpload>();
const allowed = ['image/jpeg', 'image/png', 'image/webp'];
let storageClient: ReturnType<typeof createClient> | undefined;

async function resize(image: ImageBitmap, edge: number): Promise<Blob> {
  const scale = Math.min(1, edge / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('เบราว์เซอร์นี้เตรียมไฟล์รูปไม่ได้');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
  if (!blob || blob.type !== 'image/webp' || blob.size > 4194304) throw new Error('แปลงรูปไม่สำเร็จ กรุณาลองไฟล์อื่น');
  return blob;
}

async function prepare(file: File): Promise<StagedUpload> {
  if (!allowed.includes(file.type) || file.size > 30 * 1024 * 1024) {
    throw new Error('ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 30 MB');
  }
  const source = await createImageBitmap(file).catch(() => { throw new Error('เปิดไฟล์รูปไม่ได้ ' + file.name); });
  let blobs: Record<Size, Blob>;
  try {
    blobs = { thumb: await resize(source, 640), display: await resize(source, 1600) };
  } finally {
    source.close();
  }
  const reservation = await adminRequest<Reservation>('media');
  return { reservation, blobs, uploaded: new Set() };
}

export async function uploadImage(file: File): Promise<string> {
  let upload = uploads.get(file);
  if (!upload) {
    upload = await prepare(file);
    uploads.set(file, upload);
  }
  const { reservation, blobs, uploaded } = upload;
  storageClient ??= createClient(reservation.url, reservation.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  for (const { size, path, token } of reservation.sizes) {
    if (uploaded.has(size)) continue;
    const { error } = await storageClient.storage.from(reservation.bucket).uploadToSignedUrl(path, token, blobs[size], {
      contentType: 'image/webp', upsert: false,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      if (/token|expir/i.test(error.message)) uploads.delete(file);
      throw new Error('อัปโหลดรูปไม่สำเร็จ ' + file.name + ' กรุณาลองอีกครั้ง');
    }
    uploaded.add(size);
  }
  return reservation.id;
}
