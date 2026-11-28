import type { APIRoute } from 'astro';
import template from '../../../examples/artworks-template.csv?raw';

export const GET: APIRoute = () => new Response(
  '\uFEFF' + template.replace(/\r?\n/g, '\r\n'),
  { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="artworks-template.csv"' } },
);
