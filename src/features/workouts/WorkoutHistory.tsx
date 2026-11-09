import { useState } from 'react';
import { db } from '../../db/db';
import { BackButton, Card, Empty, PageHeader } from '../../components/ui';
import { formatDay, formatDuration } from '../../lib/date';
import { fmt } from '../../lib/format';
import { doneSets, formatSets, tonnage } from '../../lib/workout';
import { useHistory } from './hooks';

export function WorkoutHistory({ onBack }: { onBack: () => void }) {
  const history = useHistory();
  const [open, setOpen] = useState<number | null>(null);

  const remove = async (id?: number) => {
    if (id && confirm('Удалить эту тренировку из истории?')) await db.workouts.delete(id);
  };

  return (
    <div>
      <PageHeader title="История тренировок" left={<BackButton onClick={onBack} />} />
      <div className="space-y-2 px-4 pb-4">
        {!history.length && <Empty>Пока нет завершённых тренировок</Empty>}
        {history.map((w) => {
          const isOpen = open === w.id;
          const sets = w.exercises.reduce((t, e) => t + doneSets(e.sets).length, 0);
          return (
            <Card key={w.id} className="p-0">
              <button className="w-full p-4 text-left" onClick={() => setOpen(isOpen ? null : w.id!)}>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{w.dayName}</span>
                  <span className="text-sm text-fg/55">{w.dayTitle}</span>
                  <span className="flex-1" />
                  <span className="text-sm text-fg/55">{formatDay(w.date)}</span>
                </div>
                <div className="mt-1 text-xs text-fg/45">
                  {w.finishedAt ? formatDuration(w.finishedAt - w.startedAt) : ''} · {sets} подходов · тоннаж{' '}
                  {fmt(tonnage(w) / 1000, 2)} т
                </div>
              </button>
              {isOpen && (
                <div className="space-y-1.5 border-t border-fg/[.06] px-4 py-3 text-sm">
                  {w.exercises.map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="flex-1 text-fg/75">{e.name}</span>
                      <span className="text-right tabular-nums text-fg/55">{formatSets(e.sets) || '—'}</span>
                    </div>
                  ))}
                  <button className="mt-2 text-xs text-red-600" onClick={() => remove(w.id)}>
                    Удалить тренировку
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
