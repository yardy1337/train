import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, usePresence, type MotionValue } from 'motion/react';

/**
 * Навигация «как на iPhone»: внутренние экраны выезжают справа поверх предыдущего,
 * предыдущий уезжает влево на 30% и чуть темнеет. Свайп от левого края тянет
 * верхний экран за пальцем 1:1; отпустили дальше середины или быстрым движением —
 * экран уходит, иначе возвращается.
 */

const IOS_EASE = [0.32, 0.72, 0, 1] as const;
const EDGE = 26; // ширина зоны у левого края, с которой начинается свайп

/**
 * Safari на iPhone при свайпе от края запускает свой «назад» со снимком прошлой
 * страницы — он накладывается на наш и экран «двоится». Пока открыт внутренний
 * экран, гасим касания у края для Safari (preventDefault на touchstart) — работает
 * только наш свайп. Короткое нажатие в этой зоне (кнопка «Назад») отдаём кнопке сами.
 */
function useBlockNativeEdgeSwipe(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let tap: { x: number; y: number; t: number; moved: boolean } | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > EDGE) return;
      // Внутри открытой шторки свайпа нет — касания не трогаем.
      if ((e.target as Element | null)?.closest?.('[role="dialog"]')) return;
      e.preventDefault();
      tap = { x: t.clientX, y: t.clientY, t: performance.now(), moved: false };
    };
    const onMove = (e: TouchEvent) => {
      if (!tap) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - tap.x) > 8 || Math.abs(t.clientY - tap.y) > 8) tap.moved = true;
    };
    const onEnd = () => {
      if (tap && !tap.moved && performance.now() - tap.t < 500) {
        const el = document.elementFromPoint(tap.x, tap.y) as HTMLElement | null;
        el?.closest<HTMLElement>('button, a, [role="button"], input, label')?.click();
      }
      tap = null;
    };
    document.addEventListener('touchstart', onStart, { passive: false, capture: true });
    document.addEventListener('touchmove', onMove, { passive: true, capture: true });
    document.addEventListener('touchend', onEnd, { capture: true });
    document.addEventListener('touchcancel', onEnd, { capture: true });
    return () => {
      document.removeEventListener('touchstart', onStart, { capture: true });
      document.removeEventListener('touchmove', onMove, { capture: true });
      document.removeEventListener('touchend', onEnd, { capture: true });
      document.removeEventListener('touchcancel', onEnd, { capture: true });
    };
  }, [enabled]);
}

/** Внутри слоя экраны не делают собственную анимацию появления. */
export const InStackLayer = createContext(false);
export const useInStackLayer = () => useContext(InStackLayer);

export interface StackLayer {
  key: string;
  node: ReactNode;
  /** Прямоугольник плитки, из которой экран «раскрывается» (как карточки в App Store). */
  origin?: Rect;
}

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Плитка тёмная — раскрываемся из тёмно-синего, а не из белого. */
  dark?: boolean;
}

/** Где на экране элемент — для раскрытия слоя из него. */
export const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, dark: el.getAttribute('data-tile') === 'dark' };
};

const EXPAND_RADIUS = 24;

const width = () => window.innerWidth || 390;

export function StackView({ base, layers, onSwipeBack }: { base: ReactNode; layers: StackLayer[]; onSwipeBack: () => void }) {
  // Положение верхнего слоя (0 — на месте, ширина экрана — ушёл вправо).
  const topX = useMotionValue(width());
  // Экран под верхним: при открытом верхнем сдвинут влево на 30%, по мере ухода верхнего — возвращается.
  const underX = useTransform(topX, (v) => (v - width()) * 0.3);
  const dim = useTransform(topX, (v) => Math.max(0, 0.12 * (1 - v / width())));

  // Пока уходящий слой анимируется, «ведёт» он; открывшийся под ним едет вместе с ним.
  useBlockNativeEdgeSwipe(layers.length > 0);

  const [prevLen, setPrevLen] = useState(layers.length);
  const [exiting, setExiting] = useState(false);
  if (layers.length !== prevLen) {
    setPrevLen(layers.length);
    if (layers.length < prevLen) setExiting(true);
  }

  return (
    <>
      <motion.div style={{ x: underX }}>{base}</motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[24] bg-black"
        style={{ opacity: dim }}
      />
      <AnimatePresence initial={false} onExitComplete={() => setExiting(false)}>
        {layers.map((l, i) => (
          <Layer
            key={l.key}
            isTop={i === layers.length - 1 && !exiting}
            topX={topX}
            underX={underX}
            onSwipeBack={onSwipeBack}
            origin={l.origin}
          >
            {l.node}
          </Layer>
        ))}
      </AnimatePresence>
    </>
  );
}

