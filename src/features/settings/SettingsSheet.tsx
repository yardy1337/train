import { Dumbbell, Palette, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { FEATURES, setFeature, useFeature, type FeatureId } from '../../lib/features';
import { Sheet } from '../../components/ui';

const GROUPS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Оформление', Icon: Palette },
  { name: 'Тренировки', Icon: Dumbbell },
  { name: 'Питание', Icon: UtensilsCrossed },
  { name: 'Прогресс', Icon: TrendingUp },
];

/** Настройки по разделам: переключатели функций «по желанию». */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Настройки">
      <div className="space-y-5">
        {GROUPS.map(({ name, Icon }) => (
          <section key={name} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Icon size={14} strokeWidth={2.6} className="text-gold" />
              <span className="eyebrow">{name}</span>
            </div>
            <div className="overflow-hidden rounded-2xl bg-fg/[.05]">
              {FEATURES.filter((f) => f.group === name).map((f, i) => (
                <FeatureRow key={f.id} id={f.id} title={f.title} hint={f.hint} first={i === 0} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

function FeatureRow({ id, title, hint, first }: { id: FeatureId; title: string; hint: string; first: boolean }) {
  const on = useFeature(id);
  return (
    <label className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-fg/[.06]'}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs font-medium text-fg/50">{hint}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => setFeature(id, e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-fg/15 transition-colors peer-checked:bg-gold after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
