import { useEffect, useState } from 'react';
import { db } from '../../db/db';
import { Button, Field, NumInput, Sheet, TextInput } from '../../components/ui';
import { uid } from '../../lib/date';
import type { Food } from '../../types';

type Draft = { name: string; brand: string; barcode: string; kcal: number | null; protein: number | null; fat: number | null; carbs: number | null };

const fromFood = (f?: Food, barcode?: string): Draft => ({
  name: f?.name ?? '',
  brand: f?.brand ?? '',
  barcode: f?.barcode ?? barcode ?? '',
  kcal: f?.kcal ?? null,
  protein: f?.protein ?? null,
  fat: f?.fat ?? null,
  carbs: f?.carbs ?? null,
});

export function CustomFoodSheet({
  open,
  food,
  barcode,
  onClose,
  onSaved,
}: {
  open: boolean;
  food?: Food;
  barcode?: string;
  onClose: () => void;
  onSaved: (f: Food) => void;
}) {
  const [d, setD] = useState<Draft>(fromFood(food, barcode));
  useEffect(() => {
    if (open) setD(fromFood(food, barcode));
  }, [open, food, barcode]);

  const autoKcal = Math.round((d.protein ?? 0) * 4 + (d.fat ?? 0) * 9 + (d.carbs ?? 0) * 4);

  const save = async () => {
    const f: Food = {
      ...(food ?? {}),
      id: food?.id ?? `c:${uid()}`,
      source: 'custom',
      category: 'Мои продукты',
      name: d.name.trim(),
      brand: d.brand.trim() || undefined,
      barcode: d.barcode.trim() || undefined,
      kcal: d.kcal ?? autoKcal,
      protein: d.protein ?? 0,
      fat: d.fat ?? 0,
      carbs: d.carbs ?? 0,
    };
    await db.foods.put(f);
    onSaved(f);
  };

  const remove = async () => {
    if (food && confirm(`Удалить «${food.name}»? Записи в дневнике останутся.`)) {
      await db.foods.delete(food.id);
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={food ? 'Редактировать продукт' : 'Свой продукт'}>
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Например, сырники мамины" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Бренд (необязательно)">
            <TextInput value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} />
          </Field>
          <Field label="Штрихкод">
            <TextInput inputMode="numeric" value={d.barcode} onChange={(e) => setD({ ...d, barcode: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
        <p className="text-xs text-fg/55">Пищевая ценность на 100 г (смотрите на упаковке):</p>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Ккал">
            <NumInput value={d.kcal} placeholder={String(autoKcal)} onChange={(v) => setD({ ...d, kcal: v })} />
          </Field>
          <Field label="Белки">
            <NumInput value={d.protein} placeholder="0" onChange={(v) => setD({ ...d, protein: v })} />
          </Field>
          <Field label="Жиры">
            <NumInput value={d.fat} placeholder="0" onChange={(v) => setD({ ...d, fat: v })} />
          </Field>
          <Field label="Углев.">
            <NumInput value={d.carbs} placeholder="0" onChange={(v) => setD({ ...d, carbs: v })} />
          </Field>
        </div>
        <p className="text-xs text-fg/45">Если не указать калории, они посчитаются из БЖУ (4/9/4).</p>
        <Button variant="primary" className="w-full py-3" disabled={!d.name.trim()} onClick={save}>
          Сохранить
        </Button>
        {food && (
          <Button variant="danger" className="w-full" onClick={remove}>
            Удалить продукт
          </Button>
        )}
      </div>
    </Sheet>
  );
}
