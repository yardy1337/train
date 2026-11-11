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
  /** Значок и цвет (своя программа, программа администратора или правка). */
  look?: { icon: string; color: string };
  /** Программа, созданная самим пользователем на телефоне. */
  userMade?: boolean;
}

const HEAVY = 120; // тяжёлая база
const BASE = 90;
const ISO = 60;
const PLYO = 75; // плиометрика и баллистика

type Ex = [name: string, sets: number, repsMin: number, repsMax: number, rest: number, note?: string];

function day(prefix: string, letter: string, order: number, title: string, list: Ex[], name = `День ${letter}`): ProgramDay {
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
  return { id, order, name, title, exercises };
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
    id: 'upper-lower-3',
    name: 'Верх / Низ (3 дня)',
    tagline: 'Гантели · набор массы · 3 тренировки в неделю',
    description:
      'Те же упражнения, что в «Верх / Низ», но на три дня: верх (сила), низ с прессом, верх (объём).',
    level: 'Средний',
    daysPerWeek: 3,
    goal: 'Масса',
    equipment: 'Гантели, турник, блок',
    // Дни A, B, C обычной «Верх / Низ» со своими id (по id дня тренировка относится к программе).
    days: () =>
      createDefaultProgram()
        .slice(0, 3)
        .map((d, i) => ({
          ...d,
          id: `ul3-${d.id}`,
          order: i,
          exercises: d.exercises.map((e) => ({ ...e, id: `ul3-${e.id}` })),
        })),
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
  {
    id: 'split-isma',
    name: 'Сплит',
    tagline: 'Грудь+руки · спина+плечи · ноги · 3 раза в неделю',
    description:
      'Классический сплит на три дня: понедельник — грудь и руки, среда — спина и плечи, пятница — ноги. Много работы в тренажёрах и блоках, высокий объём и «пирамиды» по повторам. Где в подходах разное число повторов, схема указана в пояснении к упражнению (например, 15/10/10/8).',
    level: 'Средний',
    daysPerWeek: 3,
    goal: 'Масса',
    equipment: 'Зал: Смит, тренажёры, блоки, гантели',
    days: () => [
      day('isma', 'A', 0, 'Грудь + руки', [
        ['Жим в Смите лёжа', 4, 10, 10, BASE],
        ['Бабочка (пек-дек)', 3, 20, 20, ISO],
        ['Жим гантелей лёжа', 4, 8, 8, BASE],
        ['Разводка гантелей лёжа', 3, 10, 10, ISO],
        ['Сгибания на нижнем блоке', 3, 12, 12, ISO],
        ['Сгибания на бицепс с гантелями сидя', 4, 10, 10, ISO],
        ['Разгибания на блоке с прямой рукоятью', 3, 12, 12, ISO],
        ['Французский жим на блоке', 3, 15, 15, ISO],
        ['Разгибания одной рукой на блоке', 3, 20, 20, ISO, 'канатом'],
      ], 'Понедельник'),
      day('isma', 'B', 1, 'Спина + плечи', [
        ['Подтягивания', 4, 12, 12, BASE],
        ['Тяга гантелей в наклоне на скамье (грудью на скамье)', 4, 8, 15, BASE, '15/10/10/8, со 2-го подхода — с задержкой'],
        ['Тяга верхнего блока к груди', 3, 12, 12, BASE],
        ['Пуловер', 3, 15, 15, ISO],
        ['Тяга нижнего блока одной рукой', 3, 12, 12, ISO],
        ['Жим из-за головы в Смите', 3, 10, 10, BASE],
        ['Махи гантелями в стороны', 3, 15, 15, ISO],
        ['Подъём гантелей перед собой', 4, 10, 10, ISO, 'с задержкой'],
        ['Обратная бабочка (задняя дельта)', 3, 10, 10, ISO],
      ], 'Среда'),
      day('isma', 'C', 2, 'Ноги', [
        ['Разгибания ног в тренажёре', 4, 15, 15, ISO],
        ['Жим ногами', 5, 10, 15, BASE, '15/12/10/10/10'],
        ['Приседания с блином', 3, 0, 0, BASE, 'в отказ'],
        ['Болгарские выпады', 4, 12, 12, BASE, 'на каждую ногу'],
        ['Сгибания ног лёжа', 3, 10, 10, ISO],
        ['Сгибания ног сидя', 3, 15, 15, ISO],
        ['Румынская тяга', 5, 8, 15, BASE, '15/12/10/8/8'],
        ['Сгибания ног одной ногой', 3, 12, 12, ISO, 'на каждую ногу'],
        ['Подъёмы на носки', 4, 12, 12, ISO],
      ], 'Пятница'),
    ],
  },
  {
    id: 'football-gym',
    name: 'Футболисту в тренажерном зале',
    tagline: 'Сила, мощь и профилактика травм · 2 блока',
    description: 'Блок 1 — сила и профилактика травм. Блок 2 — взрывная мощь, скорость и кор.',
    level: 'Средний',
    daysPerWeek: 2,
    goal: 'Мощь и здоровье',
    equipment: 'Штанга, гантели, трэп-гриф, медбол, гиря, тумба, барьеры',
    days: () => [
      day('foot', 'A', 0, 'Сила + профилактика', [
        ['Разминка', 1, 0, 0, ISO, '12 мин'],
        ['Прыжки на тумбу', 3, 5, 5, ISO, 'или в длину с места'],
        ['Бросок медбола от груди в стену', 3, 5, 5, ISO, 'или в пол'],
        ['Приседания со штангой', 3, 5, 6, HEAVY, 'или гоблет-присед'],
        ['Румынская тяга со штангой', 3, 6, 6, HEAVY, 'или трэп-гриф'],
        ['Жим гантелей лёжа', 3, 6, 8, BASE, 'или отжимания с весом'],
        ['Подтягивания', 3, 6, 8, BASE, 'или тяга верхнего блока'],
        ['Тяга гантели в наклоне', 3, 6, 8, BASE],
        ['Болгарские выпады', 3, 6, 6, BASE, 'на каждую ногу, с гантелями'],
        ['Скандинавские сгибания', 3, 4, 6, BASE, 'партнёр держит пятки'],
        ['Копенгагенская планка', 3, 0, 0, ISO, '15–20 сек на сторону'],
        ['Подъёмы на носки на одной ноге', 2, 12, 12, ISO],
        ['Планка', 2, 0, 0, ISO, '30–40 сек'],
        ['Заминка', 1, 0, 0, ISO, '5 мин'],
      ], 'Блок 1'),
      day('foot', 'B', 1, 'Взрывная мощь', [
        ['Разминка', 1, 0, 0, ISO, '15 мин'],
        ['Прыжок с фиксацией приземления', 2, 5, 5, ISO],
        ['Прыжки на тумбу', 3, 4, 4, PLYO],
        ['Прыжок в длину с места', 3, 3, 3, PLYO],
        ['Конькобежец', 3, 5, 5, PLYO, 'на каждую ногу'],
        ['Прыжки через барьеры', 2, 5, 5, PLYO],
        ['Прыжки с трэп-грифом', 3, 4, 4, PLYO, 'или с гантелями, 20–30% от приседа'],
        ['Махи гирей двумя руками', 3, 8, 8, PLYO, 'средняя гиря'],
        ['Бросок медбола назад через голову', 3, 4, 4, PLYO, '3–5 кг'],
        ['Взрывные отжимания', 3, 5, 5, ISO, 'можно с упором на скамью'],
        ['Бросок медбола от груди в стену', 3, 6, 6, ISO],
        ['Бросок медбола из-за головы в пол', 3, 6, 6, ISO],
        ['Старт', 3, 0, 0, ISO, '10 м'],
        ['Челнок', 3, 0, 0, ISO, '5–10–5'],
        ['Боковой бросок медбола в стену', 3, 6, 6, ISO, 'на каждую сторону'],
        ['Паллоф-пресс', 3, 10, 10, ISO, 'на каждую сторону'],
        ['Копенгагенская планка', 2, 0, 0, ISO, '20 сек на сторону'],
        ['Мёртвый жук', 2, 10, 10, ISO],
        ['Заминка', 1, 0, 0, ISO, '5 мин'],
      ], 'Блок 2'),
    ],
  },
];

