import { useState } from 'react';
import { db } from '../../db/db';
import { Button, Card, PageHeader } from '../../components/ui';
import { createWorkout, formatTarget, nextDayId } from '../../lib/workout';
import { formatShort } from '../../lib/date';
import type { ProgramDay } from '../../types';
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

  if (view === 'editor') return <ProgramEditor onBack={() => setView('home')} />;
  if (view === 'history') return <WorkoutHistory onBack={() => setView('home')} />;
  if (active === undefined) return null;
  if (active) return <ActiveWorkout key={active.id} initial={active} history={history} />;

  const nextId = nextDayId(days, history);
  const start = async (day: ProgramDay) => {
    await db.workouts.add(createWorkout(day, history));
  };
  const lastByDay = (id: string) => history.find((w) => w.dayId === id);

  return (
    <div>
      <PageHeader
        title="Тренировки"
        right={
          <div className="flex gap-1">
            <Button variant="ghost" className="px-2.5" onClick={() => setView('history')}>
              История
            </Button>
            <Button variant="ghost" className="px-2.5" onClick={() => setView('editor')}>
              Программа
            </Button>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        <p className="text-sm text-zinc-400">Верх/низ, 4 дня в неделю. Выбери день и начни тренировку.</p>
        {days.map((d) => {
          const isNext = d.id === nextId;
          const last = lastByDay(d.id);
          return (
            <Card key={d.id} className={isNext ? 'ring-2 ring-accent/60' : ''}>
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{d.name}</h2>
                    {isNext && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        следующая
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {d.title}
                    {last && <span className="text-zinc-500"> · была {formatShort(last.date)}</span>}
                  </div>
                </div>
                <Button variant={isNext ? 'primary' : 'secondary'} onClick={() => start(d)}>
                  Начать
                </Button>
              </div>
              <ul className="space-y-1 text-sm">
                {d.exercises.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="flex-1 text-zinc-300">{e.name}</span>
                    <span className="tabular-nums text-zinc-500">
                      {formatTarget(e.sets, e.repsMin, e.repsMax, e.note)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
