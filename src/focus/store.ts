import { HOME } from './airports';

export type Outcome = 'landed' | 'diverted' | 'aborted';

export interface Flight {
  start: string;
  plannedSec: number;
  actualSec: number;
  label: string;
  outcome: Outcome;
  from?: string;
  to?: string;
  aircraft?: string;
  pass?: {
    number: string;
    gate: string;
    seat: string;
    departs: string;
    stripe: string;
  };
}

export type SkyMode = 'globe' | 'satellite' | 'flat';

export interface Ambient {
  sound: 'off' | 'cabin' | 'rain' | 'cafe';
  volume: number;
}

export interface LabelTag {
  name: string;
  colour: number;
  archived?: boolean;
}

export interface FocusSettings {
  defaultMin: number;
  breakMin: number;
  chain?: boolean;
  strict?: boolean;
  dailyGoalH: number;
  weeklyGoalH: number;
  sky: SkyMode;
  ambient: Ambient;
  aircraft: string;
  motion?: boolean;
  hintSeen?: boolean;
}

export interface FocusState {
  flights: Flight[];
  settings: FocusSettings;
  labels: LabelTag[];
  earned: Record<string, string>;
}

export const FOCUS_KEY = 'c25k.focus.v1';

/** six quiet swatches for labels */
export const SWATCHES = ['#a78bfa', '#5eead4', '#c5f74f', '#fbbf24', '#f472b6', '#60a5fa'];

const defaults = (): FocusSettings => ({
  defaultMin: 50,
  breakMin: 5,
  strict: false,
  chain: false,
  dailyGoalH: 3,
  weeklyGoalH: 15,
  sky: 'globe',
  ambient: { sound: 'off', volume: 0.4 },
  aircraft: 'paper',
});

const blank = (): FocusState => ({
  flights: [],
  settings: defaults(),
  labels: [],
  earned: {},
});

export function loadFocus(): FocusState {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<FocusState>;
    return {
      flights: Array.isArray(parsed.flights) ? parsed.flights : [],
      settings: {
        ...defaults(),
        ...(parsed.settings ?? {}),
        ambient: { ...defaults().ambient, ...(parsed.settings?.ambient ?? {}) },
      },
      labels: parsed.labels ?? [],
      earned: parsed.earned ?? {},
    };
  } catch {
    return blank();
  }
}

export function saveFocus(state: FocusState): void {
  localStorage.setItem(FOCUS_KEY, JSON.stringify(state));
}

export function addFlight(flight: Flight): FocusState {
  const state = loadFocus();
  state.flights.push(flight);
  if (flight.label && !state.labels.some((l) => l.name === flight.label))
    state.labels.push({ name: flight.label, colour: state.labels.length % SWATCHES.length });
  saveFocus(state);
  return state;
}

export function updateFlight(index: number, patch: Partial<Flight>): void {
  const state = loadFocus();
  const flight = state.flights[index];
  if (!flight) return;
  state.flights[index] = { ...flight, ...patch };
  saveFocus(state);
}

export function deleteFlight(index: number): void {
  const state = loadFocus();
  state.flights.splice(index, 1);
  saveFocus(state);
}

export function setFocusSettings(patch: Partial<FocusSettings>): FocusSettings {
  const state = loadFocus();
  state.settings = { ...state.settings, ...patch };
  saveFocus(state);
  return state.settings;
}

export function setLabels(labels: LabelTag[]): void {
  const state = loadFocus();
  state.labels = labels;
  saveFocus(state);
}

export function renameLabel(from: string, to: string): void {
  const state = loadFocus();
  for (const f of state.flights) if (f.label === from) f.label = to;
  const existing = state.labels.find((l) => l.name === to);
  state.labels = state.labels.filter((l) => l.name !== from);
  if (!existing) state.labels.push({ name: to, colour: state.labels.length % SWATCHES.length });
  saveFocus(state);
}

export const colourOf = (state: FocusState, label: string): string =>
  SWATCHES[state.labels.find((l) => l.name === label)?.colour ?? 0];

export const dayKey = (d: Date | string): string => new Date(d).toLocaleDateString('en-CA');

const shift = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export const landed = (state: FocusState): Flight[] =>
  state.flights.filter((f) => f.outcome === 'landed');

export function hoursOn(state: FocusState, key: string): number {
  return (
    state.flights.filter((f) => dayKey(f.start) === key).reduce((s, f) => s + f.actualSec, 0) / 3600
  );
}

export function week(state: FocusState): { key: string; label: string; hours: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = shift(i - 6);
    return {
      key: dayKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      hours: hoursOn(state, dayKey(d)),
    };
  });
}

export const weekHours = (state: FocusState): number =>
  week(state).reduce((h, d) => h + d.hours, 0);

export const totalHours = (state: FocusState): number =>
  state.flights.reduce((s, f) => s + f.actualSec, 0) / 3600;

export const landedHours = (state: FocusState): number =>
  landed(state).reduce((s, f) => s + f.actualSec, 0) / 3600;

export function streak(state: FocusState): number {
  const days = new Set(landed(state).map((f) => dayKey(f.start)));
  let count = 0;
  let forgiven = false;
  for (let i = 0; i < 400; i++) {
    if (days.has(dayKey(shift(-i)))) count++;
    else if (i === 0) continue;
    else if (!forgiven) forgiven = true;
    else break;
  }
  return count;
}

export function recentLabels(state: FocusState, count = 5): string[] {
  const out: string[] = [];
  for (let i = state.flights.length - 1; i >= 0 && out.length < count; i--) {
    const label = state.flights[i].label;
    const tag = state.labels.find((l) => l.name === label);
    if (label && !out.includes(label) && !tag?.archived) out.push(label);
  }
  return out;
}

/** where the next flight leaves from: wherever the last one arrived */
export const lastAirport = (state: FocusState): string => {
  for (let i = state.flights.length - 1; i >= 0; i--) {
    const f = state.flights[i];
    if (f.outcome === 'landed' && f.to) return f.to;
    if (f.from) return f.from;
  }
  return HOME;
};

export const hh = (hours: number): string => `${hours.toFixed(1)} h`;
export const mins = (sec: number): string => `${Math.round(sec / 60)}′`;
