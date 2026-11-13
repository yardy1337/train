import type { ProgramDay, SetEntry, Workout, WorkoutExercise } from '../types';
import { todayISO } from './date';

const clean = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

/**
 * Одно и то же упражнение под разными названиями — считаем одним: так история весов,
 * рекорды и подсказки переходят со старых названий на новые.
 */
const ALIASES: Record<string, string> = {
  'тяга гантели в наклоне одной рукой': 'тяга гантели в наклоне',
  'трицепс из-за головы на блоке': 'французский жим на блоке',
  'разгибания на трицепс на блоке вниз': 'разгибания на трицепс на блоке',
  'гоблет-присед с паузой': 'гоблет-присед',
};

/** Ключ упражнения для сравнения названий (регистр, ё, пробелы, синонимы). */
export const normName = (s: string) => {
  const k = clean(s);
  return ALIASES[k] ?? k;
};

export function formatReps(min: number, max: number, note?: string): string {
  let r = '';
  if (min && max) r = min === max ? `${min}` : `${min}–${max}`;
  else if (min || max) r = `${min || max}`;
  return r || note || '—';
}

export function formatTarget(sets: number, min: number, max: number, note?: string) {
  const reps = min || max ? formatReps(min, max) : note ?? 'max';
  return `${sets}×${reps}`;
}

export const doneSets = (sets: SetEntry[]) => sets.filter((s) => s.done && s.reps !== null && s.reps > 0);

/**
 * Подсказка прогрессии: во всех запланированных подходах достигнута верхняя граница повторов.
 */
export function shouldIncrease(ex: Pick<WorkoutExercise, 'sets' | 'repsMax' | 'plannedSets'>): boolean {
  if (!ex.repsMax) return false;
  const done = doneSets(ex.sets);
  return done.length >= ex.plannedSets && done.length > 0 && done.every((s) => (s.reps ?? 0) >= ex.repsMax);
}

/** Последнее выполнение упражнения (по названию) в завершённых тренировках. */
export function findLastResult(history: Workout[], name: string, excludeId?: number) {
  const key = normName(name);
  for (const w of history) {
    if (w.id === excludeId || w.status !== 'done') continue;
    const ex = w.exercises.find((e) => normName(e.name) === key);
    if (ex && doneSets(ex.sets).length) return { workout: w, exercise: ex };
  }
  return null;
}

export function formatSets(sets: SetEntry[]): string {
  return doneSets(sets)
    .map((s) => (s.weight ? `${String(s.weight).replace('.', ',')}×${s.reps}` : `${s.reps}`))
    .join(', ');
}

export function tonnage(w: Workout): number {
  return w.exercises.reduce(
    (t, e) => t + doneSets(e.sets).reduce((s, x) => s + (x.weight ?? 0) * (x.reps ?? 0), 0),
    0,
  );
}

/** Создаёт новую тренировку по шаблону дня, подставляя вес с прошлого раза. В разгрузку — вдвое меньше подходов. */
export function createWorkout(day: ProgramDay, history: Workout[], opts: { deload?: boolean } = {}): Workout {
  return {
    status: 'active',
    dayId: day.id,
    dayName: day.name,
    dayTitle: day.title,
    date: todayISO(),
    startedAt: Date.now(),
    ...(opts.deload ? { deload: true } : {}),
    exercises: day.exercises.map((e) => {
      const last = findLastResult(history, e.name);
      const lastSets = last ? doneSets(last.exercise.sets) : [];
      const sets = opts.deload ? Math.max(1, Math.ceil(e.sets / 2)) : e.sets;
      return {
        exerciseId: e.id,
        name: e.name,
        plannedSets: sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        note: e.note,
        rest: e.rest,
        ...(e.supersetNext ? { supersetNext: true } : {}),
        sets: Array.from({ length: sets }, (_, i) => ({
          weight: lastSets[i]?.weight ?? lastSets[lastSets.length - 1]?.weight ?? null,
          reps: null,
          done: false,
        })),
      };
    }),
  };
}

/** Следующий день программы после последней завершённой тренировки. */
export function nextDayId(days: ProgramDay[], history: Workout[]): string | undefined {
  if (!days.length) return undefined;
  const last = history.find((w) => w.status === 'done');
  if (!last) return days[0].id;
  const idx = days.findIndex((d) => d.id === last.dayId);
  return days[(idx + 1) % days.length]?.id ?? days[0].id;
}
