import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { allExercises, MUSCLE_GROUPS, type CatalogExercise, type MuscleGroup } from '../../data/exercises';
import { EASE, spring } from '../../components/motion';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim();

const kindLabel = { base: 'базовое', iso: 'изоляция', time: 'на время' } as const;

/**
 * Справочник упражнений: фильтр по группе мышц и поиск по тексту из поля «Название».
 */
export function ExercisePicker({
  query,
  taken,
  onPick,
}: {
  query: string;
  taken: Set<string>;
  onPick: (e: CatalogExercise) => void;
}) {
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const q = norm(query);

  const list = useMemo(() => {
    let rows = group === 'all' ? allExercises() : allExercises().filter((e) => e.group === group);
    if (q) {
      const words = q.split(/\s+/);
      rows = rows.filter((e) => {
        const n = norm(e.name);
        return words.every((w) => n.includes(w));
      });
    }
    return rows.slice(0, 60);
  }, [group, q]);

  return (
    <div className="space-y-2">
      <div className="eyebrow">Справочник · {allExercises().length} упражнений</div>
      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <LayoutGroup id="muscle-groups">
          <div className="flex w-max gap-1.5">
            {(['all', ...MUSCLE_GROUPS] as const).map((g) => {
              const active = group === g;
              return (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={`relative rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    active ? 'text-white' : 'bg-fg/[.05] text-fg/60'
                  }`}
                >
                  {active && <motion.span layoutId="mg-pill" className="absolute inset-0 rounded-full bg-accent" transition={spring} />}
                  <span className="relative">{g === 'all' ? 'Все' : g}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
      <ul className="max-h-64 overflow-y-auto rounded-2xl border border-fg/[.06]">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((e) => {
            const added = taken.has(norm(e.name));
            return (
              <motion.li
                key={e.name}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="border-fg/[.06] [&:not(:first-child)]:border-t"
              >
                <button
                  onClick={() => onPick(e)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-accent-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{e.name}</div>
                    <div className="text-[11px] font-semibold text-fg/40">
                      {e.group} · {kindLabel[e.kind]}
                      {added && <span className="text-accent"> · уже в этом дне</span>}
                    </div>
                  </div>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Plus size={16} strokeWidth={2.6} />
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {!list.length && (
          <li className="px-3 py-4 text-center text-sm font-medium text-fg/40">
            В справочнике нет — сохраните со своим названием
          </li>
        )}
      </ul>
    </div>
  );
}
