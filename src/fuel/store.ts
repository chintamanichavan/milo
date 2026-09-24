import { dayKey } from '../ui/time';
import type { Food } from './foods';
import {
  baseline,
  estimate,
  macrosFor,
  PACE_LB_PER_WEEK,
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
  /** where the scale is heading */
  goalLb?: number;
  /** calories moved between days of the week, Sunday first; fasting days eat little */
  weekly?: { shift: number[]; fasting: boolean[]; fastingKcal: number };
  /** your own daily targets for micronutrients, by name */
  microTargets?: Record<string, number>;
  /** cycle tracking, off unless asked for */
  cycle?: boolean;
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
  /** steps by day, from Apple Health or typed in */
  steps: Record<string, number>;
  /** the first day of each period */
  periods: string[];
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
  steps: {},
  periods: [],
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

/** the target before any day of the week has its say */
export function baseKcal(state: FuelState): number {
  return state.profile.mode === 'manual' && state.profile.manualKcal
    ? state.profile.manualKcal
    : targetFromTdee(currentTdee(state), state.profile.pace);
}

/** a day's calories: the base, shifted for that weekday, or the fasting amount */
export function kcalFor(state: FuelState, weekday: number): number {
  const base = baseKcal(state);
  const week = state.profile.weekly;
  if (!week) return base;
  if (week.fasting[weekday]) return week.fastingKcal;
  return Math.max(1000, base + (week.shift[weekday] ?? 0));
}

export function targets(state: FuelState, date = dayKey()): { kcal: number; macros: Macros } {
  const kcal = kcalFor(state, new Date(`${date}T12:00:00`).getDay());
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

/** export.zip holds export.xml; find it and inflate it, with nothing but the browser */
async function healthXml(file: File): Promise<Blob> {
  if (!/\.zip$/i.test(file.name)) return file;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  // the end-of-central-directory record, then walk the central directory
  let eocd = bytes.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip');
  let at = view.getUint32(eocd + 16, true);
  const count = view.getUint16(eocd + 10, true);
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    if (/(^|\/)export\.xml$/.test(name)) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = new Blob([bytes.subarray(start, start + size)]);
      if (method === 0) return data;
      return new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
    }
    at += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('no export.xml');
}

/** Apple Health export → weigh-ins and daily steps, parsed in a worker so the UI keeps moving */
export async function parseHealthExport(file: File): Promise<{ weights: number; steps: number }> {
  const xml = await healthXml(file);
  return new Promise((resolve) => {
    const code = `
      self.onmessage = async (event) => {
        const text = await event.data.text();
        const attr = (tag, name) => (new RegExp(name + '="([^"]*)"').exec(tag) || [])[1];
        const weights = [];
        // each source counts its own steps; the phone and the watch overlap, so a day takes the larger
        const steps = {};
        for (const m of text.matchAll(/<Record type="HKQuantityTypeIdentifier(BodyMass|StepCount)"[^>]*>/g)) {
          const tag = m[0];
          const date = (attr(tag, 'startDate') || '').slice(0, 10);
          const value = Number(attr(tag, 'value'));
          if (!date || !(value > 0)) continue;
          if (m[1] === 'BodyMass') {
            const lb = attr(tag, 'unit') === 'kg' ? value * 2.20462 : value;
            weights.push({ date, lb: Math.round(lb * 10) / 10 });
          } else {
            const source = attr(tag, 'sourceName') || '';
            steps[date] = steps[date] || {};
            steps[date][source] = (steps[date][source] || 0) + value;
          }
        }
        const daily = {};
        for (const [date, bySource] of Object.entries(steps)) daily[date] = Math.max(...Object.values(bySource));
        self.postMessage({ weights, steps: daily });
      };`;
    const worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    worker.onmessage = (event: MessageEvent<{ weights: WeighIn[]; steps: Record<string, number> }>) => {
      const state = loadFuel();
      const seen = new Set(state.weights.map((w) => `${w.date}:${w.lb}`));
      let added = 0;
      for (const w of event.data.weights)
        if (!seen.has(`${w.date}:${w.lb}`)) {
          state.weights.push(w);
          added++;
        }
      state.weights.sort((a, b) => a.date.localeCompare(b.date));
      const days = Object.keys(event.data.steps).length;
      state.steps = { ...state.steps, ...Object.fromEntries(Object.entries(event.data.steps).map(([d, n]) => [d, Math.round(n)])) };
      saveFuel(state);
      worker.terminate();
      resolve({ weights: added, steps: days });
    };
    worker.postMessage(xml);
  });
}

/* ---------- the week, the goal and the averages ---------- */

/** a week of targets, and what they average to */
export function weekPlan(state: FuelState): { days: number[]; average: number } {
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => kcalFor(state, d));
  return { days, average: Math.round(days.reduce((a, b) => a + b, 0) / 7) };
}

