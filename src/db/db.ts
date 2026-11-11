import Dexie, { type Table } from 'dexie';
import type { Food, MealEntry, Measurement, ProgramDay, Setting, WeightEntry, Workout } from '../types';

export class TrainerDB extends Dexie {
  programDays!: Table<ProgramDay, string>;
  workouts!: Table<Workout, number>;
  foods!: Table<Food, string>;
  meals!: Table<MealEntry, number>;
  weights!: Table<WeightEntry, number>;
  settings!: Table<Setting, string>;
  measurements!: Table<Measurement, number>;

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
    this.version(2).stores({ measurements: '++id, &date' });
  }
}

export const db = new TrainerDB();

export const ALL_TABLES = ['programDays', 'workouts', 'foods', 'meals', 'weights', 'settings', 'measurements'] as const;
export type TableName = (typeof ALL_TABLES)[number];
