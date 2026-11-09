import { Pencil, Star } from 'lucide-react';
import type { Food } from '../../types';
import { fmt } from '../../lib/format';
import { toggleFavorite } from '../../lib/foods';

const badges: Partial<Record<Food['source'], string>> = {
  custom: 'мой',
  recipe: 'рецепт',
  shared: 'от пользователей',
};

export function FoodRow({ food, onPick, onEdit }: { food: Food; onPick: (f: Food) => void; onEdit?: (f: Food) => void }) {
  return (
    <li className="flex items-center gap-2 py-2">
      <button className="min-w-0 flex-1 text-left" onClick={() => onPick(food)}>
        <div className="truncate text-sm font-semibold">
          {food.name}
          {food.brand && <span className="font-medium text-fg/45"> · {food.brand}</span>}
          {badges[food.source] && (
            <span className="ml-1.5 rounded-md bg-accent-soft px-1.5 py-0.5 align-middle text-[10px] font-bold text-accent-strong">
              {badges[food.source]}
            </span>
          )}
        </div>
        <div className="text-xs tabular-nums text-fg/45">
          {Math.round(food.kcal)} ккал · Б {fmt(food.protein)} · Ж {fmt(food.fat)} · У {fmt(food.carbs)} на 100 г
        </div>
      </button>
      {onEdit && (
        <button className="grid h-9 w-9 place-items-center rounded-full text-fg/40 active:bg-fg/[.06]" onClick={() => onEdit(food)} aria-label="Редактировать">
          <Pencil size={16} />
        </button>
      )}
      <button
        className={`grid h-9 w-9 place-items-center rounded-full active:bg-fg/[.06] ${food.favorite ? 'text-amber-500' : 'text-fg/25'}`}
        onClick={() => toggleFavorite(food)}
        aria-label={food.favorite ? 'Убрать из избранного' : 'В избранное'}
      >
        <Star size={18} fill={food.favorite ? 'currentColor' : 'none'} />
      </button>
    </li>
  );
}
