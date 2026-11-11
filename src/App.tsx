import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { scrollToTop } from './lib/smoothScroll';
import { markBooted } from './components/motion';
import { BottomNav, type Tab } from './components/BottomNav';
import { RestTimerProvider } from './components/RestTimer';
import { WorkoutsPage } from './features/workouts/WorkoutsPage';
import { NutritionPage } from './features/nutrition/NutritionPage';
// Графики (recharts) грузим отдельным чанком — так быстрее первый запуск.
const ProgressPage = lazy(() => import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })));

const TAB_KEY = 'tab';

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t === 'workouts' || t === 'nutrition' || t === 'progress') return t;
  } catch {
    /* ignore */
  }
  return 'workouts';
}

export default function App() {
  const [tab, setTab] = useState<Tab>(readTab);

  // Первый экран без анимации появления; дальше — обычные переходы.
  useEffect(() => markBooted(), []);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  return (
    <MotionConfig reducedMotion="user">
      <RestTimerProvider>
        <main className="mx-auto min-h-dvh max-w-lg overflow-x-clip pb-[calc(72px+env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait" initial={false} onExitComplete={scrollToTop}>
            {tab === 'workouts' && <WorkoutsPage key="workouts" />}
            {tab === 'nutrition' && <NutritionPage key="nutrition" />}
            {tab === 'progress' && (
              <Suspense key="progress" fallback={null}>
                <ProgressPage />
              </Suspense>
            )}
          </AnimatePresence>
        </main>
        <BottomNav tab={tab} onChange={setTab} />
      </RestTimerProvider>
    </MotionConfig>
  );
}
