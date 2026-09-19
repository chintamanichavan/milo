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

export interface State {
  completedRuns: CompletedRun[];
  settings: Settings;
}

const KEY = 'c25k.v1';

const blank = (): State => ({ completedRuns: [], settings: { voice: true, beep: true } });

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      completedRuns: Array.isArray(parsed.completedRuns) ? parsed.completedRuns : [],
      settings: { ...blank().settings, ...(parsed.settings ?? {}) },
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
  save(state);
  return state;
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

export function exportFile(): void {
  const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `c25k-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFile(file: File): Promise<boolean> {
  try {
    const parsed = JSON.parse(await file.text()) as Partial<State>;
    if (!Array.isArray(parsed.completedRuns)) return false;
    save({
      completedRuns: parsed.completedRuns,
      settings: { ...blank().settings, ...(parsed.settings ?? {}) },
    });
    return true;
  } catch {
    return false;
  }
}
