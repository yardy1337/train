import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from '../../components/motion';
import { db } from '../../db/db';
import { Button, Card, IconButton, PageHeader } from '../../components/ui';
import { History, Play, SlidersHorizontal } from 'lucide-react';
import { createWorkout, formatTarget, nextDayId } from '../../lib/workout';
import { formatShort } from '../../lib/date';
import type { ProgramDay, Workout } from '../../types';
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
      <AnimatePresence mode="wait">{content}</AnimatePresence>
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
        <p className="eyebrow">Верх / низ · 4 дня в неделю</p>
        {days.map((d, i) => {
          const isNext = d.id === nextId;
          const last = lastByDay(d.id);
          return (
            <Card key={d.id} index={i + 1} className={isNext ? 'border-accent/40 ring-4 ring-accent/10' : ''}>
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
          );
        })}
      </div>
    </Screen>
  );
}
