import type { RoutineItem } from './data';

export interface SetLog {
  weightLb: number;
  reps: number;
  done: boolean;
}

export type Move = 'new' | 'up' | 'hold' | 'down';

export interface Suggestion {
  weightLb: number | null;
  move: Move;
  /** one plain sentence, shown as-is */
  why: string;
}

const round = (lb: number, inc: number): number =>
  inc > 0 ? Math.max(inc, Math.round(lb / inc) * inc) : Math.round(lb);

const working = (sets: SetLog[]): SetLog[] => sets.filter((s) => s.done && s.reps > 0);

const topWeight = (sets: SetLog[]): number => Math.max(...working(sets).map((s) => s.weightLb), 0);

/** Double progression: earn the top of the rep range on every set, then add weight.
 *  `past` is that exercise's set lists, oldest first. */
export function suggest(past: SetLog[][], item: RoutineItem, inc: number): Suggestion {
  const last = past[past.length - 1];
  if (!last || working(last).length === 0)
    return {
      weightLb: null,
      move: 'new',
      why: 'First time on this one — find a weight where the last two reps are hard.',
    };

  const sets = working(last);
  const weight = topWeight(last);
  const reps = sets.map((s) => s.reps);
  const list = reps.join(', ');

  if (sets.length >= item.sets && reps.every((r) => r >= item.high))
    return {
      weightLb: round(weight + inc, inc),
      move: 'up',
      why: `Hit ${list} at ${weight} lb — time to go up.`,
    };

  const short = (log: SetLog[] | undefined): boolean => {
    const s = log ? working(log) : [];
    return s.length > 0 && s.some((x) => x.reps < item.low);
  };
  if (short(last) && short(past[past.length - 2]))
    return {
      weightLb: round(weight * 0.9, inc),
      move: 'down',
      why: `Two sessions under ${item.low} reps — drop ten percent and build it back.`,
    };

  return {
    weightLb: weight,
    move: 'hold',
    why: `Last time was ${list} at ${weight} lb — same weight, chase ${item.high} across all sets.`,
  };
}
