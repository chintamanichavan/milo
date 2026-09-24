import { addWeight, loadFuel } from '../fuel/store';
import { BODY_KEY, LIFT_KEY } from '../keys';
import { dayKey } from '../ui/time';

/**
 * The body, kept once for the whole app: tape measurements and progress
 * photos, shown in Fuel's weight page and in Lift's body page alike. Weight
 * itself stays with Fuel, which owns the scale.
 */
export type Girth =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm'
  | 'forearm'
  | 'thigh'
  | 'calf';

export interface Measurement extends Partial<Record<Girth, number>> {
  date: string;
  bodyFat?: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  pose: 'front' | 'side' | 'back';
  note?: string;
}

export interface BodyState {
  measurements: Measurement[];
  photos: ProgressPhoto[];
  migrated?: boolean;
}

export const MEASURES: { key: Girth | 'bodyFat'; label: string; unit: string }[] = [
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
  { key: 'neck', label: 'Neck', unit: 'in' },
  { key: 'shoulders', label: 'Shoulders', unit: 'in' },
  { key: 'chest', label: 'Chest', unit: 'in' },
  { key: 'waist', label: 'Waist', unit: 'in' },
  { key: 'hips', label: 'Hips', unit: 'in' },
  { key: 'arm', label: 'Arm', unit: 'in' },
  { key: 'forearm', label: 'Forearm', unit: 'in' },
  { key: 'thigh', label: 'Thigh', unit: 'in' },
  { key: 'calf', label: 'Calf', unit: 'in' },
];

const blank = (): BodyState => ({ measurements: [], photos: [] });

export function loadBody(): BodyState {
  let state: BodyState;
  try {
    state = { ...blank(), ...(JSON.parse(localStorage.getItem(BODY_KEY) ?? '{}') as Partial<BodyState>) };
  } catch {
    state = blank();
  }
  if (!state.migrated) migrate(state);
  return state;
}

export function saveBody(state: BodyState): void {
  localStorage.setItem(BODY_KEY, JSON.stringify(state));
}

/** Lift used to keep its own tape measurements, and weights in them too */
function migrate(state: BodyState): void {
  state.migrated = true;
  try {
    const lift = JSON.parse(localStorage.getItem(LIFT_KEY) ?? 'null') as {
      measurements?: (Measurement & { weightLb?: number })[];
    } | null;
    const known = new Set(loadFuel().weights.map((w) => w.date));
    for (const { weightLb, ...rest } of lift?.measurements ?? []) {
      const date = rest.date.slice(0, 10);
      if (Object.keys(rest).length > 1) state.measurements.push({ ...rest, date });
      if (weightLb && !known.has(date)) {
        addWeight(Math.round(weightLb * 10) / 10, date);
        known.add(date);
      }
    }
    state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    // nothing to bring across
  }
  saveBody(state);
}

export function addMeasurement(entry: Omit<Measurement, 'date'>, date = dayKey()): void {
  const state = loadBody();
  const same = state.measurements.find((m) => m.date === date);
  if (same) Object.assign(same, entry);
  else state.measurements.push({ ...entry, date });
  state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  saveBody(state);
}

export function addProgressPhoto(photo: ProgressPhoto): void {
  const state = loadBody();
  state.photos.push(photo);
  state.photos.sort((a, b) => a.date.localeCompare(b.date));
  saveBody(state);
}

export function removeProgressPhoto(id: string): void {
  const state = loadBody();
  state.photos = state.photos.filter((p) => p.id !== id);
  saveBody(state);
}

export const seriesOf = (state: BodyState, key: Girth | 'bodyFat'): { date: string; value: number }[] =>
  state.measurements
    .filter((m) => typeof m[key] === 'number')
    .map((m) => ({ date: m.date, value: m[key] as number }));
