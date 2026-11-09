# train-food-api — общая библиотека продуктов

Cloudflare Worker + база D1. Приложение ищет здесь продукты по названию и бренду,
ищет по штрихкоду и сразу (без модерации) добавляет продукты пользователей.

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/foods/search?q=творог простоквашино&limit=30` | поиск (префиксный, по словам) |
| GET | `/api/foods/barcode/:code` | штрихкод: из базы, иначе из Open Food Facts (и сохраняет) |
| POST | `/api/foods` | `{name, brand?, barcode?, kcal, protein, fat, carbs}` на 100 г |
| GET | `/api/foods/stats` | сколько продуктов по источникам |

Защита без модерации: проверка значений (ккал 0–950, БЖУ 0–100 г, сумма ≤ 105 г),
не больше 30 добавлений в час с одного IP, дубли по штрихкоду и названию не создаются.

## Данные

- Встроенная база приложения (`../src/data/foods.json`) — 1006 продуктов.
- Продукты России из Open Food Facts (`data/off-ru.jsonl.gz`) — 14 103 позиции
  с заполненными КБЖУ. Источник: https://world.openfoodfacts.org, лицензия ODbL —
  в приложении указан источник; база с этими данными распространяется на тех же условиях.

## Развёртывание

Токену Cloudflare нужны права **Workers Scripts: Edit** и **D1: Edit**
(для автоопределения аккаунта — ещё **Account Settings: Read**).

```bash
cd server
npm i
npx wrangler d1 create train-food          # id базы → в wrangler.toml (database_id)
npx wrangler d1 execute train-food --remote --file schema.sql
gunzip -k data/off-ru.jsonl.gz
python3 scripts/build-seed.py data/off-ru.jsonl /tmp/seed
for f in /tmp/seed/*.sql; do npx wrangler d1 execute train-food --remote --file "$f"; done
npx wrangler deploy
```

Адрес воркера прописан в приложении (`src/lib/foodApi.ts`, переменная `VITE_FOOD_API`).

## Обновить выгрузку Open Food Facts

```bash
curl -sSL https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz \
  | gunzip | python3 scripts/off-filter.py data/off-ru.jsonl
gzip -9f data/off-ru.jsonl
```
