import { GlassWater, Minus, Plus } from 'lucide-react';
import { Card } from '../../components/ui';
import { setSetting, useSetting } from '../../db/settings';

const STEP = 250;
const GLASSES = 10;

/** Вода за день: стаканы по 250 мл, цель по умолчанию 2,5 л. */
export function WaterCard({ date, index }: { date: string; index: number }) {
  const key = `water:${date}`;
  const ml = useSetting<number>(key, 0);
  const goal = useSetting<number>('waterGoal', 2500);
  const per = goal / GLASSES;
  const filled = Math.min(GLASSES, Math.round(ml / per));
  const set = (v: number) => {
    navigator.vibrate?.(10);
    setSetting(key, Math.max(0, Math.min(6000, v)));
  };
  return (
    <Card index={index} className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-water/15 text-water">
          <GlassWater size={20} strokeWidth={2.2} />
        </span>
        <div className="flex-1">
          <div className="font-bold">Вода</div>
          <div className="text-xs font-semibold tabular-nums text-fg/45">
            {(ml / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} из {(goal / 1000).toLocaleString('ru-RU')} л
          </div>
        </div>
        <button
          onClick={() => set(ml - STEP)}
          disabled={ml <= 0}
          aria-label="Минус стакан"
          className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-fg transition-transform active:scale-90 disabled:opacity-30"
        >
          <Minus size={18} strokeWidth={2.6} />
        </button>
        <button
          onClick={() => set(ml + STEP)}
          aria-label="Плюс стакан 250 мл"
          className="grid h-9 w-9 place-items-center rounded-full bg-navy text-white shadow-lift transition-transform active:scale-90"
        >
          <Plus size={18} strokeWidth={2.6} />
        </button>
      </div>
      <div className="grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: GLASSES }, (_, i) => (
          <button
            key={i}
            tabIndex={-1}
            onClick={() => set((i + 1) * per === ml ? i * per : (i + 1) * per)}
            className={`h-7 rounded-md transition-colors duration-300 ${i < filled ? 'bg-water' : 'bg-fg/[.07]'}`}
          />
        ))}
      </div>
    </Card>
  );
}
