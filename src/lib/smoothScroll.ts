import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Прокрутка.
 * На телефонах — нативная: у iOS/Android уже есть инерция, и она идёт в отдельном
 * потоке на GPU, поэтому не подвисает. JS-прокрутку (Lenis) включаем только для
 * колёсика мыши на компьютере — там нативная прокрутка рывками.
 */
let lenis: Lenis | null = null;
let locks = 0;

export function initSmoothScroll() {
  if (lenis) return lenis;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (touch || reduced) return null;
  lenis = new Lenis({ autoRaf: true, lerp: 0.1, smoothWheel: true, syncTouch: false });
  return lenis;
}

/** Мгновенно наверх (при смене вкладки/раздела). */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/** Блокировка прокрутки страницы под открытой шторкой (с учётом вложенных шторок). */
export function lockScroll() {
  locks++;
  lenis?.stop();
  if (locks === 1) document.documentElement.classList.add('scroll-locked');
  return () => {
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      document.documentElement.classList.remove('scroll-locked');
      lenis?.start();
    }
  };
}
