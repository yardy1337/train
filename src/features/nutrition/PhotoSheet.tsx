import { Camera, Check, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, NumInput, Sheet } from '../../components/ui';
import { photoToDataUrl, recognizePhoto, type PhotoItem } from '../../lib/foodApi';
import { MEALS, scale, sum } from '../../lib/nutrition';
import type { MealType } from '../../types';

type Row = PhotoItem & { on: boolean };

/** Еда по фото: нейросеть находит блюда и примерный вес, пользователь правит и добавляет. */
export function PhotoSheet({
  file,
  initialMeal,
  onClose,
  onAdd,
}: {
  file: File | null;
  initialMeal: MealType;
  onClose: () => void;
  onAdd: (items: PhotoItem[], meal: MealType) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [meal, setMeal] = useState<MealType>(initialMeal);

  useEffect(() => {
    if (!file) return;
    let alive = true;
    setStatus('loading');
    setRows([]);
    setMeal(initialMeal);
    (async () => {
      try {
        const img = await photoToDataUrl(file);
        if (!alive) return;
        setPreview(img);
        if (!navigator.onLine) throw new Error('Нет интернета — распознавание работает только онлайн');
        const items = await recognizePhoto(img);
        if (!alive) return;
        setRows(items.map((i) => ({ ...i, name: i.name.charAt(0).toUpperCase() + i.name.slice(1), on: true })));
        setStatus('done');
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Сервер не ответил, попробуйте ещё раз');
        setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [file, initialMeal]);

  const chosen = rows.filter((r) => r.on && r.grams > 0);
  const total = sum(chosen.map((r) => scale(r, r.grams)));

  return (
    <Sheet open={!!file} onClose={onClose} title="Еда по фото">
      <div className="space-y-3">
        {preview && <img src={preview} alt="" className="max-h-52 w-full rounded-2xl object-cover" />}

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm font-bold text-fg/55">
            <Loader2 size={18} className="animate-spin" /> Распознаю еду…
          </div>
        )}
        {status === 'error' && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
        {status === 'done' && !rows.length && (
          <p className="rounded-xl bg-fg/[.05] px-3 py-2 text-sm font-semibold text-fg/60">Еду на фото не нашёл. Попробуйте снять ближе и при хорошем свете.</p>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fg/50">
              <Sparkles size={14} className="text-gold" /> Вес и КБЖУ примерные — поправьте граммы, если нужно
            </div>
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const m = scale(r, r.grams);
                return (
                  <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${r.on ? 'bg-accent-soft' : 'bg-fg/[.04] opacity-60'}`}>
                    <button
                      aria-label={r.on ? 'Не добавлять' : 'Добавить'}
                      onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${r.on ? 'bg-accent text-white' : 'border border-fg/15 bg-surface'}`}
                    >
                      {r.on && <Check size={16} strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{r.name}</div>
                      <div className="text-xs font-semibold tabular-nums text-fg/50">
                        {Math.round(m.kcal)} ккал · Б {Math.round(m.protein)} · Ж {Math.round(m.fat)} · У {Math.round(m.carbs)}
                      </div>
                    </div>
                    <div className="w-20">
                      <NumInput ariaLabel={`Граммы: ${r.name}`} decimal={false} value={r.grams} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, grams: Math.round(v ?? 0) } : x)))} />
                    </div>
                    <span className="text-xs text-fg/45">г</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {MEALS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => setMeal(x.id)}
                  className={`rounded-full px-3 py-1.5 text-xs ${meal === x.id ? 'bg-fg font-bold text-bg' : 'bg-fg/[.05] text-fg/55'}`}
                >
                  {x.label}
                </button>
              ))}
            </div>
            <Button variant="primary" className="w-full py-3" disabled={!chosen.length} onClick={() => onAdd(chosen, meal)}>
              Добавить {chosen.length > 1 ? `${chosen.length} блюда` : ''} · {Math.round(total.kcal)} ккал
            </Button>
          </>
        )}
        {status !== 'loading' && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-fg/40">
            <Camera size={13} /> Фото отправляется на наш сервер только для распознавания и не хранится
          </p>
        )}
      </div>
    </Sheet>
  );
}
