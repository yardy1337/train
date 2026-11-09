import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Плавная прокрутка страницы с инерцией (Lenis): после свайпа лента
 * продолжает ехать и мягко тормозит. Шторки и вложенные списки помечены
 * data-lenis-prevent и прокручиваются нативно.
 */
let lenis: Lenis | null = null;
let locks = 0;

export function initSmoothScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.085,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.07,
    touchInertiaExponent: 1.75,
    respectReducedMotion: true,
  });
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
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    locks = Math.max(0, locks - 1);
    if (locks === 0) {
      document.body.style.overflow = prev === 'hidden' ? '' : prev;
      lenis?.start();
    }
  };
}