export const DEFAULT_PROGRAM_ID = 'upper-lower';

/** Ключ настройки с id выбранной программы. */
export const ACTIVE_PROGRAM_KEY = 'activeProgram';

/** Свои программы пользователя (подставляются из базы при каждом показе каталога). */
let custom: CatalogProgram[] = [];
export function registerCustomPrograms(list: CatalogProgram[]) {
  custom = list;
}

/** Правки администратора поверх программ каталога (приходят с сервера). */
export interface ProgramOverride {
  icon?: string;
  color?: string;
  hidden?: boolean;
  name?: string;
  tagline?: string;
  description?: string;
  goal?: string;
  level?: CatalogProgram['level'];
  daysPerWeek?: number;
  equipment?: string;
  days?: ProgramDay[];
}
let overrides: Record<string, ProgramOverride> = {};
let added: CatalogProgram[] = [];
let order: string[] = [];
/** Настройки каталога от администратора: правки, новые программы, порядок. */
export function registerCatalog(c: { overrides?: Record<string, ProgramOverride>; added?: CatalogProgram[]; order?: string[] }) {
  overrides = c.overrides ?? {};
  added = c.added ?? [];
  order = c.order ?? [];
}
export const overrideOf = (id: string): ProgramOverride | undefined => overrides[id];

