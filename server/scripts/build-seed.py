"""Собирает SQL для заливки общей библиотеки продуктов.

Источники: встроенная база приложения (src/data/foods.json) и выгрузка продуктов
России из Open Food Facts (JSONL: code, name, brand, qty, kcal, p, f, c).
Использование: python3 build-seed.py <ru.jsonl> <out_dir>
Пишет seed-*.sql частями (D1 принимает файлы до ~100 МБ, но маленькие части надёжнее).
"""
import json, re, sys, os, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def norm(s):
    s = s.lower().replace('ё', 'е')
    s = re.sub(r'[^\w%.,]+', ' ', s, flags=re.UNICODE).replace('_', ' ')
    return re.sub(r'\s+', ' ', s).strip()

def q(s):
    return "'" + s.replace("'", "''") + "'"

def clean(s, n):
    s = unicodedata.normalize('NFC', s or '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s[:n]

rows = []
foods = json.load(open(os.path.join(ROOT, 'src/data/foods.json'), encoding='utf-8'))
for cat, items in foods.items():
    if cat == '_format':
        continue
    for name, kcal, p, f, c in items:
        rows.append((None, name, '', '', cat, kcal, p, f, c, 'builtin'))

seen_codes = set()
seen_names = set()
off = 0
for line in open(sys.argv[1], encoding='utf-8'):
    r = json.loads(line)
    code = re.sub(r'\D', '', r['code'])
    if not (8 <= len(code) <= 14) or code in seen_codes:
        continue
    name = clean(r['name'], 160)
    brand = clean(r['brand'], 80)
    if len(name) < 2 or not re.search(r'[A-Za-zА-Яа-яЁё]', name):
        continue
    key = norm(name + ' ' + brand)
    if key in seen_names:
        continue
    seen_codes.add(code)
    seen_names.add(key)
    rows.append((code, name, brand, clean(r.get('qty', ''), 40), '',
                 round(r['kcal']), round(r['p'], 1), round(r['f'], 1), round(r['c'], 1), 'off'))
    off += 1

out = sys.argv[2]
os.makedirs(out, exist_ok=True)
CHUNK = 2000
for i in range(0, len(rows), CHUNK):
    with open(os.path.join(out, f'seed-{i // CHUNK:03d}.sql'), 'w', encoding='utf-8') as fh:
        if i == 0:
            # Повторная заливка: встроенные продукты заменяем целиком (у них нет штрихкода),
            # продукты из Open Food Facts не дублируются за счёт уникального штрихкода.
            fh.write("DELETE FROM products WHERE source = 'builtin';\n")
        for code, name, brand, qty, cat, kcal, p, f, c, src in rows[i:i + CHUNK]:
            fh.write(
                'INSERT OR IGNORE INTO products (code, name, brand, qty, category, kcal, protein, fat, carbs, source, search) VALUES ('
                f"{q(code) if code else 'NULL'}, {q(name)}, {q(brand)}, {q(qty)}, {q(cat)}, {kcal}, {p}, {f}, {c}, {q(src)}, {q(norm(name + ' ' + brand))});\n"
            )
print(f'builtin {len(rows) - off}, off {off}, files {(len(rows) + CHUNK - 1) // CHUNK}')
