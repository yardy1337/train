import { Dumbbell, Palette, ShieldCheck, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { useAppConfig } from '../../lib/appConfig';
import { setAdminOpen } from '../../lib/adminOpen';
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
  const cfg = useAppConfig();
  const disabled = new Set(cfg.features?.disabled ?? []);
  return (
    <Sheet open={open} onClose={onClose} title="Настройки">
      <div className="space-y-5">
        {GROUPS.filter(({ name }) => FEATURES.some((f) => f.group === name && !disabled.has(f.id))).map(({ name, Icon }) => (
          <section key={name} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Icon size={14} strokeWidth={2.6} className="text-gold" />
              <span className="eyebrow">{name}</span>
            </div>
            <div className="overflow-hidden rounded-2xl bg-fg/[.05]">
              {FEATURES.filter((f) => f.group === name && !disabled.has(f.id)).map((f, i) => (
                <FeatureRow key={f.id} id={f.id} title={f.title} hint={f.hint} first={i === 0} />
              ))}
            </div>
          </section>
        ))}
        <button
          onClick={() => {
            onClose();
            setAdminOpen(true);
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-fg/10 px-4 py-3 text-left active:bg-fg/[.04]"
        >
          <ShieldCheck size={20} className="text-gold" />
          <span className="flex-1">
            <span className="block text-sm font-bold">Управление приложением</span>
            <span className="block text-xs font-medium text-fg/50">Для администратора, вход по паролю</span>
          </span>
          <ChevronRight size={18} className="text-fg/30" />
        </button>
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

