import type { Food } from '../../types';
import { fmt } from '../../lib/format';
import { toggleFavorite } from '../../lib/foods';

const badges: Partial<Record<Food['source'], string>> = {
  custom: 'мой',
  recipe: 'рецепт',
  off: 'OFF',
};

export function FoodRow({ food, onPick, onEdit }: { food: Food; onPick: (f: Food) => void; onEdit?: (f: Food) => void }) {
  return (
    <li className="flex items-center gap-2 py-2">
      <button className="min-w-0 flex-1 text-left" onClick={() => onPick(food)}>
        <div className="truncate text-sm">
          {food.name}
          {food.brand && <span className="text-zinc-500"> · {food.brand}</span>}
          {badges[food.source] && (
            <span className="ml-1.5 rounded bg-zinc-800 px-1.5 py-0.5 align-middle text-[10px] text-zinc-400">
              {badges[food.source]}
            </span>
          )}
        </div>
        <div className="text-xs tabular-nums text-zinc-500">
          {Math.round(food.kcal)} ккал · Б {fmt(food.protein)} · Ж {fmt(food.fat)} · У {fmt(food.carbs)} на 100 г
        </div>
      </button>
      {onEdit && (
        <button className="p-2 text-zinc-500" onClick={() => onEdit(food)} aria-label="Редактировать">
          ✎
        </button>
      )}
      <button
        className={`p-2 text-lg ${food.favorite ? 'text-amber-400' : 'text-zinc-600'}`}
        onClick={() => toggleFavorite(food)}
        aria-label={food.favorite ? 'Убрать из избранного' : 'В избранное'}
      >
        ★
      </button>
    </li>
  );
}
