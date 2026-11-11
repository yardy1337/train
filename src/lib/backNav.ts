import { useEffect, useRef } from 'react';

/**
 * «Назад» как в нативных приложениях.
 *
 * Каждый открытый внутренний экран или шторка кладёт запись в историю браузера.
 * Тогда системный «назад» (свайп от края в Safari, кнопка/жест на Android)
 * закрывает верхний экран, а не уходит с сайта. В установленном на iPhone
 * приложении системного свайпа нет — для него свой жест от левого края.
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

export const canGoBack = () => stack.length > 0;

/** Свой жест «свайп от левого края» — только в установленном приложении (там нет системного). */
export function installEdgeSwipe() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone) return;

  const EDGE = 28;
  const TRIGGER = 80;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let decided = false;
  let target: HTMLElement | null = null;

  const indicator = document.createElement('div');
  indicator.className = 'swipe-back-indicator';
  indicator.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  document.body.appendChild(indicator);

  const topLayer = (): HTMLElement | null => {
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
    if (dialogs.length) return dialogs[dialogs.length - 1];
    return document.querySelector('main');
  };

  const reset = (animate: boolean) => {
    if (target) {
      target.style.transition = animate ? 'transform 220ms cubic-bezier(.22,1,.36,1)' : '';
      target.style.transform = '';
      const t = target;
      setTimeout(() => (t.style.transition = ''), 240);
    }
    indicator.style.transition = 'opacity 180ms, transform 180ms';
    indicator.style.opacity = '0';
    indicator.style.transform = 'translate(-40px, -50%)';
    target = null;
  };

  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      tracking = e.touches.length === 1 && t.clientX <= EDGE && canGoBack();
      decided = false;
      if (!tracking) return;
      startX = t.clientX;
      startY = t.clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        decided = true;
        if (Math.abs(dy) > Math.abs(dx) || dx < 0) {
          tracking = false;
          return;
        }
        target = topLayer();
        indicator.style.transition = '';
      }
      e.preventDefault();
      const x = Math.max(0, dx);
      if (target) target.style.transform = `translateX(${x * 0.6}px)`;
      const k = Math.min(1, x / TRIGGER);
      indicator.style.opacity = String(k);
      indicator.style.transform = `translate(${-40 + k * 56}px, -50%) scale(${0.7 + k * 0.3})`;
      indicator.classList.toggle('ready', x >= TRIGGER);
    },
    { passive: false },
  );

  document.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (decided && dx >= TRIGGER) {
      navigator.vibrate?.(10);
      reset(false);
      history.back();
    } else {
      reset(true);
    }
  });
  document.addEventListener('touchcancel', () => {
    tracking = false;
    reset(true);
  });
}
