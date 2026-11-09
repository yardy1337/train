import type { ProgramDay, ProgramExercise } from '../types';
import { createDefaultProgram } from './defaultProgram';

/**
 * Каталог готовых программ. Чтобы добавить программу — допишите объект в PROGRAMS:
 * она сразу появится плашкой на главном экране «Тренировки».
 */
export interface CatalogProgram {
  id: string;
  name: string;
  /** Короткая подпись на плашке. */
  tagline: string;
  description: string;
  level: 'Новичок' | 'Средний' | 'Продвинутый';
  daysPerWeek: number;
  goal: string;
  equipment: string;
  /** Дни программы. id дней должны быть уникальны в пределах каталога. */
  days: () => ProgramDay[];
}

const BASE = 90;
const ISO = 60;

type Ex = [name: string, sets: number, repsMin: number, repsMax: number, rest: number, note?: string];

function day(prefix: string, letter: string, order: number, title: string, list: Ex[]): ProgramDay {
  const id = `${prefix}-${letter}`;
  const exercises: ProgramExercise[] = list.map(([name, sets, repsMin, repsMax, rest, note], i) => ({
    id: `${id}-${i + 1}`,
    name,
    sets,
    repsMin,
    repsMax,
    rest,
    ...(note ? { note } : {}),
  }));
  return { id, order, name: `День ${letter}`, title, exercises };
}

export const PROGRAMS: CatalogProgram[] = [
  {
    id: 'upper-lower',
    name: 'Верх / Низ',
    tagline: 'Набор массы · 4 тренировки в неделю',
    description:
      'Сплит «верх — низ»: два дня на верх тела (сила и объём) и два на ноги с прессом. Каждая мышца получает нагрузку дважды в неделю. Прогрессия по двойному диапазону: добрали верх повторов во всех подходах — добавляйте вес.',
    level: 'Средний',
    daysPerWeek: 4,
    goal: 'Масса',
    equipment: 'Гантели, турник, блок',
    days: createDefaultProgram,
  },
  {
    id: 'full-body',
    name: 'Full Body',
    tagline: 'Всё тело за тренировку · 3 раза в неделю',
    description:
      'Каждая тренировка прорабатывает всё тело: ноги, жим, тяга, плечи и кор. Подходит для старта и для тех, кто может заниматься только три раза в неделю. Между тренировками — минимум день отдыха.',
    level: 'Новичок',
    daysPerWeek: 3,
    goal: 'Сила и форма',
    equipment: 'Гантели, турник, блок',
    days: () => [
      day('fb', 'A', 0, 'Всё тело A', [
        ['Гоблет-присед', 3, 8, 12, BASE],
        ['Жим гантелей лёжа', 3, 8, 10, BASE],
        ['Тяга гантели в наклоне', 3, 8, 12, BASE, 'на каждую руку'],
        ['Жим гантелей сидя', 3, 8, 12, BASE],
        ['Румынская тяга с гантелями', 3, 10, 12, BASE],
        ['Планка', 3, 0, 0, ISO, '40–60 сек'],
      ]),
      day('fb', 'B', 1, 'Всё тело B', [
        ['Выпады с гантелями', 3, 10, 12, BASE, 'на каждую ногу'],
        ['Подтягивания', 3, 6, 10, BASE, 'или в гравитроне'],
        ['Отжимания на брусьях', 3, 8, 12, BASE],
        ['Махи гантелями в стороны', 3, 12, 15, ISO],
        ['Сгибания на бицепс с гантелями', 2, 10, 12, ISO],
        ['Скручивания', 3, 12, 15, ISO],
      ]),
      day('fb', 'C', 2, 'Всё тело C', [
        ['Жим ногами', 3, 10, 12, BASE],
        ['Жим гантелей на наклонной скамье', 3, 8, 12, BASE],
        ['Тяга горизонтального блока', 3, 10, 12, BASE],
        ['Ягодичный мост с гантелью', 3, 10, 12, BASE],
        ['Разгибания на блоке с канатом', 2, 10, 12, ISO],
        ['Подъём ног в висе', 3, 10, 15, ISO],
      ]),
    ],
  },
];

export const DEFAULT_PROGRAM_ID = 'upper-lower';

/** Ключ настройки с id выбранной программы. */
export const ACTIVE_PROGRAM_KEY = 'activeProgram';

export const findProgram = (id: string) => PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];
