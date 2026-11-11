import { Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Field, NumInput, Segmented, Sheet, TextInput } from '../../components/ui';
import { MUSCLE_GROUPS, allExercises, type ExerciseKind, type MuscleGroup } from '../../data/exercises';
import { originalTechnique, techniqueOf } from '../../data/technique';
import { adminFetch, getConfig, setAdminToken, useAppConfig } from '../../lib/appConfig';
import { FEATURES, GLOBAL_FEATURES } from '../../lib/features';
import { uid } from '../../lib/date';
import { normName } from '../../lib/workout';
import { SaveStatus, useSave } from './AdminPrograms';

const area = 'w-full rounded-xl border border-fg/10 bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/15';
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-fg/15'}`}
    >
      <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ===== Объявление =====
export function AdminAnnouncement() {
  const cfg = useAppConfig();
  const [s, save] = useSave();
  const [d, setD] = useState({ title: cfg.announcement?.title ?? '', text: cfg.announcement?.text ?? '', on: cfg.announcement?.on ?? false });
  const changed = d.title !== (cfg.announcement?.title ?? '') || d.text !== (cfg.announcement?.text ?? '');
  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-fg/60">Баннер вверху экрана «Тренировки» у всех пользователей. Каждый может его закрыть; новое объявление покажется снова.</p>
      <Field label="Заголовок">
        <TextInput value={d.title} maxLength={80} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Например, Новая программа!" />
      </Field>
      <Field label="Текст">
        <textarea value={d.text} rows={4} maxLength={500} onChange={(e) => setD({ ...d, text: e.target.value })} className={area} />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-fg/[.04] px-3 py-2.5">
        <span className="text-sm font-bold">Показывать</span>
        <Toggle on={d.on} label="Показывать объявление" onChange={(on) => setD({ ...d, on })} />
      </div>
      <SaveStatus s={s} />
      <Button
        variant="primary"
        className="w-full py-3"
        onClick={() =>
          save((c) => ({
            ...c,
            // Новый текст — новый id, чтобы объявление показалось и тем, кто закрыл прошлое.
            announcement: { id: changed || !c.announcement?.id ? uid().slice(0, 8) : c.announcement.id, title: d.title.trim(), text: d.text.trim(), on: d.on },
          }))
        }
      >
        Сохранить
      </Button>
    </Card>
  );
}

