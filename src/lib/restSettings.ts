import { setSetting, useSetting } from '../db/settings';

/** Настройки таймера отдыха. */
export interface RestSettings {
  /** 'program' — отдых из программы у каждого упражнения, число — своё время для всех, сек. */
  mode: 'program' | number;
  sound: boolean;
  vibrate: boolean;
  /** Системное уведомление, когда приложение свёрнуто. */
  notify: boolean;
}

export const DEFAULT_REST: RestSettings = { mode: 'program', sound: true, vibrate: true, notify: false };
const KEY = 'restSettings';

export const useRestSettings = () => ({ ...DEFAULT_REST, ...useSetting<Partial<RestSettings>>(KEY, DEFAULT_REST) });
export const saveRestSettings = (s: RestSettings) => setSetting(KEY, s);

/** Сколько отдыхать после подхода с учётом настроек. */
export const restFor = (s: RestSettings, programRest: number) => (s.mode === 'program' ? programRest : s.mode);

/** Разрешение на уведомления (на iPhone — только у приложения, добавленного на экран «Домой»). */
export async function askNotifyPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const r = await Notification.requestPermission();
  return r === 'granted' ? 'granted' : 'denied';
}

export async function showRestNotification(body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body, tag: 'rest-timer', renotify: true, icon: `${import.meta.env.BASE_URL}pwa-192.png` } as NotificationOptions;
    if (reg) await reg.showNotification('Отдых окончен — следующий подход!', opts);
    else new Notification('Отдых окончен — следующий подход!', opts);
  } catch {
    /* уведомления недоступны */
  }
}
