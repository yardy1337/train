// ===== Тренировки =====
export interface ProgramExercise {
  id: string;
  name: string;
  sets: number;
  /** Нижняя граница повторов (0 — не задана, например «почти до отказа»). */
  repsMin: number;
  /** Верхняя граница повторов (0 — не задана). */
  repsMax: number;
  /** Пояснение: «на ногу», «пауза 2 сек», «почти до отказа». */
  note?: string;
  /** Отдых между подходами, сек: 90 для базовых, 60 для изоляции. */
  rest: number;
  /** Суперсет: выполняется подряд со следующим упражнением, отдых — только после следующего. */
  supersetNext?: boolean;
}

export interface ProgramDay {
  id: string;
  order: number;
  name: string; // «День A»
  title: string; // «Верх, сила»
  exercises: ProgramExercise[];
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  plannedSets: number;
  repsMin: number;
  repsMax: number;
  note?: string;
  rest: number;
  sets: SetEntry[];
  supersetNext?: boolean;
}

export interface Workout {
  id?: number;
  status: 'active' | 'done';
  dayId: string;
  dayName: string;
  dayTitle: string;
  date: string; // YYYY-MM-DD
  startedAt: number;
  finishedAt?: number;
  /** Тренировка недели разгрузки (вдвое меньше подходов). */
  deload?: boolean;
  exercises: WorkoutExercise[];
}

// ===== Питание =====
export type FoodSource = 'builtin' | 'custom' | 'off' | 'recipe' | 'shared';

export interface Macros {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface RecipeIngredient extends Macros {
  foodId: string;
  name: string;
  grams: number; // Macros у ингредиента — на 100 г продукта
}

/** Продукт: КБЖУ на 100 г. */
export interface Food extends Macros {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  source: FoodSource;
  barcode?: string;
  favorite?: 0 | 1;
  lastUsed?: number;
  ingredients?: RecipeIngredient[];
  /** Вес готового блюда (г), если отличается от суммы ингредиентов. */
  totalWeight?: number;
  /** Встроенный продукт изменён в режиме редактора — не перезаписывать при обновлении базы. */
  edited?: 1;
  /** Удалён в режиме редактора (встроенные не удаляем совсем, а прячем). */
  hidden?: 1;
}

export type MealType = 'breakfast' | 'snack' | 'lunch' | 'postworkout' | 'dinner';

/** Запись в дневнике: КБЖУ уже посчитаны на указанные граммы. */
export interface MealEntry extends Macros {
  id?: number;
  date: string;
  meal: MealType;
  foodId: string;
  name: string;
  grams: number;
  /** КБЖУ продукта на 100 г — чтобы пересчитывать при смене граммов. */
  per100: Macros;
  createdAt: number;
}

export type Goals = Macros;

// ===== Прогресс =====
export interface WeightEntry {
  id?: number;
  date: string;
  weight: number;
}

/** Замеры тела, см, и фото (сжатое JPEG, data URL). */
export interface Measurement {
  id?: number;
  date: string;
  chest?: number;
  waist?: number;
  arm?: number;
  hips?: number;
  thigh?: number;
  photo?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}
