import { FOCUS_KEY } from './focus/store';
import { LIFT_KEY } from './lift/store';
import { RUNS_PER_WEEK, TOTAL_WEEKS } from './weeks';

export interface CompletedRun {
  week: number;
  run: number;
  date: string;
  durationSec: number;
}

export interface Settings {
  voice: boolean;
  beep: boolean;
}

/** One-shot moments: a grid that fills in, a hint shown once. */
export interface Flags {
  celebrate?: boolean;
  hintSeen?: boolean;
}

export interface State {
  completedRuns: CompletedRun[];
  settings: Settings;
  flags: Flags;
}

const KEY = 'c25k.v1';

const blank = (): State => ({
  completedRuns: [],
  settings: { voice: true, beep: true },
  flags: {},
});

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      completedRuns: Array.isArray(parsed.completedRuns) ? parsed.completedRuns : [],
      settings: { ...blank().settings, ...(parsed.settings ?? {}) },
      flags: parsed.flags ?? {},
    };
  } catch {
    return blank();
  }
}

export function save(state: State): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function recordRun(week: number, run: number, durationSec: number): State {
  const state = load();
  state.completedRuns.push({
    week,
    run,
    date: new Date().toISOString(),
    durationSec: Math.round(durationSec),
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

/** Where you are now: the run after the last one you finished. */
export function nextUp(state: State): { week: number; run: number } | null {
  const last = state.completedRuns[state.completedRuns.length - 1];
  if (!last) return { week: 1, run: 1 };
  if (last.run < RUNS_PER_WEEK) return { week: last.week, run: last.run + 1 };
  if (last.week < TOTAL_WEEKS) return { week: last.week + 1, run: 1 };
  return null;
}

export function isDone(state: State, week: number, run: number): boolean {
  return state.completedRuns.some((c) => c.week === week && c.run === run);
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
    } & Partial<State>;
    // older exports were the run half on its own
    const run = Array.isArray(parsed.completedRuns) ? parsed : parsed.run;
    if (!run || !Array.isArray(run.completedRuns)) return false;
    save({
      completedRuns: run.completedRuns,
      settings: { ...blank().settings, ...(run.settings ?? {}) },
      flags: run.flags ?? {},
    });
    if (parsed.lift) localStorage.setItem(LIFT_KEY, JSON.stringify(parsed.lift));
    if (parsed.focus) localStorage.setItem(FOCUS_KEY, JSON.stringify(parsed.focus));
    return true;
  } catch {
    return false;
  }
}
