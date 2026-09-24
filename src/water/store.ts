import { now } from '../clock';
import { FUEL_KEY, loadFuel, trendWeight } from '../fuel/store';
import { LIFT_KEY } from '../lift/store';
import { load as loadRun } from '../run/store';
import { dayKey } from '../ui/time';
import {
  ACHIEVEMENTS,
  CHALLENGES,
  COMPANIONS,
  DRINKS,
  ML_PER_OZ,
  WATER_KEY,
  type ChallengeId,
  type CharacterId,
  type Drink,
  type Unit,
} from './model';

export { WATER_KEY };

export interface Sip {
  id: string;
  /** when it was drunk */
  at: number;
  /** when it was logged, so undo takes back the last thing you did */
  made: number;
  drinkId: string;
  /** raw volume, in ounces */
  oz: number;
  note?: string;
}

export interface WaterSettings {
  unit: Unit;
  /** a goal you set yourself, in ounces, instead of the worked-out one */
  manualOz: number | null;
  character: CharacterId;
  sound: boolean;
  wake: string;
  bed: string;
  reminders: number;
  /** per-drink cup, in ounces */
  sizes: Record<string, number>;
  /** what one tap on the Fuel card pours */
  quick: string;
}

export interface ChallengeRun {
  started: string;
  done?: string;
}

export interface WaterState {
  sips: Sip[];
  customs: Drink[];
  settings: WaterSettings;
  /** the goal each day had, as it stood on that day */
  goals: Record<string, number>;
  /** achievements and companions, with the day they were earned */
  earned: Record<string, string>;
  challenges: Partial<Record<ChallengeId, ChallengeRun>>;
  heat?: { date: string; maxF: number };
  migrated?: boolean;
}

const defaults = (): WaterSettings => {
  // wake up with the run reminder if that is earlier than seven
  const runAt = loadRun().settings.reminder.time;
  return {
    unit: 'oz',
    manualOz: null,
    character: 'llama',
    sound: true,
    wake: runAt < '07:00' ? runAt : '07:00',
    bed: '22:30',
    reminders: 8,
    sizes: {},
    quick: 'water',
  };
};

const blank = (): WaterState => ({
  sips: [],
  customs: [],
  settings: defaults(),
  goals: {},
  earned: {},
  challenges: {},
});

/* ---------- time, on the app's own clock so the tests can move days ---------- */

export const today = (): string => dayKey(new Date(now()));

export const dayOf = (at: number): string => dayKey(new Date(at));

export function shiftDay(key: string, by: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + by, 12);
  return dayKey(date);
}

const hourOf = (at: number): number => new Date(at).getHours();

/** "2026-09-23" stays itself; anything else is read as a moment in time */
const dayOfStamp = (stamp: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(stamp) ? stamp : dayKey(new Date(stamp)));

/* ---------- load and save ---------- */

export function loadWater(): WaterState {
  let state: WaterState;
  try {
    const raw = localStorage.getItem(WATER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<WaterState>) : {};
    state = {
      ...blank(),
      ...parsed,
      settings: { ...defaults(), ...(parsed.settings ?? {}) },
    };
  } catch {
    state = blank();
  }
  if (!state.migrated) migrateFuel(state);
  return state;
}

export function saveWater(state: WaterState): void {
  localStorage.setItem(WATER_KEY, JSON.stringify(state));
}

/** Fuel used to keep a millilitre count per day; it becomes one glass at noon. */
function migrateFuel(state: WaterState): void {
  state.migrated = true;
  try {
    const fuel = JSON.parse(localStorage.getItem(FUEL_KEY) ?? 'null') as { water?: Record<string, number> } | null;
    for (const [date, ml] of Object.entries(fuel?.water ?? {})) {
      if (!ml) continue;
      const [y, m, d] = date.split('-').map(Number);
      const at = new Date(y, m - 1, d, 12).getTime();
      state.sips.push({ id: `sip-${at}-fuel`, at, made: at, drinkId: 'water', oz: ml / ML_PER_OZ });
    }
  } catch {
    // nothing worth carrying over
  }
  saveWater(state);
}

