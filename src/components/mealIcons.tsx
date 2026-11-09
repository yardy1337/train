import { Apple, Coffee, Dumbbell, Soup, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { MealType } from '../types';

export const MEAL_ICONS: Record<MealType, LucideIcon> = {
  breakfast: Coffee,
  snack: Apple,
  lunch: Soup,
  postworkout: Dumbbell,
  dinner: UtensilsCrossed,
};
