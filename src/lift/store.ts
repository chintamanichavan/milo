import { DEFAULT_ROUTINES, LIBRARY, REST_DEFAULT, type Exercise, type Gear, type Routine } from './data';
import type { SetLog } from './progression';

export interface Entry {
  exerciseId: string;
  sets: SetLog[];
  note?: string;
}

export interface Session {
  date: string;
  routineId: string;
  entries: Entry[];
  durationSec: number;
  note?: string;
  /** what this session beat */
  prs?: { exerciseId: string; kind: string; value: number }[];
}

export interface Measurement {
  date: string;
  weightLb?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
}

export type Units = 'lb' | 'kg';

/** a place you train, with what it has in it */
export interface Gym {
  id: string;
  name: string;
  equipment: Gear[];
  barLb: number;
  plates: number[];
}

export interface LiftSettings {
  units: Units;
  restSec: number;
  /** the bar and plates of the gym you are in; kept in step with it */
  barLb: number;
  plates: number[];
  gyms: Gym[];
  gymId: string;
  /** a photo of your own for any exercise */
  images?: Record<string, string>;
  /** generated programme, if any */
  planId?: string;
  planWeek?: number;
  deloadNext?: boolean;
}

export interface Active extends Session {
  startedAt: number;
  open: number;
}

export interface LiftState {
  routines: Routine[];
  sessions: Session[];
  customs: Exercise[];
  /** per-exercise rest, in seconds */
  rest: Record<string, number>;
  active: Active | null;
  favourites: string[];
  measurements: Measurement[];
  settings: LiftSettings;
}

export { LIFT_KEY } from '../keys';
import { FUEL_KEY, LIFT_KEY } from '../keys';

export const ALL_GEAR: Gear[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'band',
  'smith',
  'trapbar',
  'ezbar',
  'bodyweight',
];

const defaults = (): LiftSettings => ({
  units: 'lb',
  restSec: 90,
  barLb: 45,
  plates: [45, 35, 25, 10, 5, 2.5],
  gyms: [],
  gymId: 'main',
});

/** the gym you are training in; everyone has at least one */
export function activeGym(state: LiftState): Gym {
  return state.settings.gyms.find((g) => g.id === state.settings.gymId) ?? state.settings.gyms[0];
}

/** can this gym do this exercise? */
export const gymHas = (gym: Gym, gear: Gear): boolean => gear === 'bodyweight' || gym.equipment.includes(gear);

const blank = (): LiftState => ({
  routines: DEFAULT_ROUTINES.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })),
  sessions: [],
  customs: [],
  rest: {},
  active: null,
  favourites: [],
  measurements: [],
  settings: defaults(),
});

export function loadLift(): LiftState {
  try {
    const raw = localStorage.getItem(LIFT_KEY);
    if (!raw) return withGym(blank());
    const parsed = JSON.parse(raw) as Partial<LiftState>;
    const state = {
      ...blank(),
      ...parsed,
      settings: { ...defaults(), ...(parsed.settings ?? {}) },
    };
    return withGym(state);
  } catch {
    return withGym(blank());
  }
}

/** the first gym is the one you already had: its bar, its plates, everything in it */
function withGym(state: LiftState): LiftState {
  if (!state.settings.gyms.length)
    state.settings.gyms = [
      { id: 'main', name: 'Main gym', equipment: [...ALL_GEAR], barLb: state.settings.barLb, plates: [...state.settings.plates] },
    ];
  const gym = activeGym(state);
  state.settings.gymId = gym.id;
  state.settings.barLb = gym.barLb;
  state.settings.plates = gym.plates;
  return state;
}

export function saveLift(state: LiftState): void {
  localStorage.setItem(LIFT_KEY, JSON.stringify(state));
}

export function exerciseById(state: LiftState, id: string): Exercise {
  return (
    state.customs.find((e) => e.id === id) ??
    LIBRARY.find((e) => e.id === id) ?? {
      id,
      name: id,
      muscle: 'other',
      also: '',
      gear: 'barbell',
      inc: 5,
      how: '',
    }
  );
}

export function routineById(state: LiftState, id: string): Routine {
  return state.routines.find((r) => r.id === id) ?? state.routines[0];
}

/** Days A and B take turns. */
export function nextRoutine(state: LiftState): Routine {
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return state.routines[0];
  const at = state.routines.findIndex((r) => r.id === last.routineId);
  return state.routines[(at + 1) % state.routines.length];
}

/** Sessions where that exercise was actually worked, oldest first. */
export function sessionsWith(state: LiftState, exerciseId: string): Session[] {
  return state.sessions.filter((s) =>
    s.entries.some((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done)),
  );
}

/** That exercise's past set lists, oldest first. Skipped days do not count. */
export function pastSets(state: LiftState, exerciseId: string): SetLog[][] {
  return sessionsWith(state, exerciseId).map(
    (s) => s.entries.find((e) => e.exerciseId === exerciseId)!.sets,
  );
}

export function restFor(state: LiftState, exerciseId: string): number {
  return state.rest[exerciseId] ?? REST_DEFAULT;
}

export function volumeOf(session: Session): number {
  return session.entries.reduce(
    (total, e) =>
      total + e.sets.reduce((v, s) => v + (s.done ? s.weightLb * s.reps : 0), 0),
    0,
  );
}

export function setsDone(session: Session): number {
  return session.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}

export function sessionsThisWeek(state: LiftState): number {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return state.sessions.filter((s) => new Date(s.date) >= monday).length;
}