/* ---------- drinks ---------- */

export const allDrinks = (state: WaterState): Drink[] => [...DRINKS, ...state.customs];

export const drinkById = (state: WaterState, id: string): Drink =>
  allDrinks(state).find((d) => d.id === id) ?? DRINKS[0];

export const cupFor = (state: WaterState, id: string): number =>
  state.settings.sizes[id] ?? drinkById(state, id).defaultOz;

export function saveCustom(drink: Omit<Drink, 'id' | 'custom'> & { id?: string }): Drink {
  const state = loadWater();
  const made: Drink = { ...drink, id: drink.id ?? `custom-${now()}`, custom: true };
  state.customs = [...state.customs.filter((d) => d.id !== made.id), made];
  saveWater(state);
  return made;
}

export function deleteCustom(id: string): void {
  const state = loadWater();
  state.customs = state.customs.filter((d) => d.id !== id);
  saveWater(state);
}

export function setWaterSettings(patch: Partial<WaterSettings>): WaterSettings {
  const state = loadWater();
  state.settings = { ...state.settings, ...patch };
  saveWater(state);
  return state.settings;
}

/* ---------- the goal ---------- */

export interface GoalParts {
  /** body weight the base came from, and whether it was really measured */
  weightLb: number;
  weighed: boolean;
  base: number;
  activity: number;
  heat: number;
  manual: number | null;
  total: number;
}

function activeOn(date: string): boolean {
  const runs = loadRun().completedRuns.some((r) => dayOfStamp(r.date) === date);
  if (runs) return true;
  try {
    const lift = JSON.parse(localStorage.getItem(LIFT_KEY) ?? 'null') as { sessions?: { date: string }[] } | null;
    return (lift?.sessions ?? []).some((s) => dayOfStamp(s.date) === date);
  } catch {
    return false;
  }
}

/** half an ounce per pound, more on a training day, more again when Chicago is hot */
export function goalParts(state: WaterState, date = today()): GoalParts {
  const measured = trendWeight(loadFuel());
  const weightLb = measured || 160;
  const base = Math.round(weightLb * 0.5);
  const activity = activeOn(date) ? 16 : 0;
  const heat = state.heat && state.heat.date === date && state.heat.maxF > 85 ? 12 : 0;
  const manual = state.settings.manualOz;
  return {
    weightLb,
    weighed: measured > 0,
    base,
    activity,
    heat,
    manual,
    total: manual ?? base + activity + heat,
  };
}

/** today's goal, written down so later days remember what it was */
export function goalToday(state: WaterState): number {
  const key = today();
  const total = goalParts(state, key).total;
  if (state.goals[key] !== total) {
    state.goals[key] = total;
    saveWater(state);
  }
  return total;
}

export const goalOn = (state: WaterState, date: string): number =>
  date === today() ? goalParts(state, date).total : state.goals[date] ?? goalParts(state, date).total;

/* ---------- what was drunk ---------- */

export const sipsOn = (state: WaterState, date = today()): Sip[] =>
  state.sips.filter((s) => dayOf(s.at) === date).sort((a, b) => a.at - b.at);

export const rawOf = (sips: Sip[]): number => sips.reduce((sum, s) => sum + s.oz, 0);

export const effectiveOf = (state: WaterState, sips: Sip[]): number =>
  sips.reduce((sum, s) => sum + s.oz * drinkById(state, s.drinkId).factor, 0);

export const effectiveOn = (state: WaterState, date = today()): number => effectiveOf(state, sipsOn(state, date));

export const metOn = (state: WaterState, date: string): boolean => {
  const goal = goalOn(state, date);
  return goal > 0 && effectiveOn(state, date) >= goal - 0.05;
};

