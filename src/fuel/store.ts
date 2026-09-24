import { dayKey } from '../ui/time';
import type { Food } from './foods';
import {
  baseline,
  estimate,
  macrosFor,
  targetFromTdee,
  trend,
  type Macros,
  type MacroProgram,
  type Pace,
  type WeighIn,
} from './tdee';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Entry {
  id: string;
  date: string;
  meal: Meal;
  foodId: number | string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  micros?: number[];
  recipeId?: string;
}

export interface Profile {
  sex: 'male' | 'female';
  age: number;
  heightIn: number;
  activity: number;
  pace: Pace;
  program: MacroProgram;
  proteinPerLb: number;
  fatPercent: number;
  mode: 'coached' | 'manual' | 'collaborative';
  manualKcal?: number;
}

export interface FuelState {
  entries: Entry[];
  weights: WeighIn[];
  customs: Food[];
  templates: { name: string; entries: Omit<Entry, 'id' | 'date'>[] }[];
  notes: Record<string, string>;
  water: Record<string, number>;
  fasting?: { startedAt: number; goalHours: number } | null;
  profile: Profile;
  tdee: number;
  checkIns: { date: string; tdee: number; target: number; note: string }[];
  favourites: (number | string)[];
  waterGoalMl: number;
  onboarded?: boolean;
}

export { FUEL_KEY } from '../keys';
import { FUEL_KEY } from '../keys';

const blank = (): FuelState => ({
  entries: [],
  weights: [],
  customs: [],
  templates: [],
  notes: {},
  water: {},
  fasting: null,
  profile: {
    sex: 'male',
    age: 27,
    heightIn: 70,
    activity: 1.5,
    pace: 'maintain',
    program: 'balanced',
    proteinPerLb: 0.8,
    fatPercent: 30,
    mode: 'coached',
  },
  tdee: 0,
  checkIns: [],
  favourites: [],
  waterGoalMl: 2500,
});

export function loadFuel(): FuelState {
  try {
    const raw = localStorage.getItem(FUEL_KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<FuelState>;
    return { ...blank(), ...parsed, profile: { ...blank().profile, ...(parsed.profile ?? {}) } };
  } catch {
    return blank();
  }
}

export function saveFuel(state: FuelState): void {
  localStorage.setItem(FUEL_KEY, JSON.stringify(state));
}

export const entriesOn = (state: FuelState, date = dayKey()): Entry[] =>
  state.entries.filter((e) => e.date === date);

export const sumOf = (entries: Entry[]): { kcal: number; protein: number; carbs: number; fat: number } =>
  entries.reduce(
    (t, e) => ({
      kcal: t.kcal + e.kcal,
      protein: t.protein + e.protein,
      carbs: t.carbs + e.carbs,
      fat: t.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

export function microsOn(state: FuelState, date = dayKey()): number[] {
  const out: number[] = [];
  for (const entry of entriesOn(state, date))
    (entry.micros ?? []).forEach((value, i) => {
      out[i] = (out[i] ?? 0) + value;
    });
  return out;
}

export function addEntry(entry: Omit<Entry, 'id'>): string {
  const state = loadFuel();
  const id = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  state.entries.push({ ...entry, id });
  saveFuel(state);
  return id;
}

export function removeEntry(id: string): void {
  const state = loadFuel();
  state.entries = state.entries.filter((e) => e.id !== id);
  saveFuel(state);
}

export function updateEntry(id: string, patch: Partial<Entry>): void {
  const state = loadFuel();
  const at = state.entries.findIndex((e) => e.id === id);
  if (at < 0) return;
  state.entries[at] = { ...state.entries[at], ...patch };
  saveFuel(state);
}

/** portion a food and turn it into a diary line */
export function entryFromFood(food: Food, grams: number, meal: Meal, date = dayKey()): Omit<Entry, 'id'> {
  const factor = grams / 100;
  return {
    date,
    meal,
    foodId: food.i,
    name: food.n,
    grams,
    kcal: Math.round(food.k * factor),
    protein: Math.round(food.p * factor * 10) / 10,
    carbs: Math.round(food.c * factor * 10) / 10,
    fat: Math.round(food.f * factor * 10) / 10,
    micros: food.m.map((m) => Math.round(m * factor * 100) / 100),
  };
}

export function copyDay(from: string, to = dayKey()): number {
  const state = loadFuel();
  const source = state.entries.filter((e) => e.date === from);
  for (const entry of source)
    state.entries.push({ ...entry, id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: to });
  saveFuel(state);
  return source.length;
}

export function copyMeal(from: string, meal: Meal, to = dayKey()): number {
  const state = loadFuel();
  const source = state.entries.filter((e) => e.date === from && e.meal === meal);
  for (const entry of source)
    state.entries.push({ ...entry, id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: to });
  saveFuel(state);
  return source.length;
}

export function quickAdd(meal: Meal, kcal: number, protein = 0, carbs = 0, fat = 0): void {
  addEntry({
    date: dayKey(),
    meal,
    foodId: 'quick',
    name: 'Quick add',
    grams: 0,
    kcal,
    protein,
    carbs,
    fat,
  });
}

/** a cooked recipe becomes one diary line per serving */
export async function logRecipe(recipeId: string, servings = 1, meal: Meal = 'dinner'): Promise<void> {
  const { loadCook, recipeById } = await import('../cook/store');
  const recipe = recipeById(loadCook(), recipeId);
  if (!recipe) return;
  const n = recipe.nutrition;
  addEntry({
    date: dayKey(),
    meal,
    foodId: `recipe-${recipeId}`,
    recipeId,
    name: recipe.title,
    grams: 0,
    kcal: Math.round((n?.kcal ?? 550) * servings),
    protein: Math.round((n?.protein ?? 25) * servings),
    carbs: Math.round((n?.carbs ?? 55) * servings),
    fat: Math.round((n?.fat ?? 20) * servings),
  });
}

/* ---------- weight and targets ---------- */

export function addWeight(lb: number, date = dayKey()): void {
  const state = loadFuel();
  state.weights.push({ date, lb });
  saveFuel(state);
}

export const trendWeight = (state: FuelState): number => {
  const line = trend(state.weights);
  return line.length ? line[line.length - 1].lb : 0;
};

export function currentTdee(state: FuelState): number {
  if (state.tdee) return state.tdee;
  const weight = trendWeight(state) || 160;
  return baseline(state.profile.sex, state.profile.age, state.profile.heightIn, weight, state.profile.activity);
}

export function targets(state: FuelState): { kcal: number; macros: Macros } {
  const kcal =
    state.profile.mode === 'manual' && state.profile.manualKcal
      ? state.profile.manualKcal
      : targetFromTdee(currentTdee(state), state.profile.pace);
  return {
    kcal,
    macros: macrosFor(kcal, state.profile.program, trendWeight(state) || 160, {
      proteinPerLb: state.profile.proteinPerLb,
      fatPercent: state.profile.fatPercent,
    }),
  };
}

/** the weekly re-estimate: what did the last fortnight actually say? */
export function checkIn(): { tdee: number; target: number; note: string } | null {
  const state = loadFuel();
  const byDay = new Map<string, number>();
  for (const entry of state.entries)
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.kcal);
  const intake = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, kcal]) => ({ date, kcal }));
  const result = estimate(intake, state.weights, state.tdee);
  if (!result) return null;
  const tdee = state.profile.mode === 'manual' ? currentTdee(state) : result.tdee;
  state.tdee = tdee;
  const target = targetFromTdee(tdee, state.profile.pace);
  state.checkIns.push({ date: dayKey(), tdee, target, note: result.sentence });
  saveFuel(state);
  return { tdee, target, note: result.sentence };
}

