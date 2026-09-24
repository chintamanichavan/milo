import { COOK_KEY } from '../cook/store';
import { FOCUS_KEY } from '../focus/store';
import { FUEL_KEY } from '../fuel/store';
import { HABITS_KEY } from '../habits/store';
import { LIFT_KEY } from '../lift/store';
import { TABS_KEY } from '../ui/nav';
import { WATER_KEY } from '../water/key';
import { RUNS_PER_WEEK, TOTAL_WEEKS } from './weeks';

export interface CompletedRun {
  week: number;
  run: number;
  date: string;
  durationSec: number;
  /** which programme; missing means Couch to 5K */
  prog?: string;
  distanceKm?: number;
  /** [lat, lon, secondsFromStart][] */
  path?: [number, number, number][];
  /** seconds per km while running and while walking */
  runPace?: number;
  walkPace?: number;
  feel?: 'easy' | 'ok' | 'hard';
  note?: string;
  manual?: boolean;
  /** what the coach said, [seconds in, words] */
  cues?: [number, string][];
}

export type Units = 'mi' | 'km';

export interface Reminder {
  days: number[];
  time: string;
}

export interface Settings {
  voice: boolean;
  beep: boolean;
  coach: string;
  /** voiceURI per persona */
  voices: Record<string, string>;
  gps: boolean;
  treadmill: boolean;
  units: Units;
  theme: 'auto' | 'dark' | 'light';
  beepsOnly: boolean;
  metronome: boolean;
  reminder: Reminder;
  graduateName?: string;
  programme: string;
  /** how loud the coach is, 0–1, apart from whatever music is playing */
  voiceVolume: number;
}

/** One-shot moments: a grid that fills in, a hint shown once. */
export interface Flags {
  celebrate?: boolean;
  hintSeen?: boolean;
  graduated?: boolean;
  certificateSeen?: boolean;
}

export interface State {
  completedRuns: CompletedRun[];
  settings: Settings;
  flags: Flags;
}

const KEY = 'c25k.v1';

const defaults = (): Settings => ({
  voice: true,
  beep: true,
  coach: 'steady',
  voices: {},
  gps: false,
  treadmill: false,
  units: 'mi',
  theme: 'auto',
  beepsOnly: false,
  metronome: true,
  reminder: { days: [0, 3, 5], time: '07:30' },
  programme: 'c25k',
  voiceVolume: 1,
});

const blank = (): State => ({
  completedRuns: [],
  settings: defaults(),
  flags: {},
});

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      completedRuns: Array.isArray(parsed.completedRuns) ? parsed.completedRuns : [],
      settings: { ...defaults(), ...(parsed.settings ?? {}) },
      flags: parsed.flags ?? {},
    };
  } catch {
    return blank();
  }
}

