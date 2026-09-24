import { LIBRARY, type Exercise, type Gear } from './library';

export type { Exercise, Gear };
export { LIBRARY };

export interface RoutineItem {
  exerciseId: string;
  sets: number;
  low: number;
  high: number;
  /** exercises sharing a group number are a superset */
  group?: number;
  restSec?: number;
  note?: string;
  /** target RPE for autoregulation */
  rpe?: number;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
  folder?: string;
  tags?: string[];
  /** generated plans carry their shape */
  phase?: string;
  weekOfBlock?: number;
  deload?: boolean;
}

export const REST_DEFAULT = 90;

export const item = (
  exerciseId: string,
  sets = 3,
  low = 8,
  high = 12,
  extra: Partial<RoutineItem> = {},
): RoutineItem => ({ exerciseId, sets, low, high, ...extra });

export const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'a',
    name: 'Day A',
    folder: 'Starter',
    items: [item('squat'), item('bench'), item('row'), item('db-curl'), item('knee-raise')],
  },
  {
    id: 'b',
    name: 'Day B',
    folder: 'Starter',
    items: [
      item('rdl', 3, 5, 8),
      item('ohp'),
      item('pulldown'),
      item('lateral-raise'),
      item('calf-raise'),
    ],
  },
];

/** rep-range presets offered when editing a routine */
export const REP_PRESETS: { name: string; low: number; high: number }[] = [
  { name: 'strength', low: 4, high: 6 },
  { name: 'hypertrophy', low: 8, high: 12 },
  { name: 'endurance', low: 12, high: 20 },
];

export const byMuscle = (muscle: string): Exercise[] =>
  LIBRARY.filter((e) => e.muscle === muscle);

/** same muscle first, then same equipment — and only what this gym has in it */
export function alternatives(exercise: Exercise, limit = 8, equipment?: Gear[]): Exercise[] {
  return LIBRARY.filter(
    (e) =>
      e.id !== exercise.id &&
      e.muscle === exercise.muscle &&
      (!equipment || e.gear === 'bodyweight' || equipment.includes(e.gear)),
  )
    .sort((a, b) => Number(b.gear === exercise.gear) - Number(a.gear === exercise.gear))
    .slice(0, limit);
}
