import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StackView } from '../../components/StackView';
import { useBackEntry } from '../../lib/backNav';
import { AnimatePresence, motion } from 'motion/react';
import { EASE, Screen } from '../../components/motion';
import { CalorieRing } from '../../components/CalorieRing';
import { WaterCard } from './WaterCard';
import { MealPlanCard } from './MealPlan';
import { ChevronLeft, ChevronRight, History, Plus, Target } from 'lucide-react';
import { MEAL_ICONS } from '../../components/mealIcons';
import { db } from '../../db/db';
import { useGoals } from '../../db/settings';
import { Card, IconButton, PageHeader, ProgressBar } from '../../components/ui';
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
  useBackEntry(view === 'history', () => setView('day'));
  const [pickerMeal, setPickerMeal] = useState<MealType | null>(null);
  const [lastMeal, setLastMeal] = useState<MealType>('breakfast');
  const [picked, setPicked] = useState<Food | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const goals = useGoals();
  const entries = useLiveQuery(() => db.meals.where('date').equals(date).sortBy('createdAt'), [date], EMPTY);

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
    <motion.div exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}>
      <StackView
        onSwipeBack={() => window.history.back()}
        layers={
          view === 'history'
            ? [
                {
                  key: 'history',
                  node: (
                    <NutritionHistory
                      onBack={() => setView('day')}
                      onOpenDay={(d) => {
                        setDate(d);
                        setView('day');
                      }}
                    />
                  ),
                },
              ]
            : []
        }
        base={
      <Screen>
      <PageHeader
        title="Питание"
        right={
          <div className="flex gap-1">
            <IconButton label="История" onClick={() => setView('history')} className="bg-white/10 text-white active:bg-white/20">
              <History size={18} />
            </IconButton>
            <IconButton label="Цели" onClick={() => setGoalsOpen(true)} className="bg-white/10 text-white active:bg-white/20">
              <Target size={18} />
            </IconButton>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-center justify-between rounded-2xl border border-fg/[.06] bg-surface p-1.5 shadow-card">
          <IconButton label="Предыдущий день" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft size={20} strokeWidth={2.4} />
          </IconButton>
          <button className="relative h-9 flex-1 overflow-hidden text-center font-bold capitalize" onClick={() => setDate(todayISO())}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={date}
                className="absolute inset-0 grid place-items-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                {formatDay(date)}
              </motion.span>
            </AnimatePresence>
          </button>
          <IconButton label="Следующий день" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight size={20} strokeWidth={2.4} />
          </IconButton>
        </div>

        <Card index={1} className="space-y-4">
          <div className="flex items-center gap-5">
            <CalorieRing value={total.kcal} goal={goals.kcal} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="eyebrow">{total.kcal > goals.kcal ? 'Перебор' : 'Осталось'}</div>
                <div className={`text-2xl font-extrabold tabular-nums tracking-tight ${total.kcal > goals.kcal ? 'text-amber-600' : ''}`}>
                  {Math.round(Math.abs(goals.kcal - total.kcal))} <span className="text-sm font-bold text-fg/40">ккал</span>
                </div>
              </div>
              <div>
                <div className="eyebrow">Цель</div>
                <div className="text-lg font-extrabold tabular-nums">
                  {Math.round(goals.kcal)} <span className="text-sm font-bold text-fg/40">ккал</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-fg/[.06] pt-4">
          <ProgressBar label="Белки" value={total.protein} goal={goals.protein} unit="г" color="var(--color-protein)" />
          <ProgressBar label="Жиры" value={total.fat} goal={goals.fat} unit="г" color="var(--color-fat)" />
          <ProgressBar label="Углеводы" value={total.carbs} goal={goals.carbs} unit="г" color="var(--color-carbs)" />
          </div>
        </Card>

        <WaterCard date={date} index={2} />
        <MealPlanCard date={date} index={2} />

        {MEALS.map((meal, mi) => {
          const items = entries.filter((e) => e.meal === meal.id);
          const t = sum(items);
          const Icon = MEAL_ICONS[meal.id];
          return (
            <Card key={meal.id} index={mi + 3} className="overflow-hidden p-0">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <div className="flex-1">
                  <div className="font-bold">{meal.label}</div>
                  {items.length > 0 && (
                    <div className="text-xs tabular-nums text-fg/45">
                      {Math.round(t.kcal)} ккал · Б {fmt(t.protein, 0)} · Ж {fmt(t.fat, 0)} · У {fmt(t.carbs, 0)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPickerMeal(meal.id)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white shadow-lift transition-transform active:scale-90"
                  aria-label={`Добавить в ${meal.label}`}
                >
                  <Plus size={20} strokeWidth={2.6} />
                </button>
              </div>
              <ul className={items.length ? 'border-t border-fg/[.06]' : ''}>
                <AnimatePresence initial={false}>
                  {items.map((e) => (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden border-fg/[.06] [&:not(:first-child)]:border-t"
                    >
                      <button className="flex w-full items-center gap-2 px-4 py-2 text-left active:bg-fg/[.04]" onClick={() => setEditing(e)}>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{e.name}</div>
                          <div className="text-xs tabular-nums text-fg/45">
                            {Math.round(e.grams)} г · Б {fmt(e.protein)} · Ж {fmt(e.fat)} · У {fmt(e.carbs)}
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{Math.round(e.kcal)}</span>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </Card>
          );
        })}
      </div>
      </Screen>
        }
      />

      <FoodPicker
        open={pickerMeal !== null}
        onClose={() => setPickerMeal(null)}
        onPick={(f) => setPicked(f)}
        meal={pickerMeal ?? lastMeal}
        onPhotoAdd={async (items, m) => {
          // Блюда с фото пишем прямо в дневник: КБЖУ на 100 г уже посчитаны нейросетью.
          await db.meals.bulkAdd(
            items.map((it, i) => ({
              ...makeEntry({ id: `photo:${it.name}`, name: it.name, source: 'custom', kcal: it.kcal, protein: it.protein, fat: it.fat, carbs: it.carbs }, it.grams, date, m),
              createdAt: Date.now() + i,
            })),
          );
          setLastMeal(m);
          setPickerMeal(null);
        }}
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
    </motion.div>
  );
}
