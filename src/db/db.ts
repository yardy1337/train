import Dexie, { type Table } from 'dexie';
import type { Food, MealEntry, ProgramDay, Setting, WeightEntry, Workout } from '../types';

export class TrainerDB extends Dexie {
  programDays!: Table<ProgramDay, string>;
  workouts!: Table<Workout, number>;
  foods!: Table<Food, string>;
  meals!: Table<MealEntry, number>;
  weights!: Table<WeightEntry, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('my-trainer');
    this.version(1).stores({
      programDays: 'id, order',
      workouts: '++id, status, startedAt, date, dayId',
      foods: 'id, name, barcode, source, favorite, lastUsed',
      meals: '++id, date, foodId, createdAt',
      weights: '++id, &date',
      settings: 'key',
    });
  }
}

export const db = new TrainerDB();

export const ALL_TABLES = ['programDays', 'workouts', 'foods', 'meals', 'weights', 'settings'] as const;
export type TableName = (typeof ALL_TABLES)[number];
