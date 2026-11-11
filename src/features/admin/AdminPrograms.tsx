import { ArrowDown, ArrowUp, ChevronRight, EyeOff, Plus, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BackButton, Button, Card, Field, NumInput, PageHeader, TextInput } from '../../components/ui';
import { CUSTOM_COLORS, CUSTOM_ICONS, lookOf } from '../../data/programLook';
import { DEFAULT_PROGRAM_ID, allPrograms, findProgram, isBuiltinProgram, originalProgram, templateDays, type CatalogProgram } from '../../data/programs';
import { useAppConfig, updateConfig, type AddedProgram, type AppConfig } from '../../lib/appConfig';
import { useBackEntry } from '../../lib/backNav';
import { uid } from '../../lib/date';
import type { ProgramDay } from '../../types';
import { ProgramEditor, type DayStore } from '../workouts/ProgramEditor';
import { adminCloseButton } from './AdminPanel';

type View = { name: 'list' } | { name: 'program'; id: string } | { name: 'days'; id: string };

const LEVELS: CatalogProgram['level'][] = ['Новичок', 'Средний', 'Продвинутый'];

/** Список программ каталога в том порядке, как его видят пользователи (включая скрытые). */
const catalogIds = () => allPrograms(true).filter((p) => !p.userMade).map((p) => p.id);

function useSave() {
  const [state, setState] = useState<{ busy: boolean; error: string; ok: boolean }>({ busy: false, error: '', ok: false });
  const run = async (fn: (c: AppConfig) => AppConfig) => {
    setState({ busy: true, error: '', ok: false });
    try {
      await updateConfig(fn);
      setState({ busy: false, error: '', ok: true });
      setTimeout(() => setState((s) => ({ ...s, ok: false })), 1500);
    } catch (e) {
      setState({ busy: false, error: e instanceof Error ? e.message : 'Не сохранилось', ok: false });
    }
  };
  return [state, run] as const;
}

export function SaveStatus({ s }: { s: { busy: boolean; error: string; ok: boolean } }) {
  if (s.error) return <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">{s.error}</p>;
  if (s.busy) return <p className="text-xs font-bold text-fg/45">Сохраняю…</p>;
  if (s.ok) return <p className="text-xs font-bold text-green-600">Сохранено — пользователи увидят при следующем запуске</p>;
  return null;
}
export { useSave };

export function AdminPrograms({ onBack }: { onBack?: () => void }) {
  const [view, setView] = useState<View>({ name: 'list' });
  useBackEntry(view.name !== 'list', () => setView(view.name === 'days' ? { name: 'program', id: view.id } : { name: 'list' }));
  if (view.name === 'days') return <AdminDays id={view.id} onBack={() => setView({ name: 'program', id: view.id })} />;
  if (view.name === 'program')
    return <AdminProgram id={view.id} onBack={() => setView({ name: 'list' })} onDays={() => setView({ name: 'days', id: view.id })} />;
  return <ProgramList onBack={onBack} onOpen={(id) => setView({ name: 'program', id })} />;
}

