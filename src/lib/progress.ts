import type { WeightEntry, Workout } from '../types';
import { daysBetween } from './date';
import { doneSets, normName } from './workout';

export interface Pace {
  perWeek: number;
  days: number;
  advice: string;
  tone: 'good' | 'warn' | 'bad';
}

/**
 * Темп набора, кг/неделю: линейная регрессия по взвешиваниям за последние 4 недели
 * (устойчивее к колебаниям воды, чем разница двух точек).
 */
export function calcPace(entries: WeightEntry[]): Pace | null {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const last = sorted[sorted.length - 1];
  const window = sorted.filter((e) => daysBetween(e.date, last.date) <= 28);
  const pts = window.length >= 2 ? window : sorted.slice(-2);
  const x0 = pts[0].date;
  const xs = pts.map((p) => daysBetween(x0, p.date));
  const span = xs[xs.length - 1];
  if (span < 5) return null; // слишком короткий промежуток для выводов
  const ys = pts.map((p) => p.weight);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  const perWeek = den ? (num / den) * 7 : 0;
  return { perWeek, days: span, ...paceAdvice(perWeek) };
}

export function paceAdvice(perWeek: number): Pick<Pace, 'advice' | 'tone'> {
  if (perWeek < 0.25) return { advice: 'Набор медленный — добавь 200–300 ккал в день.', tone: 'warn' };
  if (perWeek <= 0.5) return { advice: 'Всё отлично — темп идеальный для чистого набора.', tone: 'good' };
  if (perWeek <= 0.7)
    return { advice: 'Темп на верхней границе. Можно оставить, но следи за талией.', tone: 'warn' };
  return { advice: 'Слишком быстро — убавь углеводы, иначе пойдёт жир.', tone: 'bad' };
}

export interface ExercisePoint {
  date: string;
  weight: number; // максимальный рабочий вес
  e1rm: number; // расчётный 1ПМ по Эпли
  volume: number;
}

export function exerciseNames(history: Workout[]): string[] {
  const map = new Map<string, string>();
  for (const w of history)
    for (const e of w.exercises) if (doneSets(e.sets).length) map.set(normName(e.name), map.get(normName(e.name)) ?? e.name);
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function exerciseSeries(history: Workout[], name: string): ExercisePoint[] {
  const key = normName(name);
  const pts: ExercisePoint[] = [];
  for (const w of [...history].sort((a, b) => a.startedAt - b.startedAt)) {
    const ex = w.exercises.find((e) => normName(e.name) === key);
    if (!ex) continue;
    const sets = doneSets(ex.sets);
    if (!sets.length) continue;
    const weight = Math.max(...sets.map((s) => s.weight ?? 0));
    const e1rm = Math.max(...sets.map((s) => (s.weight ?? 0) * (1 + (s.reps ?? 0) / 30)));
    const volume = sets.reduce((t, s) => t + (s.weight ?? 0) * (s.reps ?? 0), 0);
    pts.push({ date: w.date, weight, e1rm: Math.round(e1rm * 10) / 10, volume });
  }
  return pts;
}