export function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
}

export function setLiftSettings(patch: Partial<LiftSettings>): LiftSettings {
  const state = loadLift();
  state.settings = { ...state.settings, ...patch };
  // the bar and the plates belong to the gym you are standing in
  const gym = activeGym(state);
  if (patch.barLb !== undefined) gym.barLb = patch.barLb;
  if (patch.plates) gym.plates = patch.plates;
  saveLift(withGym(state));
  return state.settings;
}

export function toggleFavourite(id: string): void {
  const state = loadLift();
  state.favourites = state.favourites.includes(id)
    ? state.favourites.filter((f) => f !== id)
    : [...state.favourites, id];
  saveLift(state);
}

export function addCustomExercise(exercise: Exercise): void {
  const state = loadLift();
  state.customs.push(exercise);
  saveLift(state);
}

export function saveRoutine(routine: Routine): void {
  const state = loadLift();
  const at = state.routines.findIndex((r) => r.id === routine.id);
  if (at >= 0) state.routines[at] = routine;
  else state.routines.push(routine);
  saveLift(state);
}

export function deleteRoutine(id: string): void {
  const state = loadLift();
  state.routines = state.routines.filter((r) => r.id !== id);
  saveLift(state);
}

export function updateSession(index: number, patch: Partial<Session>): void {
  const state = loadLift();
  if (!state.sessions[index]) return;
  state.sessions[index] = { ...state.sessions[index], ...patch };
  saveLift(state);
}

export function deleteSession(index: number): void {
  const state = loadLift();
  state.sessions.splice(index, 1);
  saveLift(state);
}

export function addMeasurement(entry: Measurement): void {
  const state = loadLift();
  state.measurements.push(entry);
  state.measurements.sort((a, b) => a.date.localeCompare(b.date));
  saveLift(state);
}

export const lastPerformed = (state: LiftState, routineId: string): Session | undefined =>
  [...state.sessions].reverse().find((s) => s.routineId === routineId);

/** bodyweight now, smoothed a little, in pounds: the shared scale first, old lift entries after */
export function trendWeight(state: LiftState): number {
  try {
    const fuel = JSON.parse(localStorage.getItem(FUEL_KEY) ?? 'null') as { weights?: { lb: number }[] } | null;
    const recent = (fuel?.weights ?? []).slice(-7);
    if (recent.length) return recent.reduce((s, w) => s + w.lb, 0) / recent.length;
  } catch {
    /* fall back to the lift log */
  }
  const recent = state.measurements.filter((m) => m.weightLb).slice(-7);
  if (recent.length === 0) return 0;
  return recent.reduce((s, m) => s + (m.weightLb ?? 0), 0) / recent.length;
}

/** working sets per muscle in the last seven days */
export function weeklyVolume(state: LiftState): Map<string, number> {
  const since = Date.now() - 7 * 86_400_000;
  const out = new Map<string, number>();
  for (const session of state.sessions) {
    if (new Date(session.date).getTime() < since) continue;
    for (const entry of session.entries) {
      const muscle = exerciseById(state, entry.exerciseId).muscle;
      const sets = entry.sets.filter((s) => s.done && s.type !== 'w').length;
      if (sets) out.set(muscle, (out.get(muscle) ?? 0) + sets);
    }
  }
  return out;
}

/** weeks in a row with at least two sessions */
export function weekStreak(state: LiftState): number {
  let streak = 0;
  for (let w = 0; w < 104; w++) {
    const end = Date.now() - w * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const count = state.sessions.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= start && t < end;
    }).length;
    if (count >= 2) streak++;
    else if (w > 0) break;
  }
  return streak;
}

export const KG = 0.453_592_37;

export const showWeight = (lb: number, units: Units): string =>
  units === 'kg' ? `${(lb * KG).toFixed(1)} kg` : `${Math.round(lb * 10) / 10} lb`;

export const toLb = (value: number, units: Units): number => (units === 'kg' ? value / KG : value);

export const fromLb = (lb: number, units: Units): number =>
  units === 'kg' ? Math.round(lb * KG * 10) / 10 : Math.round(lb * 10) / 10;

/** increments follow the units: 2.5 kg and 1.25 kg plates exist */
export const incFor = (inc: number, units: Units): number =>
  units === 'kg' ? (inc >= 10 ? 5 / KG : 2.5 / KG) : inc;

/** what to hang on each side of the bar */
export function plates(totalLb: number, barLb: number, available: number[]): number[] {
  let side = (totalLb - barLb) / 2;
  const out: number[] = [];
  for (const plate of [...available].sort((a, b) => b - a)) {
    while (side >= plate - 0.01) {
      out.push(plate);
      side -= plate;
    }
  }
  return out;
}

export function saveGym(gym: Gym): void {
  const state = loadLift();
  const at = state.settings.gyms.findIndex((g) => g.id === gym.id);
  if (at >= 0) state.settings.gyms[at] = gym;
  else state.settings.gyms.push(gym);
  saveLift(withGym(state));
}

export function switchGym(id: string): void {
  const state = loadLift();
  state.settings.gymId = id;
  saveLift(withGym(state));
}

export function deleteGym(id: string): void {
  const state = loadLift();
  if (state.settings.gyms.length < 2) return;
  state.settings.gyms = state.settings.gyms.filter((g) => g.id !== id);
  if (state.settings.gymId === id) state.settings.gymId = state.settings.gyms[0].id;
  saveLift(withGym(state));
}
