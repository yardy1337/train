import type { Goals, MealEntry, Workout } from '../types';
import { addDays, parseISODate } from './date';
import { MUSCLES, muscleOf, type Muscle } from './muscles';
import { bestMap, isRecord, type Best } from './records';
import { doneSets, normName, tonnage } from './workout';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: 'dumbbell' | 'weight' | 'trophy' | 'flame' | 'sunrise' | 'moon' | 'timer' | 'body' | 'apple' | 'beef';
  value: number;
  goal: number;
}

const mondayOf = (iso: string) => {
  const d = parseISODate(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
};

/** Самая длинная серия подряд идущих элементов (недель или дней) в отсортированном списке ISO-дат. */
function longestRun(dates: string[], step: number) {
  const set = [...new Set(dates)].sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const d of set) {
    cur = prev && addDays(prev, step) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

/** Все достижения с текущим прогрессом. */
export function computeAchievements(history: Workout[], meals: MealEntry[], goals: Goals): Achievement[] {
  const done = history.filter((w) => w.status === 'done').sort((a, b) => a.startedAt - b.startedAt);
  const n = done.length;
  const tons = done.reduce((t, w) => t + tonnage(w), 0) / 1000;

  // Рекорды: идём по тренировкам по порядку и сравниваем с лучшим до этой тренировки.
  // Один проход: лучший результат копим по ходу, сравниваем каждую тренировку с тем, что было до неё.
  let records = 0;
  const best = new Map<string, Best>();
  for (const w of done) {
    for (const e of w.exercises) {
      const k = normName(e.name);
      if (e.sets.some((s) => isRecord(s, best.get(k)))) records++;
    }
    for (const [k, b] of bestMap([w])) {
      const cur = best.get(k);
      if (!cur) best.set(k, { ...b });
      else {
        if (b.weight > cur.weight || (b.weight === cur.weight && b.weightReps > cur.weightReps)) {
          cur.weight = b.weight;
          cur.weightReps = b.weightReps;
        }
        cur.reps = Math.max(cur.reps, b.reps);
      }
    }
  }

  // Недели подряд, где было хотя бы 2 тренировки.
  const perWeek = new Map<string, number>();
  for (const w of done) perWeek.set(mondayOf(w.date), (perWeek.get(mondayOf(w.date)) ?? 0) + 1);
  const goodWeeks = [...perWeek.entries()].filter(([, c]) => c >= 2).map(([m]) => m);
  const weekRun = longestRun(goodWeeks, 7);

  const hour = (w: Workout) => new Date(w.startedAt).getHours();
  const early = done.filter((w) => hour(w) < 8).length;
  const late = done.filter((w) => hour(w) >= 21).length;
  const long = done.filter((w) => w.finishedAt && w.finishedAt - w.startedAt >= 90 * 60_000).length;

  // Вся мышечная карта за одну неделю.
  const weekMuscles = new Map<string, Set<Muscle>>();
  for (const w of done)
    for (const e of w.exercises) {
      const m = muscleOf(e.name);
      if (m && doneSets(e.sets).length) {
        const k = mondayOf(w.date);
        if (!weekMuscles.has(k)) weekMuscles.set(k, new Set());
        weekMuscles.get(k)!.add(m);
      }
    }
  const bestWeekMuscles = Math.max(0, ...[...weekMuscles.values()].map((s) => s.size));

  // Питание: дни подряд с записями и дни с выполненной нормой белка.
  const mealDays = [...new Set(meals.map((m) => m.date))];
  const foodRun = longestRun(mealDays, 1);
  const proteinByDay = new Map<string, number>();
  for (const m of meals) proteinByDay.set(m.date, (proteinByDay.get(m.date) ?? 0) + m.protein);
  const proteinDays = [...proteinByDay.values()].filter((p) => goals.protein > 0 && p >= goals.protein).length;

  return [
    { id: 'w1', title: 'Первый шаг', desc: 'Заверши первую тренировку', icon: 'dumbbell', value: n, goal: 1 },
    { id: 'w10', title: 'Втянулся', desc: '10 тренировок', icon: 'dumbbell', value: n, goal: 10 },
    { id: 'w50', title: 'Постоянство', desc: '50 тренировок', icon: 'dumbbell', value: n, goal: 50 },
    { id: 'w100', title: 'Сотня', desc: '100 тренировок', icon: 'dumbbell', value: n, goal: 100 },
    { id: 't10', title: '10 тонн', desc: 'Суммарно поднято 10 тонн', icon: 'weight', value: tons, goal: 10 },
    { id: 't100', title: '100 тонн', desc: 'Суммарно поднято 100 тонн', icon: 'weight', value: tons, goal: 100 },
    { id: 't500', title: 'Тяжеловес', desc: 'Суммарно поднято 500 тонн', icon: 'weight', value: tons, goal: 500 },
    { id: 'r1', title: 'Первый рекорд', desc: 'Побей свой лучший результат', icon: 'trophy', value: records, goal: 1 },
    { id: 'r10', title: 'Рекордсмен', desc: '10 личных рекордов', icon: 'trophy', value: records, goal: 10 },
    { id: 'r50', title: 'Машина', desc: '50 личных рекордов', icon: 'trophy', value: records, goal: 50 },
    { id: 's4', title: 'Месяц в ритме', desc: '4 недели подряд по 2+ тренировки', icon: 'flame', value: weekRun, goal: 4 },
    { id: 's12', title: 'Сезон', desc: '12 недель подряд по 2+ тренировки', icon: 'flame', value: weekRun, goal: 12 },
    { id: 'body', title: 'Всё тело', desc: 'Все 10 групп мышц за одну неделю', icon: 'body', value: bestWeekMuscles, goal: MUSCLES.length },
    { id: 'early', title: 'Ранняя пташка', desc: 'Тренировка до 8 утра', icon: 'sunrise', value: early, goal: 1 },
    { id: 'night', title: 'Ночной режим', desc: 'Тренировка после 21:00', icon: 'moon', value: late, goal: 1 },
    { id: 'long', title: 'Марафон', desc: 'Тренировка дольше 1,5 часа', icon: 'timer', value: long, goal: 1 },
    { id: 'food7', title: 'Дневник питания', desc: 'Записывай еду 7 дней подряд', icon: 'apple', value: foodRun, goal: 7 },
    { id: 'protein7', title: 'Белковый', desc: '7 дней с нормой белка', icon: 'beef', value: proteinDays, goal: 7 },
  ];
}

export const unlocked = (a: Achievement) => a.value >= a.goal;
