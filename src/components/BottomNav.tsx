import type { JSX } from "react";
export type Tab = 'workouts' | 'nutrition' | 'progress';

const icons: Record<Tab, JSX.Element> = {
  workouts: (
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />
  ),
  nutrition: (
    <>
      <path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M9 3v6" />
      <path d="M17 21V3c-2 1-3 4-3 7v4h3" />
    </>
  ),
  progress: <path d="M3 20h18M5 16l4-5 4 3 6-8" />,
};

const labels: Record<Tab, string> = {
  workouts: 'Тренировки',
  nutrition: 'Питание',
  progress: 'Прогресс',
};

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              tab === t ? 'text-accent' : 'text-zinc-500'
            }`}
            aria-current={tab === t ? 'page' : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {icons[t]}
            </svg>
            {labels[t]}
          </button>
        ))}
      </div>
    </nav>
  );
}
