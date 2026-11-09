import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { Button, Field, NumInput, Sheet, TextInput } from '../../components/ui';
import { uid } from '../../lib/date';
import { fmt } from '../../lib/format';
import { per100Of, recipePer100, scale, sum } from '../../lib/nutrition';
import type { Food, RecipeIngredient } from '../../types';
import { FoodPicker } from './FoodPicker';

/** Рецепт = сумма продуктов. КБЖУ пересчитывается на 100 г готового блюда. */
export function RecipeSheet({ open, food, onClose }: { open: boolean; food?: Food; onClose: () => void }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [totalWeight, setTotalWeight] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(food?.name ?? '');
    setItems(food?.ingredients ?? []);
    setTotalWeight(food?.totalWeight ?? null);
  }, [open, food]);

  const rawWeight = items.reduce((s, i) => s + i.grams, 0);
  const total = sum(items.map((i) => scale(i, i.grams)));
  const per100 = recipePer100(items, totalWeight ?? undefined);

  const save = async () => {
    const f: Food = {
      ...(food ?? {}),
      id: food?.id ?? `r:${uid()}`,
      source: 'recipe',
      category: 'Рецепты',
      name: name.trim(),
      ingredients: items,
      totalWeight: totalWeight ?? undefined,
      ...per100,
    };
    await db.foods.put(f);
    onClose();
  };

  const remove = async () => {
    if (food && confirm(`Удалить рецепт «${food.name}»?`)) {
      await db.foods.delete(food.id);
      onClose();
    }
  };

  return (
    <>
      <Sheet open={open && !picker} onClose={onClose} title={food ? 'Рецепт' : 'Новый рецепт'} full>
        <div className="space-y-3">
          <Field label="Название блюда">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, овсянка с бананом" />
          </Field>

          <div className="text-sm font-medium">Ингредиенты</div>
          <ul className="divide-y divide-fg/[.06] rounded-xl bg-fg/[.05] px-3">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{it.name}</div>
                  <div className="text-xs text-fg/45">{Math.round(scale(it, it.grams).kcal)} ккал</div>
                </div>
                <div className="w-20">
                  <NumInput
                    value={it.grams}
                    ariaLabel="Граммы"
                    onChange={(v) => setItems(items.map((x, j) => (j === idx ? { ...x, grams: v ?? 0 } : x)))}
                  />
                </div>
                <span className="text-xs text-fg/45">г</span>
                <button className="grid h-8 w-8 place-items-center rounded-full text-red-400 active:bg-red-500/15" onClick={() => setItems(items.filter((_, j) => j !== idx))} aria-label="Убрать">
                  <X size={16} strokeWidth={2.4} />
                </button>
              </li>
            ))}
            {!items.length && <li className="py-3 text-center text-sm text-fg/45">Добавьте продукты</li>}
          </ul>
          <Button className="w-full" onClick={() => setPicker(true)}>
            + Добавить ингредиент
          </Button>

          <Field label={`Вес готового блюда, г (сырой вес ${Math.round(rawWeight)} г — укажите, если блюдо уварилось/разбухло)`}>
            <NumInput value={totalWeight} placeholder={String(Math.round(rawWeight))} onChange={setTotalWeight} />
          </Field>

          <div className="rounded-xl bg-fg/[.04] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-fg/55">Всё блюдо</span>
              <span className="tabular-nums">
                {Math.round(total.kcal)} ккал · Б {fmt(total.protein)} · Ж {fmt(total.fat)} · У {fmt(total.carbs)}
              </span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>На 100 г</span>
              <span className="tabular-nums text-accent">
                {Math.round(per100.kcal)} ккал · Б {fmt(per100.protein)} · Ж {fmt(per100.fat)} · У {fmt(per100.carbs)}
              </span>
            </div>
          </div>

          <Button variant="primary" className="w-full py-3" disabled={!name.trim() || !items.length} onClick={save}>
            Сохранить рецепт
          </Button>
          {food && (
            <Button variant="danger" className="w-full" onClick={remove}>
              Удалить рецепт
            </Button>
          )}
        </div>
      </Sheet>
      {picker && (
        <FoodPicker
          open
          allowRecipes={false}
          title="Ингредиент"
          onClose={() => setPicker(false)}
          onPick={(f) => {
            setItems([...items, { foodId: f.id, name: f.name, grams: 100, ...per100Of(f) }]);
            setPicker(false);
          }}
        />
      )}
    </>
  );
}
