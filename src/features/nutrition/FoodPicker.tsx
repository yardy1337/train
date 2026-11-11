import { Camera, ChevronLeft, Loader2, Plus, ScanBarcode } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Button, Empty, Segmented, Sheet, TextInput } from '../../components/ui';
import { searchFoods } from '../../lib/nutrition';
import { getByBarcode } from '../../lib/openFoodFacts';
import { barcodeCloud, searchCloud } from '../../lib/foodApi';
import { cacheFoods, findByBarcode } from '../../lib/foods';
import type { Food, MealType } from '../../types';
import type { PhotoItem } from '../../lib/foodApi';
import { PhotoSheet } from './PhotoSheet';
import { FoodRow } from './FoodRow';
import { BarcodeScanner } from './BarcodeScanner';
import { CustomFoodSheet } from './CustomFoodSheet';
import { RecipeSheet } from './RecipeSheet';
import { useFeature } from '../../lib/features';

type Tab = 'search' | 'fav' | 'recent' | 'mine';

const EMPTY: Food[] = [];

/** Полноэкранный выбор продукта: база, избранное, недавние, свои и штрихкод. */
export function FoodPicker({
  open,
  onClose,
  onPick,
  title = 'Добавить продукт',
  allowRecipes = true,
  meal = 'breakfast',
  onPhotoAdd,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (f: Food) => void;
  title?: string;
  allowRecipes?: boolean;
  /** Приём пищи по умолчанию — для добавления по фото. */
  meal?: MealType;
  /** Если задано — доступна кнопка «Еда по фото». */
  onPhotoAdd?: (items: PhotoItem[], meal: MealType) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState<{ food?: Food; barcode?: string } | null>(null);
  // «Свои блюда» включаются в настройках.
  const allowR = useFeature('recipes') && allowRecipes;
  const [recipeOpen, setRecipeOpen] = useState<{ food?: Food } | null>(null);
  const [cat, setCat] = useState<string | null>(null);

  // База читается только когда окно открыто — закрытое окно ничего не грузит.
  const foods = useLiveQuery(() => (open ? db.foods.toArray() : EMPTY), [open], EMPTY);

  useEffect(() => {
    if (!open) {
      setQ('');
      setCat(null);
      setScanMsg(null);
    }
  }, [open]);

  // Ввод не ждёт поиска: список обновляется в фоне, поле печатает без задержек.
  const dq = useDeferredValue(q);
  const local = useMemo(() => searchFoods(foods, dq), [foods, dq]);

  // Общая библиотека: ищем с задержкой после ввода, показываем то, чего нет в телефоне.
  const [cloud, setCloud] = useState<{ q: string; status: 'idle' | 'loading' | 'done' | 'error'; items: Food[] }>({
    q: '',
    status: 'idle',
    items: [],
  });
  useEffect(() => {
    const query = q.trim();
    if (!open || query.length < 2) {
      setCloud({ q: '', status: 'idle', items: [] });
      return;
    }
    if (!navigator.onLine) {
      setCloud({ q: query, status: 'error', items: [] });
      return;
    }
    const ctrl = new AbortController();
    setCloud((c) => ({ q: query, status: 'loading', items: c.q && query.startsWith(c.q) ? c.items : [] }));
    const t = setTimeout(() => {
      searchCloud(query, ctrl.signal)
        .then((items) => setCloud({ q: query, status: 'done', items }))
        .catch((e) => {
          if (e?.name !== 'AbortError') setCloud({ q: query, status: 'error', items: [] });
        });
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);
  const cloudNew = useMemo(() => {
    const known = new Set(local.map((f) => f.id));
    const names = new Set(local.map((f) => `${f.name}|${f.brand ?? ''}`.toLowerCase()));
    return cloud.items.filter((f) => !known.has(f.id) && !names.has(`${f.name}|${f.brand ?? ''}`.toLowerCase()));
  }, [cloud.items, local]);
  const pickCloud = async (f: Food) => {
    await cacheFoods([f]);
    onPick(f);
  };
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of foods) if (f.source === 'builtin' && f.category) map.set(f.category, (map.get(f.category) ?? 0) + 1);
    return [...map.entries()];
  }, [foods]);
  const inCategory = useMemo(
    () => (cat ? foods.filter((f) => f.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'ru')) : EMPTY),
    [foods, cat],
  );
  const favorites = useMemo(() => foods.filter((f) => f.favorite).sort((a, b) => a.name.localeCompare(b.name, 'ru')), [foods]);
  const recent = useMemo(
    () => foods.filter((f) => f.lastUsed).sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)).slice(0, 40),
    [foods],
  );
  const mine = useMemo(
    () =>
      foods
        .filter((f) => f.source === 'custom' || (allowR && f.source === 'recipe'))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [foods, allowR],
  );



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
        // Сначала общая библиотека (сервер сам спросит Open Food Facts), при сбое — OFF напрямую.
        const found = await barcodeCloud(code).catch(() => getByBarcode(code));
        if (found) {
          await cacheFoods([found]);
          setScanMsg(null);
          onPick(found);
          return;
        }
        setScanMsg(`Продукт ${code} пока не знаем — добавьте его, и он появится в общей библиотеке.`);
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
      <Sheet open={open} onClose={onClose} title={title} full lazy>
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
            {onPhotoAdd && (
              <Button onClick={() => photoRef.current?.click()} aria-label="Еда по фото" className="px-3">
                <Camera size={22} />
              </Button>
            )}
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
              {allowR && (
                <Button className="flex-1" onClick={() => setRecipeOpen({})}>
                  <Plus size={16} strokeWidth={2.6} /> Блюдо
                </Button>
              )}
            </div>
          )}

          {browsing && !cat && (
            <div className="space-y-2">
              <div className="eyebrow">Категории · {foods.length} продуктов</div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(([name, n]) => (
                  <button
                    key={name}
                    onClick={(e) => {
                      e.currentTarget.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
                      setCat(name);
                    }}
                    className="rounded-2xl border border-fg/[.06] bg-surface px-3 py-3 text-left shadow-card transition-transform active:scale-[.97]"
                  >
                    <div className="text-sm font-bold leading-tight">{name}</div>
                    <div className="mt-1 text-[11px] font-semibold text-fg/40">{n} шт.</div>
                  </button>
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

          {tab === 'search' && q.trim().length >= 2 && (cloudNew.length > 0 || cloud.status === 'loading' || !navigator.onLine) && (
            <div className="space-y-1 pt-2">
              <div className="flex items-center gap-2">
                <span className="eyebrow">Общая библиотека</span>
                {cloud.status === 'loading' && <Loader2 size={13} className="animate-spin text-fg/35" />}
                <span className="flex-1" />
                <span className="text-[10px] font-semibold text-fg/30">данные: Open Food Facts, ODbL</span>
              </div>
              {!navigator.onLine && (
                <p className="py-2 text-sm font-medium text-fg/40">Нет интернета — показываем только продукты с телефона</p>
              )}
              <ul className="divide-y divide-fg/[.06]">
                {cloudNew.map((f) => (
                  <FoodRow key={f.id} food={f} onPick={pickCloud} />
                ))}
              </ul>
            </div>
          )}
          {tab === 'search' && q.trim() && !local.length && !cloudNew.length && cloud.status !== 'loading' && (
            <Empty>Ничего не нашлось — можно создать свой продукт</Empty>
          )}
          {tab === 'fav' && !favorites.length && <Empty>Нажмите звёздочку у продукта, чтобы добавить его сюда</Empty>}
          {tab === 'recent' && !recent.length && <Empty>Здесь появятся продукты, которые вы добавляли</Empty>}
          {tab === 'mine' && !mine.length && <Empty>Свои продукты и рецепты появятся здесь</Empty>}

          {tab === 'search' && q.trim().length >= 2 && (
            <div className="border-t border-fg/[.06] pt-3">
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
      {onPhotoAdd && (
        <>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              setPhoto(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <PhotoSheet
            file={photo}
            initialMeal={meal}
            onClose={() => setPhoto(null)}
            onAdd={async (items, m) => {
              await onPhotoAdd(items, m);
              setPhoto(null);
            }}
          />
        </>
      )}
      {allowR && (
        <RecipeSheet open={!!recipeOpen} food={recipeOpen?.food} onClose={() => setRecipeOpen(null)} />
      )}
    </>
  );
}
