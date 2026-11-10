import { EXERCISES, type CatalogExercise, type MuscleGroup } from '../data/exercises';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

/** Тип движения внутри группы мышц: жим меняем на жим, тягу — на тягу и т. д. */
function pattern(e: CatalogExercise): string {
  const n = norm(e.name);
  switch (e.group) {
    case 'Грудь':
      return /разводк|сведени|бабочк|пек-дек|пуловер/.test(n) ? 'fly' : 'press';
    case 'Спина':
      if (/подтяг|верхн|гравитрон|пуловер/.test(n)) return 'vertical';
      if (/станов|гиперэкст|плинт/.test(n)) return 'hinge';
      if (/шраг/.test(n)) return 'shrug';
      return 'horizontal';
    case 'Плечи':
      if (/задн|обратная бабочка|лицу/.test(n)) return 'rear';
      if (/жим|подбородк/.test(n)) return 'press';
      return 'raise';
    case 'Квадрицепс':
      if (/выпад|зашагив/.test(n)) return 'lunge';
      if (/разгибания ног|сисси/.test(n)) return 'extension';
      return 'squat';
    case 'Ягодицы и бицепс бедра':
      if (/сгибания ног|скандинав/.test(n)) return 'curl';
      if (/мост|хип-траст|отведени|сведени|сумо/.test(n)) return 'glute';
      return 'hinge';
    default:
      return e.group;
  }
}

const byName = new Map(EXERCISES.map((e) => [norm(e.name), e]));

export function findInCatalog(name: string): CatalogExercise | undefined {
  return byName.get(norm(name));
}

/** Слова названия (без коротких), чтобы находить «с гантелями» ↔ «с гантелью» и т. п. */
const words = (s: string) =>
  norm(s)
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((w) => w.length > 3)
    .map((w) => w.slice(0, 5));

/**
 * Похожие упражнения: та же группа мышц, сначала тот же тип движения и тот же
 * характер (базовое/изоляция), затем — по похожести названия.
 */
export function alternativesFor(name: string, limit = 10): { items: CatalogExercise[]; group?: MuscleGroup } {
  const base = findInCatalog(name);
  if (!base) return { items: [] };
  const p = pattern(base);
  const w = new Set(words(base.name));
  const items = EXERCISES.filter((e) => e.group === base.group && norm(e.name) !== norm(base.name))
    .map((e) => ({
      e,
      score:
        (pattern(e) === p ? 10 : 0) +
        (e.kind === base.kind ? 3 : 0) +
        words(e.name).filter((x) => w.has(x)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.e);
  return { items, group: base.group };
}
