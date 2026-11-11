/**
 * Админ-панель «Мой тренер».
 *
 * GET    /api/config                 — настройки приложения для всех (публично)
 * GET    /api/admin/status           — создан ли администратор
 * POST   /api/admin/setup            — первый вход: код установки + новый пароль
 * POST   /api/admin/login            — пароль → токен сессии (30 дней)
 * POST   /api/admin/password         — сменить пароль
 * PUT    /api/admin/config           — сохранить настройки приложения
 * GET    /api/admin/foods?q=&source= — продукты общей библиотеки
 * PUT    /api/admin/foods/:id        — изменить продукт
 * DELETE /api/admin/foods/:id        — удалить продукт
 * GET    /api/admin/stats            — статистика
 */
import type { Env } from './index';

type J = (data: unknown, status?: number, cache?: string) => Response;

const SESSION_DAYS = 30;
const LOGINS_PER_HOUR = 10;

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function pbkdf2(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return hex(bits);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function newSession(env: Env) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO admin_sessions (token_hash, expires) VALUES (?1, ?2)').bind(await sha256(token), now + SESSION_DAYS * 86400),
    env.DB.prepare('DELETE FROM admin_sessions WHERE expires < ?1').bind(now),
  ]);
  return token;
}

async function isAdmin(req: Request, env: Env) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  const row = await env.DB.prepare('SELECT expires FROM admin_sessions WHERE token_hash = ?1').bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Math.floor(Date.now() / 1000);
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function tooManyLogins(req: Request, env: Env) {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
  const key = `login:${(await sha256(`train-admin:${ip}`)).slice(0, 24)}`;
  const now = Math.floor(Date.now() / 1000);
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM post_log WHERE ip = ?1 AND ts > ?2').bind(key, now - 3600).first<{ n: number }>();
  if ((r?.n ?? 0) >= LOGINS_PER_HOUR) return true;
  await env.DB.prepare('INSERT INTO post_log (ip, ts) VALUES (?1, ?2)').bind(key, now).run();
  return false;
}

const validPassword = (p: string) => p.length >= 6 && p.length <= 100;

