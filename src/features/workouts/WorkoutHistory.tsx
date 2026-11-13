import { CalendarX2, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowDownWideNarrow, ChevronDown, Clock, Dumbbell, Share, Trash2, Weight } from 'lucide-react';
import { db } from '../../db/db';
import { BackButton, Card, Empty, PageHeader } from '../../components/ui';
import { EASE, Item, Screen, spring } from '../../components/motion';
import { formatDay, formatDuration } from '../../lib/date';
import { fmt } from '../../lib/format';
import { doneSets, formatSets, tonnage } from '../../lib/workout';
import { shareImage, workoutCard } from '../../lib/shareCard';
import { useAllowed } from '../../lib/features';
import type { Workout } from '../../types';
import { useHistory } from './hooks';

type SortKey = 'new' | 'old' | 'tonnage' | 'duration' | 'sets';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'new', label: 'Сначала новые' },
  { id: 'old', label: 'Сначала старые' },
  { id: 'tonnage', label: 'По тоннажу' },
  { id: 'duration', label: 'По длительности' },
  { id: 'sets', label: 'По подходам' },
];

const SORT_KEY = 'history-sort';
const FILTER_KEY = 'history-filter';

function load<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const duration = (w: Workout) => (w.finishedAt ? w.finishedAt - w.startedAt : 0);
const setCount = (w: Workout) => w.exercises.reduce((t, e) => t + doneSets(e.sets).length, 0);

const sorters: Record<SortKey, (a: Workout, b: Workout) => number> = {
  new: (a, b) => b.startedAt - a.startedAt,
  old: (a, b) => a.startedAt - b.startedAt,
  tonnage: (a, b) => tonnage(b) - tonnage(a),
  duration: (a, b) => duration(b) - duration(a),
  sets: (a, b) => setCount(b) - setCount(a),
};

