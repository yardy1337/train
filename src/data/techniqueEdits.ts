import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSetting, setSetting } from '../db/settings';
import { normName } from '../lib/workout';
import { registerTechniqueEdits, type Technique } from './technique';

const KEY = 'techniqueEdits';
const EMPTY: Record<string, Technique> = {};

/** Правки техники (реактивно), подставляются в подсказки. */
export function useTechniqueEdits() {
  const e = useLiveQuery(() => db.settings.get(KEY).then((r) => (r?.value as Record<string, Technique> | undefined) ?? EMPTY), [], EMPTY);
  registerTechniqueEdits(e);
  return e;
}

export async function saveTechnique(name: string, t: Technique | null) {
  const all = await getSetting<Record<string, Technique>>(KEY, {});
  const next = { ...all };
  if (t) next[normName(name)] = t;
  else delete next[normName(name)];
  await setSetting(KEY, next);
}