/** pounds a week, from the trend over the last four weeks */
export function trendRate(state: FuelState): number {
  const line = trend(state.weights);
  if (line.length < 2) return 0;
  const last = line[line.length - 1];
  const cutoff = new Date(`${last.date}T12:00:00`).getTime() - 28 * 86_400_000;
  const first = line.find((p) => new Date(`${p.date}T12:00:00`).getTime() >= cutoff) ?? line[0];
  const days = (new Date(`${last.date}T12:00:00`).getTime() - new Date(`${first.date}T12:00:00`).getTime()) / 86_400_000;
  return days >= 3 ? ((last.lb - first.lb) / days) * 7 : 0;
}

/** when the goal weight arrives, at the rate you are going (or the pace you chose) */
export function goalEta(state: FuelState): { lbToGo: number; weekly: number; date: string | null; source: string } | null {
  const goal = state.profile.goalLb;
  const now = trendWeight(state);
  if (!goal || !now) return null;
  const lbToGo = goal - now;
  const measured = trendRate(state);
  const planned = PACE_LB_PER_WEEK[state.profile.pace];
  const heading = (rate: number): boolean => rate !== 0 && Math.sign(rate) === Math.sign(lbToGo);
  const weekly = heading(measured) ? measured : heading(planned) ? planned : 0;
  if (Math.abs(lbToGo) < 0.3) return { lbToGo, weekly, date: dayKey(), source: 'there' };
  if (!weekly) return { lbToGo, weekly: 0, date: null, source: 'not moving that way yet' };
  const days = Math.round((lbToGo / weekly) * 7);
  const when = new Date();
  when.setDate(when.getDate() + days);
  return { lbToGo, weekly, date: dayKey(when), source: weekly === measured ? 'your trend' : 'your chosen pace' };
}

export interface AverageRow {
  label: string;
  days: number;
  logged: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  weightChange: number | null;
}

/** averages per logged day, over the week, the month, the quarter and all time */
export function averages(state: FuelState): AverageRow[] {
  const byDay = new Map<string, { kcal: number; protein: number; carbs: number; fat: number }>();
  for (const e of state.entries) {
    const d = byDay.get(e.date) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    d.kcal += e.kcal;
    d.protein += e.protein;
    d.carbs += e.carbs;
    d.fat += e.fat;
    byDay.set(e.date, d);
  }
  const line = trend(state.weights);
  const first = [...byDay.keys(), ...line.map((p) => p.date)].sort()[0];
  const allDays = first ? Math.max(1, Math.round((Date.now() - new Date(`${first}T12:00:00`).getTime()) / 86_400_000) + 1) : 0;
  return (
    [
      ['7 days', 7],
      ['30 days', 30],
      ['90 days', 90],
      ['All time', allDays],
    ] as const
  ).map(([label, days]) => {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    const from = dayKey(since);
    const inRange = [...byDay.entries()].filter(([d]) => d >= from).map(([, v]) => v);
    const n = inRange.length || 1;
    const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat'): number => Math.round(inRange.reduce((a, v) => a + v[k], 0) / n);
    const w = line.filter((p) => p.date >= from);
    return {
      label,
      days,
      logged: inRange.length,
      kcal: sum('kcal'),
      protein: sum('protein'),
      carbs: sum('carbs'),
      fat: sum('fat'),
      weightChange: w.length > 1 ? Math.round((w[w.length - 1].lb - w[0].lb) * 10) / 10 : null,
    };
  });
}

/** days in a row with a weigh-in, today allowed to be still to come */
export function weighStreak(state: FuelState): number {
  const days = new Set(state.weights.map((w) => w.date));
  let count = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days.has(dayKey(d))) count++;
    else if (i === 0) continue;
    else break;
  }
  return count;
}

/** the last n days: was food logged, was the scale stepped on */
export function habitStrip(state: FuelState, n = 30): { date: string; logged: boolean; weighed: boolean }[] {
  const logged = new Set(state.entries.map((e) => e.date));
  const weighed = new Set(state.weights.map((w) => w.date));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    const key = dayKey(d);
    return { date: key, logged: logged.has(key), weighed: weighed.has(key) };
  });
}

/* ---------- micronutrients: targets, sources, timing ---------- */

export const microTarget = (state: FuelState, name: string, reference: number): number =>
  state.profile.microTargets?.[name] ?? reference;

