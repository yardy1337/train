import { CheckCircle2, Plus, Target, TrendingUp } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Button, Sheet } from '../../components/ui';
import { allExercises, defaultsFor, type CatalogExercise } from '../../data/exercises';
import { db } from '../../db/db';
import { formatShort, uid } from '../../lib/date';
import { pluralRu } from '../../lib/format';
import { TARGET, muscleOf, weeklyHistory, type Muscle } from '../../lib/muscles';
import { findLastResult, nextDayId, normName } from '../../lib/workout';
import type { Workout, WorkoutExercise } from '../../types';
import { useHistory, useProgram } from '../workouts/hooks';

/** Окно мышцы: сколько не хватает и как добрать, упражнения на неё, история по неделям. */
export function MuscleSheet({ muscle, sets, parts, onClose }: { muscle: Muscle | null; sets: number; parts: string; onClose: () => void }) {
  return (
    <Sheet open={!!muscle} onClose={onClose} title={muscle ?? ''}>
      {muscle && <Body muscle={muscle} sets={sets} parts={parts} />}
    </Sheet>
  );
}

function Body({ muscle, sets, parts }: { muscle: Muscle; sets: number; parts: string }) {
  const history = useHistory();
  const days = useProgram();
  const active = useLiveQuery(async () => (await db.workouts.where('status').equals('active').first()) ?? null, []);
  const [added, setAdded] = useState<Set<string>>(new Set());

  // Упражнения справочника на эту мышцу: сначала те, что есть в вашей программе.
  const inProgram = useMemo(() => new Set(days.flatMap((d) => d.exercises.map((e) => normName(e.name)))), [days]);
  const exercises = useMemo(
    () =>
      allExercises()
        .filter((e) => muscleOf(e.name) === muscle)
        .sort((a, b) => Number(inProgram.has(normName(b.name))) - Number(inProgram.has(normName(a.name))) || Number(b.kind === 'base') - Number(a.kind === 'base')),
    [muscle, inProgram],
  );

  // Совет: сколько не хватает и в какой день программы добрать.
  const need = TARGET.min - sets;
  const ownHistory = history.filter((w) => days.some((d) => d.id === w.dayId));
  const nextId = nextDayId(days, ownHistory);
  const ordered = (() => {
    const i = Math.max(0, days.findIndex((d) => d.id === nextId));
    return [...days.slice(i), ...days.slice(0, i)];
  })();
  const dayForMuscle = ordered.find((d) => d.exercises.some((e) => muscleOf(e.name) === muscle));
  const best = exercises.find((e) => dayForMuscle?.exercises.some((x) => normName(x.name) === normName(e.name))) ?? exercises[0];

  const weeks = useMemo(() => weeklyHistory(history, muscle), [history, muscle]);
  const maxW = Math.max(TARGET.max, ...weeks.map((w) => w.sets));

  const addToWorkout = async (c: CatalogExercise) => {
    const w = await db.workouts.where('status').equals('active').first();
    if (!w) return;
    const d = defaultsFor(c.kind);
    const last = findLastResult(history, c.name);
    const lastDone = last ? last.exercise.sets.filter((s) => s.done) : [];
    const ex: WorkoutExercise = {
      exerciseId: `x-${uid()}`,
      name: c.name,
      plannedSets: d.sets,
      repsMin: d.repsMin,
      repsMax: d.repsMax,
      note: d.note,
      rest: d.rest,
      sets: Array.from({ length: d.sets }, (_, k) => ({ weight: lastDone[k]?.weight ?? lastDone[lastDone.length - 1]?.weight ?? null, reps: null, done: false })),
    };
    await db.workouts.put({ ...w, exercises: [...w.exercises, ex] } as Workout);
    setAdded((s) => new Set(s).add(c.name));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-fg/50">{parts}</p>

      {/* 2. Как догнать */}
      <section
        className={`rounded-2xl p-3 ${need > 0 ? 'bg-gold-soft' : sets > TARGET.max ? 'bg-amber-500/10' : 'bg-accent-soft'}`}
      >
        <div className="flex items-center gap-2 font-extrabold">
          {need > 0 ? <Target size={18} className="text-gold-strong" /> : <CheckCircle2 size={18} className="text-green-600" />}
          {sets} {pluralRu(sets, 'подход', 'подхода', 'подходов')} за 7 дней
        </div>
        <p className="mt-1 text-sm font-medium leading-snug text-fg/80">
          {need > 0 ? (
            <>
              До нормы не хватает <b>{need}</b> {pluralRu(need, 'подхода', 'подходов', 'подходов')}.{' '}
              {best && (
                <>
                  Добавь {Math.min(need, 4)} {pluralRu(Math.min(need, 4), 'подход', 'подхода', 'подходов')} «{best.name}»
                  {dayForMuscle ? (
                    <>
                      {' '}
                      в ближайшую тренировку — <b>{dayForMuscle.name}</b> ({dayForMuscle.title})
                    </>
                  ) : (
                    ' в одну из ближайших тренировок'
                  )}
                  {need > 4 ? ', а остальное — в следующую.' : '.'}
                </>
              )}
            </>
          ) : sets > TARGET.max ? (
            'Нагрузки больше 20 подходов в неделю — для восстановления можно немного снизить.'
          ) : (
            'В норме (10–20 подходов в неделю). Так держать!'
          )}
        </p>
      </section>

      {/* 3. История */}
      <section>
        <div className="eyebrow mb-2 flex items-center gap-1.5">
          <TrendingUp size={13} /> Подходы по неделям
        </div>
        <div className="relative flex h-28 items-end gap-1.5">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gold/60" style={{ bottom: `${(TARGET.min / maxW) * 100}%` }} />
          {weeks.map((w, i) => (
            <div key={w.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-bold tabular-nums text-fg/50">{w.sets || ''}</span>
              <div
                className={`w-full rounded-t-md ${i === weeks.length - 1 ? 'bg-gold' : w.sets >= TARGET.min ? 'bg-accent' : 'bg-fg/15'}`}
                style={{ height: `${Math.max(3, (w.sets / maxW) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1.5">
          {weeks.map((w, i) => (
            <span key={w.start} className="flex-1 text-center text-[9px] font-semibold text-fg/40">
              {i === weeks.length - 1 ? 'эта' : formatShort(w.start).replace('.', '')}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] font-medium text-fg/45">Пунктир — норма 10 подходов. Золотой столбик — текущая неделя.</p>
      </section>

      {/* 1. Упражнения */}
      <section>
        <div className="eyebrow mb-2">Упражнения на эту мышцу</div>
        {!active && <p className="mb-2 text-xs font-medium text-fg/45">Начните тренировку — и сможете добавить упражнение в неё отсюда.</p>}
        <ul className="divide-y divide-fg/[.06] rounded-2xl bg-fg/[.04] px-3">
          {exercises.slice(0, 12).map((e) => {
            const mine = inProgram.has(normName(e.name));
            const done = added.has(e.name) || !!active?.exercises.some((x) => normName(x.name) === normName(e.name));
            return (
              <li key={e.name} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{e.name}</span>
                  <span className="text-[11px] font-semibold text-fg/45">
                    {e.kind === 'base' ? 'базовое' : e.kind === 'iso' ? 'изоляция' : 'на время'}
                    {mine && <span className="text-gold-strong"> · в вашей программе</span>}
                  </span>
                </span>
                {active && (
                  <Button className="shrink-0 px-2.5 py-1.5 text-xs" disabled={done} onClick={() => addToWorkout(e)}>
                    {done ? 'В тренировке' : (
                      <>
                        <Plus size={14} strokeWidth={2.6} /> В тренировку
                      </>
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
