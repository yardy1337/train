import { useEffect, useRef } from 'react';

/**
 * «Назад» как в нативных приложениях.
 *
 * Каждый открытый внутренний экран или шторка кладёт запись в историю браузера.
 * Тогда системный «назад» (свайп от края в Safari, кнопка/жест на Android)
 * закрывает верхний экран, а не уходит с сайта. Свайп от левого края
 * внутри приложения — в components/StackView.tsx.
 */

interface Entry {
  close: () => void;
  poppedByBrowser: boolean;
}

const stack: Entry[] = [];
let ignorePops = 0;
let pendingBacks = 0;

function flushBacks() {
  if (!pendingBacks) return;
  const n = pendingBacks;
  pendingBacks = 0;
  ignorePops++;
  history.go(-n);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    const top = stack.pop();
    if (top) {
      top.poppedByBrowser = true;
      top.close();
    }
  });
}

/** Пока active=true, системный «назад» вызывает close(). */
export function useBackEntry(active: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!active) return;
    const entry: Entry = { close: () => closeRef.current(), poppedByBrowser: false };
    stack.push(entry);
    history.pushState({ app: stack.length }, '');
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      // Закрыли кнопкой в интерфейсе — убираем свою запись из истории (пачкой, одним переходом).
      if (!entry.poppedByBrowser) {
        pendingBacks++;
        queueMicrotask(flushBacks);
      }
    };
  }, [active]);
}