// ===== Функции =====
export function AdminFeatures() {
  const cfg = useAppConfig();
  const [s, save] = useSave();
  const disabled = new Set(cfg.features?.disabled ?? []);
  const defaults = new Set(cfg.features?.defaults ?? []);
  const set = (list: 'disabled' | 'defaults', id: string, on: boolean) =>
    save((c) => {
      const cur = new Set(c.features?.[list] ?? []);
      if (on) cur.add(id);
      else cur.delete(id);
      return { ...c, features: { ...c.features, [list]: [...cur] } };
    });
  return (
    <>
      <SaveStatus s={s} />
      <Card className="space-y-1 p-0">
        <div className="eyebrow px-4 pt-4">Возможности приложения</div>
        {GLOBAL_FEATURES.map((f) => (
          <div key={f.id} className="flex items-center gap-3 border-t border-fg/[.06] px-4 py-3 first-of-type:border-0">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{f.title}</span>
              <span className="block text-xs font-medium text-fg/50">{f.hint}</span>
            </span>
            <Toggle on={!disabled.has(f.id)} label={`${f.title}: доступна`} onChange={(on) => set('disabled', f.id, !on)} />
          </div>
        ))}
      </Card>
      <Card className="space-y-1 p-0">
        <div className="eyebrow px-4 pt-4">Функции из настроек</div>
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-fg/40">
          <span />
          <span className="w-12 text-center">Есть</span>
          <span className="w-12 text-center">Вкл. сразу</span>
        </div>
        {FEATURES.map((f) => (
          <div key={f.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-fg/[.06] px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-bold">{f.title}</span>
              <span className="block text-xs font-medium text-fg/50">{f.group}</span>
            </span>
            <Toggle on={!disabled.has(f.id)} label={`${f.title}: доступна`} onChange={(on) => set('disabled', f.id, !on)} />
            <Toggle on={defaults.has(f.id)} label={`${f.title}: включена по умолчанию`} onChange={(on) => set('defaults', f.id, on)} />
          </div>
        ))}
      </Card>
      <p className="px-1 text-xs font-medium text-fg/45">«Есть» — функция видна пользователям. «Вкл. сразу» — включена у тех, кто сам её не переключал.</p>
    </>
  );
}

// ===== Упражнения и техника =====
export function AdminTechnique() {
  const cfg = useAppConfig();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => {
    const k = normName(q);
    return allExercises()
      .filter((e) => !k || normName(e.name).includes(k))
      .slice(0, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cfg]);
  return (
    <>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/35" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск упражнения" className="pl-9" />
      </div>
      <Button className="w-full" onClick={() => setAdding(true)}>
        <Plus size={16} strokeWidth={2.6} /> Добавить упражнение в справочник
      </Button>
      <Card className="p-0">
        <ul className="divide-y divide-fg/[.06]">
          {list.map((e) => {
            const edited = !!cfg.technique?.[normName(e.name)];
            const has = !!techniqueOf(e.name);
            return (
              <li key={e.name}>
                <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left" onClick={() => setEdit(e.name)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{e.name}</span>
                    <span className="block text-[11px] font-semibold text-fg/45">{e.group}</span>
                  </span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${edited ? 'bg-gold-soft text-gold-strong' : has ? 'bg-accent-soft text-fg/60' : 'bg-fg/[.05] text-fg/35'}`}>
                    {edited ? 'изменена' : has ? 'техника' : 'нет техники'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      {edit && <TechniqueEditor name={edit} onClose={() => setEdit(null)} />}
      <AddExerciseSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function TechniqueEditor({ name, onClose }: { name: string; onClose: () => void }) {
  const [s, save] = useSave();
  const cur = techniqueOf(name);
  const [steps, setSteps] = useState(cur?.steps.join('\n') ?? '');
  const [mistakes, setMistakes] = useState(cur?.mistakes.join('\n') ?? '');
  const key = normName(name);
  const isExtra = (getConfig().exercises ?? []).some((e) => normName(e.name) === key);
  return (
    <Sheet open onClose={onClose} title={name}>
      <div className="space-y-3">
        <label className="block">
          <span className="eyebrow mb-1.5 block">Как выполнять — каждый шаг с новой строки</span>
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={5} className={area} />
        </label>
        <label className="block">
          <span className="eyebrow mb-1.5 block">Частые ошибки — каждая с новой строки</span>
          <textarea value={mistakes} onChange={(e) => setMistakes(e.target.value)} rows={3} className={area} />
        </label>
        <SaveStatus s={s} />
        <Button variant="primary" className="w-full py-3" onClick={() => save((c) => ({ ...c, technique: { ...c.technique, [key]: { steps: lines(steps), mistakes: lines(mistakes) } } })).then(onClose)}>
          Сохранить для всех
        </Button>
        {originalTechnique(name) && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() =>
              save((c) => {
                const technique = { ...c.technique };
                delete technique[key];
                return { ...c, technique };
              }).then(onClose)
            }
          >
            Вернуть исходный текст
          </Button>
        )}
        {isExtra && (
          <Button
            variant="danger"
            className="w-full"
            onClick={() =>
              confirm(`Убрать «${name}» из справочника?`) &&
              save((c) => ({ ...c, exercises: (c.exercises ?? []).filter((e) => normName(e.name) !== key) })).then(onClose)
            }
          >
            Убрать из справочника
          </Button>
        )}
      </div>
    </Sheet>
  );
}

function AddExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, save] = useSave();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('Грудь');
  const [kind, setKind] = useState<ExerciseKind>('base');
  useEffect(() => {
    if (open) setName('');
  }, [open]);
  const exists = allExercises().some((e) => normName(e.name) === normName(name));
  return (
    <Sheet open={open} onClose={onClose} title="Новое упражнение">
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Жим Арнольда" />
        </Field>
        {exists && <p className="text-xs font-semibold text-amber-600">Такое упражнение уже есть</p>}
        <Field label="Группа мышц">
          <select value={group} onChange={(e) => setGroup(e.target.value as MuscleGroup)} className="w-full rounded-xl border border-fg/10 bg-surface px-3 py-2.5 text-base text-fg">
            {MUSCLE_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Segmented<ExerciseKind>
          value={kind}
          onChange={setKind}
          options={[
            { id: 'base', label: 'Базовое' },
            { id: 'iso', label: 'Изоляция' },
            { id: 'time', label: 'На время' },
          ]}
        />
        <SaveStatus s={s} />
        <Button
          variant="primary"
          className="w-full py-3"
          disabled={name.trim().length < 3 || exists}
          onClick={() => save((c) => ({ ...c, exercises: [...(c.exercises ?? []), { name: name.trim(), group, kind }] })).then(onClose)}
        >
          Добавить для всех
        </Button>
      </div>
    </Sheet>
  );
}

// ===== Продукты =====
interface AdminFood {
  id: number;
  code: string | null;
  name: string;
  brand: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  source: string;
  created_at: number;
}

const SOURCE_LABEL: Record<string, string> = { user: 'от пользователей', off: 'Open Food Facts', builtin: 'встроенный' };

export function AdminFoods() {
  const [q, setQ] = useState('');
  const [source, setSource] = useState<'user' | ''>('user');
  const [items, setItems] = useState<AdminFood[] | null>(null);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<AdminFood | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setItems(null);
      adminFetch<{ items: AdminFood[] }>(`/api/admin/foods?q=${encodeURIComponent(q)}&source=${source}`)
        .then((r) => {
          setItems(r.items);
          setError('');
        })
        .catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [q, source, tick]);
  return (
    <>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg/35" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или бренду" className="pl-9" />
      </div>
      <Segmented<'user' | ''>
        value={source}
        onChange={setSource}
        options={[
          { id: 'user', label: 'От пользователей' },
          { id: '', label: 'Все продукты' },
        ]}
      />
      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
      {!items && !error && (
        <div className="flex justify-center py-6 text-fg/40">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {items && (
        <Card className="p-0">
          {!items.length && <p className="py-8 text-center text-sm font-medium text-fg/45">Ничего не найдено</p>}
          <ul className="divide-y divide-fg/[.06]">
            {items.map((f) => (
              <li key={f.id}>
                <button className="w-full px-4 py-2.5 text-left" onClick={() => setEdit(f)}>
                  <div className="truncate text-sm font-bold">
                    {f.name}
                    {f.brand && <span className="font-medium text-fg/45"> · {f.brand}</span>}
                  </div>
                  <div className="text-[11px] font-semibold tabular-nums text-fg/45">
                    {Math.round(f.kcal)} ккал · Б {f.protein} · Ж {f.fat} · У {f.carbs} · {SOURCE_LABEL[f.source] ?? f.source} · {new Date(f.created_at * 1000).toLocaleDateString('ru-RU')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {edit && (
        <FoodEditor
          food={edit}
          onClose={(changed) => {
            setEdit(null);
            if (changed) setTick((t) => t + 1);
          }}
        />
      )}
    </>
  );
}

function FoodEditor({ food, onClose }: { food: AdminFood; onClose: (changed: boolean) => void }) {
  const [d, setD] = useState({ name: food.name, brand: food.brand, kcal: food.kcal, protein: food.protein, fat: food.fat, carbs: food.carbs });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onClose(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={() => onClose(false)} title="Продукт в общей библиотеке">
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="Бренд">
          <TextInput value={d.brand} onChange={(e) => setD({ ...d, brand: e.target.value })} />
        </Field>
        <div className="grid grid-cols-4 gap-2">
          {(['kcal', 'protein', 'fat', 'carbs'] as const).map((k) => (
            <Field key={k} label={{ kcal: 'Ккал', protein: 'Белки', fat: 'Жиры', carbs: 'Углев.' }[k]}>
              <NumInput value={d[k]} onChange={(v) => setD({ ...d, [k]: v ?? 0 })} />
            </Field>
          ))}
        </div>
        <p className="text-xs font-medium text-fg/45">На 100 г. Штрихкод: {food.code ?? 'нет'}</p>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button variant="primary" className="w-full py-3" disabled={busy} onClick={() => run(() => adminFetch(`/api/admin/foods/${food.id}`, { method: 'PUT', body: JSON.stringify(d) }))}>
          Сохранить
        </Button>
        <Button
          variant="danger"
          className="w-full"
          disabled={busy}
          onClick={() => confirm(`Удалить «${food.name}» из общей библиотеки?`) && run(() => adminFetch(`/api/admin/foods/${food.id}`, { method: 'DELETE' }))}
        >
          Удалить из библиотеки
        </Button>
      </div>
    </Sheet>
  );
}

// ===== Статистика =====
export function AdminStats() {
  const [d, setD] = useState<{ products: Record<string, number>; userAdded7d: number; photosDay: number; photosWeek: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    adminFetch<NonNullable<typeof d>>('/api/admin/stats')
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>;
  if (!d)
    return (
      <div className="flex justify-center py-6 text-fg/40">
        <Loader2 className="animate-spin" />
      </div>
    );
  const total = Object.values(d.products).reduce((a, b) => a + b, 0);
  const tiles: [string, number][] = [
    ['Продуктов в библиотеке', total],
    ['Добавили пользователи', d.products.user ?? 0],
    ['Из них за 7 дней', d.userAdded7d],
    ['Из Open Food Facts', d.products.off ?? 0],
    ['Фото еды за сутки', d.photosDay],
    ['Фото еды за неделю', d.photosWeek],
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map(([l, v]) => (
        <Card key={l} className="p-3">
          <div className="text-2xl font-extrabold tabular-nums">{v.toLocaleString('ru-RU')}</div>
          <div className="text-xs font-semibold text-fg/50">{l}</div>
        </Card>
      ))}
      <p className="col-span-2 px-1 text-xs font-medium text-fg/45">Приложение не собирает данные о пользователях — их тренировки и питание хранятся только у них на телефонах.</p>
    </div>
  );
}

// ===== Пароль и выход =====
export function AdminAccount({ onLogout }: { onLogout: () => void }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState('');
  const change = async () => {
    if (p1 !== p2) return setMsg('Пароли не совпадают');
    try {
      const r = await adminFetch<{ token: string }>('/api/admin/password', { method: 'POST', body: JSON.stringify({ password: p1 }) });
      setAdminToken(r.token);
      setP1('');
      setP2('');
      setMsg('Пароль изменён. На других устройствах нужно войти заново.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ошибка');
    }
  };
  return (
    <>
      <Card className="space-y-3">
        <Field label="Новый пароль">
          <TextInput type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Повторите">
          <TextInput type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" />
        </Field>
        {msg && <p className="text-sm font-semibold text-fg/70">{msg}</p>}
        <Button variant="primary" className="w-full" disabled={p1.length < 6} onClick={change}>
          Сменить пароль
        </Button>
      </Card>
      <Button
        variant="danger"
        className="w-full"
        onClick={() => {
          setAdminToken(null);
          onLogout();
        }}
      >
        Выйти из управления
      </Button>
    </>
  );
}
