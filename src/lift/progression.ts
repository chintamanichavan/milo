import type { RoutineItem } from './data';

export type SetType = 'w' | 'n' | 'f' | 'd';

export interface SetLog {
  weightLb: number;
  reps: number;
  done: boolean;
  /** warm-up, normal, failure, drop set */
  type?: SetType;
  /** how hard that set was, 6 to 10 */
  rpe?: number;
}

export type Move = 'new' | 'up' | 'hold' | 'down';

export interface Suggestion {
  weightLb: number | null;
  move: Move;
  /** one plain sentence, shown as-is */
  why: string;
}

/** one step up that exercise's ladder */
const up = (lb: number, inc: number): number => (inc > 0 ? lb + inc : lb);

/** about ten percent off, in whole steps, never below one step */
const down = (lb: number, inc: number): number => {
  if (inc <= 0) return lb;
  const drop = Math.max(inc, Math.round((lb * 0.1) / inc) * inc);
  return Math.max(inc, lb - drop);
};

/** warm-ups never count towards progression, volume or records */
const working = (sets: SetLog[]): SetLog[] =>
  sets.filter((s) => s.done && s.reps > 0 && s.type !== 'w');

const topWeight = (sets: SetLog[]): number => Math.max(...working(sets).map((s) => s.weightLb), 0);

/** Double progression: earn the top of the rep range on every set, then add weight.
 *  `past` is that exercise's set lists, oldest first. */
export interface SuggestOptions {
  /** target RPE for the working sets, if the routine has one */
  rpe?: number;
  /** a deload week asks for less, on purpose */
  deload?: boolean;
}

export function suggest(
  past: SetLog[][],
  item: RoutineItem,
  inc: number,
  options: SuggestOptions = {},
): Suggestion {
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
  const rpes = sets.map((s) => s.rpe).filter((r): r is number => typeof r === 'number');

  if (options.deload)
    return {
      weightLb: down(weight, inc),
      move: 'down',
      why: `Deload week — about fifteen percent lighter, one set fewer, and leave two in the tank.`,
    };

  // autoregulation: what the last session felt like beats what the numbers say
  if (rpes.length >= sets.length && sets.length > 0) {
    const hardest = Math.max(...rpes);
    const easiest = Math.min(...rpes);
    if (hardest >= 9.5)
      return {
        weightLb: weight,
        move: 'hold',
        why: `Every set was an RPE ${hardest} grind — same weight until it feels like an eight.`,
      };
    if (easiest <= 7 && reps.every((r) => r >= item.high))
      return {
        weightLb: up(up(weight, inc), inc),
        move: 'up',
        why: `${list} at RPE ${easiest} with reps to spare — two steps up this time.`,
      };
  }

  if (sets.length >= item.sets && reps.every((r) => r >= item.high))
    return {
      weightLb: up(weight, inc),
      move: 'up',
      why: `Hit ${list} at ${weight} lb — time to go up.`,
    };

  const short = (log: SetLog[] | undefined): boolean => {
    const s = log ? working(log) : [];
    return s.length > 0 && s.some((x) => x.reps < item.low);
  };
  if (short(last) && short(past[past.length - 2]))
    return {
      weightLb: down(weight, inc),
      move: 'down',
      why: `Two sessions under ${item.low} reps — drop ten percent and build it back.`,
    };

  return {
    weightLb: weight,
    move: 'hold',
    why: `Last time was ${list} at ${weight} lb — same weight, chase ${item.high} across all sets.`,
  };
}
