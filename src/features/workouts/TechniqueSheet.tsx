import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Sheet } from '../../components/ui';
import { techniqueOf } from '../../data/technique';

/** Техника выполнения: шаги и частые ошибки. */
export function TechniqueSheet({ name, onClose }: { name: string | null; onClose: () => void }) {
  const t = name ? techniqueOf(name) : null;
  return (
    <Sheet open={!!name && !!t} onClose={onClose} title={name ?? ''}>
      {t && (
        <div className="space-y-4">
          <section>
            <div className="eyebrow mb-2">Как выполнять</div>
            <ol className="space-y-2">
              {t.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-extrabold text-white">{i + 1}</span>
                  <span className="text-sm font-medium leading-snug">{s}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-2xl bg-red-500/[.07] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-red-600">
              <AlertTriangle size={14} strokeWidth={2.6} /> Частые ошибки
            </div>
            <ul className="space-y-1.5">
              {t.mistakes.map((m, i) => (
                <li key={i} className="text-sm font-medium leading-snug text-fg/80">
                  — {m}
                </li>
              ))}
            </ul>
          </section>
          <p className="flex items-center gap-1.5 text-xs font-medium text-fg/45">
            <CheckCircle2 size={14} className="text-gold" /> Начинайте с лёгкого веса и добавляйте, только когда техника стабильна.
          </p>
        </div>
      )}
    </Sheet>
  );
}

export const hasTechnique = (name: string) => !!techniqueOf(name);
