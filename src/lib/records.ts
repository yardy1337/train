import type { SetEntry, Workout } from '../types';
import { doneSets, normName } from './workout';

export interface Best {
  /** Максимальный вес (кг) и с каким числом повторов. */
  weight: number;
  weightReps: number;
  /** Максимум повторов в одном подходе (для упражнений без веса). */
  reps: number;
  date: string;
}

export interface RecordRow extends Best {
  name: string;
}

/** Лучшие результаты по каждому упражнению (ключ — нормализованное название). */
export function bestMap(history: Workout[], excludeId?: number): Map<string, RecordRow> {
  const map = new Map<string, RecordRow>();
  const sorted = [...history].filter((w) => w.status === 'done' && w.id !== excludeId).sort((a, b) => a.startedAt - b.startedAt);
  for (const w of sorted)
    for (const e of w.exercises)
      for (const s of doneSets(e.sets)) {
        const k = normName(e.name);
        const cur = map.get(k);
        const wt = s.weight ?? 0;
        const reps = s.reps ?? 0;
        if (!cur) {
          map.set(k, { name: e.name, weight: wt, weightReps: reps, reps, date: w.date });
          continue;
        }
        if (wt > cur.weight || (wt === cur.weight && wt > 0 && reps > cur.weightReps)) {
          cur.weight = wt;
          cur.weightReps = reps;
          cur.date = w.date;
        }
        if (reps > cur.reps) {
          cur.reps = reps;
          if (!wt && !cur.weight) cur.date = w.date;
        }
      }
  return map;
}

/** Подход побил прошлый рекорд? (Первое выполнение упражнения рекордом не считаем.) */
export function isRecord(set: SetEntry, best: Best | undefined): boolean {
  if (!set.done || !best || !set.reps) return false;
  const wt = set.weight ?? 0;
  if (wt > 0) return wt > best.weight || (wt === best.weight && set.reps > best.weightReps);
  return !best.weight && set.reps > best.reps;
}

export function formatBest(b: Best): string {
  return b.weight ? `${String(b.weight).replace('.', ',')} кг × ${b.weightReps}` : `${b.reps} повт.`;
}
