import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { setSetting } from '../db/settings';
import { getConfig, useAppConfig } from './appConfig';

/** Функции «по желанию»: включаются в настройках. */
export const FEATURES = [
  { id: 'suggest', group: 'Тренировки', title: 'Подсказка веса', hint: 'Совет, какой вес взять сегодня по прошлой тренировке' },
  { id: 'plates', group: 'Тренировки', title: 'Калькулятор блинов', hint: 'Какие блины повесить на штангу' },
  { id: 'warmup', group: 'Тренировки', title: 'Разминочные подходы', hint: 'Лёгкие подходы перед тяжёлыми упражнениями' },
  { id: 'recipes', group: 'Питание', title: 'Свои блюда', hint: 'Собрать блюдо из нескольких продуктов' },
  { id: 'measurements', group: 'Прогресс', title: 'Замеры тела и фото', hint: 'Обхваты и фото «до/после» во вкладке «Прогресс»' },
  { id: 'dark', group: 'Оформление', title: 'Тёмная тема', hint: 'Тёмное оформление для вечера' },
] as const;

export type FeatureId = (typeof FEATURES)[number]['id'];

const key = (id: FeatureId) => `feature:${id}`;

/** Возможности, которые администратор может выключить у всех (кроме функций из настроек). */
export const GLOBAL_FEATURES = [
  { id: 'photo', title: 'Еда по фото', hint: 'Распознавание блюд нейросетью' },
  { id: 'customPrograms', title: 'Свои программы', hint: 'Кнопка «Создать свою программу» в каталоге' },
  { id: 'share', title: 'Поделиться итогом', hint: 'Картинка тренировки для сторис' },
] as const;
export type GlobalFeatureId = (typeof GLOBAL_FEATURES)[number]['id'];

/** Выключил ли администратор возможность у всех. */
export const isDisabled = (id: string) => !!getConfig().features?.disabled?.includes(id);

/** Включена ли функция: выбор пользователя, иначе — значение по умолчанию от администратора. */
export function useFeature(id: FeatureId): boolean {
  const cfg = useAppConfig();
  const own = useLiveQuery(() => db.settings.get(key(id)).then((r) => r?.value as boolean | undefined), [id]);
  if (cfg.features?.disabled?.includes(id)) return false;
  return own ?? !!cfg.features?.defaults?.includes(id);
}

/** Доступна ли глобальная возможность (еда по фото и т. п.). */
export function useAllowed(id: GlobalFeatureId): boolean {
  const cfg = useAppConfig();
  return !cfg.features?.disabled?.includes(id);
}

export async function setFeature(id: FeatureId, on: boolean) {
  await setSetting(key(id), on);
  if (id === 'dark') applyTheme(on);
}

const THEME_KEY = 'theme';

/** Тема ставится до первого показа (из localStorage), чтобы не было вспышки светлого. */
export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#050c1f' : '#0b1f4b');
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  try {
    if (localStorage.getItem(THEME_KEY) === 'dark') applyTheme(true);
  } catch {
    /* ignore */
  }
}
