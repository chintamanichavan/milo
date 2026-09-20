export interface Ingredient {
  qty?: number;
  unit?: string;
  item: string;
  note?: string;
  raw: string;
}

export interface Step {
  text: string;
  /** seconds, picked out of the text */
  timerSec?: number;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  photoId?: string;
  prepMin?: number;
  cookMin?: number;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  categories: string[];
  tags: string[];
  favourite?: boolean;
  source?: string;
  notes?: string;
  linked?: string[];
  nutrition?: { kcal: number; protein: number; carbs: number; fat: number };
  cooked: number;
  lastCooked?: string;
  rating?: number;
  wantToCook?: boolean;
  collection?: string;
  units?: 'metric' | 'imperial';
}

export interface ShoppingItem {
  item: string;
  qty?: number;
  unit?: string;
  aisle: string;
  checked?: boolean;
  fromRecipe?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
}

export type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PlanEntry {
  date: string;
  slot: Slot;
  recipeId: string;
  servings?: number;
}

export interface CookState {
  recipes: Recipe[];
  lists: ShoppingList[];
  plan: PlanEntry[];
  aisles: Record<string, string>;
}

/* ---------- the ingredient parser ---------- */

const UNITS: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', kg: 'kg', kilogram: 'kg',
  ml: 'ml', l: 'l', litre: 'l', liter: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup', oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  clove: 'clove', cloves: 'clove', pinch: 'pinch', slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can', handful: 'handful', bunch: 'bunch', piece: 'piece', pieces: 'piece',
};

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅛': 0.125,
};

/** "2 cloves garlic, finely chopped" → {qty: 2, unit: clove, item: garlic, note: finely chopped} */
export function parseIngredient(raw: string): Ingredient {
  const line = raw.trim().replace(/\s+/g, ' ');
  if (!line) return { item: '', raw };
  const [main, ...noteParts] = line.split(',');
  let rest = main.trim();
  let qty: number | undefined;

  const fraction = Object.keys(FRACTIONS).find((f) => rest.startsWith(f));
  if (fraction) {
    qty = FRACTIONS[fraction];
    rest = rest.slice(fraction.length).trim();
  } else {
    const match = rest.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?\s*/);
    if (match) {
      qty = match[2] ? Number(match[1]) / Number(match[2]) : Number(match[1]);
      rest = rest.slice(match[0].length).trim();
      const extra = Object.keys(FRACTIONS).find((f) => rest.startsWith(f));
      if (extra) {
        qty += FRACTIONS[extra];
        rest = rest.slice(extra.length).trim();
      }
    }
  }

  let unit: string | undefined;
  const first = rest.split(' ')[0]?.toLowerCase().replace(/\.$/, '');
  if (first && UNITS[first]) {
    unit = UNITS[first];
    rest = rest.slice(rest.split(' ')[0].length).trim();
  }
  if (rest.toLowerCase().startsWith('of ')) rest = rest.slice(3);

  return {
    qty,
    unit,
    item: rest,
    note: noteParts.join(',').trim() || undefined,
    raw,
  };
}

const TIME = /(\d+(?:\.\d+)?)\s*(second|sec|minute|min|hour|hr)s?/i;

/** Steps carry their own timer when the text names one. */
export function parseStep(text: string): Step {
  const match = text.match(TIME);
  if (!match) return { text };
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const sec = unit.startsWith('h') ? value * 3600 : unit.startsWith('m') ? value * 60 : value;
  return { text, timerSec: Math.round(sec) };
}

