import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useInView, type Transition, type Variants } from 'motion/react';
import { useInStackLayer } from './StackView';

/** Общая «мягкая» кривая: быстрый старт, долгое плавное торможение. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const spring: Transition = { type: 'spring', damping: 30, stiffness: 320, mass: 0.8 };

/** Карточки и элементы списков: появляются снизу с лёгким затуханием. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE, delay: 0.05 + Math.min(i, 8) * 0.045 },
  }),
};

const screenVariants: Record<'fade' | 'push', Variants> = {
  fade: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
    exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' } },
  },
  push: {
    hidden: { opacity: 0, x: 28 },
    show: { opacity: 1, x: 0, transition: { duration: 0.36, ease: EASE } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.14, ease: 'easeIn' } },
  },
};

/** Обёртка экрана: плавное появление и уход при смене вкладки или раздела. */
export function Screen({ children, kind = 'fade' }: { children: ReactNode; kind?: 'fade' | 'push' }) {
  // Внутри слоя навигации экран уже выезжает вместе со слоем — своя анимация не нужна.
  const inLayer = useInStackLayer();
  if (inLayer) return <div>{children}</div>;
  return (
    <motion.div variants={screenVariants[kind]} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  );
}

/** Произвольный элемент, участвующий в «лесенке» появления. */
export function Item({ children, className, index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  return (
    <motion.div variants={itemVariants} initial="hidden" animate="show" custom={index} className={className}>
      {children}
    </motion.div>
  );
}

/** Число, которое плавно «доезжает» до нового значения. */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const inView = useInView(ref);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!inView) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.6,
      ease: EASE,
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView]);
  return <span ref={ref}>{format(value)}</span>;
}
