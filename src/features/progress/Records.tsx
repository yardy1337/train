import { Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, Empty } from '../../components/ui';
import { formatShort } from '../../lib/date';
import { bestMap, formatBest } from '../../lib/records';
import { useHistory } from '../workouts/hooks';

/** Личные рекорды: лучший вес (или повторы) по каждому упражнению, свежие сверху. */
export function Records({ index }: { index: number }) {
  const history = useHistory();
  const rows = useMemo(() => [...bestMap(history).values()].filter((r) => r.weight || r.reps).sort((a, b) => b.date.localeCompare(a.date)), [history]);
  const [all, setAll] = useState(false);
  return (
    <Card index={index} className="space-y-2">
      <div className="flex items-center gap-2">
        <Trophy size={20} strokeWidth={2.4} className="text-gold" />
        <h2 className="flex-1 text-lg font-extrabold tracking-tight">Личные рекорды</h2>
        {rows.length > 0 && <span className="text-sm font-bold text-fg/40">{rows.length}</span>}
      </div>
      {!rows.length ? (
        <Empty>Рекорды появятся после первой тренировки</Empty>
      ) : (
        <>
          <ul className="divide-y divide-fg/[.06]">
            {(all ? rows : rows.slice(0, 5)).map((r) => (
              <li key={r.name} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{r.name}</div>
                  <div className="text-xs font-medium text-fg/45">{formatShort(r.date)}</div>
                </div>
                <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatBest(r)}</span>
              </li>
            ))}
          </ul>
          {rows.length > 5 && (
            <button className="text-xs font-bold text-fg/55" onClick={() => setAll(!all)}>
              {all ? 'Свернуть' : `Все рекорды (${rows.length})`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
