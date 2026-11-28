import type { APIRoute } from 'astro';
import { z } from 'zod';
import { draftSchema, revisionId, workCode } from '../../../lib/catalog';
import { importDrafts, inspectCsv } from '../../../lib/csv';
import { fileKey } from '../../../lib/filename';
import { sameOrigin } from '../../../lib/server/auth';
import { CatalogError, changeState, entry, existingArtworks, historicContent, saveDrafts } from '../../../lib/server/catalog';
import { reserveMedia } from '../../../lib/server/media';

const stateInput = z.strictObject({
  action: z.enum(['publish', 'archive', 'restore']),
  items: z.array(z.strictObject({ id: z.uuid(), expected: revisionId })).min(1).max(500),
});
const csvText = z.string().min(1).max(1000000);
const inspectInput = z.strictObject({
  csv: csvText,
  filenames: z.array(z.string().max(255)).max(500),
});
const commitInput = z.strictObject({
  csv: csvText, batchId: z.uuid(),
  expected: z.array(z.strictObject({ code: workCode, revision: revisionId })).min(1).max(500),
  images: z.array(z.strictObject({ filename: z.string().max(255), id: z.uuid() })).max(500),
});
const historyInput = z.strictObject({
  kind: z.enum(['artwork', 'category', 'home']), key: z.string().max(40), revision: z.uuid(), expected: revisionId,
});

export const POST: APIRoute = async ({ locals, params, request, url }) => {
  const admin = locals.admin;
  if (!admin) return Response.json({ message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (!sameOrigin(request, url)) return Response.json({ message: 'คำขอนี้ส่งมาจากคนละเว็บไซต์' }, { status: 403 });
  const { client, user } = admin;

  try {
    if (params.operation === 'media') return Response.json(await reserveMedia(client));
    const text = await request.text();
    if (Buffer.byteLength(text) > 3000000) {
      return Response.json({ message: 'ไฟล์ข้อมูลใหญ่เกินไป กรุณาแบ่งเป็นหลายชุด' }, { status: 413 });
    }
    const body: unknown = JSON.parse(text);
    if (params.operation === 'save') {
      const draft = draftSchema.parse(body);
      await saveDrafts(client, [draft]);
      return Response.json({ key: draft.key });
    }
    if (params.operation === 'state') {
      const { action, items } = stateInput.parse(body);
      return Response.json({ count: await changeState(client, action, items) });
    }
    if (params.operation === 'inspect-import') {
      const { csv, filenames } = inspectInput.parse(body);
      return Response.json(inspectCsv(csv, filenames, await existingArtworks(client)));
    }
    if (params.operation === 'commit-import') {
      const { csv, batchId, expected, images } = commitInput.parse(body);
      const receipt = await client.from('catalog_imports').select('result').eq('owner_id', user.id).eq('id', batchId).maybeSingle();
      if (receipt.error) throw new CatalogError(receipt.error.code, receipt.error.message);
      if (receipt.data?.result != null) return Response.json({ count: receipt.data.result });

      const { rows, issues } = inspectCsv(csv, images.map(({ filename }) => filename), await existingArtworks(client));
      if (issues.length) {
        return Response.json({ message: 'รายการนำเข้าไม่ผ่านการตรวจ', issues }, { status: 422 });
      }
      let drafts;
      try {
        drafts = importDrafts(rows, new Map(expected.map(({ code, revision }) => [code, revision])),
          new Map(images.map(({ filename, id }) => [fileKey(filename), id])));
      } catch (error) {
        return Response.json({ message: (error as Error).message }, { status: 422 });
      }
      return Response.json({ count: await saveDrafts(client, drafts, batchId) });
    }
    if (params.operation === 'copy-revision') {
      const { kind, key, expected, revision } = historyInput.parse(body);
      const current = await entry(client, kind, key);
      const content = current && await historicContent(client, current.id, revision);
      if (!content) return Response.json({ message: 'ไม่พบฉบับที่เลือก' }, { status: 404 });
      await saveDrafts(client, [draftSchema.parse({ kind, key, expected, data: content })]);
      return Response.json({ key });
    }
    return Response.json({ message: 'ไม่พบคำสั่ง' }, { status: 404 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return Response.json({ message: 'ข้อมูลไม่ถูกต้อง ' + (issue?.path.join('.') ?? '') + ' ' + (issue?.message ?? '') },
        { status: 422 });
    }
    if (error instanceof SyntaxError) return Response.json({ message: 'อ่านคำขอไม่ได้' }, { status: 400 });
    if (error instanceof CatalogError) {
      if (error.code === '40001') {
        return Response.json({ message: 'มีการแก้ข้อมูลหลังเปิดหน้านี้ กรุณาโหลดใหม่แล้วตรวจอีกครั้ง' }, { status: 409 });
      }
      if (error.code === 'P0001') {
        const code = error.message.match(/^Complete the title, creator and photo for (.+)$/)?.[1];
        const message = code ? 'กรอกชื่อ ผู้สร้าง และรูปให้ครบสำหรับ ' + code
          : error.message.startsWith('Upload') ? 'รูปยังอัปโหลดไม่ครบ กรุณาลองใหม่'
            : error.message === 'Each slide needs a title and image' ? 'ใส่ชื่อและรูปให้ครบทุกสไลด์'
              : error.message === 'Both category titles are required' ? 'กรอกชื่อหมวดทั้งภาษาไทยและอังกฤษ'
                : 'รายการที่เลือกยังไม่พร้อมสำหรับคำสั่งนี้';
        return Response.json({ message }, { status: 422 });
      }
    }
    console.error('Admin operation failed', params.operation, error instanceof CatalogError ? error.code : '');
    return Response.json({ message: 'ระบบบันทึกไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
};
