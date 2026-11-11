import { FEATURES, setFeature, useFeature, type FeatureId } from '../../lib/features';
import { Sheet } from '../../components/ui';

/** Настройки: дополнительные функции «по желанию». */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Настройки">
      <div className="space-y-2">
        <div className="eyebrow">Дополнительные функции</div>
        {FEATURES.map((f) => (
          <FeatureRow key={f.id} id={f.id} title={f.title} hint={f.hint} />
        ))}
        <p className="pt-1 text-xs font-medium text-fg/45">
          Таймер отдыха, личные рекорды, расчёт нормы калорий и серия тренировок работают всегда.
        </p>
      </div>
    </Sheet>
  );
}

function FeatureRow({ id, title, hint }: { id: FeatureId; title: string; hint: string }) {
  const on = useFeature(id);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-fg/[.05] px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs font-medium text-fg/50">{hint}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => setFeature(id, e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-fg/15 transition-colors peer-checked:bg-gold after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
