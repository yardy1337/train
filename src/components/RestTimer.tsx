import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface TimerState {
  endAt: number;
  total: number;
  label: string;
}

interface TimerApi {
  start: (seconds: number, label?: string) => void;
  stop: () => void;
}

const Ctx = createContext<TimerApi>({ start: () => {}, stop: () => {} });
export const useRestTimer = () => useContext(Ctx);

const STORAGE_KEY = 'restTimer';

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* звук недоступен — не страшно */
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState | null>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as TimerState | null;
      return s && s.endAt > Date.now() ? s : null;
    } catch {
      return null;
    }
  });
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const fired = useRef(false);

  const start = useCallback((seconds: number, label = 'Отдых') => {
    const s = { endAt: Date.now() + seconds * 1000, total: seconds, label };
    fired.current = false;
    setFinished(false);
    setState(s);
    setNow(Date.now());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    setState(null);
    setFinished(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state]);

  const remaining = state ? Math.max(0, Math.ceil((state.endAt - now) / 1000)) : 0;

  useEffect(() => {
    if (state && remaining === 0 && !fired.current) {
      fired.current = true;
      setFinished(true);
      navigator.vibrate?.([300, 150, 300]);
      beep();
      const t = setTimeout(stop, 4000);
      return () => clearTimeout(t);
    }
  }, [remaining, state, stop]);

  const add = (sec: number) => {
    if (!state) return;
    const s = { ...state, endAt: Math.max(Date.now(), state.endAt) + sec * 1000, total: state.total + sec };
    fired.current = false;
    setFinished(false);
    setState(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };

  const pct = state ? Math.min(100, (1 - (state.endAt - now) / (state.total * 1000)) * 100) : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <Ctx.Provider value={{ start, stop }}>
      {children}
      {state && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 px-3">
          <div
            className={`relative mx-auto flex max-w-lg items-center gap-2 overflow-hidden rounded-2xl px-4 py-3 text-white shadow-2xl ${
              finished ? 'bg-accent' : 'bg-fg'
            }`}
            role="timer"
          >
            {!finished && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <div className="h-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="relative min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold uppercase tracking-wider opacity-60">{finished ? 'Отдых окончен' : state.label}</div>
              <div className="text-2xl font-extrabold tabular-nums tracking-tight">{finished ? 'Следующий подход!' : `${mm}:${ss}`}</div>
            </div>
            {!finished && (
              <>
                <button onClick={() => add(15)} className="relative rounded-xl bg-white/10 px-3 py-2 text-sm font-bold active:bg-white/20">
                  +15с
                </button>
                <button onClick={stop} className="relative rounded-xl bg-white/10 px-3 py-2 text-sm font-bold active:bg-white/20">
                  Пропустить
                </button>
              </>
            )}
            {finished && (
              <button onClick={stop} className="relative rounded-xl bg-white px-4 py-2 text-sm font-bold text-accent-strong">
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