export function logSip(drinkId: string, oz?: number, at = now(), note?: string): { sip: Sip; earned: string[] } {
  const state = loadWater();
  goalToday(state);
  const sip: Sip = {
    id: `sip-${now()}-${Math.round(Math.random() * 1e6)}`,
    at,
    made: now(),
    drinkId,
    oz: oz ?? cupFor(state, drinkId),
    ...(note ? { note } : {}),
  };
  state.sips.push(sip);
  saveWater(state);
  return { sip, earned: award() };
}

/** takes back the last thing logged, whenever it was drunk */
export function undoLast(): Sip | null {
  const state = loadWater();
  if (!state.sips.length) return null;
  const last = state.sips.reduce((a, b) => (b.made > a.made ? b : a));
  state.sips = state.sips.filter((s) => s.id !== last.id);
  saveWater(state);
  return last;
}

export function updateSip(id: string, patch: Partial<Sip>): void {
  const state = loadWater();
  state.sips = state.sips.map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveWater(state);
  award();
}

export function deleteSip(id: string): void {
  const state = loadWater();
  state.sips = state.sips.filter((s) => s.id !== id);
  saveWater(state);
}

/* ---------- streaks ---------- */

/** days in a row the goal was met; today only counts once it is */
export function streak(state: WaterState): number {
  let run = 0;
  const key = today();
  for (let i = 0; i < 800; i++) {
    const date = shiftDay(key, -i);
    if (metOn(state, date)) run++;
    else if (i === 0) continue;
    else break;
  }
  return run;
}

function firstDay(state: WaterState): string {
  if (!state.sips.length) return today();
  return dayOf(state.sips.reduce((a, b) => (b.at < a.at ? b : a)).at);
}

