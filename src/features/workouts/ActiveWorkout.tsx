import { Screen } from '../../components/motion';
import { ArrowDown, ArrowLeftRight, ArrowUp, Check, Disc3, Info, Flame, Lightbulb, MoreHorizontal, Plus, SlidersHorizontal, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../db/db';
import { Button, Card, Field, NumInput, PageHeader, Sheet, TextInput } from '../../components/ui';
import { defaultsFor, type CatalogExercise } from '../../data/exercises';
import { uid } from '../../lib/date';
import { SwapSheet } from './SwapSheet';
import { ExercisePicker } from './ExercisePicker';
import { useRestTimer } from '../../components/RestTimer';
import { findLastResult, formatReps, formatSets, shouldIncrease } from '../../lib/workout';
import { formatDuration, formatShort } from '../../lib/date';
import type { SetEntry, Workout, WorkoutExercise } from '../../types';
import { normName } from '../../lib/workout';
import { bestMap, formatBest, isRecord } from '../../lib/records';
import { fmtKg, isBarbell, suggestWeight, warmupSets } from '../../lib/training';
import { useFeature } from '../../lib/features';
import { PlateSheet } from './PlateSheet';
import { restFor, useRestSettings } from '../../lib/restSettings';
import { BounceTrophy, DrawCheck } from '../../components/LiveIcons';
import { TechniqueSheet, useHasTechnique } from './TechniqueSheet';

export function ActiveWorkout({ initial, history }: { initial: Workout; history: Workout[] }) {
  const [w, setW] = useState<Workout>(initial);
  const timer = useRestTimer();
  const restSettings = useRestSettings();
  const [, tick] = useState(0);
  const first = useRef(true);

  // Автосохранение: тренировка переживёт закрытие приложения.
  // Пишем в базу не на каждую цифру, а через 400 мс после последнего изменения.
  const latest = useRef(w);
  latest.current = w;
  const closed = useRef(false); // тренировка завершена/отменена — больше ничего не пишем
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (!closed.current) db.workouts.put(w);
    }, 400);
    return () => clearTimeout(t);
  }, [w]);
  // …и обязательно при уходе с экрана / сворачивании приложения.
  useEffect(() => {
    const flush = () => {
      if (!closed.current) db.workouts.put(latest.current);
    };
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      flush(); // ушли на другую вкладку — сохраняем последние цифры
    };
  }, []);

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

  // Личные рекорды до сегодняшней тренировки.
  const best = useMemo(() => bestMap(history, w.id), [history, w.id]);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const featSuggest = useFeature('suggest');
  const featPlates = useFeature('plates');
  const featWarmup = useFeature('warmup');
  const [plateFor, setPlateFor] = useState<number | null | undefined>(undefined);
  const [techFor, setTechFor] = useState<string | null>(null);
  const hasTechnique = useHasTechnique();

  const toggleDone = (i: number, si: number) => {
    const ex = w.exercises[i];
    const s = ex.sets[si];
    if (s.done) return updateSet(i, si, { done: false });
    navigator.vibrate?.(15); // лёгкий отклик на Android
    const prevSet = prev[i]?.exercise.sets.filter((x) => x.done)[si];
    const reps = s.reps ?? prevSet?.reps ?? (ex.repsMax || ex.repsMin || null);
    const weight = s.weight ?? prevSet?.weight ?? null;
    updateSet(i, si, { done: true, reps, weight });
    const b = best.get(normName(ex.name));
    if (isRecord({ done: true, reps, weight }, b) && !ex.sets.some((x, k) => k !== si && isRecord(x, b) && (x.weight ?? 0) >= (weight ?? 0))) {
      navigator.vibrate?.([40, 60, 40]);
      setToast(`Новый рекорд: ${ex.name} — ${weight ? `${fmtKg(weight)} кг × ${reps}` : `${reps} повт.`}`);
    }
    const isLastSetOfLastEx = i === w.exercises.length - 1 && si === ex.sets.length - 1;
    if (!isLastSetOfLastEx) timer.start(restFor(restSettings, ex.rest), `Отдых · ${ex.name}`);
  };

  const finish = async () => {
    const anyDone = w.exercises.some((e) => e.sets.some((s) => s.done));
    if (!anyDone && !confirm('Ни один подход не отмечен. Всё равно завершить?')) return;
    timer.stop();
    closed.current = true;
    await db.workouts.put({ ...w, status: 'done', finishedAt: Date.now() });
    try {
      // Главный экран предложит поделиться итогом.
      sessionStorage.setItem('justFinished', String(w.id));
    } catch {
      /* ignore */
    }
  };

  const cancel = async () => {
    if (!confirm('Отменить тренировку? Введённые данные будут удалены.')) return;
    timer.stop();
    closed.current = true;
    if (w.id) await db.workouts.delete(w.id);
  };

  // ---- Корректировка тренировки ----
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [swapFor, setSwapFor] = useState<number | null>(null);
  const [adjustFor, setAdjustFor] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toProgram, setToProgram] = useState(false);

  /** Изменить упражнение и в программе дня (по id упражнения программы). */
  const patchProgram = async (exerciseId: string, patch: { name?: string; sets?: number; repsMin?: number; repsMax?: number; rest?: number; note?: string }) => {
    const day = await db.programDays.get(w.dayId);
    if (!day || !day.exercises.some((e) => e.id === exerciseId)) return;
    await db.programDays.put({ ...day, exercises: day.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)) });
  };

  const swap = async (i: number, name: string, catalog?: CatalogExercise) => {
    const ex = w.exercises[i];
    const last = findLastResult(history, name, w.id);
    const lastDone = last ? last.exercise.sets.filter((s) => s.done) : [];
    updateEx(i, (e) => ({
      ...e,
      name,
      sets: e.sets.map((_, k) => ({ weight: lastDone[k]?.weight ?? lastDone[lastDone.length - 1]?.weight ?? null, reps: null, done: false })),
    }));
    if (toProgram) await patchProgram(ex.exerciseId, { name });
    void catalog;
    setSwapFor(null);
  };

  const move = (i: number, dir: -1 | 1) =>
    setW((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.exercises.length) return prev;
      const list = [...prev.exercises];
      [list[i], list[j]] = [list[j], list[i]];
      return { ...prev, exercises: list };
    });

  const remove = (i: number) => {
    const ex = w.exercises[i];
    if (ex.sets.some((s) => s.done) && !confirm(`Убрать «${ex.name}»? Отмеченные подходы этого упражнения пропадут.`)) return;
    setW((prev) => ({ ...prev, exercises: prev.exercises.filter((_, k) => k !== i) }));
  };

  const addExercise = async (name: string, catalog?: CatalogExercise) => {
    const d = defaultsFor(catalog?.kind ?? 'iso');
    const last = findLastResult(history, name, w.id);
    const lastDone = last ? last.exercise.sets.filter((s) => s.done) : [];
    const id = `x-${uid()}`;
    const ex: WorkoutExercise = {
      exerciseId: id,
      name,
      plannedSets: d.sets,
      repsMin: d.repsMin,
      repsMax: d.repsMax,
      note: d.note,
      rest: d.rest,
      sets: Array.from({ length: d.sets }, (_, k) => ({ weight: lastDone[k]?.weight ?? lastDone[lastDone.length - 1]?.weight ?? null, reps: null, done: false })),
    };
    setW((prev) => ({ ...prev, exercises: [...prev.exercises, ex] }));
    if (toProgram) {
      const day = await db.programDays.get(w.dayId);
      if (day) await db.programDays.put({ ...day, exercises: [...day.exercises, { id, name, sets: d.sets, repsMin: d.repsMin, repsMax: d.repsMax, rest: d.rest, note: d.note }] });
    }
    setAddOpen(false);
  };

  const openTool = (fn: () => void) => {
    setMenuFor(null);
    setToProgram(false);
    fn();
  };

  const totalSets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
  const doneCount = w.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0);

  return (
    <Screen>
      <PageHeader
        title={`${w.dayName} · ${w.dayTitle}`}
        right={
          <Button variant="gold" onClick={finish}>
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
          <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${(doneCount / Math.max(1, totalSets)) * 100}%` }} />
        </div>

        {w.exercises.map((ex, i) => {
          const last = prev[i];
          const increaseNow = last ? shouldIncrease({ ...last.exercise, repsMax: ex.repsMax, plannedSets: ex.plannedSets }) : false;
          const topReachedToday = shouldIncrease(ex);
          return (
            <Card key={ex.exerciseId} index={i}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  {hasTechnique(ex.name) ? (
                    <button onClick={() => setTechFor(ex.name)} className="flex items-start gap-1.5 text-left">
                      <h3 className="text-base font-extrabold leading-tight">{ex.name}</h3>
                      <Info size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-fg/35" aria-label="Техника" />
                    </button>
                  ) : (
                    <h3 className="text-base font-extrabold leading-tight">{ex.name}</h3>
                  )}
                  <div className="mt-0.5 text-xs text-fg/55">
                    {ex.plannedSets}×{formatReps(ex.repsMin, ex.repsMax, ex.note)}
                    {ex.note && (ex.repsMin || ex.repsMax) ? ` · ${ex.note}` : ''} · отдых {restFor(restSettings, ex.rest)} с
                  </div>
                </div>
                {increaseNow && !featSuggest && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-fg">
                    <TrendingUp size={14} strokeWidth={2.6} /> Увеличь вес
                  </span>
                )}
                <button
                  onClick={() => setMenuFor(i)}
                  aria-label={`Изменить «${ex.name}»`}
                  className="-mr-1.5 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg/50 active:bg-fg/[.08]"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {featSuggest && (() => {
                const sg = suggestWeight(ex, last?.exercise);
                if (!sg) return null;
                const applied = ex.sets.every((s) => s.done || s.weight === sg.weight);
                return (
                  <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 ${sg.up ? 'bg-gold-soft' : 'bg-accent-soft'}`}>
                    {sg.up ? <TrendingUp size={16} strokeWidth={2.6} className="shrink-0 text-gold-strong" /> : <Lightbulb size={16} strokeWidth={2.4} className="shrink-0 text-fg/60" />}
                    <span className="flex-1 text-xs font-bold">{sg.text}</span>
                    {!applied && (
                      <button
                        className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-extrabold shadow-card active:scale-95"
                        onClick={() => updateEx(i, (e) => ({ ...e, sets: e.sets.map((s) => (s.done ? s : { ...s, weight: sg.weight })) }))}
                      >
                        Подставить
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="mt-3 rounded-xl bg-bg px-3 py-2 text-xs font-medium text-fg/55">
                {last ? (
                  <>
                    Прошлый раз ({formatShort(last.workout.date)}):{' '}
                    <span className="font-bold text-fg">{formatSets(last.exercise.sets)}</span>
                  </>
                ) : (
                  'Прошлых результатов нет — подбери рабочий вес'
                )}
                {best.get(normName(ex.name)) && (
                  <span className="mt-0.5 flex items-center gap-1">
                    <Trophy size={12} strokeWidth={2.6} className="text-gold" /> Рекорд:{' '}
                    <span className="font-bold text-fg">{formatBest(best.get(normName(ex.name))!)}</span>
                  </span>
                )}
              </div>

              {featWarmup && <Warmup ex={ex} />}

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
                      {isRecord(s, best.get(normName(ex.name))) ? (
                        <BounceTrophy size={16} className="mx-auto text-gold" />
                      ) : (
                        <span className="text-center text-sm font-bold text-fg/40">{si + 1}</span>
                      )}
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
                        {s.done ? <DrawCheck size={20} strokeWidth={3} /> : <Check size={20} strokeWidth={3} />}
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
                {featPlates && isBarbell(ex.name) && (
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-fg/60 active:bg-fg/[.06]"
                    onClick={() => setPlateFor(ex.sets.find((s) => !s.done)?.weight ?? ex.sets[0]?.weight ?? null)}
                  >
                    <Disc3 size={14} strokeWidth={2.4} /> Блины
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

        <Button className="w-full py-3" onClick={() => openTool(() => setAddOpen(true))}>
          <Plus size={16} strokeWidth={2.6} /> Добавить упражнение
        </Button>
        <Button variant="primary" className="w-full py-3" onClick={finish}>
          Завершить тренировку
        </Button>
      </div>
      {/* Меню упражнения */}
      <Sheet open={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor !== null ? w.exercises[menuFor]?.name ?? '' : ''}>
        {menuFor !== null && (
          <div className="space-y-1.5">
            <MenuItem icon={<ArrowLeftRight size={18} />} label="Заменить на похожее" hint="Тренажёр занят, нет снаряда, неудобно" onClick={() => { const i = menuFor; openTool(() => setSwapFor(i)); }} />
            <MenuItem icon={<SlidersHorizontal size={18} />} label="Подходы, повторы, отдых" onClick={() => { const i = menuFor; openTool(() => setAdjustFor(i)); }} />
            {featPlates && (
              <MenuItem
                icon={<Disc3 size={18} />}
                label="Калькулятор блинов"
                onClick={() => { const ex = w.exercises[menuFor]; setMenuFor(null); setPlateFor(ex.sets.find((s) => !s.done)?.weight ?? ex.sets[0]?.weight ?? null); }}
              />
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <MenuItem icon={<ArrowUp size={18} />} label="Выше" disabled={menuFor === 0} onClick={() => { move(menuFor, -1); setMenuFor(null); }} />
              <MenuItem icon={<ArrowDown size={18} />} label="Ниже" disabled={menuFor === w.exercises.length - 1} onClick={() => { move(menuFor, 1); setMenuFor(null); }} />
            </div>
            <MenuItem icon={<Trash2 size={18} />} label="Убрать из тренировки" danger onClick={() => { const i = menuFor; setMenuFor(null); remove(i); }} />
          </div>
        )}
      </Sheet>

      {/* Замена */}
      <SwapSheet
        open={swapFor !== null}
        current={swapFor !== null ? w.exercises[swapFor]?.name ?? '' : ''}
        onClose={() => setSwapFor(null)}
        onPick={(name, c) => swapFor !== null && swap(swapFor, name, c)}
        footer={<ProgramToggle checked={toProgram} onChange={setToProgram} text="Заменить и в программе" hint="Иначе — только в сегодняшней тренировке" />}
      />

      {/* Настройка подходов */}
      {adjustFor !== null && w.exercises[adjustFor] && (
        <AdjustSheet
          ex={w.exercises[adjustFor]}
          toProgram={toProgram}
          setToProgram={setToProgram}
          onClose={() => setAdjustFor(null)}
          onSave={async (patch) => {
            const i = adjustFor;
            const ex = w.exercises[i];
            updateEx(i, (e) => {
              const sets = [...e.sets];
              while (sets.length < patch.sets) sets.push({ weight: sets[sets.length - 1]?.weight ?? null, reps: null, done: false });
              while (sets.length > patch.sets && sets.length > 1 && !sets[sets.length - 1].done) sets.pop();
              return { ...e, plannedSets: patch.sets, repsMin: patch.repsMin, repsMax: patch.repsMax, rest: patch.rest, note: patch.note, sets };
            });
            if (toProgram) await patchProgram(ex.exerciseId, { sets: patch.sets, repsMin: patch.repsMin, repsMax: patch.repsMax, rest: patch.rest, note: patch.note });
            setAdjustFor(null);
          }}
        />
      )}

      <TechniqueSheet name={techFor} onClose={() => setTechFor(null)} />
      <PlateSheet open={plateFor !== undefined} initial={plateFor ?? null} onClose={() => setPlateFor(undefined)} />

      {/* Рекорд */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="pt-safe fixed inset-x-0 top-0 z-[60] px-3"
            onClick={() => setToast(null)}
          >
            <div className="mx-auto mt-2 flex max-w-lg items-center gap-3 rounded-2xl bg-gold px-4 py-3 text-ink shadow-gold">
              <BounceTrophy size={22} strokeWidth={2.4} repeat className="shrink-0" />
              <span className="text-sm font-extrabold">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Добавить упражнение */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Добавить упражнение" lazy>
        <AddExercise
          taken={new Set(w.exercises.map((e) => e.name.toLowerCase().replace(/ё/g, 'е')))}
          toProgram={toProgram}
          setToProgram={setToProgram}
          onPick={addExercise}
        />
      </Sheet>
    </Screen>
  );
}

function MenuItem({ icon, label, hint, onClick, danger, disabled }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl bg-fg/[.06] px-4 py-3.5 text-left transition-colors active:bg-fg/[.1] disabled:opacity-35 ${danger ? 'text-red-600' : ''}`}
    >
      <span className={danger ? '' : 'text-accent'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-xs font-medium text-fg/45">{hint}</span>}
      </span>
    </button>
  );
}

function ProgramToggle({ checked, onChange, text, hint }: { checked: boolean; onChange: (v: boolean) => void; text: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-fg/[.08] px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{text}</span>
        <span className="block text-xs font-medium text-fg/45">{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-fg/15 transition-colors peer-checked:bg-accent after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-fg after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-bg" />
    </label>
  );
}

function AdjustSheet({
  ex,
  toProgram,
  setToProgram,
  onClose,
  onSave,
}: {
  ex: WorkoutExercise;
  toProgram: boolean;
  setToProgram: (v: boolean) => void;
  onClose: () => void;
  onSave: (p: { sets: number; repsMin: number; repsMax: number; rest: number; note?: string }) => void;
}) {
  const [d, setD] = useState({ sets: ex.sets.length, repsMin: ex.repsMin, repsMax: ex.repsMax, rest: ex.rest, note: ex.note ?? '' });
  return (
    <Sheet open onClose={onClose} title={ex.name}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Подходы">
            <NumInput decimal={false} value={d.sets} onChange={(v) => setD({ ...d, sets: Math.min(12, Math.max(1, Math.round(v ?? 1))) })} />
          </Field>
          <Field label="Повторы от">
            <NumInput decimal={false} value={d.repsMin || null} placeholder="—" onChange={(v) => setD({ ...d, repsMin: Math.round(v ?? 0) })} />
          </Field>
          <Field label="Повторы до">
            <NumInput decimal={false} value={d.repsMax || null} placeholder="—" onChange={(v) => setD({ ...d, repsMax: Math.round(v ?? 0) })} />
          </Field>
        </div>
        <div>
          <span className="eyebrow mb-1.5 block">Отдых, сек</span>
          <div className="grid grid-cols-4 gap-2">
            {[60, 90, 120].map((v) => (
              <Button key={v} variant={d.rest === v ? 'primary' : 'secondary'} className="px-2" onClick={() => setD({ ...d, rest: v })}>
                {v}
              </Button>
            ))}
            <NumInput decimal={false} value={d.rest} ariaLabel="Отдых, секунд" onChange={(v) => setD({ ...d, rest: Math.max(10, Math.round(v ?? 60)) })} />
          </div>
        </div>
        <Field label="Пояснение">
          <TextInput value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="на каждую ногу, пауза 2 сек…" />
        </Field>
        <ProgramToggle checked={toProgram} onChange={setToProgram} text="Сохранить и в программе" hint="Иначе — только в сегодняшней тренировке" />
        <Button variant="primary" className="w-full py-3" onClick={() => onSave({ ...d, note: d.note.trim() || undefined })}>
          Применить
        </Button>
      </div>
    </Sheet>
  );
}

function AddExercise({
  taken,
  toProgram,
  setToProgram,
  onPick,
}: {
  taken: Set<string>;
  toProgram: boolean;
  setToProgram: (v: boolean) => void;
  onPick: (name: string, c?: CatalogExercise) => void;
}) {
  const [q, setQ] = useState('');
  return (
    <div className="space-y-3">
      <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск или своё название" />
      {q.trim().length > 1 && (
        <Button className="w-full" onClick={() => onPick(q.trim())}>
          Добавить «{q.trim()}»
        </Button>
      )}
      <ProgramToggle checked={toProgram} onChange={setToProgram} text="Добавить и в программу" hint="Иначе — только в сегодняшнюю тренировку" />
      <ExercisePicker query={q} taken={taken} onPick={(e) => onPick(e.name, e)} />
    </div>
  );
}

/** Разминочные подходы перед рабочими: отмечаются только для себя, в историю не пишутся. */
function Warmup({ ex }: { ex: WorkoutExercise }) {
  const working = ex.sets.find((s) => (s.weight ?? 0) > 0)?.weight ?? null;
  const sets = warmupSets(ex, working);
  const [done, setDone] = useState<Set<number>>(new Set());
  if (!sets.length || ex.sets.some((s) => s.done)) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-fg/45">
        <Flame size={13} strokeWidth={2.6} /> Разминка
      </span>
      {sets.map((s, k) => (
        <button
          key={k}
          onClick={() => setDone((d) => { const n = new Set(d); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
          className={`rounded-lg px-2 py-1 text-xs font-bold tabular-nums transition-colors ${done.has(k) ? 'bg-accent text-white' : 'bg-fg/[.06] text-fg/70'}`}
        >
          {fmtKg(s.weight)}×{s.reps}
        </button>
      ))}
    </div>
  );
}
