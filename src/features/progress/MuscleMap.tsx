import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, Segmented } from '../../components/ui';
import { pluralRu } from '../../lib/format';
import { MUSCLES, TARGET, weeklySets, type Muscle } from '../../lib/muscles';
import { useHistory } from '../workouts/hooks';

type Shape = { m: Muscle; d: string };

// Стилизованный силуэт из сегментов (viewBox 100×200). Нейтральные части — голова, кисти, суставы, стопы.
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}h-${w - 2 * r}a${r} ${r} 0 0 1 -${r} -${r}v-${h - 2 * r}a${r} ${r} 0 0 1 ${r} -${r}z`;
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 -${2 * rx} 0z`;
const pair = (m: Muscle, f: (side: 1 | -1) => string): Shape[] => [{ m, d: f(-1) }, { m, d: f(1) }];
const mirror = (x: number, w: number, side: 1 | -1) => (side < 0 ? x : 100 - x - w);

const NEUTRAL = [ell(50, 15, 9, 10.5), rr(45.5, 24, 9, 7, 3), rr(38, 84, 24, 8, 3)];
const limbsNeutral = (side: 1 | -1) => [ell(side < 0 ? 22.5 : 77.5, 99, 4, 4.5), ell(side < 0 ? 42.5 : 57.5, 184, 6, 3.5), ell(side < 0 ? 42.5 : 57.5, 138, 4.5, 3)];

const FRONT: Shape[] = [
  ...pair('Плечи', (s) => ell(s < 0 ? 31 : 69, 39, 7.5, 6.5)),
  ...pair('Грудь', (s) => rr(mirror(36, 13.5, s), 34, 13.5, 17, 4)),
  { m: 'Пресс и кор', d: rr(40.5, 53.5, 19, 29, 5) },
  ...pair('Бицепс', (s) => rr(mirror(21, 8.5, s), 47, 8.5, 20, 4)),
  ...pair('Предплечья', (s) => rr(mirror(18.5, 8.5, s), 69.5, 8.5, 24, 4)),
  ...pair('Квадрицепс', (s) => rr(mirror(36, 13, s), 93.5, 13, 41, 6)),
  ...pair('Икры', (s) => rr(mirror(38, 9, s), 143, 9, 37, 4.5)),
];
const BACK: Shape[] = [
  ...pair('Плечи', (s) => ell(s < 0 ? 31 : 69, 39, 7.5, 6.5)),
  { m: 'Спина', d: 'M37 33h26a3 3 0 0 1 3 3l-5 34a4 4 0 0 1 -4 3.5h-14a4 4 0 0 1 -4 -3.5l-5 -34a3 3 0 0 1 3 -3z' },
  ...pair('Трицепс', (s) => rr(mirror(21, 8.5, s), 47, 8.5, 20, 4)),
  ...pair('Предплечья', (s) => rr(mirror(18.5, 8.5, s), 69.5, 8.5, 24, 4)),
  ...pair('Ягодицы и бицепс бедра', (s) => rr(mirror(37, 12.5, s), 76, 12.5, 18, 6)),
  ...pair('Ягодицы и бицепс бедра', (s) => rr(mirror(37, 12.5, s), 96.5, 12.5, 38, 6)),
  ...pair('Икры', (s) => rr(mirror(38, 9.5, s), 143, 9.5, 37, 5)),
];
const BACK_NEUTRAL = [ell(50, 15, 9, 10.5), rr(45.5, 24, 9, 7, 3)];

function color(sets: number) {
  if (!sets) return 'color-mix(in srgb, var(--color-fg) 9%, transparent)';
  if (sets > TARGET.max) return '#d97706';
  if (sets >= TARGET.min) return 'var(--color-gold)';
  return `color-mix(in srgb, var(--color-gold) ${30 + Math.round((sets / TARGET.min) * 45)}%, transparent)`;
}