/** Paste a whole recipe and we do our best with it. */
export function parseText(text: string): Partial<Recipe> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};
  const title = lines[0];
  const body = lines.slice(1);
  const splitAt = body.findIndex((l) => /^(method|steps|directions|instructions)\b/i.test(l));
  const ingredientLines = splitAt >= 0 ? body.slice(0, splitAt) : body.filter((l) => /^[\d½⅓⅔¼¾⅛]/.test(l));
  const stepLines = splitAt >= 0 ? body.slice(splitAt + 1) : body.filter((l) => !/^[\d½⅓⅔¼¾⅛]/.test(l));
  return {
    title,
    ingredients: ingredientLines
      .filter((l) => !/^(ingredients)\b/i.test(l))
      .map(parseIngredient),
    steps: stepLines.map((l) => parseStep(l.replace(/^\d+[.)]\s*/, ''))),
  };
}

/* ---------- scaling and units ---------- */

const NICE: [number, string][] = [
  [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'],
];

export function prettyQty(qty: number): string {
  const whole = Math.floor(qty + 1e-6);
  const rest = qty - whole;
  const nice = NICE.find(([value]) => Math.abs(rest - value) < 0.02);
  if (nice) return `${whole || ''}${nice[1]}`.trim();
  return String(Math.round(qty * 100) / 100);
}

const TO_METRIC: Record<string, [number, string]> = {
  oz: [28.35, 'g'],
  lb: [453.6, 'g'],
  cup: [240, 'ml'],
  tbsp: [15, 'ml'],
  tsp: [5, 'ml'],
};

const TO_IMPERIAL: Record<string, [number, string]> = {
  g: [1 / 28.35, 'oz'],
  kg: [35.27, 'oz'],
  ml: [1 / 240, 'cup'],
  l: [4.227, 'cup'],
};

export function convert(ing: Ingredient, to: 'metric' | 'imperial'): Ingredient {
  if (!ing.qty || !ing.unit) return ing;
  const table = to === 'metric' ? TO_METRIC : TO_IMPERIAL;
  const rule = table[ing.unit];
  if (!rule) return ing;
  return { ...ing, qty: Math.round(ing.qty * rule[0] * 10) / 10, unit: rule[1] };
}

export const scaleIngredient = (ing: Ingredient, factor: number): Ingredient =>
  ing.qty ? { ...ing, qty: ing.qty * factor } : ing;

export const ingredientLine = (ing: Ingredient): string =>
  [ing.qty ? prettyQty(ing.qty) : '', ing.unit ?? '', ing.item].filter(Boolean).join(' ') +
  (ing.note ? `, ${ing.note}` : '');

/* ---------- aisles ---------- */

export const AISLES: Record<string, string[]> = {
  Produce: ['onion', 'garlic', 'tomato', 'potato', 'carrot', 'pepper', 'spinach', 'lemon', 'lime', 'ginger', 'coriander', 'chilli', 'mushroom', 'cucumber', 'apple', 'banana', 'avocado', 'herb', 'parsley', 'mint', 'salad', 'broccoli', 'cabbage'],
  'Meat & fish': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'prawn', 'shrimp', 'mackerel', 'sardine', 'mutton', 'egg'],
  Dairy: ['milk', 'butter', 'cheese', 'yoghurt', 'yogurt', 'cream', 'paneer', 'ghee'],
  Pantry: ['rice', 'flour', 'sugar', 'salt', 'oil', 'vinegar', 'pasta', 'noodle', 'lentil', 'dal', 'bean', 'chickpea', 'stock', 'tin', 'can', 'coconut', 'honey', 'sauce', 'paste'],
  Spices: ['cumin', 'turmeric', 'masala', 'pepper', 'chilli powder', 'cinnamon', 'cardamom', 'clove', 'bay', 'oregano', 'paprika', 'seed'],
  Frozen: ['frozen', 'peas', 'ice'],
  Bakery: ['bread', 'roti', 'naan', 'bun', 'tortilla'],
};

export function aisleFor(item: string, overrides: Record<string, string> = {}): string {
  const key = item.toLowerCase();
  if (overrides[key]) return overrides[key];
  for (const [aisle, words] of Object.entries(AISLES))
    if (words.some((w) => key.includes(w))) return aisle;
  return 'Other';
}