export async function handleAdmin(req: Request, env: Env, url: URL, json: J): Promise<Response | null> {
  const path = url.pathname;

  if (req.method === 'GET' && path === '/api/config') {
    const row = await env.DB.prepare('SELECT data, version, updated_at FROM app_config WHERE id = 1').first<{ data: string; version: number; updated_at: number }>();
    return json({ config: row ? JSON.parse(row.data) : null, version: row?.version ?? 0, updatedAt: row?.updated_at ?? 0 }, 200, 'public, max-age=60');
  }

  if (!path.startsWith('/api/admin/')) return null;

  if (req.method === 'GET' && path === '/api/admin/status') {
    const row = await env.DB.prepare('SELECT 1 AS ok FROM admin WHERE id = 1').first();
    return json({ hasAdmin: !!row });
  }

  if (req.method === 'POST' && path === '/api/admin/setup') {
    if (await tooManyLogins(req, env)) return json({ error: 'Слишком много попыток, подождите час' }, 429);
    const b = await body(req);
    const code = String(b.code ?? '');
    const password = String(b.password ?? '');
    if (!env.SETUP_CODE || !safeEqual(code.trim(), env.SETUP_CODE)) return json({ error: 'Неверный код установки' }, 403);
    if (!validPassword(password)) return json({ error: 'Пароль — от 6 символов' }, 400);
    const exists = await env.DB.prepare('SELECT 1 FROM admin WHERE id = 1').first();
    if (exists) return json({ error: 'Администратор уже создан — войдите по паролю' }, 409);
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    await env.DB.prepare('INSERT INTO admin (id, salt, hash) VALUES (1, ?1, ?2)').bind(salt, await pbkdf2(password, salt)).run();
    return json({ token: await newSession(env) });
  }

  if (req.method === 'POST' && path === '/api/admin/login') {
    if (await tooManyLogins(req, env)) return json({ error: 'Слишком много попыток, подождите час' }, 429);
    const password = String((await body(req)).password ?? '');
    const a = await env.DB.prepare('SELECT salt, hash FROM admin WHERE id = 1').first<{ salt: string; hash: string }>();
    if (!a || !safeEqual(await pbkdf2(password, a.salt), a.hash)) return json({ error: 'Неверный пароль' }, 403);
    return json({ token: await newSession(env) });
  }

  // Дальше — только для вошедшего администратора.
  if (!(await isAdmin(req, env))) return json({ error: 'Нужно войти как администратор' }, 401);

  if (req.method === 'POST' && path === '/api/admin/password') {
    const password = String((await body(req)).password ?? '');
    if (!validPassword(password)) return json({ error: 'Пароль — от 6 символов' }, 400);
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    await env.DB.batch([
      env.DB.prepare('UPDATE admin SET salt = ?1, hash = ?2 WHERE id = 1').bind(salt, await pbkdf2(password, salt)),
      env.DB.prepare('DELETE FROM admin_sessions'),
    ]);
    return json({ token: await newSession(env) });
  }

  if (req.method === 'PUT' && path === '/api/admin/config') {
    const b = await body(req);
    const data = JSON.stringify(b.config ?? {});
    if (data.length > 900_000) return json({ error: 'Слишком большой объём настроек' }, 413);
    const row = await env.DB.prepare(
      `INSERT INTO app_config (id, data, version, updated_at) VALUES (1, ?1, 1, unixepoch())
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = app_config.version + 1, updated_at = unixepoch()
       RETURNING version, updated_at`,
    )
      .bind(data)
      .first<{ version: number; updated_at: number }>();
    return json({ ok: true, version: row?.version, updatedAt: row?.updated_at });
  }

  if (req.method === 'GET' && path === '/api/admin/foods') {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().replace(/ё/g, 'е');
    const source = url.searchParams.get('source') ?? '';
    const where: string[] = [];
    const args: unknown[] = [];
    if (q) {
      where.push(`search LIKE ?${args.length + 1}`);
      args.push(`%${q.replace(/[%_]/g, '')}%`);
    }
    if (source) {
      where.push(`source = ?${args.length + 1}`);
      args.push(source);
    }
    const { results } = await env.DB.prepare(
      `SELECT id, code, name, brand, qty, category, kcal, protein, fat, carbs, source, created_at FROM products
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT 60`,
    )
      .bind(...args)
      .all();
    return json({ items: results });
  }

  const m = path.match(/^\/api\/admin\/foods\/(\d+)$/);
  if (m && req.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM products WHERE id = ?1').bind(Number(m[1])).run();
    return json({ ok: true });
  }
  if (m && req.method === 'PUT') {
    const b = await body(req);
    const name = String(b.name ?? '').trim().slice(0, 160);
    const brand = String(b.brand ?? '').trim().slice(0, 80);
    const n = (k: string) => Number(b[k]);
    const v = { kcal: n('kcal'), protein: n('protein'), fat: n('fat'), carbs: n('carbs') };
    if (name.length < 2 || !Object.values(v).every((x) => Number.isFinite(x) && x >= 0) || v.kcal > 950) return json({ error: 'Проверьте название и КБЖУ' }, 400);
    const search = `${name} ${brand}`.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}%.,]+/gu, ' ').replace(/\s+/g, ' ').trim();
    await env.DB.prepare('UPDATE products SET name = ?1, brand = ?2, kcal = ?3, protein = ?4, fat = ?5, carbs = ?6, search = ?7 WHERE id = ?8')
      .bind(name, brand, Math.round(v.kcal), v.protein, v.fat, v.carbs, search, Number(m[1]))
      .run();
    return json({ ok: true });
  }

  if (req.method === 'GET' && path === '/api/admin/stats') {
    const now = Math.floor(Date.now() / 1000);
    const [bySource, users7, photosDay, photosWeek] = await Promise.all([
      env.DB.prepare('SELECT source, COUNT(*) AS n FROM products GROUP BY source').all<{ source: string; n: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE source = 'user' AND created_at > ?1").bind(now - 7 * 86400).first<{ n: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM post_log WHERE ip LIKE 'photo:%' AND ts > ?1").bind(now - 86400).first<{ n: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM post_log WHERE ip LIKE 'photo:%' AND ts > ?1").bind(now - 7 * 86400).first<{ n: number }>(),
    ]);
    return json({
      products: Object.fromEntries(bySource.results.map((r) => [r.source, r.n])),
      userAdded7d: users7?.n ?? 0,
      photosDay: photosDay?.n ?? 0,
      photosWeek: photosWeek?.n ?? 0,
    });
  }

  return json({ error: 'Not found' }, 404);
}
