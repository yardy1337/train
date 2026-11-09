# Читает TSV-выгрузку Open Food Facts из stdin, пишет JSONL с продуктами России.
import sys, csv, json
csv.field_size_limit(10**9)
r = csv.reader(sys.stdin, delimiter='\t', quoting=csv.QUOTE_NONE)
head = next(r)
ix = {h: i for i, h in enumerate(head)}
need = ['code','product_name','brands','countries_tags','energy-kcal_100g','proteins_100g','fat_100g','carbohydrates_100g','quantity','lang']
missing = [n for n in need if n not in ix]
print('missing columns', missing, file=sys.stderr)
out = open(sys.argv[1], 'w')
seen = kept = 0
def num(row, k):
    try:
        v = row[ix[k]].strip()
        return float(v) if v else None
    except (IndexError, ValueError):
        return None
for row in r:
    seen += 1
    if seen % 500000 == 0:
        print('seen', seen, 'kept', kept, file=sys.stderr, flush=True)
    try:
        if 'en:russia' not in row[ix['countries_tags']]:
            continue
        name = row[ix['product_name']].strip()
    except IndexError:
        continue
    if not name:
        continue
    kcal, p, f, c = (num(row, k) for k in ('energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g'))
    if None in (kcal, p, f, c):
        continue
    if not (0 <= kcal <= 950 and 0 <= p <= 100 and 0 <= f <= 100 and 0 <= c <= 100 and p + f + c <= 105):
        continue
    kept += 1
    out.write(json.dumps({
        'code': row[ix['code']].strip(), 'name': name, 'brand': row[ix['brands']].strip().split(',')[0].strip(),
        'qty': row[ix['quantity']].strip(), 'kcal': kcal, 'p': p, 'f': f, 'c': c,
    }, ensure_ascii=False) + '\n')
print('done seen', seen, 'kept', kept, file=sys.stderr)
