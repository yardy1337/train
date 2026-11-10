import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, X } from 'lucide-react';
import { parseNum } from '../lib/format';
import { itemVariants, spring } from './motion';
import { lockScroll } from '../lib/smoothScroll';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white font-bold shadow-lift active:bg-accent-strong',
  secondary: 'bg-accent-soft text-fg font-semibold active:bg-fg/10',
  ghost: 'bg-transparent text-fg/70 font-semibold active:bg-fg/[.06]',
  gold: 'bg-gold text-navy font-extrabold shadow-gold active:bg-gold-strong',
  danger: 'bg-red-500/15 text-red-600 font-semibold active:bg-red-500/25',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm transition-[background-color,transform] duration-150 active:scale-[.97] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  );
}

/** Круглая кнопка-иконка (назад, закрыть, добавить и т. п.). */
export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      // Цвет и фон по умолчанию — только если их не задали снаружи (иначе классы спорят).
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${/(^|\s)text-/.test(className) ? '' : 'text-fg/60'} ${/(^|\s)active:bg-/.test(className) ? '' : 'active:bg-fg/[.06]'} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  layout,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  layout?: boolean;
  /** Порядковый номер в списке — для появления «лесенкой». */
  index?: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      custom={index}
      layout={layout}
      transition={layout ? spring : undefined}
      className={`rounded-2xl border border-fg/[.06] bg-surface shadow-card ${/(^|\s)p-\d/.test(className) ? '' : 'p-4'} ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** Тёмно-синяя шапка экрана со скруглённым низом — «рамка» над светлым контентом. */
export function PageHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 mb-4 rounded-b-[28px] bg-navy text-white shadow-lift">
      <div className="flex min-h-16 items-center gap-1 px-4 pb-3 pt-3">
        {left}
        <div className="min-w-0 flex-1">
          {subtitle && <div className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{subtitle}</div>}
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Назад" onClick={onClick} className="-ml-2 text-white active:bg-white/10">
      <ChevronLeft size={24} strokeWidth={2.4} />
    </IconButton>
  );
}

const inputBase =
  'w-full rounded-xl border border-fg/10 bg-surface text-base text-fg outline-none transition-colors placeholder:text-fg/35 focus:border-accent focus:ring-4 focus:ring-accent/15';

/**
 * Числовое поле: хранит текст локально, чтобы можно было набрать «22,» без потери ввода.
 */
export function NumInput({
  value,
  onChange,
  placeholder,
  className = '',
  ariaLabel,
  decimal = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  decimal?: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  useEffect(() => {
    if (parseNum(text) !== value) setText(value === null ? '' : String(value).replace('.', ','));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,]/g, '');
        setText(t);
        onChange(parseNum(t));
      }}
      className={`${inputBase} px-2 py-2 text-center font-semibold tabular-nums ${className}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} px-3.5 py-2.5 ${props.className ?? ''}`} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

/** Нижняя шторка/полноэкранное окно. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
  lazy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  full?: boolean;
  /** Рисовать содержимое только после того, как шторка выехала (для тяжёлых списков). */
  lazy?: boolean;
}) {
  const [ready, setReady] = useState(!lazy);
  useEffect(() => {
    if (!open) {
      setReady(!lazy);
      return;
    }
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      unlock();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, lazy]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            // Плавный «выезд» без пружины: короче и не дёргается на слабых телефонах.
            transition={{ duration: full ? 0.26 : 0.3, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => setReady(true)}
            style={{ willChange: 'transform' }}
            className={`pb-safe flex w-full max-w-lg flex-col bg-surface shadow-xl ${
              full ? 'pt-safe h-full' : 'max-h-[90dvh] rounded-t-[28px]'
            }`}
          >
            {!full && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-fg/10" />}
            <div className="flex items-center gap-2 px-5 pb-2 pt-3">
              <h2 className="flex-1 truncate text-lg font-extrabold tracking-tight">{title}</h2>
              <IconButton label="Закрыть" onClick={onClose} className="-mr-2 bg-fg/[.05]">
                <X size={18} strokeWidth={2.4} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
              {ready ? (
                children
              ) : (
                <div className="space-y-3 pt-1" aria-hidden>
                  <div className="h-11 rounded-xl bg-fg/[.05]" />
                  <div className="h-10 rounded-2xl bg-fg/[.04]" />
                  <div className="h-16 rounded-2xl bg-fg/[.03]" />
                  <div className="h-16 rounded-2xl bg-fg/[.03]" />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ProgressBar({
  label,
  value,
  goal,
  unit,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const left = goal - value;
  const over = left < 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums font-bold">
          {Math.round(value)} <span className="font-medium text-fg/40">/ {Math.round(goal)} {unit}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-fg/[.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        />
      </div>
      <div className={`mt-1 text-right text-[11px] font-semibold tabular-nums ${over ? 'text-amber-600' : 'text-fg/40'}`}>
        {over ? `перебор ${Math.round(-left)} ${unit}` : `осталось ${Math.round(left)} ${unit}`}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm font-medium text-fg/40">{children}</p>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-fg/[.05] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`relative flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            value === o.id ? 'text-fg' : 'text-fg/45'
          }`}
        >
          {value === o.id && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.id).join('-')}`}
              className="absolute inset-0 rounded-xl bg-surface shadow-card"
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
