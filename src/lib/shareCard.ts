import type { Workout } from '../types';
import { formatDuration, parseISODate } from './date';
import { bestMap, isRecord } from './records';
import { doneSets, normName, tonnage } from './workout';

const W = 1080;
const H = 1920;
const NAVY = '#0b1f4b';
const NAVY2 = '#16306b';
const GOLD = '#c9a227';
const FONT = "'Manrope Variable', system-ui, sans-serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** Картинка-итог тренировки 1080×1920 (формат сторис). */
export async function workoutCard(w: Workout, history: Workout[]): Promise<Blob> {
  await document.fonts.load(`800 40px ${FONT}`).catch(() => undefined);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Фон
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, NAVY2);
  g.addColorStop(0.55, NAVY);
  g.addColorStop(1, '#050d24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.arc(W - 120, 260, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(140, H - 260, 300, 0, Math.PI * 2);
  ctx.fill();

  const pad = 90;
  // Заголовок
  ctx.fillStyle = GOLD;
  ctx.font = `800 34px ${FONT}`;
  ctx.letterSpacing = '6px';
  const date = parseISODate(w.date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  ctx.fillText(`ТРЕНИРОВКА · ${date}`, pad, 220);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#fff';
  ctx.font = `800 92px ${FONT}`;
  ctx.fillText(fitText(ctx, w.dayName, W - pad * 2), pad, 340);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(fitText(ctx, w.dayTitle, W - pad * 2), pad, 420);

  // Показатели
  const before = history.filter((h) => h.status === 'done' && h.startedAt < w.startedAt);
  const best = bestMap(before);
  let records = 0;
  for (const e of w.exercises) {
    const b = best.get(normName(e.name));
    let hit = false;
    for (const s of e.sets) if (isRecord(s, b)) hit = true;
    if (hit) records++;
  }
  const sets = w.exercises.reduce((t, e) => t + doneSets(e.sets).length, 0);
  const tons = tonnage(w) / 1000;
  const stats: [string, string][] = [
    [w.finishedAt ? formatDuration(w.finishedAt - w.startedAt) : '—', 'время'],
    [`${tons.toLocaleString('ru-RU', { maximumFractionDigits: tons < 10 ? 2 : 1 })} т`, 'поднято'],
    [String(sets), 'подходов'],
    [String(records), records === 1 ? 'рекорд' : records >= 2 && records <= 4 ? 'рекорда' : 'рекордов'],
  ];
  const cw = (W - pad * 2 - 30) / 2;
  stats.forEach(([v, l], i) => {
    const x = pad + (i % 2) * (cw + 30);
    const y = 500 + Math.floor(i / 2) * 230;
    ctx.fillStyle = i === 3 && records ? GOLD : 'rgba(255,255,255,0.09)';
    roundRect(ctx, x, y, cw, 200, 36);
    ctx.fill();
    ctx.fillStyle = i === 3 && records ? NAVY : '#fff';
    ctx.font = `800 72px ${FONT}`;
    ctx.fillText(fitText(ctx, v, cw - 60), x + 40, y + 108);
    ctx.fillStyle = i === 3 && records ? 'rgba(11,31,75,0.7)' : 'rgba(255,255,255,0.6)';
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText(l, x + 40, y + 162);
  });

  // Упражнения
  let y = 1040;
  ctx.fillStyle = GOLD;
  ctx.font = `800 32px ${FONT}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('УПРАЖНЕНИЯ', pad, y);
  ctx.letterSpacing = '0px';
  y += 40;
  const list = w.exercises.filter((e) => doneSets(e.sets).length).slice(0, 7);
  for (const e of list) {
    const ds = doneSets(e.sets);
    const top = ds.reduce((a, s) => ((s.weight ?? 0) > (a.weight ?? 0) ? s : a), ds[0]);
    const right = top.weight ? `${String(top.weight).replace('.', ',')} кг × ${top.reps}` : `${top.reps} повт.`;
    y += 92;
    ctx.font = `800 40px ${FONT}`;
    const rw = ctx.measureText(right).width;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(right, W - pad, y);
    ctx.textAlign = 'left';
    ctx.font = `700 40px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(fitText(ctx, e.name, W - pad * 2 - rw - 40), pad, y);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(pad, y + 30, W - pad * 2, 2);
  }

  // Подпись
  ctx.fillStyle = GOLD;
  roundRect(ctx, pad, H - 200, 16, 80, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText('Мой тренер', pad + 44, H - 150);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText('тренировки · питание · прогресс', pad + 44, H - 104);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'));
}

/** Поделиться картинкой (меню «Поделиться» на телефоне) или скачать её. */
export async function shareImage(blob: Blob, name: string) {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
