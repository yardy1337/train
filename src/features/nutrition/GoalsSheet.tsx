import { useEffect, useState } from 'react';
import { setSetting, DEFAULT_GOALS } from '../../db/settings';
import { Button, Field, NumInput, Sheet } from '../../components/ui';
import type { Goals } from '../../types';

export function GoalsSheet({ open, goals, onClose }: { open: boolean; goals: Goals; onClose: () => void }) {
  const [g, setG] = useState(goals);
  useEffect(() => {
    if (open) setG(goals);
  }, [open, goals]);

  const fromMacros = Math.round(g.protein * 4 + g.fat * 9 + g.carbs * 4);

  const save = async () => {
    await setSetting('goals', g);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Цели на день">
      <div className="space-y-3">
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
