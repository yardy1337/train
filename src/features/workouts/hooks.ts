import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { ProgramDay, Workout } from '../../types';

const EMPTY_DAYS: ProgramDay[] = [];
const EMPTY_WORKOUTS: Workout[] = [];

export const useProgram = () => useLiveQuery(() => db.programDays.orderBy('order').toArray(), [], EMPTY_DAYS);

/** Завершённые тренировки, новые сверху. */
export const useHistory = () =>
  useLiveQuery(
    async () => (await db.workouts.where('status').equals('done').toArray()).sort((a, b) => b.startedAt - a.startedAt),
    [],
    EMPTY_WORKOUTS,
  );

/** undefined — загрузка, null — активной тренировки нет. */
export const useActiveWorkout = () =>
  useLiveQuery(async () => (await db.workouts.where('status').equals('active').first()) ?? null, []);
