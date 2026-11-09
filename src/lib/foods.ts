import { db } from '../db/db';
import type { Food } from '../types';

/** Сохранить найденные онлайн продукты в локальную базу, не затирая отметки пользователя. */
export async function cacheFoods(foods: Food[]) {
  if (!foods.length) return;
  await db.transaction('rw', db.foods, async () => {
    const existing = await db.foods.bulkGet(foods.map((f) => f.id));
    await db.foods.bulkPut(
      foods.map((f, i) => ({ ...f, favorite: existing[i]?.favorite, lastUsed: existing[i]?.lastUsed })),
    );
  });
}

export async function toggleFavorite(food: Food) {
  const existing = await db.foods.get(food.id);
  if (existing) await db.foods.update(food.id, { favorite: existing.favorite ? 0 : 1 });
  else await db.foods.put({ ...food, favorite: 1 });
}

export async function touchFood(food: Food) {
  const existing = await db.foods.get(food.id);
  if (existing) await db.foods.update(food.id, { lastUsed: Date.now() });
  else await db.foods.put({ ...food, lastUsed: Date.now() });
}

export async function findByBarcode(code: string) {
  return db.foods.where('barcode').equals(code).first();
}
