import { Apple, Beef, Dumbbell, Flame, Medal, Moon, PersonStanding, Sunrise, Timer, Trophy, Weight, type LucideIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui';
import { db } from '../../db/db';
import { useGoals } from '../../db/settings';
import { computeAchievements, unlocked, type Achievement } from '../../lib/achievements';
import { fmt } from '../../lib/format';
import type { MealEntry } from '../../types';
import { useHistory } from '../workouts/hooks';

const ICONS: Record<Achievement['icon'], LucideIcon> = {
  dumbbell: Dumbbell,
  weight: Weight,
  trophy: Trophy,
  flame: Flame,
  sunrise: Sunrise,
  moon: Moon,
  timer: Timer,
  body: PersonStanding,
  apple: Apple,
  beef: Beef,
};

const SEEN_KEY = 'achievementsSeen';
const EMPTY: MealEntry[] = [];

/** Достижения: значки за тренировки, тоннаж, рекорды, серии и питание. */
export function Achievements({ index }: { index: number }) {
  const history = useHistory();
  const meals = useLiveQuery(() => db.meals.toArray(), [], EMPTY);
  const goals = useGoals();
  const list = useMemo(() => computeAchievements(history, meals, goals), [history, meals, goals]);
  const got = list.filter(unlocked);
  const [open, setOpen] = useState<string | null>(null);

  // Новые (ещё не просмотренные) значки подсвечиваем.
  const [seen] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(got.map((a) => a.id)));
    } catch {
      /* ignore */
    }
  }, [got]);

  const sel = list.find((a) => a.id === open);
  // Сначала полученные, затем ближайшие к получению.
  const sorted = [...list].sort((a, b) => Number(unlocked(b)) - Number(unlocked(a)) || b.value / b.goal - a.value / a.goal);

  return (
    <Card index={index} className="space-y-3">
      <div className="flex items-center gap-2">
        <Medal size={20} strokeWidth={2.4} className="text-gold" />
        <h2 className="flex-1 text-lg font-extrabold tracking-tight">Достижения</h2>
        <span className="text-sm font-bold tabular-nums text-fg/40">
          {got.length} из {list.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {sorted.map((a) => {
          const Icon = ICONS[a.icon];
          const on = unlocked(a);
          const isNew = on && !seen.has(a.id);
          const pct = Math.min(1, a.value / a.goal);
          return (
            <button key={a.id} onClick={() => setOpen(open === a.id ? null : a.id)} className="flex flex-col items-center gap-1 text-center">
              <span className="relative grid h-14 w-14 place-items-center">
                {/* Кольцо прогресса для ещё не полученных */}
                <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                  <circle cx="28" cy="28" r="25" fill="none" strokeWidth="3" className="stroke-fg/[.08]" />
                  {!on && pct > 0 && <circle cx="28" cy="28" r="25" fill="none" strokeWidth="3" strokeLinecap="round" stroke="var(--color-gold)" strokeDasharray={`${pct * 157} 157`} />}
                </svg>
                <motion.span
                  initial={isNew ? { scale: 0.5, rotate: -20 } : false}
                  animate={isNew ? { scale: [0.5, 1.2, 1], rotate: [-20, 10, 0] } : undefined}
                  transition={{ duration: 0.7 }}
                  className={`grid h-11 w-11 place-items-center rounded-full ${on ? 'bg-gradient-to-br from-[#f3d36b] to-gold-strong text-ink shadow-gold' : 'bg-fg/[.05] text-fg/25'} ${open === a.id ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
                >
                  <Icon size={20} strokeWidth={2.3} />
                </motion.span>
                {isNew && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[9px] font-extrabold text-white">NEW</span>}
              </span>
              <span className={`text-[10px] font-bold leading-tight ${on ? '' : 'text-fg/40'}`}>{a.title}</span>
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="rounded-xl bg-fg/[.04] px-3 py-2 text-sm">
          <div className="font-extrabold">{sel.title}</div>
          <div className="text-xs font-medium text-fg/60">
            {sel.desc} ·{' '}
            {unlocked(sel) ? (
              <span className="font-bold text-gold-strong">получено</span>
            ) : (
              <span className="tabular-nums">
                {fmt(Math.min(sel.value, sel.goal), sel.goal >= 10 && sel.icon === 'weight' ? 1 : 0)} из {sel.goal}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
