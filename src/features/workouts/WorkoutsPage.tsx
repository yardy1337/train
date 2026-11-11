import { useState, type ReactNode } from 'react';
import { StackView, rectOf, type Rect, type StackLayer } from '../../components/StackView';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Check, ChevronRight, Dumbbell, History, Pin, PinOff, Play, Settings, SlidersHorizontal, Target } from 'lucide-react';
import { db } from '../../db/db';
import { setSetting, useSetting } from '../../db/settings';
import { Button, Card, IconButton, PageHeader, BackButton } from '../../components/ui';
import { Item, Screen } from '../../components/motion';
import { ACTIVE_PROGRAM_KEY, DEFAULT_PROGRAM_ID, PROGRAMS, findProgram, programOfDay, templateDays, type CatalogProgram } from '../../data/programs';
import { scrollToTop } from '../../lib/smoothScroll';
import { useBackEntry } from '../../lib/backNav';
import { createWorkout, formatTarget, nextDayId } from '../../lib/workout';
import { formatShort } from '../../lib/date';
import { pluralRu } from '../../lib/format';
import type { ProgramDay, Workout } from '../../types';
import { useActiveWorkout, useHistory, useProgram } from './hooks';
import { ActiveWorkout } from './ActiveWorkout';
import { ProgramEditor } from './ProgramEditor';
import { WorkoutHistory } from './WorkoutHistory';
import { WeekStrip } from './WeekStrip';
import { SettingsSheet } from '../settings/SettingsSheet';

/** «Доброе утро · понедельник, 10 ноября» */
function greeting() {
  const d = new Date();
  const h = d.getHours();
  const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  return `${hello} · ${d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`;
}

const PINNED_KEY = 'pinnedProgram';

type View = { name: 'home' } | { name: 'program'; id: string; origin?: Rect } | { name: 'editor' } | { name: 'history' };


