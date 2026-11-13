import { AlertTriangle, Bot, ChevronDown, FlaskConical, RotateCcw, Stethoscope, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Sheet } from '../../components/ui';
import { RED_FLAGS, SYMPTOM_GROUPS, analyze, type Result } from '../../data/hormones';

/** Карточка на вкладке «Прогресс»: вход в советчика. */
export function HormoneCard({ index }: { index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card index={index} className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy text-gold">
          <Bot size={24} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">Советчик по гормонам</div>
          <div className="text-xs font-medium text-fg/55">Отметь, что беспокоит, — подскажу возможную причину и что делать</div>
        </div>
        <Button variant="gold" className="shrink-0 px-3" onClick={() => setOpen(true)}>
          Открыть
        </Button>
      </Card>
      <HormoneSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Окно советчика — открывается с карточки на «Прогрессе» и значком робота на главном экране. */
export function HormoneSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Советчик по гормонам" full>
      {open && <Advisor />}
    </Sheet>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-end gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-gold">
        <Bot size={16} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 max-w-[88%] rounded-2xl rounded-bl-md bg-fg/[.06] px-3.5 py-2.5 text-sm font-medium leading-snug">{children}</div>
    </motion.div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm font-semibold text-white">{children}</div>
    </motion.div>
  );
}

function Typing() {
  return (
    <BotBubble>
      <span className="flex gap-1 py-1">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-2 w-2 rounded-full bg-fg/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </span>
    </BotBubble>
  );
}

/** «Дефицит витамина D» → «дефицит витамина D» (только первая буква). */
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const LABEL = Object.fromEntries(SYMPTOM_GROUPS.flatMap((g) => g.items.map((s) => [s.id, s.label])));

function Advisor() {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<'pick' | 'thinking' | 'result'>('pick');
  const [results, setResults] = useState<Result[]>([]);
  const answerRef = useRef<HTMLDivElement>(null);

  // После «Разобрать» — к началу ответа.
  useEffect(() => {
    if (stage !== 'pick') answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [stage]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = () => {
    setStage('thinking');
    setResults(analyze(picked));
    setTimeout(() => setStage('result'), 900);
  };
  const reset = () => {
    setPicked(new Set());
    setResults([]);
    setStage('pick');
  };

  const top = results.filter((r) => r.level !== 'низкая').slice(0, 3);
  const shown = top.length ? top : results.slice(0, 2);
  const more = results.filter((r) => !shown.includes(r));
  const flags = [...picked].filter((id) => RED_FLAGS[id]);

  return (
    <div className="space-y-3 pb-4">
      <BotBubble>
        Привет! Я подскажу, какие гормоны могут стоять за самочувствием, и как это поправить.
        <br />
        <b>Отметь всё, что беспокоит</b> последние недели.
      </BotBubble>

      {stage === 'pick' ? (
        <div className="space-y-3">
          {SYMPTOM_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="eyebrow mb-1.5">{g.title}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((s) => {
                  const on = picked.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95 ${on ? 'border-accent bg-accent text-white' : 'border-fg/12 bg-surface text-fg/70'}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-surface via-surface to-transparent px-5 pb-1 pt-4">
            <Button variant="primary" className="w-full py-3" disabled={!picked.size} onClick={run}>
              <Sparkles size={16} /> {picked.size ? `Разобрать (${picked.size})` : 'Выбери хотя бы один пункт'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div ref={answerRef} className="scroll-mt-2" />
          <UserBubble>{[...picked].map((id) => LABEL[id]).join(', ')}</UserBubble>
          {stage === 'thinking' ? (
            <Typing />
          ) : (
            <>
              {flags.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 rounded-2xl border border-red-500/30 bg-red-500/[.07] p-3 text-sm font-semibold text-red-700">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    {flags.map((f) => (
                      <p key={f}>{RED_FLAGS[f]}</p>
                    ))}
                  </div>
                </motion.div>
              )}
              <BotBubble>
                {shown.length ? (
                  <>
                    По твоим ответам больше всего похоже на:{' '}
                    <b>{shown.map((r) => lower(r.condition.title)).join(', ')}</b>. Нажми на причину — расскажу, что делать и какие анализы сдать.
                  </>
                ) : (
                  'Явной гормональной причины по этим пунктам не видно.'
                )}
              </BotBubble>
              {shown.map((r, i) => (
                <ResultCard key={r.condition.id} r={r} defaultOpen={i === 0} delay={0.1 + i * 0.1} />
              ))}
              {more.length > 0 && (
                <BotBubble>
                  Менее вероятно, но тоже возможно: {more.map((r) => lower(r.condition.title)).join(', ')}.
                </BotBubble>
              )}
              <BotBubble>
                Это не диагноз, а подсказка. Точно скажут только анализы и врач — эндокринолог или андролог. Не начинай гормональные препараты и «бустеры» без назначения.
              </BotBubble>
              <Button className="w-full" onClick={reset}>
                <RotateCcw size={15} /> Начать заново
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

const LEVEL_STYLE: Record<Result['level'], string> = {
  высокая: 'bg-gold text-ink',
  средняя: 'bg-gold-soft text-gold-strong',
  низкая: 'bg-fg/[.06] text-fg/55',
};

function ResultCard({ r, defaultOpen, delay }: { r: Result; defaultOpen: boolean; delay: number }) {
  const [open, setOpen] = useState(defaultOpen);
  const c = r.condition;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }} className="ml-10 overflow-hidden rounded-2xl border border-fg/[.08] bg-surface shadow-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 p-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold leading-tight">{c.title}</span>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${LEVEL_STYLE[r.level]}`}>
            вероятность {r.level}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-fg/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-fg/[.06] p-3 text-sm">
              <p className="font-medium leading-snug text-fg/75">{c.about}</p>
              <div>
                <div className="eyebrow mb-1.5">Что делать</div>
                <ul className="space-y-1.5">
                  {c.advice.map((a) => (
                    <li key={a} className="flex gap-2 font-medium leading-snug">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-accent-soft p-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold">
                  <FlaskConical size={14} /> Какие анализы сдать
                </div>
                <p className="text-xs font-medium leading-snug text-fg/75">{c.tests.join(' · ')}</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold leading-snug text-fg/60">
                <Stethoscope size={15} className="mt-0.5 shrink-0 text-fg/45" />
                {c.doctor}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
