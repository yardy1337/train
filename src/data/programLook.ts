import { ArrowUpDown, Dumbbell, Goal, PersonStanding, Repeat2, Split, type LucideIcon } from 'lucide-react';

/** Свой цвет и значок у каждой программы — чтобы каталог не был однотонным. */
export interface ProgramLook {
  Icon: LucideIcon;
  color: string;
}

const LOOKS: Record<string, ProgramLook> = {
  'upper-lower': { Icon: ArrowUpDown, color: '#3461d1' },
  'upper-lower-3': { Icon: Repeat2, color: '#0f8a8c' },
  'full-body': { Icon: PersonStanding, color: '#7650d0' },
  'split-isma': { Icon: Split, color: '#d0543c' },
  'football-gym': { Icon: Goal, color: '#1f9a55' },
};

export const lookOf = (id: string): ProgramLook => LOOKS[id] ?? { Icon: Dumbbell, color: '#3461d1' };
