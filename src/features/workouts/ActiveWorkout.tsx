import { Check, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../db/db';
import { Button, Card, NumInput, PageHeader } from '../../components/ui';
import { useRestTimer } from '../../components/RestTimer';
import { findLastResult, formatReps, formatSets, shouldIncrease } from '../../lib/workout';
import { formatDuration, formatShort } from '../../lib/date';
import type { SetEntry, Workout, WorkoutExercise } from '../../types';

export function ActiveWorkout({ initial, history }: { initial: Workout; history: Workout[] }) {
  const [w, setW] = useState<Workout>(initial);
  const timer = useRestTimer();
  const [, tick] = useState(0);
  const first = useRef(true);

  // Автосохранение: тренировка переживёт закрытие приложения.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    db.workouts.put(w);
  }, [w]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const updateEx = (i: number, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    setW((prev) => ({ ...prev, exercises: prev.exercises.map((e, j) => (j === i ? fn(e) : e)) }));

  const updateSet = (i: number, si: number, patch: Partial<SetEntry>) =>
    updateEx(i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)) }));

  const prev = useMemo(
    () => w.exercises.map((e) => findLastResult(history, e.name, w.id)),
    [history, w.exercises, w.id],
  );

  const toggleDone = (i: number, si: number) => {
    const ex = w.exercises[i];
    const s = ex.sets[si];
    if (s.done) return updateSet(i, si, { done: false });
    const prevSet = prev[i]?.exercise.sets.filter((x) => x.done)[si];
    const reps = s.reps ?? prevSet?.reps ?? (ex.repsMax || ex.repsMin || null);
    const weight = s.weight ?? prevSet?.weight ?? null;
    updateSet(i, si, { done: true, reps, weight });
    const isLastSetOfLastEx = i === w.exercises.length - 1 && si === ex.sets.length - 1;
    if (!isLastSetOfLastEx) timer.start(ex.rest, `Отдых · ${ex.name}`);
  };

  const finish = async () => {
    const anyDone = w.exercises.some((e) => e.sets.some((s) => s.done));
    if (!anyDone && !confirm('Ни один подход не отмечен. Всё равно завершить?')) return;
    timer.stop();
    await db.workouts.put({ ...w, status: 'done', finishedAt: Date.now() });
  };

  const cancel = async () => {
    if (!confirm('Отменить тренировку? Введённые данные будут удалены.')) return;
    timer.stop();
    if (w.id) await db.workouts.delete(w.id);
  };

  const totalSets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
  const doneCount = w.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0);

  return (
    <div>
      <PageHeader
        title={`${w.dayName} · ${w.dayTitle}`}
        right={
          <Button variant="primary" onClick={finish}>
            Завершить
          </Button>
        }
      />
      <div className="space-y-3 px-4 pb-28">
        <div className="flex items-center justify-between text-sm font-semibold tabular-nums text-fg/55">
          <span>
            {formatDuration(Date.now() - w.startedAt)} · подходов {doneCount}/{totalSets}
          </span>
          <button onClick={cancel} className="font-semibold text-red-600">
            Отменить
          </button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-fg/[.06]">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(doneCount / Math.max(1, totalSets)) * 100}%` }} />
        </div>

        {w.exercises.map((ex, i) => {
          const last = prev[i];
          const increaseNow = last ? shouldIncrease({ ...last.exercise, repsMax: ex.repsMax, plannedSets: ex.plannedSets }) : false;
          const topReachedToday = shouldIncrease(ex);
          return (
            <Card key={`${ex.exerciseId}-${i}`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h3 className="text-base font-extrabold leading-tight">{ex.name}</h3>
                  <div className="mt-0.5 text-xs text-fg/55">
                    {ex.plannedSets}×{formatReps(ex.repsMin, ex.repsMax, ex.note)}
                    {ex.note && (ex.repsMin || ex.repsMax) ? ` · ${ex.note}` : ''} · отдых {ex.rest} с
                  </div>
                </div>
                {increaseNow && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-strong">
                    <TrendingUp size={14} strokeWidth={2.6} /> Увеличь вес
                  </span>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-bg px-3 py-2 text-xs font-medium text-fg/55">
                {last ? (
                  <>
                    Прошлый раз ({formatShort(last.workout.date)}):{' '}
                    <span className="font-bold text-fg">{formatSets(last.exercise.sets)}</span>
                  </>
                ) : (
                  'Прошлых результатов нет — подбери рабочий вес'
                )}
              </div>

              <div className="mt-3 grid grid-cols-[1.5rem_1fr_1fr_2.75rem] items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-fg/40">
                <span>#</span>
                <span className="text-center">Вес, кг</span>
                <span className="text-center">Повторы</span>
                <span />
              </div>
              <div className="mt-1 space-y-1.5">
                {ex.sets.map((s, si) => {
                  const prevSet = last?.exercise.sets.filter((x) => x.done)[si];
                  return (
                    <div
                      key={si}
                      className={`grid grid-cols-[1.5rem_1fr_1fr_2.75rem] items-center gap-2 rounded-lg ${
                        s.done ? 'bg-accent-soft/70' : ''
                      }`}
                    >
                      <span className="text-center text-sm font-bold text-fg/40">{si + 1}</span>
                      <NumInput
                        ariaLabel={`Вес, подход ${si + 1}`}
                        value={s.weight}
                        placeholder={prevSet?.weight ? String(prevSet.weight) : 'кг'}
                        onChange={(v) => updateSet(i, si, { weight: v })}
                      />
                      <NumInput
                        ariaLabel={`Повторы, подход ${si + 1}`}
                        decimal={false}
                        value={s.reps}
                        placeholder={String(prevSet?.reps ?? (ex.repsMax || ex.repsMin || ''))}
                        onChange={(v) => updateSet(i, si, { reps: v === null ? null : Math.round(v) })}
                      />
                      <button
                        onClick={() => toggleDone(i, si)}
                        aria-label={s.done ? 'Снять отметку' : 'Подход выполнен'}
                        className={`grid h-10 w-11 place-items-center rounded-xl transition-all active:scale-90 ${
                          s.done ? 'bg-accent text-white shadow-lift' : 'border border-fg/10 bg-surface text-fg/30'
                        }`}
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-accent active:bg-accent-soft"
                  onClick={() =>
                    updateEx(i, (e) => ({
                      ...e,
                      sets: [...e.sets, { weight: e.sets[e.sets.length - 1]?.weight ?? null, reps: null, done: false }],
                    }))
                  }
                >
                  + подход
                </button>
                {ex.sets.length > 1 && (
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-fg/45 active:bg-fg/[.06]"
                    onClick={() => updateEx(i, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
                  >
                    − подход
                  </button>
                )}
                <span className="flex-1" />
                {topReachedToday && (
                  <span className="text-xs font-bold text-accent">Верх диапазона взят — в след. раз +вес</span>
                )}
              </div>
            </Card>
          );
        })}

        <Button variant="primary" className="w-full py-3" onClick={finish}>
          Завершить тренировку
        </Button>
      </div>
    </div>
  );
}
