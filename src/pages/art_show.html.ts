import type { APIRoute } from 'astro';
import { pathForLegacyCategory } from '../lib/catalog';
export const GET: APIRoute = ({ url, redirect }) => redirect(pathForLegacyCategory(url.searchParams.get('cat')), 308);
