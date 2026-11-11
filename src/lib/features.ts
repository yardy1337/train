import { setSetting, useSetting } from '../db/settings';

/** Функции «по желанию»: включаются в настройках. */
export const FEATURES = [
  { id: 'suggest', title: 'Подсказка веса', hint: 'Совет, какой вес взять сегодня по прошлой тренировке' },
  { id: 'plates', title: 'Калькулятор блинов', hint: 'Какие блины повесить на штангу' },
  { id: 'warmup', title: 'Разминочные подходы', hint: 'Лёгкие подходы перед тяжёлыми упражнениями' },
  { id: 'recipes', title: 'Свои блюда', hint: 'Собрать блюдо из нескольких продуктов' },
  { id: 'measurements', title: 'Замеры тела и фото', hint: 'Обхваты и фото «до/после» во вкладке «Прогресс»' },
  { id: 'dark', title: 'Тёмная тема', hint: 'Тёмное оформление для вечера' },
] as const;

export type FeatureId = (typeof FEATURES)[number]['id'];

const key = (id: FeatureId) => `feature:${id}`;

export const useFeature = (id: FeatureId) => useSetting<boolean>(key(id), false);

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
