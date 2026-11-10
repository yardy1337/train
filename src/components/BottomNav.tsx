import { Dumbbell, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export type Tab = 'workouts' | 'nutrition' | 'progress';

const items: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'workouts', label: 'Тренировки', Icon: Dumbbell },
  { id: 'nutrition', label: 'Питание', Icon: UtensilsCrossed },
  { id: 'progress', label: 'Прогресс', Icon: TrendingUp },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-navy shadow-[0_-8px_24px_-12px_rgb(11_31_75/0.5)]">
      <div className="mx-auto flex max-w-lg px-2">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-bold transition-colors ${
                active ? 'text-white' : 'text-white/45'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute top-1.5 h-[3px] w-8 rounded-full bg-gold"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
