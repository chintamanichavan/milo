/**
 * Builds the bundled food table from USDA FoodData Central.
 *
 *   node scripts/build_foods.ts <sr_legacy.json> <foundation.json>
 *
 * Downloads (public domain, no key needed):
 *   https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip
 *   https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-04-18.zip
 *
 * Writes public/foods.json.gz — macros plus thirty micronutrients per 100 g,
 * with household portions where USDA gives them.
 */
import { createReadStream, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/** FDC nutrient numbers we keep, in order */
export const MICROS = [
  '301', '303', '304', '305', '306', '307', '309', '312', '315', '317',
  '320', '323', '328', '401', '404', '405', '406', '410', '415', '417',
  '418', '421', '430', '291', '269', '601', '606', '645', '646', '621',
];

export const MICRO_NAMES = [
  'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc', 'copper',
  'manganese', 'selenium', 'vitamin A', 'vitamin E', 'vitamin D', 'vitamin C', 'thiamin',
  'riboflavin', 'niacin', 'pantothenic acid', 'vitamin B6', 'folate', 'vitamin B12', 'choline',
  'vitamin K', 'fibre', 'sugars', 'cholesterol', 'saturated fat', 'monounsaturated fat',
  'polyunsaturated fat', 'omega-3 DHA',
];

interface FdcNutrient {
  nutrient?: { number?: string };
  amount?: number;
}

interface FdcPortion {
  measureUnit?: { name?: string };
  modifier?: string;
  gramWeight?: number;
  amount?: number;
}

interface FdcFood {
  fdcId: number;
  description: string;
  foodCategory?: { description?: string };
  foodNutrients?: FdcNutrient[];
  foodPortions?: FdcPortion[];
}

export interface Food {
  /** id */
  i: number;
  /** name */
  n: string;
  /** category */
  g: string;
  /** kcal, protein, carbs, fat per 100 g */
  k: number;
  p: number;
  c: number;
  f: number;
  /** micros per 100 g, in MICROS order */
  m: number[];
  /** portions: [label, grams] */
  s: [string, number][];
}

const round = (n: number, places = 1): number => {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
};

function trim(food: FdcFood): Food | null {
  const by = new Map<string, number>();
  for (const n of food.foodNutrients ?? [])
    if (n.nutrient?.number && typeof n.amount === 'number') by.set(n.nutrient.number, n.amount);
  const kcal = by.get('208');
  if (kcal === undefined) return null;
  const portions: [string, number][] = [];
  for (const p of food.foodPortions ?? []) {
    const unit = p.measureUnit?.name && p.measureUnit.name !== 'undetermined' ? p.measureUnit.name : '';
    const label = [p.amount && p.amount !== 1 ? p.amount : '', unit, p.modifier ?? '']
      .filter(Boolean)
      .join(' ')
      .trim();
    if (label && p.gramWeight) portions.push([label.slice(0, 40), round(p.gramWeight)]);
    if (portions.length >= 4) break;
  }
  return {
    i: food.fdcId,
    n: food.description.slice(0, 90),
    g: (food.foodCategory?.description ?? '').slice(0, 40),
    k: round(kcal),
    p: round(by.get('203') ?? 0),
    c: round(by.get('205') ?? 0),
    f: round(by.get('204') ?? 0),
    m: MICROS.map((id) => round(by.get(id) ?? 0, 2)),
    s: portions,
  };
}

/** The SR file is 200 MB, so scan it a chunk at a time and trim as we go.
 *  Food objects sit two braces deep: {"SRLegacyFoods": [ {...}, ... ]}. */
async function eachFood(path: string, onFood: (food: FdcFood) => void): Promise<void> {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let buffer = '';
  let capturing = false;
  const stream = createReadStream(path, { encoding: 'utf8', highWaterMark: 1 << 20 });
  for await (const chunk of stream) {
    const text = chunk as string;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (capturing) buffer += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === '{') {
        depth++;
        if (depth === 2 && !capturing) {
          capturing = true;
          buffer = '{';
        }
      } else if (char === '}') {
        depth--;
        if (depth === 1 && capturing) {
          capturing = false;
          try {
            const food = JSON.parse(buffer) as FdcFood;
            if (food.fdcId && food.description) onFood(food);
          } catch {
            /* not a food object */
          }
          buffer = '';
        }
      }
    }
  }
}

const [srPath, foundationPath] = process.argv.slice(2);
if (!srPath) {
  console.error('usage: node scripts/build_foods.ts <sr_legacy.json> [foundation.json]');
  process.exit(1);
}

const foods: Food[] = [];
const seen = new Set<string>();
for (const path of [foundationPath, srPath].filter(Boolean)) {
  await eachFood(path, (food) => {
    const trimmed = trim(food);
    if (!trimmed) return;
    const key = trimmed.n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    foods.push(trimmed);
  });
  console.log(path, '→', foods.length, 'foods so far');
}

const payload = { micros: MICRO_NAMES, foods };
const json = JSON.stringify(payload);
const gz = gzipSync(Buffer.from(json), { level: 9 });
writeFileSync('public/foods.json.gz', gz);
console.log(`${foods.length} foods · ${(json.length / 1e6).toFixed(1)} MB json · ${(gz.length / 1e6).toFixed(2)} MB gzipped`);
