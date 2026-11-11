import { motion } from 'motion/react';
import { Flame, Trophy } from 'lucide-react';

/** Галочка, которая «рисуется» линией при появлении. */
export function DrawCheck({ size = 20, strokeWidth = 3, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <motion.path d="M20 6 9 17l-5-5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} />
    </svg>
  );
}

/** Кубок, который подпрыгивает при появлении. */
export function BounceTrophy({ size = 16, strokeWidth = 2.6, className, repeat = false }: { size?: number; strokeWidth?: number; className?: string; repeat?: boolean }) {
  return (
    <motion.span
      className={`inline-grid place-items-center ${className ?? ''}`}
      initial={{ scale: 0.4, rotate: -12, y: 0 }}
      animate={{ scale: [0.4, 1.25, 1], rotate: [-12, 8, 0], y: repeat ? [0, -3, 0] : 0 }}
      transition={
        repeat
          ? { duration: 0.6, ease: 'easeOut', y: { duration: 0.9, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' } }
          : { duration: 0.6, ease: 'easeOut' }
      }
    >
      <Trophy size={size} strokeWidth={strokeWidth} />
    </motion.span>
  );
}

/** Огонёк серии: мягко «мерцает», пока серия жива. */
export function LiveFlame({ size = 20, strokeWidth = 2.4, active, className }: { size?: number; strokeWidth?: number; active: boolean; className?: string }) {
  return (
    <span className={`inline-grid place-items-center ${active ? 'flame-live' : ''} ${className ?? ''}`}>
      <Flame size={size} strokeWidth={strokeWidth} />
    </span>
  );
}
