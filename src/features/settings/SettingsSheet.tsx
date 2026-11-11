import { Dumbbell, Palette, ShieldCheck, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { useAppConfig } from '../../lib/appConfig';
import { setAdminOpen } from '../../lib/adminOpen';
import { FEATURES, setFeature, useFeature, type FeatureId } from '../../lib/features';
import { Sheet } from '../../components/ui';
import { Timer } from 'lucide-react';
import { useState } from 'react';
import { askNotifyPermission, saveRestSettings, useRestSettings, type RestSettings } from '../../lib/restSettings';

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
        <RestSection />
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


const REST_OPTIONS: { id: RestSettings['mode']; label: string }[] = [
  { id: 'program', label: 'Как в программе' },
  { id: 60, label: '60 с' },
  { id: 90, label: '90 с' },
  { id: 120, label: '2 мин' },
  { id: 180, label: '3 мин' },
];

/** Таймер отдыха: своё время и как сообщать об окончании. */
function RestSection() {
  const s = useRestSettings();
  const [note, setNote] = useState('');
  const set = (patch: Partial<RestSettings>) => saveRestSettings({ ...s, ...patch });
  const toggleNotify = async (on: boolean) => {
    setNote('');
    if (!on) return set({ notify: false });
    const r = await askNotifyPermission();
    if (r === 'granted') set({ notify: true });
    else if (r === 'unsupported')
      setNote('Уведомления недоступны. На iPhone добавьте приложение на экран «Домой» (Поделиться → На экран «Домой») и откройте его оттуда.');
    else setNote('Уведомления запрещены. Разрешите их в настройках телефона для этого приложения.');
  };
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Timer size={14} strokeWidth={2.6} className="text-gold" />
        <span className="eyebrow">Таймер отдыха</span>
      </div>
      <div className="space-y-3 rounded-2xl bg-fg/[.05] p-4">
        <div>
          <div className="text-sm font-bold">Время отдыха</div>
          <div className="mb-2 text-xs font-medium text-fg/50">«Как в программе» — у каждого упражнения своё (обычно 60–120 с)</div>
          <div className="flex flex-wrap gap-1.5">
            {REST_OPTIONS.map((o) => (
              <button
                key={String(o.id)}
                onClick={() => set({ mode: o.id })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${s.mode === o.id ? 'bg-fg text-bg' : 'bg-surface text-fg/60'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <Switch title="Звук" hint="Короткий сигнал, когда отдых кончился" on={s.sound} onChange={(v) => set({ sound: v })} />
        <Switch title="Вибрация" hint="Работает на Android; iPhone не даёт сайтам вибрировать" on={s.vibrate} onChange={(v) => set({ vibrate: v })} />
        <Switch title="Уведомление" hint="Если приложение свёрнуто — придёт уведомление" on={s.notify} onChange={toggleNotify} />
        {note && <p className="text-xs font-semibold text-amber-600">{note}</p>}
        <p className="text-[11px] font-medium text-fg/45">Во время отдыха время можно поправить кнопками −15 и +15 на таймере.</p>
      </div>
    </section>
  );
}

function Switch({ title, hint, on, onChange }: { title: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs font-medium text-fg/50">{hint}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-fg/15 transition-colors peer-checked:bg-gold after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
