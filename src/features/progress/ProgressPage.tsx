import { Screen } from '../../components/motion';
import { Settings, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../../db/db';
import { Button, Card, Empty, Field, IconButton, NumInput, PageHeader, Segmented, TextInput } from '../../components/ui';
import { Records } from './Records';
import { Measurements } from './Measurements';
import { SettingsSheet } from '../settings/SettingsSheet';
import { formatShort, todayISO } from '../../lib/date';
import { fmt } from '../../lib/format';
import { calcPace, exerciseNames, exerciseSeries } from '../../lib/progress';
import { downloadBackup, importData } from '../../lib/backup';
import type { WeightEntry } from '../../types';
import { useHistory } from '../workouts/hooks';
import { useFeature } from '../../lib/features';

const EMPTY: WeightEntry[] = [];

/** Цвета графиков под текущую тему (в SVG-атрибутах CSS-переменные не работают). */
function useChart() {
  const dark = useFeature('dark');
  const fg = dark ? '232 236 246' : '11 31 75';
  return {
    line: dark ? '#8fa8e8' : '#0b1f4b',
    dotFill: dark ? '#0d1a3b' : '#fff',
    grid: `rgb(${fg} / 0.08)`,
    axis: { stroke: `rgb(${fg} / 0.45)`, fontSize: 11, tickLine: false, axisLine: false } as const,
    tooltip: {
      contentStyle: { background: 'var(--color-surface)', color: 'var(--color-fg)', border: `1px solid rgb(${fg} / 0.1)`, borderRadius: 12, fontSize: 12, fontWeight: 600, boxShadow: '0 8px 24px -8px rgb(0 0 0 / 0.25)' },
      labelStyle: { color: `rgb(${fg} / 0.5)` },
    },
  };
}

export function ProgressPage() {
  const [settings, setSettings] = useState(false);
  const measurements = useFeature('measurements');
  return (
    <Screen>
      <PageHeader
        title="Прогресс"
        right={
          <IconButton label="Настройки" onClick={() => setSettings(true)} className="bg-white/10 text-white active:bg-white/20">
            <Settings size={18} />
          </IconButton>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        <BodyWeight />
        {measurements && <Measurements index={2} />}
        <Records index={2} />
        <ExerciseProgress />
        <Backup />
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </Screen>
  );
}

function BodyWeight() {
  const entries = useLiveQuery(() => db.weights.orderBy('date').toArray(), [], EMPTY);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const pace = useMemo(() => calcPace(entries), [entries]);
  const ch = useChart();

  const save = async () => {
    if (!weight || weight < 30 || weight > 300) return;
    const existing = await db.weights.where('date').equals(date).first();
    if (existing?.id) await db.weights.update(existing.id, { weight });
    else await db.weights.add({ date, weight });
    setWeight(null);
  };

  const data = entries.map((e) => ({ date: formatShort(e.date), weight: e.weight }));
  const last = entries[entries.length - 1];
  const toneClass = { good: 'bg-gold-soft text-accent', warn: 'bg-amber-500/10 text-amber-600', bad: 'bg-red-500/10 text-red-600' };
  const list = [...entries].reverse();

  return (
    <Card index={1} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold tracking-tight">Вес тела</h2>
        {last && <span className="text-3xl font-extrabold tabular-nums tracking-tight">{fmt(last.weight)} кг</span>}
      </div>
      <p className="text-xs text-fg/45">Взвешивайся утром натощак, раз в неделю в один и тот же день.</p>
      <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
        <Field label="Дата">
          <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
        <Field label="Вес, кг">
          <NumInput value={weight} onChange={setWeight} placeholder={last ? fmt(last.weight) : '70'} className="py-2.5" />
        </Field>
        <Button variant="primary" onClick={save} disabled={!weight}>
          OK
        </Button>
      </div>

      {pace ? (
        <div className={`rounded-xl px-3 py-2 text-sm ${toneClass[pace.tone]}`}>
          <div className="font-semibold">
            Темп: {pace.perWeek >= 0 ? '+' : ''}
            {fmt(pace.perWeek, 2)} кг/нед
          </div>
          <div>{pace.advice}</div>
        </div>
      ) : (
        <p className="rounded-xl bg-fg/[.04] px-3 py-2 text-sm text-fg/55">
          Нужно минимум 2 взвешивания с разницей от 5 дней, чтобы посчитать темп набора.
        </p>
      )}

      {data.length >= 2 ? (
        <div className="h-48 -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={ch.grid} vertical={false} />
              <XAxis dataKey="date" {...ch.axis} minTickGap={16} />
              <YAxis {...ch.axis} width={40} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => fmt(v, 1)} />
              <Tooltip {...ch.tooltip} formatter={(v) => [`${fmt(Number(v))} кг`, 'Вес']} />
              <Line isAnimationActive={false} type="monotone" dataKey="weight" stroke={ch.line} strokeWidth={2.5} dot={{ r: 3, fill: ch.dotFill, stroke: ch.line, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {list.length > 0 && (
        <div>
          <ul className="divide-y divide-fg/[.06] text-sm">
            {(showAll ? list : list.slice(0, 4)).map((e, i) => {
              const prev = list[i + 1];
              const diff = prev ? e.weight - prev.weight : null;
              return (
                <li key={e.id} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1 text-fg/55">{formatShort(e.date)}</span>
                  {diff !== null && (
                    <span className={`text-xs tabular-nums ${diff >= 0 ? 'text-accent' : 'text-amber-600'}`}>
                      {diff >= 0 ? '+' : ''}
                      {fmt(diff)}
                    </span>
                  )}
                  <span className="w-16 text-right tabular-nums">{fmt(e.weight)} кг</span>
                  <button className="grid h-8 w-8 place-items-center rounded-full text-fg/30 active:bg-fg/[.06]" onClick={() => e.id && db.weights.delete(e.id)} aria-label="Удалить">
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </li>
              );
            })}
          </ul>
          {list.length > 4 && (
            <button className="mt-1 text-xs text-fg/55" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Свернуть' : `Показать все (${list.length})`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function ExerciseProgress() {
  const history = useHistory();
  const names = useMemo(() => exerciseNames(history), [history]);
  const [selected, setSelected] = useState<string>('');
  const [metric, setMetric] = useState<'weight' | 'e1rm'>('weight');
  const name = names.includes(selected) ? selected : names[0];
  const series = useMemo(() => (name ? exerciseSeries(history, name) : []), [history, name]);
  const data = series.map((p) => ({ ...p, label: formatShort(p.date) }));
  const first = series[0];
  const last = series[series.length - 1];
  const ch = useChart();

  return (
    <Card index={2} className="space-y-3">
      <h2 className="text-lg font-extrabold tracking-tight">Рабочие веса</h2>
      {!names.length ? (
        <Empty>Заверши первую тренировку — здесь появятся графики по упражнениям</Empty>
      ) : (
        <>
          <select
            value={name}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl bg-fg/[.05] px-3 py-2.5 text-base text-fg outline-none"
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { id: 'weight', label: 'Макс. рабочий вес' },
              { id: 'e1rm', label: 'Расчётный 1ПМ' },
            ]}
          />
          {first && last && series.length > 1 && (
            <p className="text-sm text-fg/55">
              {fmt(first[metric])} → <span className="font-semibold text-fg">{fmt(last[metric])} кг</span>
              {last[metric] - first[metric] !== 0 && (
                <span className={last[metric] > first[metric] ? 'text-accent' : 'text-amber-600'}>
                  {' '}
                  ({last[metric] > first[metric] ? '+' : ''}
                  {fmt(last[metric] - first[metric])} кг)
                </span>
              )}{' '}
              за {series.length} тренировок
            </p>
          )}
          <div className="h-52 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={ch.grid} vertical={false} />
                <XAxis dataKey="label" {...ch.axis} minTickGap={16} />
                <YAxis {...ch.axis} width={40} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v, 0)} />
                <Tooltip {...ch.tooltip} formatter={(v) => [`${fmt(Number(v))} кг`, metric === 'weight' ? 'Вес' : '1ПМ']} />
                <Line isAnimationActive={false} type="monotone" dataKey={metric} stroke="#c9a227" strokeWidth={2.5} dot={{ r: 3, fill: ch.dotFill, stroke: '#c9a227', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

function Backup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!confirm('Импорт заменит ВСЕ текущие данные содержимым файла. Продолжить?')) return;
    try {
      await importData(file);
      setMsg('Данные восстановлены из резервной копии');
    } catch (e) {
      setMsg(e instanceof Error ? `Ошибка: ${e.message}` : 'Не удалось прочитать файл');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card index={3} className="space-y-3">
      <h2 className="text-lg font-extrabold tracking-tight">Резервная копия</h2>
      <p className="text-xs text-fg/45">
        Все данные хранятся только на этом устройстве. Периодически сохраняй копию в JSON — её можно перенести на другой телефон.
      </p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => downloadBackup().then(() => setMsg('Файл сохранён'))}>
          ⬇ Экспорт
        </Button>
        <Button className="flex-1" onClick={() => fileRef.current?.click()}>
          ⬆ Импорт
        </Button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {msg && <p className="text-sm text-fg/75">{msg}</p>}
    </Card>
  );
}