/** days logged in a row, one miss forgiven */
export function loggedStreak(state: FuelState): number {
  const days = new Set(state.entries.map((e) => e.date));
  let count = 0;
  let forgiven = false;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(dayKey(d))) count++;
    else if (i === 0) continue;
    else if (!forgiven) forgiven = true;
    else break;
  }
  return count;
}

export function setProfile(patch: Partial<Profile>): void {
  const state = loadFuel();
  state.profile = { ...state.profile, ...patch };
  saveFuel(state);
}

export function addWater(ml: number, date = dayKey()): void {
  const state = loadFuel();
  state.water[date] = (state.water[date] ?? 0) + ml;
  saveFuel(state);
}

export function setNote(date: string, note: string): void {
  const state = loadFuel();
  state.notes[date] = note;
  saveFuel(state);
}

export function startFast(goalHours: number): void {
  const state = loadFuel();
  state.fasting = { startedAt: Date.now(), goalHours };
  saveFuel(state);
}

export function stopFast(): void {
  const state = loadFuel();
  state.fasting = null;
  saveFuel(state);
}

export function saveTemplate(name: string, meal: Meal, date = dayKey()): void {
  const state = loadFuel();
  const entries = state.entries
    .filter((e) => e.date === date && e.meal === meal)
    .map(({ id: _id, date: _date, ...rest }) => rest);
  if (entries.length) {
    state.templates.push({ name, entries });
    saveFuel(state);
  }
}

export function useTemplate(index: number, meal: Meal): void {
  const state = loadFuel();
  const template = state.templates[index];
  if (!template) return;
  for (const entry of template.entries)
    state.entries.push({
      ...entry,
      meal,
      date: dayKey(),
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    });
  saveFuel(state);
}

/** everything, as a spreadsheet */
export function toCsv(state: FuelState): string {
  const rows = [
    'date,meal,food,grams,kcal,protein,carbs,fat',
    ...state.entries.map((e) =>
      [e.date, e.meal, `"${e.name.replace(/"/g, "'")}"`, e.grams, e.kcal, e.protein, e.carbs, e.fat].join(','),
    ),
  ];
  return rows.join('\n');
}

/** Apple Health export.zip → weights, parsed in a worker so the UI keeps moving */
export function parseHealthExport(file: File): Promise<number> {
  return new Promise((resolve) => {
    const code = `
      self.onmessage = async (event) => {
        const text = await event.data.text();
        const matches = text.matchAll(/type="HKQuantityTypeIdentifierBodyMass"[^>]*startDate="([^"]+)"[^>]*value="([\\d.]+)"[^>]*unit="([^"]+)"/g);
        const out = [];
        for (const m of matches) {
          const lb = m[3] === 'kg' ? Number(m[2]) * 2.20462 : Number(m[2]);
          out.push({ date: m[1].slice(0, 10), lb: Math.round(lb * 10) / 10 });
        }
        self.postMessage(out);
      };`;
    const worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    worker.onmessage = (event: MessageEvent<WeighIn[]>) => {
      const state = loadFuel();
      const seen = new Set(state.weights.map((w) => `${w.date}:${w.lb}`));
      let added = 0;
      for (const w of event.data)
        if (!seen.has(`${w.date}:${w.lb}`)) {
          state.weights.push(w);
          added++;
        }
      state.weights.sort((a, b) => a.date.localeCompare(b.date));
      saveFuel(state);
      worker.terminate();
      resolve(added);
    };
    worker.postMessage(file);
  });
}
