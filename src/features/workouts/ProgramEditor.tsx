import { Screen, spring } from '../../components/motion';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { db } from '../../db/db';
import { createDefaultProgram } from '../../data/defaultProgram';
import { BackButton, Button, Card, Field, NumInput, PageHeader, Sheet, TextInput } from '../../components/ui';
import { uid } from '../../lib/date';
import { formatTarget } from '../../lib/workout';
import type { ProgramDay, ProgramExercise } from '../../types';
import { useProgram } from './hooks';
import { ExercisePicker } from './ExercisePicker';
import { defaultsFor } from '../../data/exercises';

const emptyExercise = (): ProgramExercise => ({ id: uid(), name: '', sets: 3, repsMin: 8, repsMax: 12, rest: 60 });

export function ProgramEditor({ onBack }: { onBack: () => void }) {
  const days = useProgram();
  const [editing, setEditing] = useState<{ dayId: string; ex: ProgramExercise; isNew: boolean } | null>(null);
  // После выбора из справочника поле «Название» перестаёт фильтровать список.
  const [picked, setPicked] = useState(false);
  const openEditor = (v: { dayId: string; ex: ProgramExercise; isNew: boolean }) => {
    setPicked(false);
    setEditing(v);
  };

  const saveDay = (day: ProgramDay) => db.programDays.put(day);

  const move = (day: ProgramDay, idx: number, dir: -1 | 1) => {
    const list = [...day.exercises];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    saveDay({ ...day, exercises: list });
  };

  const removeEx = (day: ProgramDay, id: string) => {
    if (confirm('Удалить упражнение из программы? История тренировок сохранится.'))
      saveDay({ ...day, exercises: day.exercises.filter((e) => e.id !== id) });
  };

  const saveExercise = () => {
    if (!editing || !editing.ex.name.trim()) return;
    const day = days.find((d) => d.id === editing.dayId);
    if (!day) return;
    const ex = { ...editing.ex, name: editing.ex.name.trim() };
    const exercises = editing.isNew
      ? [...day.exercises, ex]
      : day.exercises.map((e) => (e.id === ex.id ? ex : e));
    saveDay({ ...day, exercises });
    setEditing(null);
  };

  const addDay = () => {
    const letter = String.fromCharCode(65 + days.length);
    db.programDays.put({
      id: uid(),
      order: (days[days.length - 1]?.order ?? -1) + 1,
      name: `День ${letter}`,
      title: 'Новый день',
      exercises: [],
    });
  };

  const removeDay = (day: ProgramDay) => {
    if (confirm(`Удалить «${day.name}» из программы?`)) db.programDays.delete(day.id);
  };

  const reset = async () => {
    if (!confirm('Вернуть программу по умолчанию? Ваши изменения в программе пропадут (история останется).')) return;
    await db.transaction('rw', db.programDays, async () => {
      await db.programDays.clear();
      await db.programDays.bulkAdd(createDefaultProgram());
    });
  };

  const setEx = (patch: Partial<ProgramExercise>) => editing && setEditing({ ...editing, ex: { ...editing.ex, ...patch } });

  return (
    <Screen kind="push">
      <PageHeader title="Редактор программы" left={<BackButton onClick={onBack} />} />
      <div className="space-y-3 px-4 pb-4">
        {days.map((day) => (
          <Card key={day.id}>
            <div className="mb-3 grid grid-cols-[6rem_1fr_auto] gap-2">
              <TextInput
                aria-label="Название дня"
                defaultValue={day.name}
                onBlur={(e) => e.target.value.trim() && saveDay({ ...day, name: e.target.value.trim() })}
              />
              <TextInput
                aria-label="Описание дня"
                defaultValue={day.title}
                onBlur={(e) => saveDay({ ...day, title: e.target.value.trim() })}
              />
              <button onClick={() => removeDay(day)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-red-600 active:bg-red-50" aria-label="Удалить день">
                <Trash2 size={18} />
              </button>
            </div>
            <ul className="divide-y divide-fg/[.06]">
              {day.exercises.map((e, idx) => (
                <motion.li key={e.id} layout transition={spring} className="flex items-center gap-1 py-2">
                  <button
                    className="flex-1 text-left"
                    onClick={() => openEditor({ dayId: day.id, ex: { ...e }, isNew: false })}
                  >
                    <div className="text-sm font-semibold">{e.name}</div>
                    <div className="text-xs text-fg/45">
                      {formatTarget(e.sets, e.repsMin, e.repsMax, e.note)}
                      {e.note && (e.repsMin || e.repsMax) ? ` · ${e.note}` : ''} · {e.rest} с
                    </div>
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-full text-fg/45 active:bg-fg/[.06]" onClick={() => move(day, idx, -1)} aria-label="Выше">
                    <ArrowUp size={16} />
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-full text-fg/45 active:bg-fg/[.06]" onClick={() => move(day, idx, 1)} aria-label="Ниже">
                    <ArrowDown size={16} />
                  </button>
                  <button className="grid h-8 w-8 place-items-center rounded-full text-red-600 active:bg-red-50" onClick={() => removeEx(day, e.id)} aria-label="Удалить">
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </motion.li>
              ))}
            </ul>
            <Button
              className="mt-2 w-full"
              onClick={() => openEditor({ dayId: day.id, ex: emptyExercise(), isNew: true })}
            >
              <Plus size={16} strokeWidth={2.6} /> Добавить упражнение
            </Button>
          </Card>
        ))}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={addDay}>
            <Plus size={16} strokeWidth={2.6} /> Добавить день
          </Button>
          <Button variant="danger" onClick={reset}>
            Сбросить
          </Button>
        </div>
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.isNew ? 'Новое упражнение' : 'Упражнение'}
      >
        {editing && (
          <div className="space-y-3">
            <Field label="Название">
              <TextInput
                value={editing.ex.name}
                onChange={(e) => {
                  setPicked(false);
                  setEx({ name: e.target.value });
                }}
                placeholder="Поиск или своё название"
              />
            </Field>
            {editing.isNew && (
              <ExercisePicker
                query={picked ? '' : editing.ex.name}
                taken={new Set((days.find((d) => d.id === editing.dayId)?.exercises ?? []).map((e) => e.name.toLowerCase().replace(/ё/g, 'е')))}
                onPick={(c) => {
                  setPicked(true);
                  setEx({ name: c.name, ...defaultsFor(c.kind) });
                }}
              />
            )}
            <div className="grid grid-cols-3 gap-2">
              <Field label="Подходы">
                <NumInput decimal={false} value={editing.ex.sets} onChange={(v) => setEx({ sets: Math.max(1, Math.round(v ?? 1)) })} />
              </Field>
              <Field label="Повторы от">
                <NumInput decimal={false} value={editing.ex.repsMin || null} placeholder="—" onChange={(v) => setEx({ repsMin: Math.round(v ?? 0) })} />
              </Field>
              <Field label="Повторы до">
                <NumInput decimal={false} value={editing.ex.repsMax || null} placeholder="—" onChange={(v) => setEx({ repsMax: Math.round(v ?? 0) })} />
              </Field>
            </div>
            <Field label="Пояснение (необязательно)">
              <TextInput
                value={editing.ex.note ?? ''}
                onChange={(e) => setEx({ note: e.target.value || undefined })}
                placeholder="на каждую ногу, пауза 2 сек, почти до отказа…"
              />
            </Field>
            <Field label="Отдых между подходами">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 90, l: 'Базовое · 90 с' },
                  { v: 60, l: 'Изоляция · 60 с' },
                ].map((o) => (
                  <Button
                    key={o.v}
                    variant={editing.ex.rest === o.v ? 'primary' : 'secondary'}
                    className="px-2 text-xs"
                    onClick={() => setEx({ rest: o.v })}
                  >
                    {o.l}
                  </Button>
                ))}
                <NumInput decimal={false} value={editing.ex.rest} onChange={(v) => setEx({ rest: Math.max(10, Math.round(v ?? 60)) })} ariaLabel="Отдых, секунд" />
              </div>
            </Field>
            <p className="text-xs text-fg/45">
              Подсказка «Увеличь вес» появится, когда во всех подходах будет достигнута верхняя граница повторов.
            </p>
            <Button variant="primary" className="w-full py-3" disabled={!editing.ex.name.trim()} onClick={saveExercise}>
              Сохранить
            </Button>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
