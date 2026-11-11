import { useSyncExternalStore } from 'react';
import { registerExtraExercises, type CatalogExercise } from '../data/exercises';
import { registerCatalog, type CatalogProgram, type ProgramOverride } from '../data/programs';
import { registerTechniqueEdits, type Technique } from '../data/technique';
import type { ProgramDay } from '../types';
import { FOOD_API } from './foodApi';

/** Программа, добавленная администратором (видна всем пользователям). */
export interface AddedProgram {
  id: string; // «a-…»
  name: string;
  tagline: string;
  description: string;
  level: CatalogProgram['level'];
  daysPerWeek: number;
  goal: string;
  equipment: string;
  icon: string;
  color: string;
  days: ProgramDay[];
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  on: boolean;
}

/** Настройки приложения от администратора — одни на всех пользователей. */
export interface AppConfig {
  programs?: {
    overrides?: Record<string, ProgramOverride>;
    added?: AddedProgram[];
    order?: string[];
    /** Программа, закреплённая у новых пользователей. */
    defaultPinned?: string;
  };
  /** Правки техники; ключ — название упражнения. */
  technique?: Record<string, Technique>;
  /** Упражнения, добавленные в справочник. */
  exercises?: CatalogExercise[];
  announcement?: Announcement;
  features?: {
    /** Выключены у всех пользователей. */
    disabled?: string[];
    /** Включены по умолчанию (пока пользователь сам не переключил). */
    defaults?: string[];
  };
}

const CACHE_KEY = 'appConfig';

export function addedToCatalog(a: AddedProgram): CatalogProgram {
  return {
    id: a.id,
    name: a.name,
    tagline: a.tagline,
    description: a.description,
    level: a.level,
    daysPerWeek: a.daysPerWeek,
    goal: a.goal,
    equipment: a.equipment,
    days: () => a.days,
    look: { icon: a.icon, color: a.color },
  };
}

let config: AppConfig = {};
let version = 0;
const listeners = new Set<() => void>();

/** Подставить настройки в каталог, технику, справочник — и перерисовать экраны. */
export function applyConfig(c: AppConfig, v = version) {
  config = c ?? {};
  version = v;
  registerCatalog({
    overrides: config.programs?.overrides,
    added: (config.programs?.added ?? []).map(addedToCatalog),
    order: config.programs?.order,
  });
  registerTechniqueEdits(config.technique ?? {});
  registerExtraExercises(config.exercises ?? []);
  listeners.forEach((l) => l());
}

export const getConfig = () => config;

/** Реактивное чтение настроек: экран перерисуется, когда придут новые. */
export function useAppConfig(): AppConfig {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => config,
  );
}

/** При запуске: сначала сохранённые на телефоне настройки (мгновенно), затем свежие с сервера. */
export function initAppConfig() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as { config: AppConfig; version: number } | null;
    if (cached?.config) applyConfig(cached.config, cached.version);
  } catch {
    /* ignore */
  }
  void refreshConfig();
}

export async function refreshConfig() {
  if (!navigator.onLine) return;
  try {
    const res = await fetch(`${FOOD_API}/api/config`, { signal: AbortSignal.timeout(8000), cache: 'no-cache' });
    if (!res.ok) return;
    const data = (await res.json()) as { config: AppConfig | null; version: number };
    if (data.version === version && version !== 0) return;
    applyConfig(data.config ?? {}, data.version);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ config: data.config ?? {}, version: data.version }));
  } catch {
    /* офлайн или сервер недоступен — работаем на сохранённых */
  }
}

// ===== Админ API =====

const TOKEN_KEY = 'adminToken';

export const getAdminToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setAdminToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${FOOD_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(15000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) setAdminToken(null);
  if (!res.ok) throw new Error(data.error ?? `Ошибка ${res.status}`);
  return data;
}

/** Сохранить настройки на сервере (у всех пользователей обновятся при следующем запуске). */
export async function saveConfig(next: AppConfig) {
  const r = await adminFetch<{ version: number }>('/api/admin/config', { method: 'PUT', body: JSON.stringify({ config: next }) });
  applyConfig(next, r.version);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ config: next, version: r.version }));
}

/** Изменить настройки функцией от текущих и сразу сохранить. */
export const updateConfig = (fn: (c: AppConfig) => AppConfig) => saveConfig(fn(structuredClone(config)));
