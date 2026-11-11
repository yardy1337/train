import { useEffect, useState } from 'react';
import { Button, Field, NumInput, Sheet } from '../../components/ui';
import { fmtKg, platesFor } from '../../lib/training';

const BAR_KEY = 'plateBar';
const BARS = [20, 15, 10, 0];

const COLORS: Record<string, string> = {
  '25': 'bg-red-600',
  '20': 'bg-blue-600',
  '15': 'bg-yellow-400',
  '10': 'bg-green-600',
  '5': 'bg-slate-100 ring-1 ring-black/10',
  '2.5': 'bg-slate-800',
  '1.25': 'bg-slate-400',
};
const HEIGHT: Record<string, number> = { '25': 100, '20': 100, '15': 88, '10': 76, '5': 58, '2.5': 46, '1.25': 38 };

function readBar() {
  try {
    const v = Number(localStorage.getItem(BAR_KEY));
    return BARS.includes(v) && localStorage.getItem(BAR_KEY) !== null ? v : 20;
  } catch {
    return 20;
  }
}

/** Калькулятор блинов: что повесить на каждую сторону штанги. */
export function PlateSheet({ open, initial, onClose }: { open: boolean; initial: number | null; onClose: () => void }) {
  const [target, setTarget] = useState<number | null>(initial);
  const [bar, setBar] = useState(readBar);
  useEffect(() => {
    if (open) setTarget(initial);
  }, [open, initial]);

  const pickBar = (b: number) => {
    setBar(b);
    try {
      localStorage.setItem(BAR_KEY, String(b));
    } catch {
      /* ignore */
    }
  };

  const res = target ? platesFor(target, bar) : null;

  return (
    <Sheet open={open} onClose={onClose} title="Калькулятор блинов">
      <div className="space-y-4">
        <Field label="Вес на штанге, кг">
          <NumInput value={target} onChange={setTarget} placeholder="например, 80" className="py-3 text-xl" />
        </Field>
        <div>
          <span className="eyebrow mb-1.5 block">Гриф</span>
          <div className="grid grid-cols-4 gap-2">
            {BARS.map((b) => (
              <Button key={b} variant={bar === b ? 'primary' : 'secondary'} className="px-2" onClick={() => pickBar(b)}>
                {b ? `${b} кг` : 'Без'}
              </Button>
            ))}
          </div>
        </div>

        {res && target && (
          <div className="rounded-2xl bg-fg/[.05] p-4">
            {target < bar ? (
              <p className="text-sm font-semibold text-fg/60">Вес меньше грифа ({bar} кг).</p>
            ) : res.plates.length === 0 ? (
              <p className="text-sm font-semibold text-fg/60">Только гриф — блины не нужны.</p>
            ) : (
              <>
                <div className="eyebrow">На каждую сторону</div>
                <div className="mt-3 flex h-28 items-center">
                  {/* от центра грифа к краю: втулка-упор, блины от тяжёлых к лёгким, конец грифа */}
                  <div className="h-3 flex-1 rounded-l bg-slate-400" />
                  <div className="h-6 w-2 bg-slate-500" />
                  {res.plates.map((p, i) => (
                    <div key={i} className={`mx-px w-4 rounded-[3px] ${COLORS[String(p)]}`} style={{ height: HEIGHT[String(p)] }} />
                  ))}
                  <div className="h-3 w-8 rounded-r bg-slate-400" />
                </div>
                <div className="mt-3 text-lg font-extrabold">{res.plates.map(fmtKg).join(' + ')} кг</div>
                <div className="text-xs font-semibold text-fg/50">
                  {res.plates.length} {res.plates.length === 1 ? 'блин' : res.plates.length < 5 ? 'блина' : 'блинов'} с каждой стороны · гриф {bar} кг
                </div>
              </>
            )}
            {res.rest > 0 && target >= bar && (
              <p className="mt-2 text-xs font-semibold text-amber-600">
                Точно не собрать: не хватает {fmtKg(res.rest)} кг (самый маленький блин 1,25 кг).
              </p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
