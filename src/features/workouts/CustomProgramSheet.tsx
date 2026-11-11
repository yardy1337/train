import { useEffect, useState } from 'react';
import { Button, Field, Sheet, TextInput } from '../../components/ui';
import { CUSTOM_COLORS, CUSTOM_ICONS } from '../../data/programLook';

export interface CustomProgramForm {
  name: string;
  icon: string;
  color: string;
  days: number;
}

/** Создание своей программы (или правка названия и значка). */
export function CustomProgramSheet({
  open,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial?: Omit<CustomProgramForm, 'days'>;
  onClose: () => void;
  onSave: (f: CustomProgramForm) => void;
  onDelete?: () => void;
}) {
  const [f, setF] = useState<CustomProgramForm>({ name: '', icon: 'dumbbell', color: CUSTOM_COLORS[0], days: 3 });
  useEffect(() => {
    if (open) setF({ name: initial?.name ?? '', icon: initial?.icon ?? 'dumbbell', color: initial?.color ?? CUSTOM_COLORS[0], days: 3 });
  }, [open, initial]);
  const editing = !!initial;
  const Icon = CUSTOM_ICONS[f.icon];

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Название и значок' : 'Своя программа'}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${f.color} 15%, transparent)`, color: f.color }}>
            <Icon size={26} strokeWidth={2.3} />
          </span>
          <div className="flex-1">
            <Field label="Название">
              <TextInput value={f.name} maxLength={40} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Например, Мой сплит" />
            </Field>
          </div>
        </div>

        <div>
          <span className="eyebrow mb-1.5 block">Значок</span>
          <div className="grid grid-cols-9 gap-1.5">
            {Object.entries(CUSTOM_ICONS).map(([key, I]) => (
              <button
                key={key}
                aria-label={key}
                onClick={() => setF({ ...f, icon: key })}
                className={`grid aspect-square place-items-center rounded-xl transition-colors ${f.icon === key ? 'bg-fg text-bg' : 'bg-fg/[.05] text-fg/60'}`}
              >
                <I size={18} strokeWidth={2.3} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="eyebrow mb-1.5 block">Цвет</span>
          <div className="flex gap-2">
            {CUSTOM_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Цвет ${c}`}
                onClick={() => setF({ ...f, color: c })}
                className={`h-9 flex-1 rounded-xl transition-transform ${f.color === c ? 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {!editing && (
          <div>
            <span className="eyebrow mb-1.5 block">Тренировочных дней</span>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Button key={n} variant={f.days === n ? 'primary' : 'secondary'} className="px-0" onClick={() => setF({ ...f, days: n })}>
                  {n}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs font-medium text-fg/45">Упражнения добавите в редакторе — он откроется сразу после создания.</p>
          </div>
        )}

        <Button variant="primary" className="w-full py-3" disabled={!f.name.trim()} onClick={() => onSave({ ...f, name: f.name.trim() })}>
          {editing ? 'Сохранить' : 'Создать программу'}
        </Button>
        {onDelete && (
          <Button variant="danger" className="w-full" onClick={onDelete}>
            Удалить программу
          </Button>
        )}
      </div>
    </Sheet>
  );
}
