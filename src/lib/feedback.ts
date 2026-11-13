/**
 * Звук и вибрация на телефоне.
 *
 * Звук: iPhone глушит Web Audio, если его включили не сразу после касания. Поэтому один
 * общий AudioContext «разблокируем» в момент нажатия (unlockAudio), а сигнал в конце отдыха
 * играем уже через него.
 *
 * Вибрация: на Android — navigator.vibrate. В Safari на iPhone её нет, но с iOS 18 нажатие
 * на системный переключатель (<input type="checkbox" switch>) даёт тактильный отклик —
 * им и пользуемся.
 */

type AudioSessionNav = Navigator & { audioSession?: { type: string } };

let ctx: AudioContext | null = null;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Вызывать в обработчике нажатия: после этого звук можно играть и позже, по таймеру. */
export function unlockAudio() {
  try {
    const nav = navigator as AudioSessionNav;
    // Короткие сигналы поверх музыки (музыка не останавливается, а приглушается).
    if (nav.audioSession) nav.audioSession.type = 'transient';
    const c = getCtx();
    if (!c) return;
    if (c.state !== 'running') void c.resume();
    // Беззвучный буфер окончательно «будит» звук на iOS.
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* ignore */
  }
}

/** Сигнал «отдых окончен»: три коротких тона. */
export function beep() {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state !== 'running') void c.resume();
    const t0 = c.currentTime + 0.02;
    [0, 0.22, 0.44].forEach((dt, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
      o.connect(g).connect(c.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.2);
    });
  } catch {
    /* звук недоступен */
  }
}

let switchLabel: HTMLLabelElement | null = null;
function iosTap() {
  if (!switchLabel) {
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    switchLabel = label;
  }
  switchLabel.click();
}

/** Вибрация: число — одиночный импульс (мс), массив — узор [вибрация, пауза, вибрация…]. */
export function haptic(pattern: number | number[] = 15) {
  try {
    if (typeof navigator.vibrate === 'function' && navigator.vibrate(pattern)) return;
  } catch {
    /* ignore */
  }
  // iPhone: по одному «тапу» на каждый импульс узора.
  const arr = Array.isArray(pattern) ? pattern : [pattern];
  let t = 0;
  arr.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(iosTap, t);
    t += ms;
  });
}