export function save(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function recordRun(
  week: number,
  run: number,
  durationSec: number,
  extra: Partial<CompletedRun> = {},
): State {
  const state = load();
  state.completedRuns.push({
    week,
    run,
    date: new Date().toISOString(),
    durationSec: Math.round(durationSec),
    ...extra,
  });
  state.flags.celebrate = true;
  save(state);
  return state;
}

/** True once, right after a run lands: the grid gets to fill itself in. */
export function claimCelebrate(): boolean {
  const state = load();
  const yes = !!state.flags.celebrate;
  if (yes) {
    state.flags.celebrate = false;
    save(state);
  }
  return yes;
}

/** True on the first session only, for the hold-to-pause hint. */
export function claimHint(): boolean {
  const state = load();
  const yes = !state.flags.hintSeen;
  if (yes) {
    state.flags.hintSeen = true;
    save(state);
  }
  return yes;
}

export function setSettings(patch: Partial<Settings>): Settings {
  const state = load();
  state.settings = { ...state.settings, ...patch };
  save(state);
  return state.settings;
}

export const progOf = (run: CompletedRun): string => run.prog ?? 'c25k';

export const runsIn = (state: State, prog = 'c25k'): CompletedRun[] =>
  state.completedRuns.filter((r) => progOf(r) === prog);

/** Where you are now: the run after the last one you finished. */
export function nextUp(
  state: State,
  prog = 'c25k',
  weeks = TOTAL_WEEKS,
  perWeek = RUNS_PER_WEEK,
): { week: number; run: number } | null {
  const mine = runsIn(state, prog);
  const last = mine[mine.length - 1];
  if (!last) return { week: 1, run: 1 };
  if (last.run < perWeek) return { week: last.week, run: last.run + 1 };
  if (last.week < weeks) return { week: last.week + 1, run: 1 };
  return null;
}

export const graduated = (state: State): boolean =>
  runsIn(state, 'c25k').some((r) => r.week === TOTAL_WEEKS && r.run === RUNS_PER_WEEK) ||
  !!state.flags.graduated;

export function updateRun(index: number, patch: Partial<CompletedRun>): void {
  const state = load();
  if (!state.completedRuns[index]) return;
  state.completedRuns[index] = { ...state.completedRuns[index], ...patch };
  save(state);
}

export function deleteRun(index: number): void {
  const state = load();
  state.completedRuns.splice(index, 1);
  save(state);
}

export function isDone(state: State, week: number, run: number, prog = 'c25k'): boolean {
  return runsIn(state, prog).some((c) => c.week === week && c.run === run);
}

export function weekDone(state: State, week: number): boolean {
  for (let run = 1; run <= RUNS_PER_WEEK; run++) if (!isDone(state, week, run)) return false;
  return true;
}

export function doneCount(state: State): number {
  let n = 0;
  for (let week = 1; week <= TOTAL_WEEKS; week++)
    for (let run = 1; run <= RUNS_PER_WEEK; run++) if (isDone(state, week, run)) n++;
  return n;
}

/** One file holds both halves of the app. */
export function exportFile(): void {
  const bundle = {
    run: load(),
    lift: JSON.parse(localStorage.getItem(LIFT_KEY) ?? 'null') as unknown,
    focus: JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as unknown,
    cook: JSON.parse(localStorage.getItem(COOK_KEY) ?? 'null') as unknown,
    fuel: JSON.parse(localStorage.getItem(FUEL_KEY) ?? 'null') as unknown,
    habits: JSON.parse(localStorage.getItem(HABITS_KEY) ?? 'null') as unknown,
    water: JSON.parse(localStorage.getItem(WATER_KEY) ?? 'null') as unknown,
    nav: JSON.parse(localStorage.getItem(TABS_KEY) ?? 'null') as unknown,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `milo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFile(file: File): Promise<boolean> {
  try {
    const parsed = JSON.parse(await file.text()) as {
      run?: Partial<State>;
      lift?: unknown;
      focus?: unknown;
      cook?: unknown;
      fuel?: unknown;
      habits?: unknown;
      water?: unknown;
      nav?: unknown;
    } & Partial<State>;
    // older exports were the run half on its own
    const run = Array.isArray(parsed.completedRuns) ? parsed : parsed.run;
    if (!run || !Array.isArray(run.completedRuns)) return false;
    save({
      completedRuns: run.completedRuns,
      settings: { ...defaults(), ...(run.settings ?? {}) },
      flags: run.flags ?? {},
    });
    if (parsed.lift) localStorage.setItem(LIFT_KEY, JSON.stringify(parsed.lift));
    if (parsed.focus) localStorage.setItem(FOCUS_KEY, JSON.stringify(parsed.focus));
    if (parsed.cook) localStorage.setItem(COOK_KEY, JSON.stringify(parsed.cook));
    if (parsed.fuel) localStorage.setItem(FUEL_KEY, JSON.stringify(parsed.fuel));
    if (parsed.habits) localStorage.setItem(HABITS_KEY, JSON.stringify(parsed.habits));
    if (parsed.water) localStorage.setItem(WATER_KEY, JSON.stringify(parsed.water));
    if (parsed.nav) localStorage.setItem(TABS_KEY, JSON.stringify(parsed.nav));
    return true;
  } catch {
    return false;
  }
}
