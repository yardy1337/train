import { CheckCircle2, ChevronLeft, Plus, Target, TrendingUp } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { allExercises, defaultsFor, type CatalogExercise } from '../../data/exercises';
import { db } from '../../db/db';
import { formatShort, uid } from '../../lib/date';
import { pluralRu } from '../../lib/format';
import { TARGET, muscleOf, weeklyHistory, type Muscle } from '../../lib/muscles';
import { findLastResult, nextDayId, normName } from '../../lib/workout';
import type { Workout, WorkoutExercise } from '../../types';
import { useHistory, useProgram } from '../workouts/hooks';

/** Данные по мышце: упражнения, совет, история. */
function useMuscle(muscle: Muscle, sets: number) {
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

  return { history, active, added, setAdded, inProgram, exercises, need, dayForMuscle, best, weeks, maxW, sets };
}

/** Подсказки справа от человечка: подходы, как догнать, подходы по неделям. */
export function MuscleTips({ muscle, sets, parts, onBack }: { muscle: Muscle; sets: number; parts: string; onBack: () => void }) {
  const { need, dayForMuscle, best, weeks, maxW } = useMuscle(muscle, sets);
  return (
    <div className="min-w-0 space-y-2.5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-fg/50 active:text-fg">
        <ChevronLeft size={14} strokeWidth={2.6} /> Все мышцы
      </button>
      <div>
        <div className="text-base font-extrabold leading-tight">{muscle}</div>
        <div className="text-[11px] font-medium leading-tight text-fg/45">{parts}</div>
      </div>
      <div className={`rounded-xl p-2.5 ${need > 0 ? 'bg-gold-soft' : sets > TARGET.max ? 'bg-amber-500/10' : 'bg-accent-soft'}`}>
        <div className="flex items-center gap-1.5 text-sm font-extrabold">
          {need > 0 ? <Target size={15} className="shrink-0 text-gold-strong" /> : <CheckCircle2 size={15} className="shrink-0 text-green-600" />}
          {sets} {pluralRu(sets, 'подход', 'подхода', 'подходов')} за 7 дней
        </div>
        <p className="mt-1 text-xs font-medium leading-snug text-fg/80">
          {need > 0 ? (
            <>
              Не хватает <b>{need}</b> до нормы.{' '}
              {best && (
                <>
                  Добавь {Math.min(need, 4)} {pluralRu(Math.min(need, 4), 'подход', 'подхода', 'подходов')} «{best.name}»
                  {dayForMuscle ? (
                    <>
                      {' '}
                      в <b>{dayForMuscle.name}</b> ({dayForMuscle.title})
                    </>
                  ) : (
                    ' в ближайшую тренировку'
                  )}
                  .
                </>
              )}
            </>
          ) : sets > TARGET.max ? (
            'Больше 20 подходов в неделю — можно немного снизить для восстановления.'
          ) : (
            'В норме (10–20 подходов). Так держать!'
          )}
        </p>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-fg/45">
          <TrendingUp size={11} /> По неделям
        </div>
        <div className="relative flex h-16 items-end gap-1">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gold/60" style={{ bottom: `${(TARGET.min / maxW) * 100}%` }} />
          {weeks.map((w, i) => (
            <div
              key={w.start}
              title={`${formatShort(w.start)}: ${w.sets}`}
              className={`flex-1 rounded-t ${i === weeks.length - 1 ? 'bg-gold' : w.sets >= TARGET.min ? 'bg-accent' : 'bg-fg/15'}`}
              style={{ height: `${Math.max(4, (w.sets / maxW) * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] font-semibold text-fg/40">
          <span>8 нед. назад</span>
          <span>эта</span>
        </div>
      </div>
    </div>
  );
}

/** Упражнения на мышцу (под картой), с добавлением в текущую тренировку. */
export function MuscleExercises({ muscle, sets }: { muscle: Muscle; sets: number }) {
  const { history, active, added, setAdded, inProgram, exercises } = useMuscle(muscle, sets);
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
    <div>
      {/* 1. Упражнения */}
      <section>
        <div className="eyebrow mb-2">Упражнения: {muscle.toLowerCase()}</div>
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
