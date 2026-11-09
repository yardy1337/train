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

  const foods = useLiveQuery(() => db.foods.toArray(), [], EMPTY);

  useEffect(() => {
    if (!open) {
      setQ('');
      setOnline({ status: 'idle', items: [] });
      setScanMsg(null);
    }
  }, [open]);

  useEffect(() => setOnline({ status: 'idle', items: [] }), [q]);

  const local = useMemo(() => searchFoods(foods, q), [foods, q]);
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

  const list = tab === 'search' ? local : tab === 'fav' ? favorites : tab === 'recent' ? recent : mine;
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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" />
              </svg>
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
          {scanMsg && <p className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300">{scanMsg}</p>}

          {tab === 'mine' && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setCustomOpen({})}>
                + Свой продукт
              </Button>
              {allowRecipes && (
                <Button className="flex-1" onClick={() => setRecipeOpen({})}>
                  + Рецепт
                </Button>
              )}
            </div>
          )}

          <ul className="divide-y divide-white/5">
            {list.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                onPick={onPick}
                onEdit={f.source === 'custom' || f.source === 'recipe' ? editHandler : undefined}
              />
            ))}
          </ul>

          {tab === 'search' && !q.trim() && (
            <Empty>Начните вводить название. В базе {foods.length} продуктов.</Empty>
          )}
          {tab === 'search' && q.trim() && !local.length && online.status === 'idle' && (
            <Empty>В локальной базе ничего не нашлось</Empty>
          )}
          {tab === 'fav' && !favorites.length && <Empty>Нажмите ★ у продукта, чтобы добавить его сюда</Empty>}
          {tab === 'recent' && !recent.length && <Empty>Здесь появятся продукты, которые вы добавляли</Empty>}
          {tab === 'mine' && !mine.length && <Empty>Свои продукты и рецепты появятся здесь</Empty>}

          {tab === 'search' && q.trim().length >= 2 && (
            <div className="space-y-2 border-t border-white/5 pt-3">
              {online.status === 'idle' && (
                <Button className="w-full" onClick={searchOnline}>
                  🌐 Искать в Open Food Facts
                </Button>
              )}
              {online.status === 'loading' && <p className="text-center text-sm text-zinc-400">Ищем онлайн…</p>}
              {online.status === 'error' && <p className="text-center text-sm text-amber-400">{online.msg}</p>}
              {online.status === 'done' && (
                <>
                  <div className="text-xs text-zinc-500">
                    Open Food Facts: найдено {online.items.length}, сохранено в локальную базу
                  </div>
                  <ul className="divide-y divide-white/5">
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
