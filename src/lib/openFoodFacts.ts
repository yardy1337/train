import type { Food } from '../types';

/**
 * Open Food Facts — открытая база продуктов, работает без ключа.
 * Документация: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
const API = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_ru,generic_name_ru,brands,nutriments';

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_ru?: string;
  generic_name_ru?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : (v as number);
  return Number.isFinite(n) ? n : undefined;
};

export function offToFood(p: OffProduct): Food | null {
  const n = p.nutriments ?? {};
  const name = (p.product_name_ru || p.product_name || p.generic_name_ru || '').trim();
  if (!p.code || !name) return null;
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(n['energy_100g']) ?? num(n['energy-kj_100g']);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  const protein = num(n['proteins_100g']);
  const fat = num(n['fat_100g']);
  const carbs = num(n['carbohydrates_100g']);
  if (kcal === undefined && protein === undefined && fat === undefined && carbs === undefined) return null;
  const round = (x?: number) => Math.round((x ?? 0) * 10) / 10;
  return {
    id: `off:${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: p.code,
    source: 'off',
    category: 'Open Food Facts',
    kcal: Math.round(kcal ?? (protein ?? 0) * 4 + (fat ?? 0) * 9 + (carbs ?? 0) * 4),
    protein: round(protein),
    fat: round(fat),
    carbs: round(carbs),
  };
}

async function getJson(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Food Facts: HTTP ${res.status}`);
  return res.json();
}

export async function getByBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const data = await getJson(`${API}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, signal);
  if (data.status !== 1 || !data.product) return null;
  return offToFood({ code, ...data.product });
}
