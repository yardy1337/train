import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, Segmented } from '../../components/ui';
import { MuscleMap as BodyMap, type Highlight, type MuscleGroup } from 'js-rich-body-highlighter/react';
import { useFeature } from '../../lib/features';
import { pluralRu } from '../../lib/format';
import { MUSCLES, TARGET, weeklySets, type Muscle } from '../../lib/muscles';
import { useHistory } from '../workouts/hooks';

/** Наши группы мышц → группы на анатомическом рисунке (js-rich-body-highlighter, MIT). */
const GROUPS: Record<Muscle, MuscleGroup[]> = {
  Грудь: ['chest'],
  Спина: ['lats', 'upper_back', 'lower_back'],
  Плечи: ['shoulders'],
  Бицепс: ['biceps'],
  Трицепс: ['triceps'],
  Предплечья: ['forearms'],
  'Пресс и кор': ['abs', 'obliques'],
  Квадрицепс: ['quads'],
  'Ягодицы и бицепс бедра': ['glutes', 'hamstrings'],
  Икры: ['calves'],
};
const muscleOfGroup = (g: string) => (Object.keys(GROUPS) as Muscle[]).find((m) => GROUPS[m].includes(g as MuscleGroup)) ?? null;

/** Из чего состоит группа — подпись в списке. */
const PARTS: Record<Muscle, string> = {
  Грудь: 'грудные',
  Спина: 'широчайшие, трапеции, поясница',
  Плечи: 'передние, средние и задние дельты',
  Бицепс: 'бицепс плеча',
  Трицепс: 'трицепс',
  Предплечья: 'сгибатели и разгибатели',
  'Пресс и кор': 'прямая и косые мышцы живота',
  Квадрицепс: 'квадрицепсы, приводящие',
  'Ягодицы и бицепс бедра': 'ягодичные, бицепсы бедра',
  Икры: 'икроножные, камбаловидные',
};

const IDLE = 'color-mix(in srgb, var(--color-fg) 13%, var(--color-surface))';

export function color(sets: number) {
  if (!sets) return IDLE;
  if (sets > TARGET.max) return '#d97706';
  if (sets >= TARGET.min) return 'var(--color-gold)';
  return `color-mix(in srgb, var(--color-gold) ${35 + Math.round((sets / TARGET.min) * 45)}%, ${IDLE})`;
}

function status(n: number) {
  if (!n) return 'не было';
  if (n < TARGET.min) return 'мало';
  if (n > TARGET.max) return 'много';
  return 'норма';
}

/** Цвет подсветки на рисунке: мало — светлое золото, норма — золото, много — оранжевый. */
function tint(n: number) {
  if (n > TARGET.max) return '#e0301e';
  if (n >= TARGET.min) return '#f08a00';
  return '#f5b82e';
}

/** Мышечная карта: реалистичный силуэт спереди/сзади и список задействованных мышц за 7 дней. */
export function MuscleMap({ index }: { index: number }) {
  const history = useHistory();
  const sets = useMemo(() => weeklySets(history), [history]);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<Muscle | null>(null);
  const worked = MUSCLES.filter((m) => sets[m] > 0).sort((a, b) => sets[b] - sets[a]);
  const idle = MUSCLES.filter((m) => !sets[m]);
  const total = MUSCLES.reduce((t, m) => t + sets[m], 0);
  const lagging = MUSCLES.filter((m) => sets[m] < TARGET.min);
  const dark = useFeature('dark');
  const highlights = useMemo<Highlight[]>(
    () =>
      MUSCLES.flatMap((m) => {
        const n = sets[m];
        const on = n > 0 || m === selected;
        if (!on) return [];
        const intensity = m === selected ? 100 : Math.min(100, 60 + Math.round((n / TARGET.max) * 40));
        return GROUPS[m].map((group) => ({ group, intensity, color: n ? tint(n) : '#8fa8e8' }));
      }),
    [sets, selected],
  );

  return (
    <Card index={index} className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={20} strokeWidth={2.4} className="text-gold" />
        <h2 className="flex-1 text-lg font-extrabold tracking-tight">Мышцы за 7 дней</h2>
        <span className="text-sm font-bold tabular-nums text-fg/40">
          {total} {pluralRu(total, 'подход', 'подхода', 'подходов')}
        </span>
      </div>
      <Segmented
        value={side}
        onChange={setSide}
        options={[
          { id: 'front', label: 'Спереди' },
          { id: 'back', label: 'Сзади' },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
        <div className="self-start">
          <BodyMap
            view={side}
            gender="male"
            theme={dark ? 'dark' : 'light'}
            width="100%"
            highlights={highlights}
            hoverHighlight={false}
            onMuscleClick={(t) => {
              const m = muscleOfGroup(t.group);
              if (m) setSelected(selected === m ? null : m);
            }}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="eyebrow">Задействованы</div>
          {!worked.length && <p className="text-xs font-semibold text-fg/45">Пока ничего — заверши тренировку, и мышцы загорятся</p>}
          {worked.map((m) => (
            <button
              key={m}
              onClick={() => setSelected(selected === m ? null : m)}
              className={`flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors ${selected === m ? 'bg-accent-soft' : 'active:bg-fg/[.04]'}`}
            >
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sets[m] ? tint(sets[m]) : color(0) }} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-1">
                  <span className="truncate text-sm font-bold">{m}</span>
                  <span className="shrink-0 text-xs font-extrabold tabular-nums">{sets[m]}</span>
                </span>
                <span className="block text-[11px] font-medium leading-tight text-fg/45">
                  {status(sets[m])} · {PARTS[m]}
                </span>
              </span>
            </button>
          ))}
          {idle.length > 0 && worked.length > 0 && (
            <div className="px-2 pt-1 text-[11px] font-semibold leading-snug text-fg/40">
              Не было: {idle.map((m) => m.toLowerCase()).join(', ')}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl bg-fg/[.04] px-3 py-2 text-sm font-bold">
          {selected}: <span className="tabular-nums">{sets[selected]}</span> {pluralRu(sets[selected], 'подход', 'подхода', 'подходов')} · {status(sets[selected])}
          <div className="text-xs font-medium text-fg/50">{PARTS[selected]}</div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-fg/50">
        {[
          [0, 'не было'],
          [5, 'мало'],
          [12, 'норма 10–20'],
          [25, 'много'],
        ].map(([n, t]) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: n ? tint(n as number) : color(0) }} />
            {t}
          </span>
        ))}
      </div>
      {total > 0 && lagging.length > 0 && lagging.length < MUSCLES.length && (
        <p className="text-xs font-semibold text-fg/55">
          Отстают: <span className="font-bold text-fg">{lagging.map((m) => m.toLowerCase()).join(', ')}</span>. Для роста — примерно 10–20 рабочих подходов на мышцу в неделю.
        </p>
      )}
    </Card>
  );
}
