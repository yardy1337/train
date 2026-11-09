import { useState, type ReactNode } from 'react';
import { scrollToTop } from '../../lib/smoothScroll';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { EASE, Item, Screen, spring } from '../../components/motion';
import { db } from '../../db/db';
import { Button, Card, Empty, IconButton, PageHeader } from '../../components/ui';
import { pluralRu } from '../../lib/format';
import { History, Play, SlidersHorizontal } from 'lucide-react';
import { createWorkout, daySplit, formatTarget, nextDayId, SPLITS } from '../../lib/workout';
import { formatShort } from '../../lib/date';
import type { ProgramDay, Split, Workout } from '../../types';
import { useActiveWorkout, useHistory, useProgram } from './hooks';
import { ActiveWorkout } from './ActiveWorkout';
import { ProgramEditor } from './ProgramEditor';
import { WorkoutHistory } from './WorkoutHistory';

type View = 'home' | 'editor' | 'history';

export function WorkoutsPage() {
  const [view, setView] = useState<View>('home');
  const days = useProgram();
  const history = useHistory();
  const active = useActiveWorkout();

  let content: ReactNode = null;
  if (view === 'editor') content = <ProgramEditor key="editor" onBack={() => setView('home')} />;
  else if (view === 'history') content = <WorkoutHistory key="history" onBack={() => setView('home')} />;
  else if (active) content = <ActiveWorkout key={`active-${active.id}`} initial={active} history={history} />;
  else if (active === null) content = <WorkoutsHome key="home" days={days} history={history} setView={setView} />;

  return (
    <motion.div exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}>
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>{content}</AnimatePresence>
    </motion.div>
  );
}

function WorkoutsHome({
  days,
  history,
  setView,
}: {
  days: ProgramDay[];
  history: Workout[];
  setView: (v: View) => void;
}) {
  const nextId = nextDayId(days, history);
  const start = async (day: ProgramDay) => {
    await db.workouts.add(createWorkout(day, history));
  };
  const lastByDay = (id: string) => history.find((w) => w.dayId === id);
  const nextSplit = daySplit(days.find((d) => d.id === nextId) ?? { title: '' });
  // По умолчанию открыт тип следующей тренировки; пользователь может переключить.
  const [picked, setPicked] = useState<Split | null>(null);
  const split = picked ?? nextSplit;
  const dir = split === 'upper' ? -1 : 1;
  const setSplit = (s: Split) => setPicked(s);
  const shown = days.filter((d) => daySplit(d) === split);

  return (
    <Screen>
      <PageHeader
        title="Тренировки"
        right={
          <div className="flex gap-1">
            <IconButton label="История" onClick={() => setView('history')} className="bg-surface text-fg shadow-card">
              <History size={18} />
            </IconButton>
            <IconButton label="Программа" onClick={() => setView('editor')} className="bg-surface text-fg shadow-card">
              <SlidersHorizontal size={18} />
            </IconButton>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        <Item>
          <LayoutGroup id="split">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-fg/[.06] bg-surface p-1.5 shadow-card">
              {SPLITS.map((o) => {
                const active = split === o.id;
                const count = days.filter((d) => daySplit(d) === o.id).length;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSplit(o.id)}
                    className={`relative rounded-xl py-3 text-center transition-colors ${active ? 'text-white' : 'text-fg/55'}`}
                  >
                    {active && <motion.span layoutId="split-pill" className="absolute inset-0 rounded-xl bg-accent shadow-lift" transition={spring} />}
                    <span className="relative block text-lg font-extrabold tracking-tight">{o.label}</span>
                    <span className={`relative block text-[11px] font-bold ${active ? 'text-white/75' : 'text-fg/35'}`}>
                      {count} {pluralRu(count, 'тренировка', 'тренировки', 'тренировок')}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </Item>
        <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((d, i) => {
          const isNext = d.id === nextId;
          const last = lastByDay(d.id);
          return (
            <motion.div
              key={d.id}
              layout
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.32, ease: EASE }}
            >
            <Card index={i + 1} className={isNext ? 'border-accent/40 ring-4 ring-accent/10' : ''}>
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight">{d.name}</h2>
                    {isNext && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        следующая
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-fg/55">
                    {d.title}
                    {last && <span className="text-fg/45"> · была {formatShort(last.date)}</span>}
                  </div>
                </div>
                <Button variant={isNext ? 'primary' : 'secondary'} onClick={() => start(d)}>
                  <Play size={14} fill="currentColor" /> Начать
                </Button>
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-fg/[.06] pt-3 text-sm">
                {d.exercises.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="flex-1 font-medium text-fg/80">{e.name}</span>
                    <span className="font-semibold tabular-nums text-fg/40">
                      {formatTarget(e.sets, e.repsMin, e.repsMax, e.note)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            </motion.div>
          );
        })}
        </AnimatePresence>
        {!shown.length && <Empty>Пока нет тренировок этого типа — добавьте их в «Программе»</Empty>}
      </div>
    </Screen>
  );
}