function Figure({ shapes, neutral, sets, label, selected, onPick }: { shapes: Shape[]; neutral: string[]; sets: Record<Muscle, number>; label: string; selected: Muscle | null; onPick: (m: Muscle) => void }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 192" className="h-56 w-auto">
        {[...neutral, ...limbsNeutral(-1), ...limbsNeutral(1)].map((d, i) => (
          <path key={i} d={d} fill="color-mix(in srgb, var(--color-fg) 6%, transparent)" />
        ))}
        {shapes.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill={color(sets[s.m])}
            stroke={selected === s.m ? 'var(--color-fg)' : 'none'}
            strokeWidth={1.2}
            className="cursor-pointer transition-[fill] duration-500"
            onClick={() => onPick(s.m)}
          />
        ))}
      </svg>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-fg/40">{label}</span>
    </div>
  );
}

/** Мышечная карта: какие мышцы нагружены за последние 7 дней, а какие отстают. */
export function MuscleMap({ index }: { index: number }) {
  const history = useHistory();
  const sets = useMemo(() => weeklySets(history), [history]);
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const lagging = MUSCLES.filter((m) => sets[m] < TARGET.min);
  const total = MUSCLES.reduce((t, m) => t + sets[m], 0);

  return (
    <Card index={index} className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={20} strokeWidth={2.4} className="text-gold" />
        <h2 className="flex-1 text-lg font-extrabold tracking-tight">Мышцы за 7 дней</h2>
        <span className="text-sm font-bold tabular-nums text-fg/40">
          {total} {pluralRu(total, 'подход', 'подхода', 'подходов')}
        </span>
      </div>
      <Segmented value={view} onChange={setView} options={[{ id: 'map', label: 'Карта' }, { id: 'list', label: 'Списком' }]} />

      {view === 'map' ? (
        <>
          <div className="flex justify-center gap-6">
            <Figure shapes={FRONT} neutral={NEUTRAL} sets={sets} label="Спереди" selected={selected} onPick={setSelected} />
            <Figure shapes={BACK} neutral={BACK_NEUTRAL} sets={sets} label="Сзади" selected={selected} onPick={setSelected} />
          </div>
          <div className="rounded-xl bg-fg/[.04] px-3 py-2 text-center text-sm font-bold">
            {selected ? (
              <>
                {selected}: <span className="tabular-nums">{sets[selected]}</span> {pluralRu(sets[selected], 'подход', 'подхода', 'подходов')} · {status(sets[selected])}
              </>
            ) : (
              <span className="font-semibold text-fg/55">Нажми на мышцу, чтобы увидеть подходы</span>
            )}
          </div>
        </>
      ) : (
        <ul className="space-y-2">
          {MUSCLES.map((m) => (
            <li key={m}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-bold">{m}</span>
                <span className="text-xs font-bold tabular-nums text-fg/55">
                  {sets[m]} · {status(sets[m])}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-fg/[.07]">
                <div className="absolute inset-y-0 border-x border-fg/15" style={{ left: `${(TARGET.min / 25) * 100}%`, width: `${((TARGET.max - TARGET.min) / 25) * 100}%` }} />
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (sets[m] / 25) * 100)}%`, background: color(sets[m]) }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-fg/50">
        {[
          [0, 'не было'],
          [5, 'мало'],
          [12, 'норма 10–20'],
          [25, 'много'],
        ].map(([n, t]) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(n as number) }} />
            {t}
          </span>
        ))}
      </div>
      {total > 0 && lagging.length > 0 && lagging.length < MUSCLES.length && (
        <p className="text-xs font-semibold text-fg/55">
          Отстают: <span className="font-bold text-fg">{lagging.map((m) => m.toLowerCase()).join(', ')}</span>. Для роста нужно примерно 10–20 рабочих подходов на мышцу в неделю.
        </p>
      )}
    </Card>
  );
}

function status(n: number) {
  if (!n) return 'не было';
  if (n < TARGET.min) return 'мало';
  if (n > TARGET.max) return 'много';
  return 'норма';
}