export function WorkoutHistory({ onBack }: { onBack: () => void }) {
  const history = useHistory();
  const canShare = useAllowed('share');
  const [open, setOpen] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>(() => load(SORT_KEY, 'new'));
  const [filter, setFilter] = useState<string>(() => load(FILTER_KEY, 'all'));
  const [sortOpen, setSortOpen] = useState(false);

  // Дни, которые встречаются в истории, в порядке названия (День A, B, C…).
  const dayOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of history) if (!map.has(w.dayName)) map.set(w.dayName, w.dayTitle);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru')).map(([name, title]) => ({ name, title }));
  }, [history]);

  const activeFilter = filter === 'all' || dayOptions.some((d) => d.name === filter) ? filter : 'all';

  const list = useMemo(() => {
    const rows = activeFilter === 'all' ? history : history.filter((w) => w.dayName === activeFilter);
    return [...rows].sort(sorters[sort]);
  }, [history, activeFilter, sort]);

  const totals = useMemo(
    () => ({
      count: list.length,
      tonnage: list.reduce((t, w) => t + tonnage(w), 0),
      time: list.reduce((t, w) => t + duration(w), 0),
    }),
    [list],
  );

  const remove = async (id?: number) => {
    if (id && confirm('Удалить эту тренировку из истории?')) await db.workouts.delete(id);
  };

  const pickSort = (k: SortKey) => {
    setSort(k);
    save(SORT_KEY, k);
    setSortOpen(false);
  };
  const pickFilter = (f: string) => {
    setFilter(f);
    save(FILTER_KEY, f);
    setOpen(null);
  };

  return (
    <Screen kind="push">
      <PageHeader title="История" left={<BackButton onClick={onBack} />} />
      <div className="space-y-3 px-4 pb-4">
        {!history.length && <Empty icon={CalendarX2} title="История пуста">Заверши первую тренировку — она появится здесь</Empty>}

        {history.length > 0 && (
          <>
            <Item className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
              <LayoutGroup id="day-filter">
                <div className="flex w-max gap-1.5">
                  {[{ name: 'all', title: '' }, ...dayOptions].map((d) => {
                    const active = activeFilter === d.name;
                    return (
                      <button
                        key={d.name}
                        onClick={() => pickFilter(d.name)}
                        className={`relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                          active ? 'text-white' : 'bg-surface text-fg/60 shadow-card'
                        }`}
                      >
                        {active && (
                          <motion.span layoutId="day-pill" className="absolute inset-0 rounded-full bg-accent shadow-lift" transition={spring} />
                        )}
                        <span className="relative">{d.name === 'all' ? 'Все' : d.name}</span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
            </Item>

            <Item index={1} className="flex items-center gap-2">
              <div className="flex flex-1 gap-4 text-xs font-bold tabular-nums text-fg/45">
                <span className="inline-flex items-center gap-1">
                  <Dumbbell size={13} /> {totals.count}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Weight size={13} /> {fmt(totals.tonnage / 1000, 1)} т
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} /> {formatDuration(totals.time)}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-fg/70 shadow-card active:scale-95"
                  aria-expanded={sortOpen}
                >
                  <ArrowDownWideNarrow size={14} />
                  {SORTS.find((x) => x.id === sort)?.label}
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <button className="fixed inset-0 z-30 cursor-default" aria-label="Закрыть" onClick={() => setSortOpen(false)} />
                      <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="absolute right-0 top-full z-40 mt-2 w-52 origin-top-right overflow-hidden rounded-2xl border border-fg/[.06] bg-surface p-1 shadow-2xl"
                      >
                        {SORTS.map((o) => (
                          <li key={o.id}>
                            <button
                              onClick={() => pickSort(o.id)}
                              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                                sort === o.id ? 'bg-accent-soft text-accent-strong' : 'text-fg/75 active:bg-fg/[.05]'
                              }`}
                            >
                              {o.label}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </Item>
          </>
        )}

        <LayoutGroup id="history-list">
          <AnimatePresence initial={false} mode="popLayout">
            {list.map((w) => {
              const isOpen = open === w.id;
              return (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={spring}
                >
                  <Card className="overflow-hidden p-0">
                    <button className="w-full p-4 text-left" onClick={() => setOpen(isOpen ? null : w.id!)}>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-extrabold text-accent-strong">{w.dayName}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold">{w.dayTitle}</span>
                        <span className="text-xs font-semibold text-fg/45">{formatDay(w.date)}</span>
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }} className="text-fg/35">
                          <ChevronDown size={18} />
                        </motion.span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs font-semibold tabular-nums text-fg/50">
                        <span className={sort === 'duration' ? 'text-accent' : ''}>{w.finishedAt ? formatDuration(duration(w)) : '—'}</span>
                        <span className={sort === 'sets' ? 'text-accent' : ''}>{setCount(w)} подходов</span>
                        <span className={sort === 'tonnage' ? 'text-accent' : ''}>{fmt(tonnage(w) / 1000, 2)} т</span>
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-1.5 border-t border-fg/[.06] px-4 py-3 text-sm">
                            {w.exercises.map((e, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="flex-1 font-medium text-fg/75">{e.name}</span>
                                <span className="text-right font-semibold tabular-nums text-fg/50">{formatSets(e.sets) || '—'}</span>
                              </div>
                            ))}
                            <div className="mt-2 flex items-center justify-between">
                              <button
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-red-600 active:bg-red-500/15"
                                onClick={() => remove(w.id)}
                              >
                                <Trash2 size={14} /> Удалить
                              </button>
                              {canShare && <button
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-extrabold text-ink shadow-gold active:scale-95"
                                onClick={() => workoutCard(w, history).then((b) => shareImage(b, `trenirovka-${w.date}.png`))}
                              >
                                <Share size={14} strokeWidth={2.6} /> Поделиться
                              </button>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
        {history.length > 0 && !list.length && <Empty icon={Filter}>Нет тренировок для этого дня</Empty>}
      </div>
    </Screen>
  );
}
