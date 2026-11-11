import type { Food } from '../types';

/**
 * Общая библиотека продуктов (Cloudflare Worker, папка server/).
 * Адрес можно переопределить при сборке: VITE_FOOD_API=https://… npm run build
 */
export const FOOD_API = (import.meta.env.VITE_FOOD_API as string | undefined) ?? 'https://train-food-api.doedu.workers.dev';

interface CloudRow {
  id: number;
  code: string | null;
  name: string;
  brand: string;
  qty: string;
  category: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  source: 'builtin' | 'off' | 'user';
}

function toFood(r: CloudRow): Food {
  return {
    // Продукты со штрихкодом — тот же id, что был у кэша Open Food Facts, чтобы не было дублей.
    id: r.code ? `off:${r.code}` : `s:${r.id}`,
    name: r.name,
    brand: r.brand || undefined,
    barcode: r.code ?? undefined,
    category: r.category || 'Общая библиотека',
    source: r.source === 'user' ? 'shared' : 'off',
    kcal: r.kcal,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
  };
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${FOOD_API}${path}`, { signal: signal ?? AbortSignal.timeout(8000) });
  if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Поиск в общей библиотеке. Встроенные продукты не возвращаем — они уже есть на телефоне. */
export async function searchCloud(q: string, signal?: AbortSignal): Promise<Food[]> {
  const data = await get<{ items: CloudRow[] }>(`/api/foods/search?q=${encodeURIComponent(q)}&limit=40`, signal);
  return (data.items ?? []).filter((r) => r.source !== 'builtin').map(toFood);
}

/** Штрихкод: общая библиотека, а если там нет — сервер сам спросит Open Food Facts. */
export async function barcodeCloud(code: string): Promise<Food | null> {
  const data = await get<{ product: CloudRow | null }>(`/api/foods/barcode/${encodeURIComponent(code)}`);
  return data.product ? toFood(data.product) : null;
}

/** Добавить свой продукт в общую библиотеку (сразу, без модерации). */
export async function shareFood(f: Food): Promise<void> {
  const res = await fetch(`${FOOD_API}/api/foods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: f.name, brand: f.brand, barcode: f.barcode, kcal: f.kcal, protein: f.protein, fat: f.fat, carbs: f.carbs }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export interface PhotoItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** Сжимаем фото до ~768 px (JPEG) — быстрее отправка, нейросети этого хватает. */
export async function photoToDataUrl(file: File, max = 768): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Распознать еду на фото: список блюд с примерным весом и КБЖУ на 100 г. */
export async function recognizePhoto(image: string): Promise<PhotoItem[]> {
  const res = await fetch(`${FOOD_API}/api/foods/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
    signal: AbortSignal.timeout(40000),
  });
  const data = (await res.json().catch(() => ({}))) as { items?: PhotoItem[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Не удалось распознать фото');
  return data.items ?? [];
}
