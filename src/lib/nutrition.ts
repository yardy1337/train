import type { Food, Macros, MealEntry, MealType, RecipeIngredient } from '../types';

export const MEALS: { id: MealType; label: string }[] = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'snack', label: 'Перекус' },
  { id: 'lunch', label: 'Обед' },
  { id: 'postworkout', label: 'После тренировки' },
  { id: 'dinner', label: 'Ужин' },
];

export const ZERO: Macros = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

export function scale(per100: Macros, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: per100.kcal * k,
    protein: per100.protein * k,
    fat: per100.fat * k,
    carbs: per100.carbs * k,
  };
}

export function sum(items: Macros[]): Macros {
  return items.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      fat: a.fat + b.fat,
      carbs: a.carbs + b.carbs,
    }),
    { ...ZERO },
  );
}

export const per100Of = (f: Macros): Macros => ({ kcal: f.kcal, protein: f.protein, fat: f.fat, carbs: f.carbs });

export function makeEntry(food: Food, grams: number, date: string, meal: MealType): MealEntry {
  const per100 = per100Of(food);
  return {
    date,
    meal,
    foodId: food.id,
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    grams,
    per100,
    ...scale(per100, grams),
    createdAt: Date.now(),
  };
}

/** КБЖУ рецепта на 100 г: сумма ингредиентов / вес готового блюда. */
export function recipePer100(ingredients: RecipeIngredient[], totalWeight?: number): Macros {
  const total = sum(ingredients.map((i) => scale(i, i.grams)));
  const weight = totalWeight && totalWeight > 0 ? totalWeight : ingredients.reduce((s, i) => s + i.grams, 0);
  if (!weight) return { ...ZERO };
  return scale(total, (100 / weight) * 100);
}

/** Поиск по локальной базе: все слова запроса должны встречаться в названии. */
export function searchFoods(foods: Food[], query: string, limit = 60): Food[] {
  const q = query.toLowerCase().replace(/ё/g, 'е').trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
  const scored: { f: Food; score: number }[] = [];
  for (const f of foods) {
    const name = norm(`${f.name} ${f.brand ?? ''}`);
    if (!words.every((w) => name.includes(w))) continue;
    let score = 0;
    if (name.startsWith(q)) score += 10;
    else if (name.split(/[\s(]+/).some((t) => t.startsWith(words[0]))) score += 5;
    if (f.favorite) score += 3;
    if (f.lastUsed) score += 2;
    if (f.source === 'custom' || f.source === 'recipe') score += 1;
    score -= name.length / 100;
    scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.f);
}
