import { AlertTriangle, CheckCircle2, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Sheet } from '../../components/ui';
import { originalTechnique, techniqueOf } from '../../data/technique';
import { saveTechnique, useTechniqueEdits } from '../../data/techniqueEdits';
import { useFeature } from '../../lib/features';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

const area =
  'w-full rounded-xl border border-fg/10 bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/15';

/** Техника выполнения: шаги и частые ошибки. В режиме редактора — правка. */
export function TechniqueSheet({ name, onClose }: { name: string | null; onClose: () => void }) {
  useTechniqueEdits();
  const admin = useFeature('admin');
  const t = name ? techniqueOf(name) : null;
  const [edit, setEdit] = useState(false);
  const [steps, setSteps] = useState('');
  const [mistakes, setMistakes] = useState('');
  useEffect(() => {
    setEdit(false);
    if (name) {
      const cur = techniqueOf(name);
      setSteps(cur?.steps.join('\n') ?? '');
      setMistakes(cur?.mistakes.join('\n') ?? '');
    }
  }, [name]);

  const open = !!name && (!!t || admin);

  return (
    <Sheet open={open} onClose={onClose} title={name ?? ''}>
      {edit || (admin && !t) ? (
        <div className="space-y-3">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Как выполнять — каждый шаг с новой строки</span>
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={5} className={area} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Частые ошибки — каждая с новой строки</span>
            <textarea value={mistakes} onChange={(e) => setMistakes(e.target.value)} rows={3} className={area} />
          </label>
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={async () => {
              if (name) await saveTechnique(name, { steps: lines(steps), mistakes: lines(mistakes) });
              setEdit(false);
            }}
          >
            Сохранить
          </Button>
          {name && originalTechnique(name) && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={async () => {
                await saveTechnique(name, null);
                const o = originalTechnique(name)!;
                setSteps(o.steps.join('\n'));
                setMistakes(o.mistakes.join('\n'));
                setEdit(false);
              }}
            >
              Вернуть исходный текст
            </Button>
          )}
        </div>
      ) : (
        t && (
          <div className="space-y-4">
            <section>
              <div className="eyebrow mb-2">Как выполнять</div>
              <ol className="space-y-2">
                {t.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-extrabold text-white">{i + 1}</span>
                    <span className="text-sm font-medium leading-snug">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            {t.mistakes.length > 0 && (
              <section className="rounded-2xl bg-red-500/[.07] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-red-600">
                  <AlertTriangle size={14} strokeWidth={2.6} /> Частые ошибки
                </div>
                <ul className="space-y-1.5">
                  {t.mistakes.map((m, i) => (
                    <li key={i} className="text-sm font-medium leading-snug text-fg/80">
                      — {m}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="flex items-center gap-1.5 text-xs font-medium text-fg/45">
              <CheckCircle2 size={14} className="text-gold" /> Начинайте с лёгкого веса и добавляйте, только когда техника стабильна.
            </p>
            {admin && (
              <Button className="w-full" onClick={() => setEdit(true)}>
                <Pencil size={15} /> Изменить
              </Button>
            )}
          </div>
        )
      )}
    </Sheet>
  );
}

/** Есть ли подсказка (в режиме редактора — можно открыть у любого упражнения, чтобы написать). */
export function useHasTechnique() {
  useTechniqueEdits();
  const admin = useFeature('admin');
  return (name: string) => admin || !!techniqueOf(name);
}
