import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useGoals } from '../../db/settings';
import { Button, Card, PageHeader, ProgressBar } from '../../components/ui';
import { addDays, formatDay, todayISO } from '../../lib/date';
import { fmt } from '../../lib/format';
import { MEALS, makeEntry, scale, sum } from '../../lib/nutrition';
import { touchFood } from '../../lib/foods';
import type { Food, MealEntry, MealType } from '../../types';
import { FoodPicker } from './FoodPicker';
import { AmountSheet } from './AmountSheet';
import { GoalsSheet } from './GoalsSheet';
import { NutritionHistory } from './NutritionHistory';

const EMPTY: MealEntry[] = [];

export function NutritionPage() {
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState<'day' | 'history'>('day');
  const [pickerMeal, setPickerMeal] = useState<MealType | null>(null);
  const [lastMeal, setLastMeal] = useState<MealType>('breakfast');
  const [picked, setPicked] = useState<Food | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const goals = useGoals();
  const entries = useLiveQuery(() => db.meals.where('date').equals(date).sortBy('createdAt'), [date], EMPTY);

  if (view === 'history')
    return (
      <NutritionHistory
        onBack={() => setView('day')}
        onOpenDay={(d) => {
          setDate(d);
          setView('day');
        }}
      />
    );

  const total = sum(entries);

  const add = async (grams: number, meal: MealType) => {
    if (!picked) return;
    await db.meals.add(makeEntry(picked, grams, date, meal));
    await touchFood(picked);
    setLastMeal(meal);
    setPicked(null);
  };

  const saveEdit = async (grams: number, meal: MealType) => {
    if (!editing?.id) return;
    await db.meals.update(editing.id, { grams, meal, ...scale(editing.per100, grams) });
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="Питание"
        right={
          <div className="flex gap-1">
            <Button variant="ghost" className="px-2.5" onClick={() => setView('history')}>
              История
            </Button>
            <Button variant="ghost" className="px-2.5" onClick={() => setGoalsOpen(true)}>
              Цели
            </Button>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-1 ring-1 ring-white/5">
          <button className="rounded-xl px-4 py-2 text-xl text-zinc-300 active:bg-zinc-800" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">
            ‹
          </button>
          <button className="flex-1 text-center font-semibold capitalize" onClick={() => setDate(todayISO())}>
            {formatDay(date)}
          </button>
          <button className="rounded-xl px-4 py-2 text-xl text-zinc-300 active:bg-zinc-800" onClick={() => setDate(addDays(date, 1))} aria-label="Следующий день">
            ›
          </button>
        </div>

        <Card className="space-y-3">
          <ProgressBar label="Калории" value={total.kcal} goal={goals.kcal} unit="ккал" color="var(--color-accent)" />
          <ProgressBar label="Белки" value={total.protein} goal={goals.protein} unit="г" color="var(--color-protein)" />
          <ProgressBar label="Жиры" value={total.fat} goal={goals.fat} unit="г" color="var(--color-fat)" />
          <ProgressBar label="Углеводы" value={total.carbs} goal={goals.carbs} unit="г" color="var(--color-carbs)" />
        </Card>

        {MEALS.map((meal) => {
          const items = entries.filter((e) => e.meal === meal.id);
          const t = sum(items);
          return (
            <Card key={meal.id} className="p-0">
              <div className="flex items-center gap-2 px-4 pb-2 pt-3">
                <span className="text-lg">{meal.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{meal.label}</div>
                  {items.length > 0 && (
                    <div className="text-xs tabular-nums text-zinc-500">
                      {Math.round(t.kcal)} ккал · Б {fmt(t.protein, 0)} · Ж {fmt(t.fat, 0)} · У {fmt(t.carbs, 0)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPickerMeal(meal.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xl text-accent active:bg-accent/30"
                  aria-label={`Добавить в ${meal.label}`}
                >
                  +
                </button>
              </div>
              {items.length > 0 && (
                <ul className="divide-y divide-white/5 border-t border-white/5">
                  {items.map((e) => (
                    <li key={e.id}>
                      <button className="flex w-full items-center gap-2 px-4 py-2 text-left active:bg-zinc-800/50" onClick={() => setEditing(e)}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{e.name}</div>
                          <div className="text-xs tabular-nums text-zinc-500">
                            {Math.round(e.grams)} г · Б {fmt(e.protein)} · Ж {fmt(e.fat)} · У {fmt(e.carbs)}
                          </div>
                        </div>
                        <span className="text-sm tabular-nums text-zinc-300">{Math.round(e.kcal)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <FoodPicker
        open={pickerMeal !== null}
        onClose={() => setPickerMeal(null)}
        onPick={(f) => setPicked(f)}
      />
      <AmountSheet
        open={!!picked}
        title={picked?.name ?? ''}
        per100={picked ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }}
        initialMeal={pickerMeal ?? lastMeal}
        onClose={() => setPicked(null)}
        onSubmit={async (g, m) => {
          await add(g, m);
          setPickerMeal(null);
        }}
      />
      <AmountSheet
        open={!!editing}
        title={editing?.name ?? ''}
        per100={editing?.per100 ?? { kcal: 0, protein: 0, fat: 0, carbs: 0 }}
        initialGrams={editing?.grams ?? 100}
        initialMeal={editing?.meal ?? 'breakfast'}
        submitLabel="Сохранить"
        onClose={() => setEditing(null)}
        onSubmit={saveEdit}
        onDelete={async () => {
          if (editing?.id) await db.meals.delete(editing.id);
          setEditing(null);
        }}
      />
      <GoalsSheet open={goalsOpen} goals={goals} onClose={() => setGoalsOpen(false)} />
    </div>
  );
}
