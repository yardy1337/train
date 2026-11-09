import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initDb } from './db/init';
import './index.css';
import { initSmoothScroll } from './lib/smoothScroll';

initSmoothScroll();

// Сервис-воркер: офлайн-работа и автообновление.
registerSW({ immediate: true });

// Просим браузер не удалять IndexedDB при нехватке места.
navigator.storage?.persist?.().catch(() => {});

const root = createRoot(document.getElementById('root')!);

initDb()
  .catch((e) => console.error('Ошибка инициализации БД', e))
  .finally(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
