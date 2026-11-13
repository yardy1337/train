import { CalendarCheck, Check, ClipboardList, Copy, RefreshCw, Share, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Button, Card, Segmented, Sheet } from '../../components/ui';
import { db } from '../../db/db';
import { setSetting, useGoals, useSetting } from '../../db/settings';
import { buildPlan, shoppingList, type MealPlan, type PlanMeal } from '../../lib/mealPlan';
import { makeEntry, sum } from '../../lib/nutrition';
import { pluralRu } from '../../lib/format';
import type { Food } from '../../types';

const PLAN_KEY = 'mealPlan';
const EMPTY: Food[] = [];

/** Карточка «План питания» на вкладке «Питание». */
export function MealPlanCard({ date, index }: { date: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card index={index} className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-soft text-gold-strong">
          <CalendarCheck size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">План питания</div>
          <div className="text-xs font-medium text-fg/55">Меню на день под твою норму и список покупок</div>
        </div>
        <Button className="shrink-0 px-3" onClick={() => setOpen(true)}>
          Открыть
        </Button>
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title="План питания" full>
        {open && <PlanBody date={date} />}
      </Sheet>
    </>
  );
}

function PlanBody({ date }: { date: string }) {
  const goals = useGoals();
  const foods = useLiveQuery(() => db.foods.where('source').equals('builtin').toArray(), [], EMPTY);
  const saved = useSetting<MealPlan | null>(PLAN_KEY, null);
  const [tab, setTab] = useState<'menu' | 'shop'>('menu');
  const [msg, setMsg] = useState('');

  const generate = async () => {
    const p = buildPlan(foods, goals);
    if (p) await setSetting(PLAN_KEY, p);
    setMsg('');
  };

  const plan = saved;
  const total = plan ? sum(plan.meals.flatMap((m) => m.items)) : null;

  const addMeal = async (m: PlanMeal) => {
    const byId = new Map(foods.map((f) => [f.id, f]));
    const entries = m.items.map((it, i) => {
      const f = byId.get(it.foodId);
      return f ? { ...makeEntry(f, it.grams, date, m.meal), createdAt: Date.now() + i } : null;
    });
    await db.meals.bulkAdd(entries.filter((e): e is NonNullable<typeof e> => !!e));
  };

  return (
    <div className="space-y-3 pb-4">
      <p className="text-xs font-medium text-fg/55">
        Цель на день: <b className="text-fg">{goals.kcal} ккал</b> · Б {goals.protein} · Ж {goals.fat} · У {goals.carbs}. Меню собирается из базовых продуктов
        и подгоняется под эти цифры.
      </p>

      {!plan ? (
        <Button variant="gold" className="w-full py-3" disabled={!foods.length} onClick={generate}>
          <Sparkles size={16} /> Составить меню на день
        </Button>
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: 'menu', label: 'Меню' },
              { id: 'shop', label: 'Покупки' },
            ]}
          />
          {tab === 'menu' ? (
            <>
              {total && (
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {(
                    [
                      ['Ккал', total.kcal, goals.kcal],
                      ['Белки', total.protein, goals.protein],
                      ['Жиры', total.fat, goals.fat],
                      ['Углев.', total.carbs, goals.carbs],
                    ] as const
                  ).map(([l, v, g]) => (
                    <div key={l} className="rounded-xl bg-fg/[.05] px-1 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-fg/45">{l}</div>
                      <div className="text-base font-extrabold tabular-nums">{Math.round(v)}</div>
                      <div className="text-[10px] font-semibold tabular-nums text-fg/40">из {g}</div>
                    </div>
                  ))}
                </div>
              )}
              {plan.meals.map((m) => (
                <MealBlock key={m.meal} m={m} onAdd={() => addMeal(m).then(() => setMsg(`«${m.title}» добавлен в дневник`))} />
              ))}
              {msg && <p className="text-center text-xs font-bold text-green-600">{msg}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={generate}>
                  <RefreshCw size={15} /> Другое меню
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    for (const m of plan.meals) await addMeal(m);
                    setMsg('Всё меню добавлено в дневник');
                  }}
                >
                  <Check size={15} /> Всё в дневник
                </Button>
              </div>
            </>
          ) : (
            <Shopping plan={plan} />
          )}
        </>
      )}
    </div>
  );
}

