import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initDb } from './db/init';
import './index.css';
import { initSmoothScroll } from './lib/smoothScroll';
import { initTheme } from './lib/features';
import { initAppConfig } from './lib/appConfig';
import cyrillicFont from '@fontsource-variable/manrope/files/manrope-cyrillic-wght-normal.woff2?url';
import latinFont from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';

// Шрифт начинаем грузить сразу, параллельно со скриптами и базой.
for (const href of [cyrillicFont, latinFont]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Ждём фирменный шрифт перед первым показом, иначе текст сначала рисуется
 * системным шрифтом (выглядит слишком жирно) и потом резко меняется.
 * Не дольше 1,5 с — если шрифт не успел, показываем как есть.
 */
function fontsReady() {
  const load = Promise.all([
    document.fonts.load('400 16px "Manrope Variable"', 'Аа Aa'),
    document.fonts.load('800 16px "Manrope Variable"', 'Аа Aa'),
  ]).catch(() => undefined);
  return Promise.race([load, new Promise((r) => setTimeout(r, 1500))]);
}

initTheme();
// Настройки от администратора: сохранённые — сразу, свежие — с сервера в фоне.
initAppConfig();
initSmoothScroll();

// Сервис-воркер: офлайн-работа и автообновление.
registerSW({ immediate: true });

// Просим браузер не удалять IndexedDB при нехватке места.
navigator.storage?.persist?.().catch(() => {});

const root = createRoot(document.getElementById('root')!);

Promise.all([initDb().catch((e) => console.error('Ошибка инициализации БД', e)), fontsReady()])
  .finally(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
