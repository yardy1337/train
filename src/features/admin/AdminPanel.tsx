import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, ChevronRight, Dumbbell, KeyRound, LayoutGrid, Megaphone, ShieldCheck, ToggleRight, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { BackButton, Button, Field, IconButton, PageHeader, TextInput } from '../../components/ui';
import { adminFetch, getAdminToken, refreshConfig, setAdminToken } from '../../lib/appConfig';
import { setAdminOpen, useAdminOpen } from '../../lib/adminOpen';
import { useBackEntry } from '../../lib/backNav';
import { lockScroll } from '../../lib/smoothScroll';
import { AdminPrograms } from './AdminPrograms';
import { AdminAnnouncement, AdminAccount, AdminFeatures, AdminFoods, AdminStats, AdminTechnique } from './AdminSections';

export type AdminView = 'home' | 'programs' | 'announcement' | 'features' | 'technique' | 'foods' | 'stats' | 'account';

const SECTIONS: { id: AdminView; title: string; hint: string; Icon: typeof LayoutGrid }[] = [
  { id: 'programs', title: 'Программы', hint: 'Каталог: изменить, добавить, скрыть, порядок', Icon: LayoutGrid },
  { id: 'announcement', title: 'Объявление', hint: 'Баннер на главном экране у всех', Icon: Megaphone },
  { id: 'features', title: 'Функции', hint: 'Включить и выключить возможности у всех', Icon: ToggleRight },
  { id: 'technique', title: 'Упражнения и техника', hint: 'Справочник и подсказки по технике', Icon: Dumbbell },
  { id: 'foods', title: 'Продукты', hint: 'Общая библиотека: править и удалять', Icon: UtensilsCrossed },
  { id: 'stats', title: 'Статистика', hint: 'Библиотека продуктов, фото еды', Icon: BarChart3 },
  { id: 'account', title: 'Пароль и выход', hint: 'Сменить пароль администратора', Icon: KeyRound },
];

/** Админ-панель поверх всего приложения. Изменения сохраняются на сервере и видны всем пользователям. */
export function AdminPanel() {
  const open = useAdminOpen();
  useBackEntry(open, () => setAdminOpen(false));
  useEffect(() => (open ? lockScroll() : undefined), [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[45] overflow-y-auto overscroll-contain bg-bg"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          data-lenis-prevent
        >
          <div className="mx-auto max-w-lg pb-[calc(24px+env(safe-area-inset-bottom))]">
            <Gate />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const closeBtn = (
  <IconButton label="Закрыть" onClick={() => setAdminOpen(false)} className="bg-white/10 text-white active:bg-white/20">
    <X size={18} />
  </IconButton>
);

function Gate() {
  const [token, setToken] = useState(getAdminToken());
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (token) return;
    adminFetch<{ hasAdmin: boolean }>('/api/admin/status')
      .then((r) => setHasAdmin(r.hasAdmin))
      .catch(() => setError('Нет связи с сервером — нужен интернет'));
  }, [token]);

  if (token) return <Panel onLogout={() => setToken(null)} />;
  return (
    <>
      <PageHeader title="Управление" subtitle="Вход для администратора" right={closeBtn} />
      <div className="px-4">
        {error ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">{error}</p> : hasAdmin === null ? null : <Login setup={!hasAdmin} onToken={setToken} />}
      </div>
    </>
  );
}

function Login({ setup, onToken }: { setup: boolean; onToken: (t: string) => void }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (setup && password !== repeat) return setError('Пароли не совпадают');
    setBusy(true);
    try {
      const r = await adminFetch<{ token: string }>(setup ? '/api/admin/setup' : '/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(setup ? { code, password } : { password }),
      });
      setAdminToken(r.token);
      onToken(r.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-gold" />
        <div className="font-extrabold">{setup ? 'Первый вход: создайте пароль' : 'Вход по паролю'}</div>
      </div>
      {setup && (
        <Field label="Код установки">
          <TextInput value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" />
        </Field>
      )}
      <Field label={setup ? 'Новый пароль (от 6 символов)' : 'Пароль'}>
        <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={setup ? 'new-password' : 'current-password'} />
      </Field>
      {setup && (
        <Field label="Повторите пароль">
          <TextInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
        </Field>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <Button variant="primary" className="w-full py-3" disabled={busy || password.length < (setup ? 6 : 1)} onClick={submit}>
        {setup ? 'Создать и войти' : 'Войти'}
      </Button>
    </div>
  );
}

function Panel({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<AdminView>('home');
  useBackEntry(view !== 'home', () => setView('home'));
  // Свежие настройки с сервера — чтобы не затереть чужие изменения старыми.
  useEffect(() => {
    void refreshConfig();
  }, []);
  const back = () => setView('home');
  const section = SECTIONS.find((s) => s.id === view);

  let body: ReactNode;
  if (view === 'programs') body = <AdminPrograms />;
  else if (view === 'announcement') body = <AdminAnnouncement />;
  else if (view === 'features') body = <AdminFeatures />;
  else if (view === 'technique') body = <AdminTechnique />;
  else if (view === 'foods') body = <AdminFoods />;
  else if (view === 'stats') body = <AdminStats />;
  else if (view === 'account') body = <AdminAccount onLogout={onLogout} />;

  if (view !== 'home' && view !== 'programs')
    return (
      <>
        <PageHeader title={section?.title ?? ''} subtitle="Управление" left={<BackButton onClick={back} />} right={closeBtn} />
        <div className="space-y-3 px-4">{body}</div>
      </>
    );
  if (view === 'programs') return <AdminPrograms onBack={back} />;

  return (
    <>
      <PageHeader title="Управление" subtitle="Изменения увидят все пользователи" right={closeBtn} />
      <div className="space-y-2 px-4">
        {SECTIONS.map(({ id, title, hint, Icon }) => (
          <button key={id} onClick={() => setView(id)} className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-card active:bg-fg/[.03]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">{title}</span>
              <span className="block truncate text-xs font-medium text-fg/50">{hint}</span>
            </span>
            <ChevronRight size={18} className="text-fg/30" />
          </button>
        ))}
        <p className="px-1 pt-2 text-xs font-medium text-fg/45">
          Изменения сохраняются на сервере сразу. Пользователи получат их при следующем открытии приложения (нужен интернет).
        </p>
      </div>
    </>
  );
}

export { closeBtn as adminCloseButton };
