import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Goals } from '../types';

export const DEFAULT_GOALS: Goals = { kcal: 3000, protein: 130, fat: 80, carbs: 440 };

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export function setSetting<T>(key: string, value: T) {
  return db.settings.put({ key, value });
}

/** Реактивное чтение настройки. Пока идёт загрузка — возвращает fallback. */
export function useSetting<T>(key: string, fallback: T): T {
  return useLiveQuery(() => getSetting(key, fallback), [key], fallback) as T;
}

export const useGoals = () => useSetting<Goals>('goals', DEFAULT_GOALS);
