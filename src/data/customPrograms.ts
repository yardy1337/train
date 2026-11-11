import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSetting, setSetting } from '../db/settings';
import { uid } from '../lib/date';
import type { ProgramDay } from '../types';
import { registerCustomPrograms, type CatalogProgram } from './programs';

/** Своя программа, созданная пользователем с нуля. Хранится в настройках. */
export interface CustomProgram {
  id: string; // «c-…»
  name: string;
  icon: string;
  color: string;
  days: ProgramDay[];
  createdAt: number;
}

const KEY = 'customPrograms';
const EMPTY: CustomProgram[] = [];

export function toCatalog(c: CustomProgram): CatalogProgram {
  const n = c.days.length;
  const exercises = c.days.reduce((t, d) => t + d.exercises.length, 0);
  return {
    id: c.id,
    name: c.name,
    tagline: exercises ? `Своя программа · ${exercises} упр.` : 'Своя программа · добавьте упражнения',
    description: 'Ваша программа: дни и упражнения вы задаёте сами в редакторе.',
    level: 'Средний',
    daysPerWeek: n,
    goal: 'Своя',
    equipment: 'на ваш выбор',
    days: () => c.days,
    custom: { icon: c.icon, color: c.color },
  };
}

/** Свои программы (реактивно). Заодно регистрирует их в каталоге. */
export function useCustomPrograms(): CustomProgram[] {
  const list = useLiveQuery(() => db.settings.get(KEY).then((r) => (r?.value as CustomProgram[] | undefined) ?? EMPTY), [], EMPTY);
  registerCustomPrograms(list.map(toCatalog));
  return list;
}

async function update(fn: (list: CustomProgram[]) => CustomProgram[]) {
  const list = await getSetting<CustomProgram[]>(KEY, []);
  await setSetting(KEY, fn(list));
}

const LETTERS = 'ABCDEFG';

export function newDay(programId: string, index: number): ProgramDay {
  return { id: `${programId}-${uid().slice(0, 8)}`, order: index, name: `День ${LETTERS[index] ?? index + 1}`, title: 'Новый день', exercises: [] };
}

export async function createCustomProgram(p: { name: string; icon: string; color: string; days: number }) {
  const id = `c-${uid().slice(0, 8)}`;
  const program: CustomProgram = {
    id,
    name: p.name,
    icon: p.icon,
    color: p.color,
    days: Array.from({ length: p.days }, (_, i) => newDay(id, i)),
    createdAt: Date.now(),
  };
  await update((list) => [...list, program]);
  return id;
}

export const patchCustomProgram = (id: string, patch: Partial<Omit<CustomProgram, 'id'>>) =>
  update((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

export const deleteCustomProgram = (id: string) => update((list) => list.filter((c) => c.id !== id));

/** Хранилище дней для редактора: тот же интерфейс, что у основной программы. */
export function customDayStore(id: string) {
  const days = async () => (await getSetting<CustomProgram[]>(KEY, [])).find((c) => c.id === id)?.days ?? [];
  return {
    put: async (day: ProgramDay) => {
      const list = await days();
      const next = list.some((d) => d.id === day.id) ? list.map((d) => (d.id === day.id ? day : d)) : [...list, day];
      await patchCustomProgram(id, { days: next.sort((a, b) => a.order - b.order) });
    },
    remove: async (dayId: string) => {
      const list = await days();
      await patchCustomProgram(id, { days: list.filter((d) => d.id !== dayId) });
    },
  };
}
