/**
 * train-food-api — общая библиотека продуктов приложения «Мой тренер».
 *
 * GET  /api/foods/search?q=творог простоквашино&limit=30
 * GET  /api/foods/barcode/:code   — из базы, а если нет — из Open Food Facts (и сохраняем)
 * POST /api/foods                 — добавить продукт (сразу в общую базу, без модерации)
 * GET  /api/foods/stats
 */

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

interface Row {
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
  source: string;
}

const OFF_UA = 'MoyTrener/1.0 (https://github.com/yardy1337/train)';
const POSTS_PER_HOUR = 30;

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}%.,]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data: unknown, req: Request, env: Env, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, ...cors(req, env) },
  });
}

const SELECT = 'SELECT p.id, p.code, p.name, p.brand, p.qty, p.category, p.kcal, p.protein, p.fat, p.carbs, p.source FROM products p';

async function search(env: Env, q: string, limit: number): Promise<Row[]> {
  const words = norm(q)
    .split(' ')
    .filter((w) => w.length > 0)
    .slice(0, 6);
  if (!words.length) return [];
  // Каждое слово — префиксный поиск: «твор прост» найдёт «Творог Простоквашино».
  const match = words.map((w) => `"${w.replace(/"/g, '')}"*`).join(' ');
  const { results } = await env.DB.prepare(
    `${SELECT} JOIN products_fts f ON f.rowid = p.id
     WHERE products_fts MATCH ?1
     ORDER BY CASE p.source WHEN 'builtin' THEN 0 WHEN 'user' THEN 1 ELSE 2 END,
              CASE WHEN p.search LIKE ?3 THEN 0 ELSE 1 END,
              bm25(products_fts), length(p.name)
     LIMIT ?2`,
  )
    .bind(match, limit, `${words[0]}%`)
    .all<Row>();
  return results;
}

async function byCode(env: Env, code: string) {
  return env.DB.prepare(`${SELECT} WHERE p.code = ?1`).bind(code).first<Row>();
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);

function validMacros(kcal: number, p: number, f: number, c: number) {
  return (
    [kcal, p, f, c].every(Number.isFinite) &&
    kcal >= 0 &&
    kcal <= 950 &&
    [p, f, c].every((x) => x >= 0 && x <= 100) &&
    p + f + c <= 105
  );
}

async function insert(
  env: Env,
  r: { code: string | null; name: string; brand: string; qty: string; kcal: number; protein: number; fat: number; carbs: number; source: string },
) {
  const res = await env.DB.prepare(
    `INSERT INTO products (code, name, brand, qty, kcal, protein, fat, carbs, source, search)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
     ON CONFLICT(code) DO NOTHING RETURNING id`,
  )
    .bind(r.code, r.name, r.brand, r.qty, r.kcal, r.protein, r.fat, r.carbs, r.source, norm(`${r.name} ${r.brand}`))
    .first<{ id: number }>();
  return res?.id ?? null;
}

async function fromOpenFoodFacts(env: Env, code: string): Promise<Row | null> {
  const fields = 'product_name,product_name_ru,brands,quantity,nutriments';
  let res: Response;
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, {
      headers: { 'User-Agent': OFF_UA },
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.warn('OFF недоступен', e);
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: number; product?: Record<string, any> };
  const p = data.product;
  if (data.status !== 1 || !p) return null;
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g'] ?? (num(n['energy_100g']) / 4.184));
  const protein = num(n['proteins_100g']);
  const fat = num(n['fat_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const name = String(p.product_name_ru || p.product_name || '').trim();
  if (!name || !validMacros(kcal, protein, fat, carbs)) return null;
  const row = {
    code,
    name: name.slice(0, 160),
    brand: String(p.brands ?? '').split(',')[0].trim().slice(0, 80),
    qty: String(p.quantity ?? '').trim().slice(0, 40),
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    source: 'off',
  };
  await insert(env, row);
  return byCode(env, code);
}

async function clientKey(req: Request) {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`train-food:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function addProduct(req: Request, env: Env) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный JSON' }, req, env, 400);
  }
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
  const brand = String(body.brand ?? '').trim().replace(/\s+/g, ' ');
  const code = String(body.barcode ?? '').replace(/\D/g, '') || null;
  const kcal = num(body.kcal);
  const protein = num(body.protein);
  const fat = num(body.fat);
  const carbs = num(body.carbs);
  if (name.length < 2 || name.length > 160 || brand.length > 80) return json({ error: 'Проверьте название' }, req, env, 400);
  if (code && (code.length < 8 || code.length > 14)) return json({ error: 'Некорректный штрихкод' }, req, env, 400);
  if (!validMacros(kcal, protein, fat, carbs)) return json({ error: 'Проверьте КБЖУ на 100 г' }, req, env, 400);

  const key = await clientKey(req);
  const hourAgo = Math.floor(Date.now() / 1000) - 3600;
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM post_log WHERE ip = ?1 AND ts > ?2').bind(key, hourAgo).first<{ n: number }>();
  if ((recent?.n ?? 0) >= POSTS_PER_HOUR) return json({ error: 'Слишком много добавлений, попробуйте позже' }, req, env, 429);

  if (code) {
    const existing = await byCode(env, code);
    if (existing) return json({ product: existing, existed: true }, req, env);
  }
  const dup = await env.DB.prepare(`${SELECT} WHERE p.search = ?1 AND p.source = 'user' LIMIT 1`)
    .bind(norm(`${name} ${brand}`))
    .first<Row>();
  if (dup) return json({ product: dup, existed: true }, req, env);

  const id = await insert(env, {
    code,
    name,
    brand,
    qty: String(body.qty ?? '').trim().slice(0, 40),
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    source: 'user',
  });
  await env.DB.batch([
    env.DB.prepare('INSERT INTO post_log (ip, ts) VALUES (?1, ?2)').bind(key, Math.floor(Date.now() / 1000)),
    env.DB.prepare('DELETE FROM post_log WHERE ts < ?1').bind(hourAgo - 86400),
  ]);
  const product = id ? await env.DB.prepare(`${SELECT} WHERE p.id = ?1`).bind(id).first<Row>() : null;
  return json({ product, existed: false }, req, env, 201);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, env) });

    try {
      if (req.method === 'GET' && url.pathname === '/api/foods/search') {
        const q = (url.searchParams.get('q') ?? '').slice(0, 100);
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 30));
        return json({ items: await search(env, q, limit) }, req, env, 200, 'public, max-age=300');
      }

      const m = url.pathname.match(/^\/api\/foods\/barcode\/(\d{6,14})$/);
      if (req.method === 'GET' && m) {
        const code = m[1];
        const product = (await byCode(env, code)) ?? (await fromOpenFoodFacts(env, code));
        return json({ product }, req, env, product ? 200 : 404, product ? 'public, max-age=3600' : 'no-store');
      }

      if (req.method === 'POST' && url.pathname === '/api/foods') return addProduct(req, env);

      if (req.method === 'GET' && url.pathname === '/api/foods/stats') {
        const { results } = await env.DB.prepare('SELECT source, COUNT(*) AS n FROM products GROUP BY source').all<{ source: string; n: number }>();
        return json({ bySource: Object.fromEntries(results.map((r) => [r.source, r.n])) }, req, env, 200, 'public, max-age=300');
      }

      return json({ error: 'Not found' }, req, env, 404);
    } catch (e) {
      console.error(e);
      return json({ error: 'Ошибка сервера' }, req, env, 500);
    }
  },
};
