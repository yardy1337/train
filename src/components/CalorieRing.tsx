import { motion } from 'motion/react';
import { AnimatedNumber } from './motion';

/** Кольцо калорий: золотая дуга заполняется к цели, в центре — съедено. */
export function CalorieRing({ value, goal, size = 132 }: { value: number; goal: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-fg/[.07]" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? '#d97706' : 'url(#ring-gold)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', damping: 30, stiffness: 120 }}
        />
        <defs>
          <linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ddb948" />
            <stop offset="1" stopColor="#a8861c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-extrabold leading-none tabular-nums tracking-tight">
            <AnimatedNumber value={value} />
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-fg/40">ккал</div>
        </div>
      </div>
    </div>
  );
}
