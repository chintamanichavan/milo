import { DEFAULT_ROUTINES, LIBRARY, REST_DEFAULT, type Exercise, type Routine } from './data';
import type { SetLog } from './progression';

export interface Entry {
  exerciseId: string;
  sets: SetLog[];
}

export interface Session {
  date: string;
  routineId: string;
  entries: Entry[];
  durationSec: number;
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
}

export const LIFT_KEY = 'c25k.lift.v1';

const blank = (): LiftState => ({
  routines: DEFAULT_ROUTINES.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })),
  sessions: [],
  customs: [],
  rest: {},
  active: null,
});

export function loadLift(): LiftState {
  try {
    const raw = localStorage.getItem(LIFT_KEY);
    if (!raw) return blank();
    return { ...blank(), ...(JSON.parse(raw) as Partial<LiftState>) };
  } catch {
    return blank();
  }
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
      gear: 'barbell',
      inc: 5,
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
