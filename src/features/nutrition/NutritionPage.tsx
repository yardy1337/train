import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { scrollToTop } from '../../lib/smoothScroll';
import { AnimatePresence, motion } from 'motion/react';
import { AnimatedNumber, EASE, Screen } from '../../components/motion';
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
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
      {view === 'history' ? (
        <NutritionHistory
          key="history"
          onBack={() => setView('day')}
          onOpenDay={(d) => {
            setDate(d);
            setView('day');
          }}
        />
      ) : (
      <Screen key="day">
      <PageHeader
        title="Питание"
        right={
          <div className="flex gap-1">
            <IconButton label="История" onClick={() => setView('history')} className="bg-surface text-fg shadow-card">
              <History size={18} />
            </IconButton>
            <IconButton label="Цели" onClick={() => setGoalsOpen(true)} className="bg-surface text-fg shadow-card">
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
          <div className="flex items-end justify-between">
            <div>
              <div className="eyebrow">Съедено за день</div>
              <div className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
                <AnimatedNumber value={total.kcal} />
                <span className="ml-1.5 text-base font-bold text-fg/40">/ {Math.round(goals.kcal)} ккал</span>
              </div>
            </div>
            <div className="text-right text-xs font-bold tabular-nums text-fg/40">
              {total.kcal > goals.kcal ? (
                <span className="text-amber-400">перебор {Math.round(total.kcal - goals.kcal)}</span>
              ) : (
                <>осталось {Math.round(goals.kcal - total.kcal)}</>
              )}
            </div>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-fg/[.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-strong transition-[width] duration-500"
              style={{ width: `${Math.min(100, goals.kcal > 0 ? (total.kcal / goals.kcal) * 100 : 0)}%` }}
            />
          </div>
          <div className="grid gap-3 border-t border-fg/[.06] pt-4">
          <ProgressBar label="Белки" value={total.protein} goal={goals.protein} unit="г" color="var(--color-protein)" />
          <ProgressBar label="Жиры" value={total.fat} goal={goals.fat} unit="г" color="var(--color-fat)" />
          <ProgressBar label="Углеводы" value={total.carbs} goal={goals.carbs} unit="г" color="var(--color-carbs)" />
          </div>
        </Card>

        {MEALS.map((meal, mi) => {
          const items = entries.filter((e) => e.meal === meal.id);
          const t = sum(items);
          const Icon = MEAL_ICONS[meal.id];
          return (
            <Card key={meal.id} index={mi + 2} className="overflow-hidden p-0">
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
                  className="grid h-9 w-9 place-items-center rounded-full bg-accent text-bg shadow-lift transition-transform active:scale-90"
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
      )}
      </AnimatePresence>

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
    </motion.div>
  );
}