function ProgramList({ onBack, onOpen }: { onBack?: () => void; onOpen: (id: string) => void }) {
  const cfg = useAppConfig();
  const [s, save] = useSave();
  const ids = catalogIds();
  const pinned = cfg.programs?.defaultPinned ?? DEFAULT_PROGRAM_ID;

  const move = (id: string, dir: -1 | 1) =>
    save((c) => {
      const order = [...ids];
      const i = order.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= order.length) return c;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...c, programs: { ...c.programs, order } };
    });

  const add = async () => {
    const id = `a-${uid().slice(0, 8)}`;
    const p: AddedProgram = {
      id,
      name: 'Новая программа',
      tagline: 'Описание на плитке',
      description: '',
      level: 'Средний',
      daysPerWeek: 3,
      goal: 'Масса',
      equipment: 'Зал',
      icon: 'dumbbell',
      color: CUSTOM_COLORS[0],
      days: [0, 1, 2].map((i) => ({ id: `${id}-${'ABC'[i]}`, order: i, name: `День ${'ABC'[i]}`, title: 'Новый день', exercises: [] })),
    };
    await save((c) => ({ ...c, programs: { ...c.programs, added: [...(c.programs?.added ?? []), p], order: [...ids, id] } }));
    onOpen(id);
  };

  return (
    <>
      <PageHeader title="Программы" subtitle="Управление" left={onBack && <BackButton onClick={onBack} />} right={adminCloseButton} />
      <div className="space-y-2 px-4">
        <SaveStatus s={s} />
        {ids.map((id, i) => {
          const p = findProgram(id);
          const { Icon, color } = lookOf(id);
          const hidden = cfg.programs?.overrides?.[id]?.hidden;
          return (
            <Card key={id} className={`p-0 ${hidden ? 'opacity-55' : ''}`}>
              <div className="flex items-center gap-2 p-3">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(id)}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
                    <Icon size={20} strokeWidth={2.3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{p.name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-fg/45">
                      {isBuiltinProgram(id) ? 'встроенная' : 'добавлена вами'}
                      {hidden && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <EyeOff size={11} /> скрыта
                        </span>
                      )}
                      {pinned === id && <span className="text-gold-strong">· у новичков закреплена</span>}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-fg/25" />
                </button>
                <div className="flex flex-col">
                  <button aria-label="Выше" disabled={i === 0} onClick={() => move(id, -1)} className="grid h-7 w-8 place-items-center rounded-lg text-fg/45 disabled:opacity-20">
                    <ArrowUp size={15} />
                  </button>
                  <button aria-label="Ниже" disabled={i === ids.length - 1} onClick={() => move(id, 1)} className="grid h-7 w-8 place-items-center rounded-lg text-fg/45 disabled:opacity-20">
                    <ArrowDown size={15} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        <Button className="w-full py-3" onClick={add}>
          <Plus size={16} strokeWidth={2.6} /> Добавить программу
        </Button>
        <p className="px-1 text-xs font-medium text-fg/45">Стрелками меняется порядок в каталоге у всех пользователей.</p>
      </div>
    </>
  );
}

function AdminProgram({ id, onBack, onDays }: { id: string; onBack: () => void; onDays: () => void }) {
  const cfg = useAppConfig();
  const [s, save] = useSave();
  const p = findProgram(id);
  const builtin = isBuiltinProgram(id);
  const look = lookOf(id);
  const hidden = !!cfg.programs?.overrides?.[id]?.hidden;
  const pinned = (cfg.programs?.defaultPinned ?? DEFAULT_PROGRAM_ID) === id;
  const iconKey = p.look?.icon ?? Object.entries(CUSTOM_ICONS).find(([, I]) => I === look.Icon)?.[0] ?? 'dumbbell';

  const [d, setD] = useState({ name: '', tagline: '', description: '', goal: '', equipment: '', level: 'Средний' as CatalogProgram['level'], daysPerWeek: 3, icon: 'dumbbell', color: CUSTOM_COLORS[0] });
  useEffect(() => {
    setD({ name: p.name, tagline: p.tagline, description: p.description, goal: p.goal, equipment: p.equipment, level: p.level, daysPerWeek: p.daysPerWeek, icon: iconKey, color: look.color });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Записать поля: встроенной — как правку, добавленной — прямо в неё. */
  const patch = (fields: Partial<AddedProgram> & { hidden?: boolean }) =>
    save((c) => {
      const programs = { ...c.programs };
      if (builtin || 'hidden' in fields) {
        const { days, ...rest } = fields;
        void days;
        programs.overrides = { ...programs.overrides, [id]: { ...programs.overrides?.[id], ...rest } };
      }
      if (!builtin) {
        const { hidden: _h, ...rest } = fields;
        void _h;
        programs.added = (programs.added ?? []).map((a) => (a.id === id ? { ...a, ...rest } : a));
      }
      return { ...c, programs };
    });

  const Icon = CUSTOM_ICONS[d.icon] ?? look.Icon;

  return (
    <>
      <PageHeader title={p.name} subtitle="Программа" left={<BackButton onClick={onBack} />} right={adminCloseButton} />
      <div className="space-y-3 px-4">
        <SaveStatus s={s} />
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${d.color} 15%, transparent)`, color: d.color }}>
              <Icon size={24} strokeWidth={2.3} />
            </span>
            <div className="flex-1">
              <Field label="Название">
                <TextInput value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
              </Field>
            </div>
          </div>
          <Field label="Подпись на плитке">
            <TextInput value={d.tagline} onChange={(e) => setD({ ...d, tagline: e.target.value })} />
          </Field>
          <Field label="Описание">
            <textarea
              value={d.description}
              rows={4}
              onChange={(e) => setD({ ...d, description: e.target.value })}
              className="w-full rounded-xl border border-fg/10 bg-surface px-3.5 py-2.5 text-base text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="Цель">
              <TextInput value={d.goal} onChange={(e) => setD({ ...d, goal: e.target.value })} />
            </Field>
            <Field label="Дней/нед">
              <NumInput decimal={false} value={d.daysPerWeek} onChange={(v) => setD({ ...d, daysPerWeek: Math.min(7, Math.max(1, Math.round(v ?? 3))) })} />
            </Field>
          </div>
          <Field label="Инвентарь">
            <TextInput value={d.equipment} onChange={(e) => setD({ ...d, equipment: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <Button key={l} variant={d.level === l ? 'primary' : 'secondary'} className="px-1" onClick={() => setD({ ...d, level: l })}>
                {l}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-9 gap-1.5">
            {Object.entries(CUSTOM_ICONS).map(([key, I]) => (
              <button key={key} aria-label={key} onClick={() => setD({ ...d, icon: key })} className={`grid aspect-square place-items-center rounded-xl ${d.icon === key ? 'bg-fg text-bg' : 'bg-fg/[.05] text-fg/60'}`}>
                <I size={17} strokeWidth={2.3} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {CUSTOM_COLORS.map((c) => (
              <button key={c} aria-label={`Цвет ${c}`} onClick={() => setD({ ...d, color: c })} className={`h-8 flex-1 rounded-lg ${d.color === c ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <Button variant="primary" className="w-full py-3" disabled={!d.name.trim() || s.busy} onClick={() => patch({ ...d, name: d.name.trim() })}>
            Сохранить описание
          </Button>
        </Card>

        <Button className="w-full py-3" onClick={onDays}>
          Дни и упражнения · {templateDays(p).length}
        </Button>

        <Card className="space-y-2">
          <Button className="w-full" disabled={pinned} onClick={() => save((c) => ({ ...c, programs: { ...c.programs, defaultPinned: id } }))}>
            <Star size={15} /> {pinned ? 'Закреплена у новых пользователей' : 'Закреплять у новых пользователей'}
          </Button>
          <Button className="w-full" onClick={() => patch({ hidden: !hidden })}>
            <EyeOff size={15} /> {hidden ? 'Показать в каталоге' : 'Скрыть из каталога'}
          </Button>
          {builtin ? (
            <Button
              variant="danger"
              className="w-full"
              onClick={() =>
                confirm('Вернуть программу к исходному виду? Все ваши правки этой программы пропадут.') &&
                save((c) => {
                  const overrides = { ...c.programs?.overrides };
                  delete overrides[id];
                  return { ...c, programs: { ...c.programs, overrides } };
                }).then(() => {
                  const o = originalProgram(id);
                  if (o) setD({ ...d, name: o.name, tagline: o.tagline, description: o.description, goal: o.goal, equipment: o.equipment, level: o.level, daysPerWeek: o.daysPerWeek });
                })
              }
            >
              Вернуть как было
            </Button>
          ) : (
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => {
                if (!confirm(`Удалить программу «${p.name}» у всех пользователей?`)) return;
                await save((c) => ({
                  ...c,
                  programs: { ...c.programs, added: (c.programs?.added ?? []).filter((a) => a.id !== id), order: (c.programs?.order ?? []).filter((x) => x !== id) },
                }));
                onBack();
              }}
            >
              Удалить программу
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}

/** Дни и упражнения программы — тот же редактор, что у пользователя, но сохраняет на сервер. */
function AdminDays({ id, onBack }: { id: string; onBack: () => void }) {
  useAppConfig();
  const builtin = isBuiltinProgram(id);
  const days = templateDays(findProgram(id));
  const write = (fn: (list: ProgramDay[]) => ProgramDay[]) =>
    updateConfig((c) => {
      const programs = { ...c.programs };
      if (builtin) {
        const cur = programs.overrides?.[id]?.days ?? originalProgram(id)?.days() ?? [];
        programs.overrides = { ...programs.overrides, [id]: { ...programs.overrides?.[id], days: fn(cur) } };
      } else {
        programs.added = (programs.added ?? []).map((a) => (a.id === id ? { ...a, days: fn(a.days) } : a));
      }
      return { ...c, programs };
    });
  const store: DayStore = {
    put: (day) => write((list) => (list.some((d) => d.id === day.id) ? list.map((d) => (d.id === day.id ? day : d)) : [...list, day]).sort((a, b) => a.order - b.order)),
    remove: (dayId) => write((list) => list.filter((d) => d.id !== dayId)),
  };
  return <ProgramEditor onBack={onBack} days={days} store={store} newDayId={() => `${id}-${uid().slice(0, 8)}`} />;
}
