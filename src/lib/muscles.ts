import { allExercises, type MuscleGroup } from '../data/exercises';
import type { Workout } from '../types';
import { addDays, todayISO } from './date';
import { doneSets, normName } from './workout';

export type Muscle = Exclude<MuscleGroup, 'Кардио' | 'Взрывная работа'>;

export const MUSCLES: Muscle[] = ['Грудь', 'Спина', 'Плечи', 'Бицепс', 'Трицепс', 'Предплечья', 'Пресс и кор', 'Квадрицепс', 'Ягодицы и бицепс бедра', 'Икры'];

const groupOf = (k: string) => allExercises().find((e) => normName(e.name) === k)?.group;

/** Если упражнения нет в справочнике — угадываем мышцу по словам в названии. */
const RULES: [RegExp, Muscle][] = [
  [/икр|на носки/, 'Икры'],
  [/пресс|планк|скруч|подъ[её]м ног|кор\b/, 'Пресс и кор'],
  [/румынск|станов|ягодич|сгибани[ея] ног|мост|гиперэкст|мертв/, 'Ягодицы и бицепс бедра'],
  [/присед|жим ног|выпад|разгибани[ея] ног|болгар|зашагив/, 'Квадрицепс'],
  [/трицепс|французск|разгибани[ея] рук|брусь|узким хват/, 'Трицепс'],
  [/бицепс|сгибани[ея] рук|молот|на бицепс/, 'Бицепс'],
  [/запясть|предплеч/, 'Предплечья'],
  [/подтяг|тяга|пуловер/, 'Спина'],
  [/жим.*(стоя|сидя|над голов)|армейск|мах|развед|арнольд|дельт|шраг|лицу/, 'Плечи'],
  [/жим|развод|отжим|кроссовер|бабочк|груд/, 'Грудь'],
];

export function muscleOf(name: string): Muscle | null {
  const k = normName(name);
  const g = groupOf(k);
  if (g) return (MUSCLES as string[]).includes(g) ? (g as Muscle) : null;
  for (const [re, m] of RULES) if (re.test(k)) return m;
  return null;
}

/** Рабочие подходы на каждую мышцу за последние 7 дней (включая сегодня). */
export function weeklySets(history: Workout[]): Record<Muscle, number> {
  const from = addDays(todayISO(), -6);
  const out = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const w of history) {
    if (w.status !== 'done' || w.date < from) continue;
    for (const e of w.exercises) {
      const m = muscleOf(e.name);
      if (m) out[m] += doneSets(e.sets).length;
    }
  }
  return out;
}

/** Рекомендуемый объём для роста мышц: примерно 10–20 рабочих подходов в неделю. */
export const TARGET = { min: 10, max: 20 };
