import { Camera, Ruler, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db } from '../../db/db';
import { Button, Card, Field, NumInput, Sheet, TextInput } from '../../components/ui';
import { formatShort, todayISO } from '../../lib/date';
import { fmt } from '../../lib/format';
import type { Measurement } from '../../types';

const FIELDS = [
  { id: 'chest', label: 'Грудь' },
  { id: 'waist', label: 'Талия' },
  { id: 'arm', label: 'Бицепс' },
  { id: 'hips', label: 'Ягодицы' },
  { id: 'thigh', label: 'Бедро' },
] as const;
type FieldId = (typeof FIELDS)[number]['id'];

const EMPTY: Measurement[] = [];

/** Сжимаем фото до ~1080 px по длинной стороне, JPEG — чтобы база не раздувалась. */
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, 1080 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Measurements({ index }: { index: number }) {
  const list = useLiveQuery(() => db.measurements.orderBy('date').reverse().toArray(), [], EMPTY);
  const [edit, setEdit] = useState<Measurement | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const last = list[0];
  const first = list[list.length - 1];
  const photos = list.filter((m) => m.photo);

  return (
    <>
    <Card index={index} className="space-y-3">
      <div className="flex items-center gap-2">
        <Ruler size={20} strokeWidth={2.4} className="text-gold" />
        <h2 className="flex-1 text-lg font-extrabold tracking-tight">Замеры и фото</h2>
        <Button variant="primary" className="px-3 py-2" onClick={() => setEdit({ date: todayISO() })}>
          + Замер
        </Button>
      </div>
      {!list.length ? (
        <p className="text-sm font-medium text-fg/50">Раз в 2–4 недели меряй обхваты сантиметровой лентой утром и делай фото в одной позе и свете.</p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {FIELDS.map((f) => {
              const v = last?.[f.id];
              const d = v && first !== last && first?.[f.id] ? v - first[f.id]! : null;
              return (
                <div key={f.id} className="rounded-xl bg-fg/[.05] px-1 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-fg/45">{f.label}</div>
                  <div className="text-base font-extrabold tabular-nums">{v ? fmt(v) : '—'}</div>
                  {d !== null && d !== 0 && (
                    <div className={`text-[10px] font-bold tabular-nums ${f.id === 'waist' ? (d > 0 ? 'text-amber-600' : 'text-green-600') : d > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {d > 0 ? '+' : ''}
                      {fmt(d)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {first !== last && <p className="text-[11px] font-medium text-fg/40">Изменения — с первого замера ({formatShort(first.date)})</p>}

          {photos.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="eyebrow">Фото</span>
                {photos.length > 1 && (
                  <button className="text-xs font-bold text-accent" onClick={() => setCompare(true)}>
                    До / после
                  </button>
                )}
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {photos.map((m) => (
                  <button key={m.id} className="shrink-0" onClick={() => setPhoto(m.photo!)}>
                    <img src={m.photo} alt={`Фото ${formatShort(m.date)}`} className="h-28 w-20 rounded-xl object-cover" />
                    <div className="mt-0.5 text-[10px] font-bold text-fg/45">{formatShort(m.date)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="divide-y divide-fg/[.06] text-sm">
            {list.slice(0, 6).map((m) => (
              <li key={m.id}>
                <button className="flex w-full items-center gap-2 py-2 text-left" onClick={() => setEdit(m)}>
                  <span className="w-16 shrink-0 font-bold">{formatShort(m.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg/55">
                    {FIELDS.filter((f) => m[f.id]).map((f) => `${f.label.toLowerCase()} ${fmt(m[f.id]!)}`).join(' · ') || 'только фото'}
                  </span>
                  {m.photo && <Camera size={14} className="shrink-0 text-fg/40" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>

      {edit && <EditSheet m={edit} onClose={() => setEdit(null)} />}

      <Sheet open={!!photo} onClose={() => setPhoto(null)} title="Фото">
        {photo && <img src={photo} alt="" className="w-full rounded-2xl" />}
      </Sheet>
      <Sheet open={compare} onClose={() => setCompare(false)} title="До / после">
        {compare && photos.length > 1 && (
          <div className="grid grid-cols-2 gap-2">
            {[photos[photos.length - 1], photos[0]].map((m, k) => (
              <div key={m.id}>
                <img src={m.photo} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
                <div className="mt-1 text-center text-xs font-bold text-fg/55">
                  {k ? 'Сейчас' : 'Было'} · {formatShort(m.date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}

function EditSheet({ m, onClose }: { m: Measurement; onClose: () => void }) {
  const [d, setD] = useState<Measurement>(m);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    const existing = await db.measurements.where('date').equals(d.date).first();
    const id = d.id ?? existing?.id;
    if (existing && existing.id !== d.id && d.id) await db.measurements.delete(existing.id!);
    await db.measurements.put({ ...existing, ...d, id });
    onClose();
  };
  const remove = async () => {
    if (d.id && confirm('Удалить этот замер?')) {
      await db.measurements.delete(d.id);
      onClose();
    }
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      setD({ ...d, photo: await compress(f) });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Sheet open onClose={onClose} title={m.id ? 'Замер' : 'Новый замер'}>
      <div className="space-y-3">
        <Field label="Дата">
          <TextInput type="date" value={d.date} max={todayISO()} onChange={(e) => setD({ ...d, date: e.target.value || todayISO() })} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map((f) => (
            <Field key={f.id} label={`${f.label}, см`}>
              <NumInput value={d[f.id as FieldId] ?? null} onChange={(v) => setD({ ...d, [f.id]: v ?? undefined })} placeholder="—" />
            </Field>
          ))}
        </div>
        {d.photo ? (
          <div className="relative">
            <img src={d.photo} alt="" className="max-h-72 w-full rounded-2xl object-cover" />
            <button className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white" onClick={() => setD({ ...d, photo: undefined })} aria-label="Убрать фото">
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <Button className="w-full py-3" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Camera size={16} strokeWidth={2.4} /> {busy ? 'Обработка…' : 'Добавить фото'}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-[11px] font-medium text-fg/40">Фото хранятся только на этом телефоне.</p>
        <Button variant="primary" className="w-full py-3" onClick={save}>
          Сохранить
        </Button>
        {m.id && (
          <Button variant="danger" className="w-full" onClick={remove}>
            Удалить
          </Button>
        )}
      </div>
    </Sheet>
  );
}