/** which foods gave you the most of one nutrient, over the last n days */
export function topSources(state: FuelState, microIndex: number, days: number): { name: string; amount: number }[] {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const from = dayKey(since);
  const byFood = new Map<string, number>();
  for (const e of state.entries) {
    if (e.date < from) continue;
    const value = e.micros?.[microIndex] ?? 0;
    if (value > 0) byFood.set(e.name, (byFood.get(e.name) ?? 0) + value);
  }
  return [...byFood.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
}

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** energy and macros by meal, over the last n days (1 is today) */
export function byMeal(state: FuelState, days: number): Record<Meal, { kcal: number; protein: number; carbs: number; fat: number }> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const from = dayKey(since);
  const out = Object.fromEntries(MEAL_ORDER.map((m) => [m, { kcal: 0, protein: 0, carbs: 0, fat: 0 }])) as Record<
    Meal,
    { kcal: number; protein: number; carbs: number; fat: number }
  >;
  for (const e of state.entries) {
    if (e.date < from) continue;
    const slot = out[e.meal];
    slot.kcal += e.kcal;
    slot.protein += e.protein;
    slot.carbs += e.carbs;
    slot.fat += e.fat;
  }
  return out;
}

/* ---------- steps ---------- */

export function setSteps(date: string, steps: number): void {
  const state = loadFuel();
  state.steps = { ...state.steps, [date]: Math.max(0, Math.round(steps)) };
  saveFuel(state);
}

/** a rough extra burn from walking: about four hundredths of a calorie a step for an adult */
export const stepKcal = (steps: number, lb: number): number => Math.round(steps * 0.00025 * (lb || 160));

/* ---------- the cycle ---------- */

export function togglePeriod(date: string): void {
  const state = loadFuel();
  state.periods = state.periods.includes(date)
    ? state.periods.filter((d) => d !== date)
    : [...state.periods, date].sort();
  saveFuel(state);
}

/** the phase a date falls in, from the logged starts and their average length */
export function cyclePhase(state: FuelState, date: string): { day: number; phase: 'period' | 'follicular' | 'luteal'; length: number } | null {
  const starts = state.periods.filter((d) => d <= date);
  if (!starts.length) return null;
  const gaps = state.periods
    .slice(1)
    .map((d, i) => (new Date(d).getTime() - new Date(state.periods[i]).getTime()) / 86_400_000)
    .filter((g) => g > 15 && g < 45);
  const length = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 28;
  const day = Math.round((new Date(date).getTime() - new Date(starts[starts.length - 1]).getTime()) / 86_400_000) + 1;
  if (day > length + 10) return null;
  return { day, length, phase: day <= 5 ? 'period' : day <= length - 14 ? 'follicular' : 'luteal' };
}

/* ---------- reading a nutrition label ---------- */

export interface LabelRead {
  name: string;
  servingG: number;
  kcal: number;
  fat: number;
  carbs: number;
  protein: number;
  fibre: number;
  sugar: number;
  sodiumMg: number;
}

/** the numbers off an American nutrition facts panel, as best the photo allows */
export function parseLabel(text: string): LabelRead {
  const flat = text.replace(/[|]/g, ' ').replace(/\s+/g, ' ');
  // OCR reads O for 0 and l for 1 inside numbers often enough to be worth fixing
  const num = (re: RegExp): number => {
    const m = re.exec(flat);
    return m ? Number(m[1].replace(/[Oo]/g, '0').replace(/[lI]/g, '1')) : 0;
  };
  const servingG =
    num(/serving size[^(]*\((\d+(?:\.\d+)?)\s*g\)/i) ||
    // a small g in brackets often comes back as a 9: "(2409)" is 240 g
    num(/serving size[^(]*\((\d+?)9\)/i) ||
    num(/serving size\s*(\d+(?:\.\d+)?)\s*g\b/i) ||
    num(/\((\d+(?:\.\d+)?)\s*g\)/i) ||
    100;
  return {
    name: '',
    servingG,
    kcal: num(/calories\s*([\dOol]+)/i),
    fat: num(/total fat\s*([\dOol]+(?:\.\d+)?)\s*g/i),
    carbs: num(/total carb[a-z.]*\s*([\dOol]+(?:\.\d+)?)\s*g/i),
    protein: num(/protein\s*([\dOol]+(?:\.\d+)?)\s*g/i),
    fibre: num(/(?:dietary )?fib(?:er|re)\s*([\dOol]+(?:\.\d+)?)\s*g/i),
    sugar: num(/total sugars?\s*([\dOol]+(?:\.\d+)?)\s*g/i),
    sodiumMg: num(/sodium\s*([\dOol]+)\s*mg/i),
  };
}
