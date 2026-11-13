import type { Food, Goals, MealType } from '../types';

/**
 * План питания на день под цель КБЖУ.
 * Каждый приём пищи — набор «ячеек» (белок, гарнир, овощи…); в ячейку берём случайный продукт
 * из списка, затем подгоняем граммы, чтобы сумма сошлась с целью по белкам, жирам и углеводам.
 */

interface Slot {
  role: 'protein' | 'carb' | 'veg' | 'fat' | 'fruit' | 'dairy';
  options: string[];
  min: number;
  max: number;
  /** Шаг округления граммов. */
  step?: number;
}

const MEALS: { meal: MealType; title: string; slots: Slot[] }[] = [
  {
    meal: 'breakfast',
    title: 'Завтрак',
    slots: [
      { role: 'carb', options: ['Овсянка на воде', 'Овсянка на молоке 2,5%'], min: 150, max: 500, step: 10 },
      { role: 'carb', options: ['Хлеб цельнозерновой', 'Хлеб ржаной'], min: 0, max: 120, step: 10 },
      { role: 'protein', options: ['Яйцо куриное варёное', 'Омлет', 'Творог 5%', 'Творог 2%'], min: 100, max: 250, step: 10 },
      { role: 'fruit', options: ['Банан', 'Яблоко', 'Черника'], min: 80, max: 200, step: 10 },
    ],
  },
  {
    meal: 'lunch',
    title: 'Обед',
    slots: [
      { role: 'protein', options: ['Куриная грудка отварная', 'Куриное филе гриль', 'Филе индейки (грудка)', 'Говядина отварная'], min: 120, max: 300, step: 10 },
      { role: 'carb', options: ['Гречка варёная', 'Рис белый варёный', 'Булгур варёный', 'Макароны из твёрдых сортов варёные'], min: 150, max: 550, step: 10 },
      { role: 'carb', options: ['Хлеб цельнозерновой', 'Хлеб ржаной'], min: 0, max: 120, step: 10 },
      { role: 'veg', options: ['Огурец', 'Помидор', 'Капуста брокколи', 'Перец болгарский'], min: 100, max: 250, step: 10 },
      { role: 'fat', options: ['Масло оливковое'], min: 0, max: 20, step: 5 },
    ],
  },
  {
    meal: 'snack',
    title: 'Перекус',
    slots: [
      { role: 'dairy', options: ['Йогурт греческий 2%', 'Творог 5%', 'Кефир 1%'], min: 150, max: 350, step: 10 },
      { role: 'fat', options: ['Грецкий орех', 'Миндаль'], min: 0, max: 40, step: 5 },
      { role: 'fruit', options: ['Банан', 'Яблоко'], min: 0, max: 300, step: 10 },
    ],
  },
  {
    meal: 'dinner',
    title: 'Ужин',
    slots: [
      { role: 'protein', options: ['Лосось (сёмга) охлаждённый', 'Минтай', 'Треска', 'Куриная грудка отварная', 'Тунец консервированный в собственном соку'], min: 120, max: 300, step: 10 },
      { role: 'carb', options: ['Картофель отварной', 'Рис бурый варёный', 'Батат', 'Гречка варёная'], min: 100, max: 500, step: 10 },
      { role: 'veg', options: ['Капуста брокколи', 'Огурец', 'Помидор', 'Салат листовой'], min: 100, max: 250, step: 10 },
      { role: 'fat', options: ['Масло оливковое'], min: 0, max: 15, step: 5 },
    ],
  },
];

export interface PlanItem {
  foodId: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}
export interface PlanMeal {
  meal: MealType;
  title: string;
  items: PlanItem[];
}
export interface MealPlan {
  createdAt: number;
  meals: PlanMeal[];
}

const per = (f: Food, g: number) => ({ kcal: (f.kcal * g) / 100, protein: (f.protein * g) / 100, fat: (f.fat * g) / 100, carbs: (f.carbs * g) / 100 });

