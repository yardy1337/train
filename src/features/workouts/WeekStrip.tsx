import { Check, Flame } from 'lucide-react';
import { Card } from '../../components/ui';
import { addDays, parseISODate, todayISO } from '../../lib/date';
import { pluralRu } from '../../lib/format';
import type { Workout } from '../../types';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Текущая неделя: в какие дни были тренировки и сколько из плана выполнено. */
export function WeekStrip({ history, plan, index }: { history: Workout[]; plan: number; index: number }) {
  const today = todayISO();
  const dow = (parseISODate(today).getDay() + 6) % 7; // 0 = понедельник
  const monday = addDays(today, -dow);
  const week = DAYS.map((label, i) => {
    const date = addDays(monday, i);
    return { label, date, num: parseISODate(date).getDate(), done: history.some((w) => w.date === date) };
  });
  const count = week.filter((d) => d.done).length;
  // Серия недель подряд, где был хотя бы план тренировок.
  let streak = 0;
  for (let k = 1; k < 52; k++) {
    const start = addDays(monday, -7 * k);
    const end = addDays(start, 6);
    const n = new Set(history.filter((w) => w.date >= start && w.date <= end).map((w) => w.date)).size;
    if (n >= plan) streak++;
    else break;
  }
  if (count >= plan) streak++;

  return (
    <Card index={index} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">Эта неделя</div>
        <div className="text-sm font-extrabold tabular-nums">
          {count} <span className="font-bold text-fg/40">из {plan} {pluralRu(plan, 'тренировки', 'тренировок', 'тренировок')}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const isToday = d.date === today;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-fg' : 'text-fg/40'}`}>{d.label}</span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold tabular-nums transition-colors ${
                  d.done ? 'bg-navy text-white' : isToday ? 'text-fg ring-2 ring-gold' : 'bg-fg/[.05] text-fg/50'
                }`}
              >
                {d.done ? <Check size={16} strokeWidth={3} className="text-gold" /> : d.num}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fg/[.07]">
        <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${Math.min(100, (count / Math.max(1, plan)) * 100)}%` }} />
      </div>
      <div className="flex items-center gap-2.5 rounded-xl bg-gold-soft px-3 py-2">
        <Flame size={20} strokeWidth={2.4} className={streak ? 'text-gold-strong' : 'text-fg/30'} />
        <div className="min-w-0 flex-1 text-xs font-bold leading-tight">
          {streak ? (
            <>
              Серия: <span className="text-sm font-extrabold">{streak} {pluralRu(streak, 'неделя', 'недели', 'недель')}</span> подряд по плану
            </>
          ) : (
            <span className="text-fg/60">Выполни план этой недели — начнётся серия</span>
          )}
        </div>
        {streak > 0 && count < plan && <span className="shrink-0 text-[11px] font-bold text-fg/50">ещё {plan - count}</span>}
      </div>
    </Card>
  );
}
