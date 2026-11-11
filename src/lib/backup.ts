import { ALL_TABLES, db } from '../db/db';
import { initDb } from '../db/init';
import { todayISO } from './date';
import { applyTheme } from './features';

const APP_ID = 'my-trainer';

export async function exportData(): Promise<Blob> {
  const data: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    let rows: unknown[] = await db.table(t).toArray();
    // Встроенные продукты не выгружаем целиком — только те, что отмечены пользователем.
    if (t === 'foods') rows = (rows as { source: string; favorite?: number; lastUsed?: number }[]).filter(
      (f) => f.source !== 'builtin' || f.favorite || f.lastUsed,
    );
    data[t] = rows;
  }
  const payload = { app: APP_ID, version: 1, exportedAt: new Date().toISOString(), data };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function downloadBackup() {
  const blob = await exportData();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `moy-trener-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Полностью заменяет данные содержимым резервной копии. */
export async function importData(file: File) {
  const json = JSON.parse(await file.text());
  if (json?.app !== APP_ID || typeof json.data !== 'object') {
    throw new Error('Это не резервная копия «Мой тренер»');
  }
  await db.transaction('rw', ALL_TABLES.map((t) => db.table(t)), async () => {
    for (const t of ALL_TABLES) {
      await db.table(t).clear();
      const rows = json.data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows as never[]);
    }
  });
  // Встроенная база продуктов должна быть на месте: принудительно досеиваем.
  await db.settings.delete('foodsSeedVersion');
  await initDb();
  const dark = await db.settings.get('feature:dark');
  applyTheme(dark?.value === true);
}
