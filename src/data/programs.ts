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

const HEAVY = 120; // тяжёлая база
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
    name: 'Верх / Низ (гантели)',
    tagline: 'Гантели · набор массы · 4 тренировки в неделю',
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
    name: 'Full Body (зал)',
    tagline: 'Тренажёрный зал · всё тело · 3 раза в неделю',
    description:
      'Каждая тренировка — всё тело: присед или жим ногами, горизонтальный жим, вертикальная и горизонтальная тяга, задняя поверхность бедра, плечи, руки и кор. Три дня с разным акцентом: A — силовой со штангой, B — объём в тренажёрах, C — смешанный. Тяжёлую базу делайте в начале, отдых 2 минуты; изоляцию — с отдыхом 60 секунд. Прогрессия: добрали верх диапазона во всех подходах — прибавьте 2,5 кг (на ноги — 5 кг). Между тренировками — день отдыха, например пн/ср/пт.',
    level: 'Средний',
    daysPerWeek: 3,
    goal: 'Сила и масса',
    equipment: 'Штанга, тренажёры, блоки, турник',
    days: () => [
      day('fb', 'A', 0, 'Сила · штанга', [
        ['Приседания со штангой', 4, 5, 8, HEAVY],
        ['Жим штанги лёжа', 4, 5, 8, HEAVY],
        ['Тяга верхнего блока к груди', 3, 8, 10, BASE],
        ['Румынская тяга со штангой', 3, 8, 10, BASE],
        ['Махи гантелями в стороны', 3, 12, 15, ISO],
        ['Разгибания на блоке с канатом', 3, 10, 12, ISO],
        ['Скручивания на блоке (молитва)', 3, 10, 15, ISO],
      ]),
      day('fb', 'B', 1, 'Объём · тренажёры', [
        ['Жим ногами', 4, 10, 12, BASE],
        ['Жим гантелей на наклонной скамье', 3, 8, 12, BASE],
        ['Тяга горизонтального блока', 3, 10, 12, BASE],
        ['Жим в тренажёре на плечи', 3, 10, 12, BASE],
        ['Сгибания ног лёжа', 3, 10, 15, ISO],
        ['Подъём EZ-штанги на бицепс', 3, 10, 12, ISO],
        ['Подъёмы на носки стоя', 3, 12, 15, ISO],
      ]),
      day('fb', 'C', 2, 'Смешанный', [
        ['Гакк-приседания', 3, 8, 12, BASE],
        ['Жим в тренажёре сидя (Хаммер)', 3, 8, 12, BASE],
        ['Подтягивания', 3, 6, 10, BASE, 'или в гравитроне'],
        ['Хип-траст в тренажёре', 3, 8, 12, BASE],
        ['Обратная бабочка (задняя дельта)', 3, 12, 15, ISO],
        ['Разгибания ног в тренажёре', 3, 12, 15, ISO],
        ['Подъём ног в висе', 3, 10, 15, ISO],
      ]),
    ],
  },
];

export const DEFAULT_PROGRAM_ID = 'upper-lower';

/** Ключ настройки с id выбранной программы. */
export const ACTIVE_PROGRAM_KEY = 'activeProgram';

export const findProgram = (id: string) => PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];
