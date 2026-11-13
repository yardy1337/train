import { useEffect } from 'react';
import { getSetting, setSetting, useSetting } from '../db/settings';
import type { CatalogProgram } from '../data/programs';
import { addDays, daysBetween, parseISODate, todayISO } from './date';

/** Неделя цикла: 1…workWeeks — рабочие, последняя — разгрузка. */
export interface CycleInfo {
  week: number;
  total: number;
  deload: boolean;
}

const key = (id: string) => `cycleStart:${id}`;
const mondayOf = (iso: string) => addDays(iso, -((parseISODate(iso).getDay() + 6) % 7));

function calc(start: string, workWeeks: number): CycleInfo {
  const total = workWeeks + 1;
  const weeks = Math.max(0, Math.floor(daysBetween(mondayOf(start), mondayOf(todayISO())) / 7));
  const week = (weeks % total) + 1;
  return { week, total, deload: week === total };
}

/** Неделя цикла программы (если у программы есть цикл). Начало цикла — неделя первого показа. */
export function useCycle(program: CatalogProgram | undefined): CycleInfo | null {
  const id = program?.id ?? '';
  const start = useSetting<string | null>(key(id), null);
  const has = !!program?.cycle;
  useEffect(() => {
    if (!has || start) return;
    // Нет даты начала — проверяем базу (useSetting мог ещё не загрузиться) и только тогда пишем.
    void getSetting<string | null>(key(id), null).then((v) => {
      if (!v) void setSetting(key(id), mondayOf(todayISO()));
    });
  }, [has, start, id]);
  if (!program?.cycle) return null;
  return calc(start ?? mondayOf(todayISO()), program.cycle.workWeeks);
}

/** То же, без React — для старта тренировки. */
export async function getCycle(program: CatalogProgram | undefined): Promise<CycleInfo | null> {
  if (!program?.cycle) return null;
  let start = await getSetting<string | null>(key(program.id), null);
  if (!start) {
    start = mondayOf(todayISO());
    await setSetting(key(program.id), start);
  }
  return calc(start, program.cycle.workWeeks);
}

/** Начать цикл заново с этой недели. */
export const restartCycle = (id: string) => setSetting(key(id), mondayOf(todayISO()));