export function bestStreak(state: WaterState): number {
  let best = 0;
  let run = 0;
  const end = today();
  for (let date = firstDay(state); date <= end; date = shiftDay(date, 1)) {
    run = metOn(state, date) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export const daysMet = (state: WaterState): number => {
  const days = new Set(state.sips.map((s) => dayOf(s.at)));
  return [...days].filter((d) => metOn(state, d)).length;
};

/** share of the last seven days that met the goal */
export function weekConsistency(state: WaterState): number {
  let hit = 0;
  for (let i = 0; i < 7; i++) if (metOn(state, shiftDay(today(), -i))) hit++;
  return Math.round((hit / 7) * 100);
}

/* ---------- challenges ---------- */

export interface ChallengeStatus {
  state: 'idle' | 'active' | 'done' | 'broken';
  progress: number;
  target: number;
  note: string;
}

export function challengeStatus(state: WaterState, id: ChallengeId): ChallengeStatus {
  const def = CHALLENGES.find((c) => c.id === id)!;
  const run = state.challenges[id];
  if (!run) return { state: 'idle', progress: 0, target: def.target, note: def.blurb };
  if (run.done) return { state: 'done', progress: def.target, target: def.target, note: `Finished ${run.done}` };
  const key = today();
  let progress = 0;
  let broken = false;

  if (id === 'week' || id === 'month') {
    for (let date = run.started; date <= key; date = shiftDay(date, 1)) {
      if (metOn(state, date)) progress++;
      else if (date !== key) progress = 0;
    }
  } else if (id === 'nosoda') {
    for (let date = run.started; date <= key; date = shiftDay(date, 1)) {
      if (sipsOn(state, date).some((s) => s.drinkId === 'soda')) {
        broken = true;
        break;
      }
      if (date < key) progress++;
    }
  } else if (id === 'morning') {
    for (let date = run.started; date <= key; date = shiftDay(date, 1))
      if (sipsOn(state, date).some((s) => (s.drinkId === 'water' || s.drinkId === 'sparkling') && hourOf(s.at) < 10))
        progress++;
  } else if (id === 'runday') {
    for (let date = run.started; date <= key; date = shiftDay(date, 1)) {
      if (!activeOn(date)) continue;
      if (metOn(state, date)) progress++;
      else if (date !== key) progress = 0;
    }
  }
  progress = Math.min(def.target, progress);
  if (broken) return { state: 'broken', progress, target: def.target, note: 'A soda slipped in. Start it again?' };
  return {
    state: 'active',
    progress,
    target: def.target,
    note: `${progress} of ${def.target}${id === 'runday' ? ' run days' : ' days'}`,
  };
}

export function startChallenge(id: ChallengeId): void {
  const state = loadWater();
  state.challenges[id] = { started: today() };
  saveWater(state);
}

export function dropChallenge(id: ChallengeId): void {
  const state = loadWater();
  delete state.challenges[id];
  saveWater(state);
}

/* ---------- achievements and companions ---------- */

/** everything earned just now, by name, so the view can say so */
export function award(): string[] {
  const state = loadWater();
  const earnedNow: string[] = [];
  const give = (id: string, name: string): void => {
    if (state.earned[id]) return;
    state.earned[id] = today();
    earnedNow.push(name);
  };

  // challenges finish themselves
  for (const def of CHALLENGES) {
    const run = state.challenges[def.id];
    if (!run || run.done) continue;
    const status = challengeStatus(state, def.id);
    if (status.state === 'active' && status.progress >= def.target) {
      run.done = today();
      earnedNow.push(`${def.name} complete`);
    }
  }

  const current = streak(state);
  const best = Math.max(bestStreak(state), current);
  const met = daysMet(state);
  const drinks = state.sips.length;
  const finished = CHALLENGES.some((c) => state.challenges[c.id]?.done);
  const ratio = effectiveOn(state) / Math.max(1, goalOn(state, today()));
  const has: Record<string, boolean> = {
    'first-sip': drinks > 0,
    'first-goal': met > 0,
    'streak-3': best >= 3,
    'streak-7': best >= 7,
    'streak-14': best >= 14,
    'streak-30': best >= 30,
    'drinks-50': drinks >= 50,
    'drinks-250': drinks >= 250,
    over: ratio >= 1.25,
    variety: new Set(state.sips.map((s) => s.drinkId)).size >= 6,
    early: state.sips.some((s) => hourOf(s.at) < 7),
    challenge: finished,
  };
  for (const a of ACHIEVEMENTS) if (has[a.id]) give(a.id, a.name);

  const unlocks: Record<CharacterId, boolean> = {
    llama: true,
    cat: met >= 1,
    dog: best >= 3,
    fox: best >= 7,
    penguin: drinks >= 50,
    otter: finished,
    capybara: best >= 14,
    sloth: met >= 30,
  };
  for (const c of COMPANIONS)
    if (c.id !== 'llama' && unlocks[c.id]) give(`pet-${c.id}`, `${c.name.split(' ')[0]} joined you`);

  saveWater(state);
  return earnedNow;
}

export const unlocked = (state: WaterState, id: CharacterId): boolean => id === 'llama' || !!state.earned[`pet-${id}`];

/* ---------- reminders ---------- */

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export interface Nudge {
  at: number;
  label: string;
  state: 'done' | 'due' | 'later' | 'skipped';
}

/** N reminders spread evenly between waking and bed, dropped once the goal is met */
export function schedule(state: WaterState): Nudge[] {
  const wake = minutes(state.settings.wake);
  let bed = minutes(state.settings.bed);
  if (bed <= wake) bed += 24 * 60;
  const n = Math.max(1, state.settings.reminders);
  const start = new Date(now());
  start.setHours(0, 0, 0, 0);
  const sips = sipsOn(state);
  const met = metOn(state, today());
  const clock = now();
  return Array.from({ length: n }, (_, i) => {
    const at = start.getTime() + (wake + ((i + 0.5) * (bed - wake)) / n) * 60_000;
    const label = new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const window = ((bed - wake) / n) * 60_000;
    const answered = sips.some((s) => Math.abs(s.at - at) <= window / 2);
    const state: Nudge['state'] = met && at > clock ? 'skipped' : at > clock ? 'later' : answered ? 'done' : 'due';
    return { at, label, state };
  });
}

const stamp = (d: Date): string => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/** a daily calendar alarm for each reminder: the part of reminders a web app can do */
export function remindersIcs(state: WaterState): string {
  const events = schedule(state).map((nudge, i) => {
    const start = new Date(nudge.at);
    return [
      'BEGIN:VEVENT',
      `UID:${now()}-${i}@milo-water`,
      `DTSTAMP:${stamp(new Date(now()))}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + 5 * 60_000))}`,
      'RRULE:FREQ=DAILY;COUNT=60',
      'SUMMARY:A glass of water',
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:DISPLAY',
      'DESCRIPTION:A glass of water',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Milo//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}

/* ---------- caffeine ---------- */

export function caffeine(state: WaterState, date = today()): { mg: number; late: number } {
  let mg = 0;
  let late = 0;
  for (const s of sipsOn(state, date)) {
    const per8 = drinkById(state, s.drinkId).caffeinePer8 ?? 0;
    const here = (per8 * s.oz) / 8;
    mg += here;
    if (hourOf(s.at) >= 14) late += here;
  }
  return { mg: Math.round(mg), late: Math.round(late) };
}

/* ---------- the weather in Chicago ---------- */

/** once a day, if online: is it hot enough to drink more? */
export async function refreshHeat(): Promise<boolean> {
  const state = loadWater();
  const key = today();
  if (state.heat?.date === key || !navigator.onLine) return false;
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=41.88&longitude=-87.63' +
      '&daily=temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=1';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const body = (await response.json()) as { daily?: { temperature_2m_max?: number[] } };
    const maxF = body.daily?.temperature_2m_max?.[0];
    if (typeof maxF !== 'number') return false;
    const next = loadWater();
    next.heat = { date: key, maxF };
    saveWater(next);
    return true;
  } catch {
    return false;
  }
}

/* ---------- stats ---------- */

export function weekBars(state: WaterState): { date: string; effective: number; goal: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(today(), i - 6);
    return { date, effective: effectiveOn(state, date), goal: goalOn(state, date) };
  });
}

export function monthGrid(state: WaterState): { date: string; ratio: number | null }[] {
  const [y, m] = today().split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const date = dayKey(new Date(y, m - 1, i + 1, 12));
    const sips = sipsOn(state, date);
    return { date, ratio: sips.length ? effectiveOf(state, sips) / Math.max(1, goalOn(state, date)) : null };
  });
}

export interface Summary {
  average: number;
  hitRate: number;
  logged: number;
  raw: number;
  effective: number;
  byDrink: { id: string; name: string; effective: number; raw: number }[];
  byHour: number[];
  bestHour: number | null;
}

/** the last thirty days, in numbers */
export function summary(state: WaterState, days = 30): Summary {
  const since = shiftDay(today(), -(days - 1));
  const sips = state.sips.filter((s) => dayOf(s.at) >= since);
  const dates = [...new Set(sips.map((s) => dayOf(s.at)))];
  const byDrink = new Map<string, { effective: number; raw: number }>();
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const s of sips) {
    const factor = drinkById(state, s.drinkId).factor;
    const row = byDrink.get(s.drinkId) ?? { effective: 0, raw: 0 };
    row.effective += s.oz * factor;
    row.raw += s.oz;
    byDrink.set(s.drinkId, row);
    byHour[hourOf(s.at)] += s.oz;
  }
  const raw = rawOf(sips);
  const effective = effectiveOf(state, sips);
  const top = Math.max(...byHour);
  return {
    average: dates.length ? effective / dates.length : 0,
    hitRate: dates.length ? Math.round((dates.filter((d) => metOn(state, d)).length / dates.length) * 100) : 0,
    logged: dates.length,
    raw,
    effective,
    byDrink: [...byDrink.entries()]
      .map(([id, v]) => ({ id, name: drinkById(state, id).name, ...v }))
      .sort((a, b) => b.effective - a.effective),
    byHour,
    bestHour: top > 0 ? byHour.indexOf(top) : null,
  };
}
