import { ChevronLeft, Globe, Plus, ScanBarcode } from 'lucide-react';
import { motion } from 'motion/react';
import { EASE } from '../../components/motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Button, Empty, Segmented, Sheet, TextInput } from '../../components/ui';
import { searchFoods } from '../../lib/nutrition';
import { getByBarcode, searchOpenFoodFacts } from '../../lib/openFoodFacts';
import { cacheFoods, findByBarcode } from '../../lib/foods';
import type { Food } from '../../types';
import { FoodRow } from './FoodRow';
import { BarcodeScanner } from './BarcodeScanner';
import { CustomFoodSheet } from './CustomFoodSheet';
import { RecipeSheet } from './RecipeSheet';

type Tab = 'search' | 'fav' | 'recent' | 'mine';

const EMPTY: Food[] = [];

/** Полноэкранный выбор продукта: локальная база, избранное, недавние, свои, онлайн и штрихкод. */
export function FoodPicker({
  open,
  onClose,
  onPick,
  title = 'Добавить продукт',
  allowRecipes = true,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (f: Food) => void;
  title?: string;
  allowRecipes?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [online, setOnline] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; items: Food[]; msg?: string }>({
    status: 'idle',
    items: [],
  });
  const [scan, setScan] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState<{ food?: Food; barcode?: string } | null>(null);
  const [recipeOpen, setRecipeOpen] = useState<{ food?: Food } | null>(null);
  const [cat, setCat] = useState<string | null>(null);

  const foods = useLiveQuery(() => db.foods.toArray(), [], EMPTY);

  useEffect(() => {
    if (!open) {
      setQ('');
      setCat(null);
      setOnline({ status: 'idle', items: [] });
      setScanMsg(null);
    }
  }, [open]);

  useEffect(() => setOnline({ status: 'idle', items: [] }), [q]);

  const local = useMemo(() => searchFoods(foods, q), [foods, q]);
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of foods) if (f.source === 'builtin' && f.category) map.set(f.category, (map.get(f.category) ?? 0) + 1);
    return [...map.entries()];
  }, [foods]);
  const inCategory = useMemo(
    () => (cat ? foods.filter((f) => f.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'ru')) : EMPTY),
    [foods, cat],
  );
  const onlineNew = useMemo(() => {
    const known = new Set(local.map((f) => f.id));
    return online.items.filter((f) => !known.has(f.id));
  }, [local, online.items]);
  const favorites = useMemo(() => foods.filter((f) => f.favorite).sort((a, b) => a.name.localeCompare(b.name, 'ru')), [foods]);
  const recent = useMemo(
    () => foods.filter((f) => f.lastUsed).sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)).slice(0, 40),
    [foods],
  );
  const mine = useMemo(
    () =>
      foods
        .filter((f) => f.source === 'custom' || (allowRecipes && f.source === 'recipe'))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [foods, allowRecipes],
  );

  const searchOnline = async () => {
    if (!navigator.onLine) {
      setOnline({ status: 'error', items: [], msg: 'Нет интернета — доступна только локальная база' });
      return;
    }
    setOnline({ status: 'loading', items: [] });
    try {
      const items = await searchOpenFoodFacts(q.trim());
      await cacheFoods(items);
      setOnline({ status: 'done', items });
    } catch {
      setOnline({ status: 'error', items: [], msg: 'Open Food Facts не ответил, попробуйте позже' });
    }
  };

  const onBarcode = useCallback(
    async (code: string) => {
      setScan(false);
      setScanMsg(`Ищем ${code}…`);
      try {
        const cached = await findByBarcode(code);
        if (cached) {
          setScanMsg(null);
          onPick(cached);
          return;
        }
        const found = await getByBarcode(code);
        if (found) {
          await cacheFoods([found]);
          setScanMsg(null);
          onPick(found);
          return;
        }
        setScanMsg(`Продукт ${code} не найден в Open Food Facts.`);
        setCustomOpen({ barcode: code });
      } catch {
        setScanMsg('Не удалось выполнить поиск (нет сети?). Можно добавить продукт вручную.');
        setCustomOpen({ barcode: code });
      }
    },
    [onPick],
  );

  const browsing = tab === 'search' && !q.trim();
  const list = tab === 'search' ? (browsing ? inCategory : local) : tab === 'fav' ? favorites : tab === 'recent' ? recent : mine;
  const editHandler = (f: Food) =>
    f.source === 'recipe' ? setRecipeOpen({ food: f }) : setCustomOpen({ food: f });

  return (
    <>
      <Sheet open={open} onClose={onClose} title={title} full>
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextInput
              type="search"
              placeholder="Поиск: творог, гречка, банан…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (tab !== 'search') setTab('search');
              }}
            />
            <Button onClick={() => setScan(true)} aria-label="Сканировать штрихкод" className="px-3">
              <ScanBarcode size={22} />
            </Button>
          </div>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { id: 'search', label: 'Поиск' },
              { id: 'fav', label: 'Избранное' },
              { id: 'recent', label: 'Недавние' },
              { id: 'mine', label: 'Мои' },
            ]}
          />
          {scanMsg && <p className="rounded-lg bg-fg/[.05] px-3 py-2 text-sm text-fg/75">{scanMsg}</p>}

          {tab === 'mine' && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setCustomOpen({})}>
                <Plus size={16} strokeWidth={2.6} /> Свой продукт
              </Button>
              {allowRecipes && (
                <Button className="flex-1" onClick={() => setRecipeOpen({})}>
                  <Plus size={16} strokeWidth={2.6} /> Рецепт
                </Button>
              )}
            </div>
          )}

          {browsing && !cat && (
            <div className="space-y-2">
              <div className="eyebrow">Категории · {foods.length} продуктов</div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(([name, n], i) => (
                  <motion.button
                    key={name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.015, 0.3), ease: EASE }}
                    onClick={(e) => {
                      e.currentTarget.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
                      setCat(name);
                    }}
                    className="rounded-2xl border border-fg/[.06] bg-surface px-3 py-3 text-left shadow-card transition-transform active:scale-[.97]"
                  >
                    <div className="text-sm font-bold leading-tight">{name}</div>
                    <div className="mt-1 text-[11px] font-semibold text-fg/40">{n} шт.</div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          {browsing && cat && (
            <button
              onClick={() => setCat(null)}
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1.5 pl-2 pr-3 text-sm font-bold text-accent-strong active:scale-95"
            >
              <ChevronLeft size={16} strokeWidth={2.6} /> {cat}
            </button>
          )}
          <ul className="divide-y divide-fg/[.06]">
            {list.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                onPick={onPick}
                onEdit={f.source === 'custom' || f.source === 'recipe' ? editHandler : undefined}
              />
            ))}
          </ul>

          {tab === 'search' && q.trim() && !local.length && online.status === 'idle' && (
            <Empty>В локальной базе ничего не нашлось</Empty>
          )}
          {tab === 'fav' && !favorites.length && <Empty>Нажмите звёздочку у продукта, чтобы добавить его сюда</Empty>}
          {tab === 'recent' && !recent.length && <Empty>Здесь появятся продукты, которые вы добавляли</Empty>}
          {tab === 'mine' && !mine.length && <Empty>Свои продукты и рецепты появятся здесь</Empty>}

          {tab === 'search' && q.trim().length >= 2 && (
            <div className="space-y-2 border-t border-fg/[.06] pt-3">
              {online.status === 'idle' && (
                <Button className="w-full" onClick={searchOnline}>
                  <Globe size={16} /> Искать в Open Food Facts
                </Button>
              )}
              {online.status === 'loading' && <p className="text-center text-sm text-fg/55">Ищем онлайн…</p>}
              {online.status === 'error' && <p className="text-center text-sm text-amber-600">{online.msg}</p>}
              {online.status === 'done' && (
                <>
                  <div className="text-xs text-fg/45">
                    Open Food Facts: найдено {online.items.length}, сохранено в локальную базу
                  </div>
                  <ul className="divide-y divide-fg/[.06]">
                    {onlineNew.map((f) => (
                      <FoodRow key={f.id} food={f} onPick={onPick} />
                    ))}
                  </ul>
                </>
              )}
              <Button variant="ghost" className="w-full text-xs" onClick={() => setCustomOpen({})}>
                Не нашли? Создать свой продукт
              </Button>
            </div>
          )}
        </div>
      </Sheet>

      <Sheet open={scan} onClose={() => setScan(false)} title="Сканер штрихкода">
        {scan && <BarcodeScanner onDetected={onBarcode} />}
      </Sheet>

      <CustomFoodSheet
        open={!!customOpen}
        food={customOpen?.food}
        barcode={customOpen?.barcode}
        onClose={() => setCustomOpen(null)}
        onSaved={(f) => {
          setCustomOpen(null);
          setScanMsg(null);
          if (!customOpen?.food) onPick(f);
        }}
      />
      {allowRecipes && (
        <RecipeSheet open={!!recipeOpen} food={recipeOpen?.food} onClose={() => setRecipeOpen(null)} />
      )}
    </>
  );
}
