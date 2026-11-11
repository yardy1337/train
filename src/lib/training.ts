import { allExercises } from '../data/exercises';
import type { WorkoutExercise } from '../types';
import { doneSets, normName, shouldIncrease } from './workout';

const kindOf = (name: string) => allExercises().find((e) => normName(e.name) === normName(name))?.kind;
const isDumbbell = (name: string) => /гантел/i.test(name);
export const isBarbell = (name: string) => /штанг|смит|гриф|становая/i.test(name) && !/гантел|гир|гоблет/i.test(name);

/** Многосуставное упражнение (по справочнику, иначе — по длинному отдыху). */
export function isCompound(ex: Pick<WorkoutExercise, 'name' | 'rest'>) {
  const k = kindOf(ex.name);
  return k ? k === 'base' : ex.rest >= 90;
}

function step(name: string, w: number) {
  if (isDumbbell(name)) return w >= 10 ? 2 : 1;
  return w >= 20 ? 2.5 : 1;
}

const roundTo = (v: number, s: number) => Math.round(v / s) * s;

export interface Suggestion {
  weight: number;
  text: string;
  up: boolean;
}

/** Совет по весу на сегодня по прошлому выполнению. */
export function suggestWeight(ex: WorkoutExercise, last: WorkoutExercise | undefined): Suggestion | null {
  if (!last) return null;
  const sets = doneSets(last.sets).filter((s) => (s.weight ?? 0) > 0);
  if (!sets.length) return null;
  const top = Math.max(...sets.map((s) => s.weight ?? 0));
  const reps = ex.repsMax ? `${ex.repsMin || ex.repsMax}–${ex.repsMax}` : '';
  // Все рабочие подходы прошлого раза дошли до верха диапазона — пора прибавлять.
  const done = doneSets(last.sets);
  const reachedTop = !!ex.repsMax && done.length >= Math.max(1, ex.plannedSets - 1) && done.every((s) => (s.reps ?? 0) >= ex.repsMax);
  if (reachedTop || shouldIncrease({ sets: last.sets, repsMax: ex.repsMax, plannedSets: ex.plannedSets })) {
    const w = Math.round((top + step(ex.name, top)) * 100) / 100;
    return { weight: w, up: true, text: `Прибавь вес: ${fmtKg(w)} кг${reps ? ` на ${ex.repsMin || ex.repsMax} повт.` : ''}` };
  }
  const topSets = sets.filter((s) => s.weight === top);
  const minReps = Math.min(...topSets.map((s) => s.reps ?? 0));
  if (ex.repsMin && minReps < ex.repsMin - 1) {
    const w = Math.max(0, Math.round((top - step(ex.name, top)) * 100) / 100);
    return { weight: w, up: false, text: `В прошлый раз было тяжело — попробуй ${fmtKg(w)} кг` };
  }
  return { weight: top, up: false, text: `Оставь ${fmtKg(top)} кг${reps ? ` и добавь повторов (цель ${reps})` : ''}` };
}

export const fmtKg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Разминочные подходы до рабочего веса. */
export function warmupSets(ex: WorkoutExercise, working: number | null): { weight: number; reps: number }[] {
  if (!working || working < 15 || !isCompound(ex)) return [];
  const s = isDumbbell(ex.name) ? (working >= 20 ? 2 : 1) : 2.5;
  const plan: [number, number][] = working >= 60 ? [[0.4, 10], [0.6, 5], [0.8, 3]] : working >= 30 ? [[0.5, 8], [0.75, 4]] : [[0.6, 6]];
  const out: { weight: number; reps: number }[] = [];
  for (const [pct, reps] of plan) {
    const w = roundTo(working * pct, s);
    if (w > 0 && w < working && !out.some((o) => o.weight === w)) out.push({ weight: w, reps });
  }
  return out;
}

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Блины на одну сторону (жадно, от крупных). rest — что не удалось набрать. */
export function platesFor(target: number, bar: number) {
  let side = (target - bar) / 2;
  if (side < 0) return { plates: [] as number[], rest: target - bar };
  const plates: number[] = [];
  for (const p of PLATES)
    while (side + 1e-9 >= p) {
      plates.push(p);
      side -= p;
    }
  return { plates, rest: Math.round(side * 2 * 100) / 100 };
}