function withOverride(p: CatalogProgram): CatalogProgram {
  const o = overrides[p.id];
  if (!o) return p;
  const { hidden: _h, days, icon, color, ...fields } = o;
  void _h;
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined && v !== ''));
  const look = icon || color ? { icon: icon ?? p.look?.icon ?? 'dumbbell', color: color ?? p.look?.color ?? '#3461d1' } : p.look;
  return { ...p, ...clean, look, days: days ? () => days : p.days };
}

/** Каталог: встроенные программы (с правками), затем свои. Скрытые — только с includeHidden. */
export function allPrograms(includeHidden = false) {
  const list = [...PROGRAMS, ...added].map(withOverride).filter((p) => includeHidden || !overrides[p.id]?.hidden);
  // Порядок задаёт администратор; не упомянутые — в конце в исходном порядке.
  if (order.length) {
    const pos = (id: string) => {
      const i = order.indexOf(id);
      return i < 0 ? order.length : i;
    };
    list.sort((a, b) => pos(a.id) - pos(b.id));
  }
  return [...list, ...custom];
}

/** Программа без правок администратора (встроенная или добавленная). */
export const originalProgram = (id: string) => [...PROGRAMS, ...added].find((p) => p.id === id);
export const isBuiltinProgram = (id: string) => PROGRAMS.some((p) => p.id === id);

export const findProgram = (id: string) => allPrograms(true).find((p) => p.id === id) ?? allPrograms()[0] ?? PROGRAMS[0];

const templateCache = new Map<string, ProgramDay[]>();
/** Дни программы из каталога (кэшируются — шаблоны не меняются; свои — всегда свежие). */
export function templateDays(p: CatalogProgram): ProgramDay[] {
  if (p.userMade || !PROGRAMS.some((x) => x.id === p.id)) return p.days();
  const o = overrides[p.id]?.days;
  if (o) return o;
  let d = templateCache.get(p.id);
  if (!d) {
    d = p.days();
    templateCache.set(p.id, d);
  }
  return d;
}

/** Программа, к которой относится день (по id дня — они уникальны в каталоге). */
export function programOfDay(dayId: string): CatalogProgram | undefined {
  return allPrograms(true).find((p) => templateDays(p).some((d) => d.id === dayId));
}
