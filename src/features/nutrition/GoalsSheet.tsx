import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { db } from '../../db/db';
import { getSetting, setSetting, DEFAULT_GOALS } from '../../db/settings';
import { Button, Field, NumInput, Segmented, Sheet } from '../../components/ui';
import type { Goals } from '../../types';

type Sex = 'm' | 'f';
type Activity = 'low' | 'mid' | 'high';
type Aim = 'gain' | 'keep' | 'cut';
interface Params {
  sex: Sex;
  age: number | null;
  height: number | null;
  weight: number | null;
  activity: Activity;
  aim: Aim;
}
const PARAMS_KEY = 'bodyParams';
const FACTOR: Record<Activity, number> = { low: 1.375, mid: 1.55, high: 1.725 };
const AIM: Record<Aim, number> = { gain: 1.12, keep: 1, cut: 0.82 };

/** Норма по формуле Миффлина — Сан Жеора + активность + цель. Белок и жиры — от веса, остальное — углеводы. */
export function calcGoals(p: Params): Goals | null {
  if (!p.age || !p.height || !p.weight) return null;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const kcal = Math.round((bmr * FACTOR[p.activity] * AIM[p.aim]) / 10) * 10;
  const protein = Math.round(p.weight * (p.aim === 'cut' ? 2.2 : p.aim === 'gain' ? 2 : 1.8));
  const fat = Math.round(p.weight * (p.aim === 'cut' ? 0.8 : 1));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}

function Calc({ onApply }: { onApply: (g: Goals) => void }) {
  const [p, setP] = useState<Params>({ sex: 'm', age: null, height: null, weight: null, activity: 'mid', aim: 'gain' });
  useEffect(() => {
    (async () => {
      const saved = await getSetting<Params | null>(PARAMS_KEY, null);
      const last = await db.weights.orderBy('date').last();
      setP((cur) => ({ ...cur, ...(saved ?? {}), weight: last?.weight ?? saved?.weight ?? null }));
    })();
  }, []);
  const res = calcGoals(p);
  return (
    <div className="space-y-3 rounded-2xl bg-fg/[.04] p-3">
      <Segmented<Sex> value={p.sex} onChange={(sex) => setP({ ...p, sex })} options={[{ id: 'm', label: 'Мужчина' }, { id: 'f', label: 'Женщина' }]} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Возраст">
          <NumInput decimal={false} value={p.age} onChange={(age) => setP({ ...p, age })} placeholder="лет" />
        </Field>
        <Field label="Рост, см">
          <NumInput decimal={false} value={p.height} onChange={(height) => setP({ ...p, height })} placeholder="см" />
        </Field>
        <Field label="Вес, кг">
          <NumInput value={p.weight} onChange={(weight) => setP({ ...p, weight })} placeholder="кг" />
        </Field>
      </div>
      <div>
        <span className="eyebrow mb-1.5 block">Тренировок в неделю</span>
        <Segmented<Activity> value={p.activity} onChange={(activity) => setP({ ...p, activity })} options={[{ id: 'low', label: '1–3' }, { id: 'mid', label: '3–5' }, { id: 'high', label: '6+' }]} />
      </div>
      <div>
        <span className="eyebrow mb-1.5 block">Цель</span>
        <Segmented<Aim> value={p.aim} onChange={(aim) => setP({ ...p, aim })} options={[{ id: 'gain', label: 'Набор' }, { id: 'keep', label: 'Форма' }, { id: 'cut', label: 'Сушка' }]} />
      </div>
      {res ? (
        <div className="rounded-xl bg-surface p-3 text-center shadow-card">
          <div className="text-2xl font-extrabold tabular-nums">{res.kcal} ккал</div>
          <div className="text-xs font-bold tabular-nums text-fg/55">
            Б {res.protein} г · Ж {res.fat} г · У {res.carbs} г
          </div>
        </div>
      ) : (
        <p className="text-center text-xs font-medium text-fg/45">Заполни возраст, рост и вес</p>
      )}
      <Button
        variant="gold"
        className="w-full"
        disabled={!res}
        onClick={() => {
          if (!res) return;
          setSetting(PARAMS_KEY, p);
          onApply(res);
        }}
      >
        Подставить в цели
      </Button>
    </div>
  );
}

export function GoalsSheet({ open, goals, onClose }: { open: boolean; goals: Goals; onClose: () => void }) {
  const [g, setG] = useState(goals);
  const [calc, setCalc] = useState(false);
  useEffect(() => {
    if (open) {
      setG(goals);
      setCalc(false);
    }
  }, [open, goals]);

  const fromMacros = Math.round(g.protein * 4 + g.fat * 9 + g.carbs * 4);

  const save = async () => {
    await setSetting('goals', g);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Цели на день">
      <div className="space-y-3">
        {calc ? (
          <Calc
            onApply={(r) => {
              setG(r);
              setCalc(false);
            }}
          />
        ) : (
          <Button className="w-full" onClick={() => setCalc(true)}>
            <Calculator size={16} strokeWidth={2.4} /> Рассчитать мою норму
          </Button>
        )}
        <Field label="Калории, ккал">
          <NumInput value={g.kcal} onChange={(v) => setG({ ...g, kcal: v ?? 0 })} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Белки, г">
            <NumInput value={g.protein} onChange={(v) => setG({ ...g, protein: v ?? 0 })} />
          </Field>
          <Field label="Жиры, г">
            <NumInput value={g.fat} onChange={(v) => setG({ ...g, fat: v ?? 0 })} />
          </Field>
          <Field label="Углеводы, г">
            <NumInput value={g.carbs} onChange={(v) => setG({ ...g, carbs: v ?? 0 })} />
          </Field>
        </div>
        <p className="text-xs text-fg/45">
          БЖУ дают {fromMacros} ккал.{' '}
          {Math.abs(fromMacros - g.kcal) > 50 && (
            <button className="text-accent underline" onClick={() => setG({ ...g, kcal: fromMacros })}>
              Подставить в калории
            </button>
          )}
        </p>
        <Button variant="primary" className="w-full py-3" onClick={save}>
          Сохранить
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setG(DEFAULT_GOALS)}>
          По умолчанию (3000 / 130 / 80 / 440)
        </Button>
      </div>
    </Sheet>
  );
}
