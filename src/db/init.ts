import { db } from './db';
import { createDefaultProgram } from '../data/defaultProgram';
import foodsJson from '../data/foods.json';
import type { Food } from '../types';

/** Увеличивайте, когда меняется встроенная база продуктов. */
const FOODS_SEED_VERSION = 2;
/** Увеличивайте, когда меняется встроенная программа «Верх / Низ». */
const PROGRAM_VERSION = 2;

type Row = [name: string, kcal: number, protein: number, fat: number, carbs: number];

export function builtinFoods(): Food[] {
  const out: Food[] = [];
  for (const [category, rows] of Object.entries(foodsJson)) {
    if (!Array.isArray(rows)) continue;
    for (const [name, kcal, protein, fat, carbs] of rows as Row[]) {
      out.push({ id: `b:${name}`, name, category, kcal, protein, fat, carbs, source: 'builtin' });
    }
  }
  return out;
}

/** Первичное заполнение БД: программа тренировок и встроенная база продуктов. */
export async function initDb() {
  await db.transaction('rw', db.programDays, db.foods, db.settings, async () => {
    if ((await db.programDays.count()) === 0) {
      await db.programDays.bulkAdd(createDefaultProgram());
      await db.settings.put({ key: 'programVersion', value: PROGRAM_VERSION });
    }
    // Новая «Верх / Низ»: заменяем дни программы на телефоне (история тренировок и веса остаются).
    const pv = await db.settings.get('programVersion');
    if (pv?.value !== PROGRAM_VERSION) {
      const active = (await db.settings.get('activeProgram'))?.value ?? 'upper-lower';
      if (active === 'upper-lower') {
        await db.programDays.clear();
        await db.programDays.bulkAdd(createDefaultProgram());
        await db.settings.delete('cycleStart:upper-lower');
      }
      await db.settings.put({ key: 'programVersion', value: PROGRAM_VERSION });
    }
    const seeded = await db.settings.get('foodsSeedVersion');
    if (seeded?.value !== FOODS_SEED_VERSION) {
      const foods = builtinFoods();
      const existing = await db.foods.bulkGet(foods.map((f) => f.id));
      // Сохраняем пользовательские отметки (избранное, недавние) при обновлении базы.
      await db.foods.bulkPut(
        foods.map((f, i) => {
          const e = existing[i];
          // Продукт, изменённый или удалённый в режиме редактора, оставляем как есть.
          if (e?.edited) return e;
          return { ...f, favorite: e?.favorite, lastUsed: e?.lastUsed };
        }),
      );
      await db.settings.put({ key: 'foodsSeedVersion', value: FOODS_SEED_VERSION });
    }
  });
}
