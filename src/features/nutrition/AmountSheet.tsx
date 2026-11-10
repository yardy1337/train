import { useEffect, useState } from 'react';
import { Button, NumInput, Sheet } from '../../components/ui';
import { fmt } from '../../lib/format';
import { MEALS, scale } from '../../lib/nutrition';
import type { Macros, MealType } from '../../types';

const QUICK = [50, 100, 150, 200, 250, 300];

/** Ввод граммов с живым пересчётом КБЖУ. Используется и для добавления, и для правки записи. */
export function AmountSheet({
  open,
  title,
  per100,
  initialGrams = 100,
  initialMeal,
  onClose,
  onSubmit,
  onDelete,
  submitLabel = 'Добавить',
}: {
  open: boolean;
  title: string;
  per100: Macros;
  initialGrams?: number;
  initialMeal: MealType;
  onClose: () => void;
  onSubmit: (grams: number, meal: MealType) => void;
  onDelete?: () => void;
  submitLabel?: string;
}) {
  const [grams, setGrams] = useState<number | null>(initialGrams);
  const [meal, setMeal] = useState<MealType>(initialMeal);
  useEffect(() => {
    if (open) {
      setGrams(initialGrams);
      setMeal(initialMeal);
    }
  }, [open, initialGrams, initialMeal]);

  const m = scale(per100, grams ?? 0);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <NumInput value={grams} onChange={setGrams} className="py-3 text-2xl font-bold" ariaLabel="Граммы" />
          <span className="text-lg text-fg/55">г</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((g) => (
            <button
              key={g}
              onClick={() => setGrams(g)}
              className={`rounded-lg px-3 py-1.5 text-sm ${grams === g ? 'bg-accent text-white font-bold' : 'bg-fg/[.05] text-fg/75'}`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: 'Ккал', v: Math.round(m.kcal), c: 'text-fg' },
            { l: 'Белки', v: fmt(m.protein), c: 'text-protein' },
            { l: 'Жиры', v: fmt(m.fat), c: 'text-fat' },
            { l: 'Углев.', v: fmt(m.carbs), c: 'text-carbs' },
          ].map((x) => (
            <div key={x.l} className="rounded-xl bg-fg/[.04] py-2">
              <div className={`text-lg font-extrabold tabular-nums ${x.c}`}>{x.v}</div>
              <div className="text-[11px] font-semibold text-fg/45">{x.l}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-fg/45">
          На 100 г: {Math.round(per100.kcal)} ккал · Б {fmt(per100.protein)} · Ж {fmt(per100.fat)} · У {fmt(per100.carbs)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MEALS.map((x) => (
            <button
              key={x.id}
              onClick={() => setMeal(x.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${meal === x.id ? 'bg-fg text-bg font-bold' : 'bg-fg/[.05] text-fg/55'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <Button variant="primary" className="w-full py-3" disabled={!grams} onClick={() => grams && onSubmit(grams, meal)}>
          {submitLabel}
        </Button>
        {onDelete && (
          <Button variant="danger" className="w-full" onClick={onDelete}>
            Удалить запись
          </Button>
        )}
      </div>
    </Sheet>
  );
}