export function WorkoutsPage() {
  const [view, setView] = useState<View>({ name: 'home' });
  const days = useProgram();
  const history = useHistory();
  const active = useActiveWorkout();
  const activeProgramId = useSetting<string>(ACTIVE_PROGRAM_KEY, DEFAULT_PROGRAM_ID);

  // Свайп / системный «назад»: из редактора — на страницу программы, с остальных экранов — на главный.
  useBackEntry(view.name !== 'home', () => setView({ name: 'home' }));
  useBackEntry(view.name === 'editor', () => setView({ name: 'program', id: activeProgramId }));

  const start = async (day: ProgramDay) => {
    await db.workouts.add(createWorkout(day, history));
  };

  // Редактируемая программа (с вашими правками) хранится в базе, остальные — шаблоны каталога.
  const daysOf = (p: CatalogProgram) => (p.id === activeProgramId ? days : templateDays(p));
  // «Моя программа» — та, по которой была последняя тренировка.
  const lastDayId = history[0]?.dayId;
  const lastUsedId =
    !lastDayId || days.some((d) => d.id === lastDayId) ? activeProgramId : programOfDay(lastDayId)?.id ?? activeProgramId;
  // Закреплённая программа всегда сверху; иначе — та, по которой была последняя тренировка.
  // По умолчанию закреплена «Верх / Низ»; если пользователь открепит — сохранится null.
  const pinnedRaw = useSetting<string | null>(PINNED_KEY, DEFAULT_PROGRAM_ID);
  const pinnedId = pinnedRaw && PROGRAMS.some((p) => p.id === pinnedRaw) ? pinnedRaw : null;
  const currentId = pinnedId ?? lastUsedId;
  const togglePin = (id: string) => setSetting(PINNED_KEY, pinnedId === id ? null : id);

  // Стек экранов как на iPhone: главный внизу, программа / редактор / история — слоями поверх.
  const layers: StackLayer[] = [];
  if (view.name === 'program' || view.name === 'editor') {
    const pid = view.name === 'program' ? view.id : activeProgramId;
    const program = findProgram(pid);
    layers.push({
      key: `program-${pid}`,
      origin: view.name === 'program' ? view.origin : undefined,
      node: (
        <ProgramPage
          program={program}
          isCurrent={pid === currentId}
          pinned={pid === pinnedId}
          onTogglePin={() => togglePin(pid)}
          canEdit={pid === activeProgramId}
          days={daysOf(program)}
          history={history}
          onBack={() => setView({ name: 'home' })}
          onEdit={() => setView({ name: 'editor' })}
          onStart={start}
        />
      ),
    });
  }
  if (view.name === 'editor')
    layers.push({ key: 'editor', node: <ProgramEditor onBack={() => setView({ name: 'program', id: activeProgramId })} /> });
  if (view.name === 'history') layers.push({ key: 'history', node: <WorkoutHistory onBack={() => setView({ name: 'home' })} /> });

  return (
    <motion.div exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}>
      <AnimatePresence mode="wait" onExitComplete={scrollToTop}>
        {active ? (
          <ActiveWorkout key={`active-${active.id}`} initial={active} history={history} />
        ) : active === null ? (
          <motion.div key="stack" exit={{ opacity: 0, transition: { duration: 0.14 } }}>
            <StackView
              // Свайп от края: экран уже уехал — дальше обычный «назад» через историю.
              onSwipeBack={() => window.history.back()}
              layers={layers}
              base={
                <CatalogHome
                  days={daysOf(findProgram(currentId))}
                  history={history}
                  activeProgramId={currentId}
                  pinnedId={pinnedId}
                  onOpen={(id, origin) => setView({ name: 'program', id, origin })}
                  onHistory={() => setView({ name: 'history' })}
                  onStart={start}
                />
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Главный экран: моя программа + каталог ---------- */

function CatalogHome({
  days,
  history,
  activeProgramId,
  pinnedId,
  onOpen,
  onHistory,
  onStart,
}: {
  days: ProgramDay[];
  history: Workout[];
  activeProgramId: string;
  pinnedId: string | null;
  onOpen: (id: string, origin?: Rect) => void;
  onHistory: () => void;
  onStart: (d: ProgramDay) => void;
}) {
  const [settings, setSettings] = useState(false);
  const mine = findProgram(activeProgramId);
  const nextId = nextDayId(days, history.filter((w) => days.some((d) => d.id === w.dayId)));
  const next = days.find((d) => d.id === nextId);

  return (
    <Screen>
      <PageHeader
        title="Тренировки"
        subtitle={greeting()}
        right={
          <div className="flex gap-2">
            <IconButton label="История" onClick={onHistory} className="bg-white/10 text-white active:bg-white/20">
              <History size={18} />
            </IconButton>
            <IconButton label="Настройки" onClick={() => setSettings(true)} className="bg-white/10 text-white active:bg-white/20">
              <Settings size={18} />
            </IconButton>
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-6">
        <Item>
          <div data-tile="dark" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-2 via-navy to-[#071636] p-5 text-white shadow-lift">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[.06]" />
            <div className="pointer-events-none absolute -bottom-14 right-12 h-32 w-32 rounded-full bg-white/[.07]" />
            <button className="relative block w-full text-left" onClick={(e) => onOpen(mine.id, rectOf(e.currentTarget.closest('[data-tile]') ?? e.currentTarget))}>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                {pinnedId === mine.id && <Pin size={12} strokeWidth={2.6} />}
                {pinnedId === mine.id ? 'Закреплённая программа' : 'Моя программа'}
              </div>
              <div className="mt-1 flex items-center gap-1 text-3xl font-extrabold tracking-tight">
                {mine.name}
                <ChevronRight size={26} strokeWidth={2.6} className="opacity-70" />
              </div>
              <div className="mt-0.5 text-sm font-semibold text-white/75">{mine.tagline}</div>
            </button>
            {next && (
              <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/12 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-white/65">Следующая</div>
                  <div className="truncate font-extrabold">
                    {next.name} · {next.title}
                  </div>
                </div>
                <button
                  onClick={() => onStart(next)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-extrabold text-ink shadow-gold transition-transform active:scale-95"
                >
                  <Play size={14} fill="currentColor" /> Начать
                </button>
              </div>
            )}
          </div>
        </Item>

        <WeekStrip history={history} plan={mine.daysPerWeek} index={1} />

        <Item index={2} className="flex items-baseline justify-between pt-3">
          <div className="eyebrow">Каталог программ</div>
          <div className="text-xs font-bold text-fg/35">{PROGRAMS.length}</div>
        </Item>

        {[...PROGRAMS].sort((a, b) => Number(b.id === pinnedId) - Number(a.id === pinnedId)).map((p, i) => (
          <Card key={p.id} index={i + 3} className="p-0">
            <button className="flex w-full items-center gap-3 p-4 text-left active:bg-fg/[.02]" onClick={(e) => onOpen(p.id, rectOf(e.currentTarget))}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Dumbbell size={22} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-lg font-extrabold tracking-tight">{p.name}</span>
                  {p.id === pinnedId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink">
                      <Pin size={10} strokeWidth={3} /> закреплена
                    </span>
                  ) : (
                    p.id === activeProgramId && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-fg">
                        моя
                      </span>
                    )
                  )}
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-fg/50">{p.tagline}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip>{p.level}</Chip>
                  <Chip>
                    {p.daysPerWeek} {pluralRu(p.daysPerWeek, 'день', 'дня', 'дней')}/нед
                  </Chip>
                  <Chip>{p.goal}</Chip>
                </div>
              </div>
              <ChevronRight size={20} className="shrink-0 text-fg/25" />
            </button>
          </Card>
        ))}

        <Item index={PROGRAMS.length + 3}>
          <p className="px-2 pt-2 text-center text-xs font-medium text-fg/35">Скоро здесь появятся новые программы</p>
        </Item>
      </div>
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </Screen>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-lg bg-fg/[.05] px-2 py-0.5 text-[11px] font-bold text-fg/55">{children}</span>;
}

/* ---------- Страница программы ---------- */

function ProgramPage({
  program,
  isCurrent,
  canEdit,
  pinned,
  onTogglePin,
  days,
  history,
  onBack,
  onEdit,
  onStart,
}: {
  program: CatalogProgram;
  /** По этой программе была последняя тренировка. */
  isCurrent: boolean;
  /** Это ваша редактируемая программа (правки хранятся в базе). */
  canEdit: boolean;
  pinned: boolean;
  onTogglePin: () => void;
  days: ProgramDay[];
  history: Workout[];
  onBack: () => void;
  onEdit: () => void;
  onStart: (d: ProgramDay) => void;
}) {
  const own = history.filter((w) => days.some((d) => d.id === w.dayId));
  const nextId = nextDayId(days, own);
  const lastByDay = (id: string) => own.find((w) => w.dayId === id);

  return (
    <Screen kind="push">
      <PageHeader
        title={program.name}
        left={<BackButton onClick={onBack} />}
        right={
          <div className="flex gap-1">
            <IconButton
              label={pinned ? 'Открепить программу' : 'Закрепить программу'}
              onClick={onTogglePin}
              aria-pressed={pinned}
              className={pinned ? 'bg-gold text-ink active:bg-gold-strong' : 'bg-white/10 text-white active:bg-white/20'}
            >
              {pinned ? <PinOff size={18} /> : <Pin size={18} />}
            </IconButton>
            {canEdit && (
              <IconButton label="Редактировать программу" onClick={onEdit} className="bg-white/10 text-white active:bg-white/20">
                <SlidersHorizontal size={18} />
              </IconButton>
            )}
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-6">
        <Card index={0} className="space-y-3">
          <p className="text-sm font-medium leading-relaxed text-fg/70">{program.description}</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={<CalendarDays size={16} />} label="В неделю" value={`${program.daysPerWeek} ${pluralRu(program.daysPerWeek, 'день', 'дня', 'дней')}`} />
            <Stat icon={<Target size={16} />} label="Цель" value={program.goal} />
            <Stat icon={<Dumbbell size={16} />} label="Уровень" value={program.level} />
          </div>
          <div className="text-xs font-semibold text-fg/45">Инвентарь: {program.equipment}</div>
          {isCurrent && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-strong">
              <Check size={14} strokeWidth={3} /> Вы занимаетесь по этой программе
            </div>
          )}
        </Card>

        {days.map((d, i) => {
          const isNext = d.id === nextId;
          const last = lastByDay(d.id);
          return (
            <Card key={d.id} index={i + 1} className={isNext ? 'border-gold/60 ring-4 ring-gold/15' : ''}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight">{d.name}</h2>
                    {isNext && (
                      <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink">
                        следующая
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-fg/55">
                    {d.title}
                    {last && <span className="text-fg/45"> · была {formatShort(last.date)}</span>}
                  </div>
                </div>
                  <Button variant={isNext ? 'primary' : 'secondary'} onClick={() => onStart(d)}>
                    <Play size={14} fill="currentColor" /> Начать
                  </Button>
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-fg/[.06] pt-3 text-sm">
                {d.exercises.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <span className="flex-1 font-medium text-fg/80">
                      {e.name}
                      {e.note && (e.repsMin || e.repsMax) ? <span className="text-fg/40"> · {e.note}</span> : null}
                    </span>
                    <span className="font-semibold tabular-nums text-fg/40">{formatTarget(e.sets, e.repsMin, e.repsMax, e.note)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg px-2.5 py-2">
      <div className="flex items-center gap-1 text-fg/40">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-0.5 text-sm font-extrabold leading-tight">{value}</div>
    </div>
  );
}
