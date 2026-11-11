import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, usePresence, type MotionValue } from 'motion/react';

/**
 * Навигация «как на iPhone»: внутренние экраны выезжают справа поверх предыдущего,
 * предыдущий уезжает влево на 30% и чуть темнеет. Свайп от левого края тянет
 * верхний экран за пальцем 1:1; отпустили дальше середины или быстрым движением —
 * экран уходит, иначе возвращается.
 */

const IOS_EASE = [0.32, 0.72, 0, 1] as const;
const EDGE = 30; // ширина зоны у левого края, с которой начинается свайп

/** Внутри слоя экраны не делают собственную анимацию появления. */
export const InStackLayer = createContext(false);
export const useInStackLayer = () => useContext(InStackLayer);

export interface StackLayer {
  key: string;
  node: ReactNode;
}

const width = () => window.innerWidth || 390;

export function StackView({ base, layers, onSwipeBack }: { base: ReactNode; layers: StackLayer[]; onSwipeBack: () => void }) {
  // Положение верхнего слоя (0 — на месте, ширина экрана — ушёл вправо).
  const topX = useMotionValue(width());
  // Экран под верхним: при открытом верхнем сдвинут влево на 30%, по мере ухода верхнего — возвращается.
  const underX = useTransform(topX, (v) => (v - width()) * 0.3);
  const dim = useTransform(topX, (v) => Math.max(0, 0.12 * (1 - v / width())));

  // Пока уходящий слой анимируется, «ведёт» он; открывшийся под ним едет вместе с ним.
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
}: {
  children: ReactNode;
  isTop: boolean;
  topX: MotionValue<number>;
  underX: MotionValue<number>;
  onSwipeBack: () => void;
}) {
  const x = useMotionValue(width());
  const [isPresent, safeToRemove] = usePresence();
  const swiping = useRef(false);

  // Ведущий слой (верхний или уходящий) управляет общим положением:
  // по нему двигается экран под ним и затемнение.
  const driving = isTop || !isPresent;
  useEffect(() => {
    if (!driving) return;
    const unsub = x.on('change', (v) => topX.set(v));
    topX.set(x.get());
    return unsub;
  }, [driving, x, topX]);

  // Появление: справа налево.
  useEffect(() => {
    const c = animate(x, 0, { duration: 0.42, ease: IOS_EASE });
    return () => c.stop();
  }, [x]);

  // Уход (кнопка «назад», системный «назад» или после свайпа): вправо за экран.
  useEffect(() => {
    if (isPresent) return;
    const c = animate(x, width(), { duration: swiping.current ? 0.2 : 0.36, ease: IOS_EASE, onComplete: () => safeToRemove?.() });
    return () => c.stop();
  }, [isPresent, x, safeToRemove]);

  // ---- свайп от левого края ----
  const start = useRef<{ x: number; y: number; t: number; decided: boolean; active: boolean } | null>(null);
  const samples = useRef<{ x: number; t: number }[]>([]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isTop || e.touches.length !== 1) return;
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
      style={{ x: driving ? x : underX }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <InStackLayer.Provider value>
        <div className="mx-auto max-w-lg">{children}</div>
      </InStackLayer.Provider>
    </motion.div>
  );
}