function Layer({
  children,
  isTop,
  topX,
  underX,
  onSwipeBack,
  origin: originProp,
}: {
  children: ReactNode;
  isTop: boolean;
  topX: MotionValue<number>;
  underX: MotionValue<number>;
  onSwipeBack: () => void;
  origin?: Rect;
}) {
  const x = useMotionValue(width());
  const [isPresent, safeToRemove] = usePresence();
  const swiping = useRef(false);

  // Раскрытие из плитки: слой стоит на месте и «растёт» из прямоугольника плитки до всего экрана,
  // а x при этом ведёт только экран под ним (сдвиг и затемнение). Свайп назад — обычный, вбок.
  const [origin] = useState(originProp);
  const follow = useRef(!origin); // слой двигается вместе с x
  const ownX = useTransform(x, (v) => (follow.current ? v : 0));
  const p = useMotionValue(origin ? 0 : 1); // 0 — размером с плитку, 1 — весь экран
  const clip = useTransform(p, (v) => {
    if (!origin || v >= 1) return 'none';
    const W = window.innerWidth;
    const H = window.innerHeight;
    const k = 1 - v;
    const top = origin.top * k;
    const left = origin.left * k;
    const right = (W - origin.left - origin.width) * k;
    const bottom = (H - origin.top - origin.height) * k;
    return `inset(${top}px ${right}px ${bottom}px ${left}px round ${EXPAND_RADIUS * k}px)`;
  });
  // Пока плитка раскрывается, поверх — белая «карточка», содержимое проявляется.
  const cover = useTransform(p, [0, 0.45], [1, 0]);

  // Ведущий слой (верхний или уходящий) управляет общим положением:
  // по нему двигается экран под ним и затемнение.
  const driving = isTop || !isPresent;
  useEffect(() => {
    if (!driving) return;
    const unsub = x.on('change', (v) => topX.set(v));
    topX.set(x.get());
    return unsub;
  }, [driving, x, topX]);

  // Появление: справа налево (или раскрытие из плитки).
  useEffect(() => {
    const c = animate(x, 0, { duration: origin ? 0.5 : 0.42, ease: IOS_EASE });
    const e = origin
      ? animate(p, 1, {
          type: 'spring',
          stiffness: 260,
          damping: 30,
          onComplete: () => {
            follow.current = true;
          },
        })
      : null;
    return () => {
      c.stop();
      e?.stop();
    };
  }, [x, p, origin]);

  // Уход (кнопка «назад», системный «назад» или после свайпа): вправо за экран — или обратно в плитку.
  useEffect(() => {
    if (isPresent) return;
    if (origin && !swiping.current) {
      follow.current = false;
      x.set(x.get()); // пересчитать положение слоя без сдвига
      const c = animate(x, width(), { duration: 0.42, ease: IOS_EASE });
      const e = animate(p, 0, { duration: 0.42, ease: IOS_EASE, onComplete: () => safeToRemove?.() });
      return () => {
        c.stop();
        e.stop();
      };
    }
    const c = animate(x, width(), { duration: swiping.current ? 0.2 : 0.36, ease: IOS_EASE, onComplete: () => safeToRemove?.() });
    return () => c.stop();
  }, [isPresent, x, p, origin, safeToRemove]);

  // ---- свайп от левого края ----
  const start = useRef<{ x: number; y: number; t: number; decided: boolean; active: boolean } | null>(null);
  const samples = useRef<{ x: number; t: number }[]>([]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isTop || e.touches.length !== 1 || !follow.current) return;
    const t = e.touches[0];
    if (t.clientX > EDGE) return;
    start.current = { x: t.clientX, y: t.clientY, t: performance.now(), decided: false, active: false };
    samples.current = [{ x: t.clientX, t: performance.now() }];
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      s.decided = true;
      s.active = dx > 0 && Math.abs(dx) > Math.abs(dy);
      if (!s.active) {
        start.current = null;
        return;
      }
      swiping.current = true;
    }
    x.set(Math.max(0, dx));
    const now = performance.now();
    samples.current.push({ x: t.clientX, t: now });
    while (samples.current.length > 2 && now - samples.current[0].t > 80) samples.current.shift();
  };

  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    if (!s?.active) return;
    const pts = samples.current;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const v = last && first && last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0; // px/s
    const cur = x.get();
    if (cur > width() * 0.5 || v > 500) {
      // Досылаем экран за край со скоростью пальца, потом — «назад».
      animate(x, width(), {
        duration: Math.max(0.12, Math.min(0.3, (width() - cur) / Math.max(v, 900))),
        ease: 'easeOut',
        onComplete: () => onSwipeBack(),
      });
    } else {
      swiping.current = false;
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 40 });
    }
  };

  return (
    <motion.div
      data-lenis-prevent
      className="fixed inset-0 z-[25] overflow-y-auto overscroll-contain bg-bg pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[-10px_0_30px_rgb(0_0_0/0.18)]"
      style={{ x: driving ? ownX : underX, clipPath: clip }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <InStackLayer.Provider value>
        <div className="mx-auto max-w-lg">{children}</div>
      </InStackLayer.Provider>
      {origin && <motion.div aria-hidden className={`pointer-events-none fixed inset-0 ${origin.dark ? 'bg-navy' : 'bg-surface'}`} style={{ opacity: cover }} />}
    </motion.div>
  );
}
