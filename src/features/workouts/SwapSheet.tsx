import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Button, Sheet, TextInput } from '../../components/ui';
import { alternativesFor } from '../../lib/alternatives';
import type { CatalogExercise } from '../../data/exercises';
import { ExercisePicker } from './ExercisePicker';

const kindLabel = { base: 'базовое', iso: 'изоляция', time: 'на время' } as const;

/**
 * Замена упражнения: сначала похожие (та же группа мышц и тип движения),
 * ниже — весь справочник с поиском, или своё название.
 */
export function SwapSheet({
  open,
  current,
  onClose,
  onPick,
  footer,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  /** catalog — запись справочника, если выбрано из него (для подсказки подходов/отдыха). */
  onPick: (name: string, catalog?: CatalogExercise) => void;
  /** Дополнительные настройки под списком (например, «заменить и в программе»). */
  footer?: ReactNode;
}) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open, current]);
  const { items, group } = useMemo(() => alternativesFor(current, 8), [current]);

  return (
    <Sheet open={open} onClose={onClose} title="Заменить упражнение">
      <div className="space-y-4">
        <div className="rounded-2xl bg-bg/60 px-4 py-3">
          <div className="eyebrow">Сейчас</div>
          <div className="mt-0.5 font-extrabold">{current}</div>
          {group && <div className="text-xs font-semibold text-fg/45">{group}</div>}
        </div>

        {footer}

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="eyebrow">Похожие упражнения</div>
            <ul className="overflow-hidden rounded-2xl border border-fg/[.08]">
              {items.map((e) => (
                <li key={e.name} className="border-fg/[.08] [&:not(:first-child)]:border-t">
                  <button
                    onClick={() => onPick(e.name, e)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-fg/[.06]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <ArrowLeftRight size={15} strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{e.name}</span>
                      <span className="block text-[11px] font-semibold text-fg/40">{kindLabel[e.kind]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <div className="eyebrow">Другое упражнение</div>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск или своё название" />
          {q.trim().length > 1 && (
            <Button className="w-full" onClick={() => onPick(q.trim())}>
              Использовать «{q.trim()}»
            </Button>
          )}
          <ExercisePicker query={q} taken={new Set([current.toLowerCase().replace(/ё/g, 'е')])} onPick={(e) => onPick(e.name, e)} />
        </div>
      </div>
    </Sheet>
  );
}
