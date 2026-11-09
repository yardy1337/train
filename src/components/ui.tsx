import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { parseNum } from '../lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-accent-strong text-zinc-950 active:bg-accent font-semibold',
  secondary: 'bg-zinc-800 text-zinc-100 active:bg-zinc-700',
  ghost: 'bg-transparent text-zinc-300 active:bg-zinc-800',
  danger: 'bg-red-500/15 text-red-400 active:bg-red-500/25',
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-zinc-950/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-4">
        {left}
        <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="-ml-2 rounded-lg p-2 text-zinc-300 active:bg-zinc-800" aria-label="Назад">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

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
      className={`w-full rounded-lg bg-zinc-800 px-2 py-2 text-center text-base text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-accent ${className}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl bg-zinc-800 px-3 py-2.5 text-base text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-accent ${props.className ?? ''}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-400">{label}</span>
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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  full?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`pb-safe flex w-full max-w-lg flex-col bg-zinc-900 ring-1 ring-white/10 ${
          full ? 'pt-safe h-full' : 'max-h-[90dvh] rounded-t-3xl'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <h2 className="flex-1 truncate text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 active:bg-zinc-800" aria-label="Закрыть">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
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
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-zinc-300">
          {Math.round(value)} <span className="text-zinc-500">/ {Math.round(goal)} {unit}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={`mt-0.5 text-right text-xs ${over ? 'text-amber-400' : 'text-zinc-500'}`}>
        {over ? `перебор ${Math.round(-left)} ${unit}` : `осталось ${Math.round(left)} ${unit}`}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-zinc-500">{children}</p>;
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
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-800/70 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
            value === o.id ? 'bg-zinc-950 font-semibold text-accent' : 'text-zinc-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
