import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSetting, setSetting } from '../db/settings';
import type { ProgramDay } from '../types';
import { originalProgram, registerProgramOverrides, type ProgramOverride } from './programs';

const KEY = 'programOverrides';
const EMPTY: Record<string, ProgramOverride> = {};

/** Правки встроенных программ (реактивно). Заодно подставляет их в каталог. */
export function useProgramOverrides() {
  const o = useLiveQuery(() => db.settings.get(KEY).then((r) => (r?.value as Record<string, ProgramOverride> | undefined) ?? EMPTY), [], EMPTY);
  registerProgramOverrides(o);
  return o;
}

export async function patchOverride(id: string, patch: ProgramOverride) {
  const all = await getSetting<Record<string, ProgramOverride>>(KEY, {});
  await setSetting(KEY, { ...all, [id]: { ...all[id], ...patch } });
}

/** Вернуть программу к исходному виду из каталога. */
export async function resetOverride(id: string) {
  const all = await getSetting<Record<string, ProgramOverride>>(KEY, {});
  const next = { ...all };
  delete next[id];
  await setSetting(KEY, next);
}

/** Хранилище дней встроенной программы для редактора: правки пишутся поверх шаблона. */
export function overrideDayStore(id: string) {
  const current = async (): Promise<ProgramDay[]> => {
    const all = await getSetting<Record<string, ProgramOverride>>(KEY, {});
    return all[id]?.days ?? originalProgram(id)?.days() ?? [];
  };
  return {
    put: async (day: ProgramDay) => {
      const list = await current();
      const next = list.some((d) => d.id === day.id) ? list.map((d) => (d.id === day.id ? day : d)) : [...list, day];
      await patchOverride(id, { days: next.sort((a, b) => a.order - b.order) });
    },
    remove: async (dayId: string) => {
      await patchOverride(id, { days: (await current()).filter((d) => d.id !== dayId) });
    },
  };
}
