import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useGoals } from '../../db/settings';
import { BackButton, Card, Empty, PageHeader } from '../../components/ui';
import { formatDay } from '../../lib/date';
import { sum } from '../../lib/nutrition';
import type { MealEntry } from '../../types';

export function NutritionHistory({ onBack, onOpenDay }: { onBack: () => void; onOpenDay: (date: string) => void }) {
  const goals = useGoals();
  const days = useLiveQuery(async () => {
    const all = await db.meals.toArray();
    const byDate = new Map<string, MealEntry[]>();
    for (const m of all) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);
    return [...byDate.entries()]
      .map(([date, items]) => ({ date, count: items.length, ...sum(items) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const avg = days?.length
    ? sum(days.slice(0, 7)).kcal / Math.min(7, days.length)
    : 0;

  return (
    <div>
      <PageHeader title="История питания" left={<BackButton onClick={onBack} />} />
      <div className="space-y-2 px-4 pb-4">
        {days && days.length > 0 && (
          <Card>
            <div className="text-sm text-zinc-400">Среднее за последние {Math.min(7, days.length)} дн. с записями</div>
            <div className="text-2xl font-bold tabular-nums">
              {Math.round(avg)} <span className="text-base font-normal text-zinc-500">/ {goals.kcal} ккал</span>
            </div>
          </Card>
        )}
        {days && !days.length && <Empty>Записей пока нет</Empty>}
        {days?.map((d) => {
          const pct = goals.kcal ? Math.round((d.kcal / goals.kcal) * 100) : 0;
          return (
            <button key={d.date} className="w-full text-left" onClick={() => onOpenDay(d.date)}>
              <Card className="py-3">
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 font-medium">{formatDay(d.date)}</span>
                  <span className={`text-sm tabular-nums ${pct >= 95 ? 'text-accent' : pct >= 80 ? 'text-zinc-300' : 'text-amber-400'}`}>
                    {Math.round(d.kcal)} ккал · {pct}%
                  </span>
                </div>
                <div className="mt-1 text-xs tabular-nums text-zinc-500">
                  Б {Math.round(d.protein)} / {goals.protein} · Ж {Math.round(d.fat)} / {goals.fat} · У {Math.round(d.carbs)} /{' '}
                  {goals.carbs} · {d.count} зап.
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