/** Составить меню. foods — база продуктов телефона (берём по точному названию). */
export function buildPlan(foods: Food[], goals: Goals, rnd: () => number = Math.random): MealPlan | null {
  const byName = new Map(foods.filter((f) => !f.hidden).map((f) => [f.name, f]));
  const chosen: { mealIdx: number; slot: Slot; food: Food; g: number }[] = [];
  MEALS.forEach((m, mealIdx) =>
    m.slots.forEach((slot) => {
      const opts = slot.options.map((n) => byName.get(n)).filter((f): f is Food => !!f);
      if (!opts.length) return;
      const food = opts[Math.floor(rnd() * opts.length)];
      chosen.push({ mealIdx, slot, food, g: (slot.min + slot.max) / 2 });
    }),
  );
  if (!chosen.length) return null;

  // Подгонка граммов: градиентный спуск по ошибке БЖУ (в ккал), с границами каждой ячейки.
  const target = [goals.protein * 4, goals.fat * 9, goals.carbs * 4];
  for (let it = 0; it < 4000; it++) {
    const tot = [0, 0, 0];
    for (const c of chosen) {
      tot[0] += (c.food.protein * c.g * 4) / 100;
      tot[1] += (c.food.fat * c.g * 9) / 100;
      tot[2] += (c.food.carbs * c.g * 4) / 100;
    }
    const err = tot.map((t, i) => t - target[i]);
    const lr = 0.00012;
    for (const c of chosen) {
      const grad = (2 * (err[0] * c.food.protein * 4 + err[1] * c.food.fat * 9 + err[2] * c.food.carbs * 4)) / 100;
      c.g = Math.min(c.slot.max, Math.max(c.slot.min, c.g - lr * grad));
    }
  }

  const meals: PlanMeal[] = MEALS.map((m, i) => ({
    meal: m.meal,
    title: m.title,
    items: chosen
      .filter((c) => c.mealIdx === i)
      .map((c) => {
        const step = c.slot.step ?? 10;
        const g = Math.round(c.g / step) * step;
        return { foodId: c.food.id, name: c.food.name, grams: g, ...per(c.food, g) };
      })
      .filter((x) => x.grams > 0),
  })).filter((m) => m.items.length);
  return { createdAt: Date.now(), meals };
}

// ===== Список покупок =====

/** Готовое блюдо → что купить и сколько (варёные крупы — в сухом виде). */
const TO_BUY: Record<string, { name: string; k: number; group: string }> = {
  'Овсянка на воде': { name: 'Овсяные хлопья', k: 0.25, group: 'Крупы' },
  'Овсянка на молоке 2,5%': { name: 'Овсяные хлопья', k: 0.2, group: 'Крупы' },
  'Гречка варёная': { name: 'Гречка', k: 0.37, group: 'Крупы' },
  'Рис белый варёный': { name: 'Рис белый', k: 0.33, group: 'Крупы' },
  'Рис бурый варёный': { name: 'Рис бурый', k: 0.35, group: 'Крупы' },
  'Булгур варёный': { name: 'Булгур', k: 0.4, group: 'Крупы' },
  'Макароны из твёрдых сортов варёные': { name: 'Макароны твёрдых сортов', k: 0.42, group: 'Крупы' },
  'Картофель отварной': { name: 'Картофель', k: 1.05, group: 'Овощи и фрукты' },
  'Хлеб цельнозерновой': { name: 'Хлеб цельнозерновой', k: 1, group: 'Хлеб' },
  'Хлеб ржаной': { name: 'Хлеб ржаной', k: 1, group: 'Хлеб' },
  'Яйцо куриное варёное': { name: 'Яйца', k: 1, group: 'Молочное и яйца' },
  Омлет: { name: 'Яйца', k: 0.8, group: 'Молочное и яйца' },
  'Куриная грудка отварная': { name: 'Куриное филе', k: 1.3, group: 'Мясо и рыба' },
  'Куриное филе гриль': { name: 'Куриное филе', k: 1.35, group: 'Мясо и рыба' },
  'Говядина отварная': { name: 'Говядина', k: 1.4, group: 'Мясо и рыба' },
};

/** Отдел магазина по названию продукта. */
function groupOf(name: string) {
  const n = name.toLowerCase();
  if (/творог|йогурт|кефир|молок|яйц|омлет|сыр/.test(n)) return 'Молочное и яйца';
  if (/филе|курин|говяд|индейк|лосос|сёмг|минтай|треск|тунец|рыб/.test(n)) return 'Мясо и рыба';
  if (/овсян|гречк|рис|булгур|макарон/.test(n)) return 'Крупы';
  if (/хлеб/.test(n)) return 'Хлеб';
  if (/масло|орех|миндал/.test(n)) return 'Масло и орехи';
  return 'Овощи и фрукты';
}

export interface ShopItem {
  name: string;
  grams: number;
  group: string;
  /** Для яиц — штуки. */
  pieces?: number;
}

/** Список покупок на N дней по плану. */
export function shoppingList(plan: MealPlan, days: number): ShopItem[] {
  const map = new Map<string, ShopItem>();
  for (const m of plan.meals)
    for (const it of m.items) {
      const t = TO_BUY[it.name];
      const name = t?.name ?? it.name;
      const group = t?.group ?? groupOf(name);
      const g = it.grams * (t?.k ?? 1) * days;
      const cur = map.get(name) ?? { name, grams: 0, group };
      cur.grams += g;
      map.set(name, cur);
    }
  const out = [...map.values()].map((x) => {
    const grams = x.grams >= 1000 ? Math.ceil(x.grams / 100) * 100 : Math.ceil(x.grams / 10) * 10;
    return x.name === 'Яйца' ? { ...x, grams, pieces: Math.ceil(x.grams / 55) } : { ...x, grams };
  });
  const order = ['Мясо и рыба', 'Молочное и яйца', 'Крупы', 'Хлеб', 'Овощи и фрукты', 'Масло и орехи'];
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name, 'ru'));
}
