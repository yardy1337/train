import { useEffect, useState } from 'react';
import { Button, Field, NumInput, Sheet, TextInput } from '../../components/ui';
import type { CatalogProgram } from '../../data/programs';
import { patchOverride } from '../../data/programOverrides';

const LEVELS: CatalogProgram['level'][] = ['Новичок', 'Средний', 'Продвинутый'];

/** Режим редактора: название, подписи и описание встроенной программы. */
export function ProgramInfoSheet({ program, onClose }: { program: CatalogProgram | null; onClose: () => void }) {
  const [d, setD] = useState({ name: '', tagline: '', description: '', goal: '', equipment: '', level: 'Средний' as CatalogProgram['level'], daysPerWeek: 3 });
  useEffect(() => {
    if (program)
      setD({
        name: program.name,
        tagline: program.tagline,
        description: program.description,
        goal: program.goal,
        equipment: program.equipment,
        level: program.level,
        daysPerWeek: program.daysPerWeek,
      });
  }, [program]);

  const save = async () => {
    if (!program) return;
    await patchOverride(program.id, { ...d, name: d.name.trim() || program.name });
    onClose();
  };

  return (
    <Sheet open={!!program} onClose={onClose} title="Описание программы">
      <div className="space-y-3">
        <Field label="Название">
          <TextInput value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="Подпись на плитке">
          <TextInput value={d.tagline} onChange={(e) => setD({ ...d, tagline: e.target.value })} />
        </Field>
        <Field label="Описание">
          <textarea
            value={d.description}
            onChange={(e) => setD({ ...d, description: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-fg/10 bg-surface px-3.5 py-2.5 text-base text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label="Цель">
            <TextInput value={d.goal} onChange={(e) => setD({ ...d, goal: e.target.value })} />
          </Field>
          <Field label="Дней/нед">
            <NumInput decimal={false} value={d.daysPerWeek} onChange={(v) => setD({ ...d, daysPerWeek: Math.min(7, Math.max(1, Math.round(v ?? 3))) })} />
          </Field>
        </div>
        <Field label="Инвентарь">
          <TextInput value={d.equipment} onChange={(e) => setD({ ...d, equipment: e.target.value })} />
        </Field>
        <div>
          <span className="eyebrow mb-1.5 block">Уровень</span>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <Button key={l} variant={d.level === l ? 'primary' : 'secondary'} className="px-1" onClick={() => setD({ ...d, level: l })}>
                {l}
              </Button>
            ))}
          </div>
        </div>
        <Button variant="primary" className="w-full py-3" onClick={save}>
          Сохранить
        </Button>
      </div>
    </Sheet>
  );
}
