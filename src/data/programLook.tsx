import { BicepsFlexed, Calendar, Dumbbell, Flame, Heart, Mountain, PersonStanding, Target, Zap } from 'lucide-react';
import { allPrograms } from './programs';
import type { ComponentType } from 'react';

type IconProps = { size?: number; strokeWidth?: number; className?: string };

/** Календарь с цифрой «3» — программа на 3 дня в неделю. */
function Calendar3({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <span className={`relative inline-grid place-items-center ${className ?? ''}`} style={{ width: size, height: size }}>
      <Calendar size={size} strokeWidth={strokeWidth} />
      <span className="absolute font-extrabold leading-none" style={{ fontSize: size * 0.42, top: size * 0.44 }}>
        3
      </span>
    </span>
  );
}

/** Футбольный мяч в стиле значков lucide (в наборе такого нет). */
function SoccerBall({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="currentColor" fillOpacity={0.9} />
      <path d="M12 7.5V2.3M16.3 10.6l4.8-1.7M14.7 15.6l2.9 4.3M9.3 15.6l-2.9 4.3M7.7 10.6L2.9 8.9" />
    </svg>
  );
}

/** Свой цвет и значок у каждой программы — чтобы каталог не был однотонным. */
export interface ProgramLook {
  Icon: ComponentType<IconProps>;
  color: string;
}

const LOOKS: Record<string, ProgramLook> = {
  'upper-lower': { Icon: Dumbbell, color: '#3461d1' },
  'upper-lower-3': { Icon: Calendar3, color: '#0f8a8c' },
  'full-body': { Icon: PersonStanding, color: '#7650d0' },
  'split-isma': { Icon: BicepsFlexed, color: '#d0543c' },
  'football-gym': { Icon: SoccerBall, color: '#1f9a55' },
  'power': { Icon: Zap, color: '#b4232c' },
};

/** Значки и цвета на выбор для своей программы. */
export const CUSTOM_ICONS: Record<string, ComponentType<IconProps>> = {
  dumbbell: Dumbbell,
  biceps: BicepsFlexed,
  person: PersonStanding,
  flame: Flame,
  zap: Zap,
  heart: Heart,
  target: Target,
  mountain: Mountain,
  ball: SoccerBall,
};
export const CUSTOM_COLORS = ['#3461d1', '#0f8a8c', '#7650d0', '#d0543c', '#1f9a55', '#c9a227', '#d23f7a', '#4b5563'];

export function lookOf(id: string): ProgramLook {
  const c = allPrograms(true).find((p) => p.id === id)?.look;
  if (c) return { Icon: CUSTOM_ICONS[c.icon] ?? Dumbbell, color: c.color };
  return LOOKS[id] ?? { Icon: Dumbbell, color: '#3461d1' };
}
