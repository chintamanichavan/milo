import type { SetLog } from './progression';
import type { Session } from './store';

/** Epley, the usual one-rep-max guess */
export const epley = (weight: number, reps: number): number =>
  reps <= 1 ? weight : weight * (1 + reps / 30);

export interface Best {
  weight: number;
  oneRm: number;
  volume: number;
  date: string;
}

const working = (sets: SetLog[]): SetLog[] =>
  sets.filter((s) => s.done && s.reps > 0 && s.type !== 'w');

export function bestOf(sets: SetLog[], date: string): Best | null {
  const list = working(sets);
  if (list.length === 0) return null;
  return {
    weight: Math.max(...list.map((s) => s.weightLb)),
    oneRm: Math.max(...list.map((s) => epley(s.weightLb, s.reps))),
    volume: Math.max(...list.map((s) => s.weightLb * s.reps)),
    date,
  };
}

/** every session that exercise appeared in, best-first */
export function recordsFor(sessions: Session[], exerciseId: string): Best[] {
  return sessions
    .map((s) => {
      const entry = s.entries.find((e) => e.exerciseId === exerciseId);
      return entry ? bestOf(entry.sets, s.date) : null;
    })
    .filter((r): r is Best => !!r);
}

export interface Pr {
  exerciseId: string;
  kind: 'weight' | 'oneRm' | 'volume';
  value: number;
}

/** What the session just beat. Warm-ups never count. */
export function findPrs(session: Session, history: Session[]): Pr[] {
  const out: Pr[] = [];
  for (const entry of session.entries) {
    const now = bestOf(entry.sets, session.date);
    if (!now) continue;
    const before = recordsFor(history, entry.exerciseId);
    const best = (key: 'weight' | 'oneRm' | 'volume'): number =>
      before.length ? Math.max(...before.map((r) => r[key])) : 0;
    if (now.weight > best('weight')) out.push({ exerciseId: entry.exerciseId, kind: 'weight', value: now.weight });
    if (now.oneRm > best('oneRm') + 0.5)
      out.push({ exerciseId: entry.exerciseId, kind: 'oneRm', value: Math.round(now.oneRm) });
    if (now.volume > best('volume'))
      out.push({ exerciseId: entry.exerciseId, kind: 'volume', value: now.volume });
  }
  return out;
}

/** Rough strength standards as a multiple of bodyweight, for a quiet reference. */
export const STANDARDS: Partial<Record<string, number[]>> = {
  squat: [0.75, 1.25, 1.75, 2.25],
  bench: [0.5, 1.0, 1.5, 2.0],
  deadlift: [1.0, 1.5, 2.25, 2.75],
  ohp: [0.35, 0.6, 0.9, 1.2],
};

export const STANDARD_NAMES = ['untrained', 'novice', 'intermediate', 'advanced'];

export function standardFor(exerciseId: string, oneRm: number, bodyweight: number): string {
  const bands = STANDARDS[exerciseId];
  if (!bands || !bodyweight) return '';
  const ratio = oneRm / bodyweight;
  let name = 'starting out';
  bands.forEach((b: number, i: number) => {
    if (ratio >= b) name = STANDARD_NAMES[i];
  });
  return name;
}
