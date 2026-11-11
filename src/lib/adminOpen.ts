import { useSyncExternalStore } from 'react';

/** Открыта ли админ-панель (открывается из настроек, рисуется поверх всего приложения). */
let open = false;
const listeners = new Set<() => void>();
export function setAdminOpen(v: boolean) {
  open = v;
  listeners.forEach((l) => l());
}
export const useAdminOpen = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
  );