function MealBlock({ m, onAdd }: { m: PlanMeal; onAdd: () => void }) {
  const t = sum(m.items);
  return (
    <div className="rounded-2xl border border-fg/[.08] bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex-1">
          <div className="font-extrabold">{m.title}</div>
          <div className="text-[11px] font-semibold tabular-nums text-fg/45">
            {Math.round(t.kcal)} ккал · Б {Math.round(t.protein)} · Ж {Math.round(t.fat)} · У {Math.round(t.carbs)}
          </div>
        </div>
        <Button className="px-2.5 py-1.5 text-xs" onClick={onAdd}>
          + В дневник
        </Button>
      </div>
      <ul className="space-y-1">
        {m.items.map((it) => (
          <li key={it.foodId} className="flex justify-between gap-2 text-sm">
            <span className="font-medium text-fg/80">{it.name}</span>
            <span className="shrink-0 font-bold tabular-nums">{it.grams} г</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHECK_KEY = 'shoppingChecked';
const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

function Shopping({ plan }: { plan: MealPlan }) {
  const [days, setDays] = useState<'1' | '3' | '7'>('3');
  const list = useMemo(() => shoppingList(plan, Number(days)), [plan, days]);
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(CHECK_KEY) ?? 'null') as { at: number; items: string[] } | null;
      return new Set(s && s.at === plan.createdAt ? s.items : []);
    } catch {
      return new Set();
    }
  });
  const [copied, setCopied] = useState(false);
  const toggle = (name: string) => {
    const n = new Set(checked);
    if (n.has(name)) n.delete(name);
    else n.add(name);
    setChecked(n);
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify({ at: plan.createdAt, items: [...n] }));
    } catch {
      /* ignore */
    }
  };
  const amount = (x: (typeof list)[number]) => (x.pieces ? `${x.pieces} шт` : x.grams >= 1000 ? `${(x.grams / 1000).toLocaleString('ru-RU')} кг` : `${x.grams} г`);
  const text = () => {
    let out = `Список покупок на ${days} ${pluralRu(Number(days), 'день', 'дня', 'дней')}\n`;
    let g = '';
    for (const x of list) {
      if (x.group !== g) {
        g = x.group;
        out += `\n${g}:\n`;
      }
      out += `— ${x.name} — ${amount(x)}\n`;
    }
    return out;
  };
  const share = async () => {
    const t = text();
    try {
      if (canShare) await navigator.share({ text: t });
      else {
        await navigator.clipboard.writeText(t);
        setCopied(true);
      }
    } catch {
      /* отменили */
    }
  };

  let group = '';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">На сколько дней</span>
        <div className="flex-1">
          <Segmented
            value={days}
            onChange={setDays}
            options={[
              { id: '1', label: '1' },
              { id: '3', label: '3' },
              { id: '7', label: '7' },
            ]}
          />
        </div>
      </div>
      <p className="text-xs font-medium text-fg/50">Крупы указаны в сухом виде, мясо — в сыром. Отмечай купленное галочкой.</p>
      <div className="rounded-2xl bg-fg/[.04] px-3 py-1">
        {list.map((x) => {
          const head = x.group !== group;
          group = x.group;
          const on = checked.has(x.name);
          return (
            <div key={x.name}>
              {head && <div className="eyebrow pb-1 pt-3">{x.group}</div>}
              <button onClick={() => toggle(x.name)} className="flex w-full items-center gap-3 py-2 text-left">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${on ? 'bg-accent text-white' : 'border border-fg/20 bg-surface'}`}>
                  {on && <Check size={15} strokeWidth={3} />}
                </span>
                <span className={`flex-1 text-sm font-semibold ${on ? 'text-fg/35 line-through' : ''}`}>{x.name}</span>
                <span className={`text-sm font-bold tabular-nums ${on ? 'text-fg/35' : ''}`}>{amount(x)}</span>
              </button>
            </div>
          );
        })}
      </div>
      <Button className="w-full" onClick={share}>
        {canShare ? <Share size={15} /> : copied ? <ClipboardList size={15} /> : <Copy size={15} />}
        {canShare ? 'Отправить список' : copied ? 'Скопировано' : 'Скопировать список'}
      </Button>
    </div>
  );
}
