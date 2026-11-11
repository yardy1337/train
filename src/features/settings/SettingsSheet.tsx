import { Dumbbell, Palette, ShieldCheck, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { allPrograms } from '../../data/programs';
import { resetOverride, patchOverride, useProgramOverrides } from '../../data/programOverrides';
import { db } from '../../db/db';
import { FEATURES, setFeature, useFeature, type FeatureId } from '../../lib/features';
import { Sheet } from '../../components/ui';

const GROUPS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Оформление', Icon: Palette },
  { name: 'Тренировки', Icon: Dumbbell },
  { name: 'Питание', Icon: UtensilsCrossed },
  { name: 'Прогресс', Icon: TrendingUp },
  { name: 'Администратор', Icon: ShieldCheck },
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
        <AdminExtras />
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

/** Для режима редактора: скрытые программы и скрытые продукты — можно вернуть. */
function AdminExtras() {
  const admin = useFeature('admin');
  const overrides = useProgramOverrides();
  const hiddenFoods = useLiveQuery(() => db.foods.filter((f) => !!f.hidden).toArray(), [], []);
  if (!admin) return null;
  const hidden = allPrograms(true).filter((p) => overrides[p.id]?.hidden);
  return (
    <section className="space-y-2">
      <p className="px-1 text-xs font-medium text-fg/50">
        В режиме редактора на странице любой программы есть кнопка правки, у подсказок по технике — «Изменить», у продуктов — карандаш. Правки хранятся только на этом телефоне.
      </p>
      {hidden.length > 0 && (
        <div className="rounded-2xl bg-fg/[.05] p-3">
          <div className="eyebrow mb-2">Скрытые программы</div>
          {hidden.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <span className="flex-1 text-sm font-bold">{p.name}</span>
              <button className="rounded-lg bg-surface px-2.5 py-1 text-xs font-bold shadow-card" onClick={() => patchOverride(p.id, { hidden: false })}>
                Показать
              </button>
              <button className="rounded-lg px-2.5 py-1 text-xs font-bold text-fg/55" onClick={() => confirm(`Вернуть «${p.name}» к исходному виду?`) && resetOverride(p.id)}>
                Сбросить
              </button>
            </div>
          ))}
        </div>
      )}
      {hiddenFoods.length > 0 && (
        <div className="rounded-2xl bg-fg/[.05] p-3">
          <div className="eyebrow mb-2">Удалённые продукты · {hiddenFoods.length}</div>
          <button className="rounded-lg bg-surface px-2.5 py-1 text-xs font-bold shadow-card" onClick={() => db.foods.bulkUpdate(hiddenFoods.map((f) => ({ key: f.id, changes: { hidden: undefined } })))}>
            Вернуть все
          </button>
        </div>
      )}
    </section>
  );
}
