import { lazy, Suspense, useEffect, useState } from 'react';
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

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <RestTimerProvider>
      <main className="mx-auto min-h-dvh max-w-lg pb-[calc(72px+env(safe-area-inset-bottom))]">
        {tab === 'workouts' && <WorkoutsPage />}
        {tab === 'nutrition' && <NutritionPage />}
        {tab === 'progress' && (
          <Suspense fallback={null}>
            <ProgressPage />
          </Suspense>
        )}
      </main>
      <BottomNav tab={tab} onChange={setTab} />
    </RestTimerProvider>
  );
}
