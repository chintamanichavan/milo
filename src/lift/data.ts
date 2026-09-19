export type Gear = 'barbell' | 'dumbbell' | 'bodyweight' | 'machine';

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  gear: Gear;
  /** smallest sane jump in pounds */
  inc: number;
}

export interface RoutineItem {
  exerciseId: string;
  sets: number;
  low: number;
  high: number;
}

export interface Routine {
  id: string;
  name: string;
  items: RoutineItem[];
}

const E = (id: string, name: string, muscle: string, gear: Gear, inc: number): Exercise => ({
  id,
  name,
  muscle,
  gear,
  inc,
});

export const LIBRARY: Exercise[] = [
  E('squat', 'Back squat', 'legs', 'barbell', 10),
  E('front-squat', 'Front squat', 'legs', 'barbell', 10),
  E('goblet-squat', 'Goblet squat', 'legs', 'dumbbell', 5),
  E('leg-press', 'Leg press', 'legs', 'machine', 10),
  E('split-squat', 'Split squat', 'legs', 'dumbbell', 5),
  E('lunge', 'Walking lunge', 'legs', 'dumbbell', 5),
  E('leg-extension', 'Leg extension', 'legs', 'machine', 5),
  E('leg-curl', 'Leg curl', 'legs', 'machine', 5),
  E('calf-raise', 'Calf raise', 'legs', 'machine', 5),
  E('hip-thrust', 'Hip thrust', 'legs', 'barbell', 10),
  E('deadlift', 'Deadlift', 'hinge', 'barbell', 10),
  E('rdl', 'Romanian deadlift', 'hinge', 'barbell', 10),
  E('trap-bar', 'Trap bar deadlift', 'hinge', 'barbell', 10),
  E('good-morning', 'Good morning', 'hinge', 'barbell', 10),
  E('back-extension', 'Back extension', 'hinge', 'bodyweight', 5),
  E('bench', 'Bench press', 'push', 'barbell', 5),
  E('incline-bench', 'Incline bench press', 'push', 'barbell', 5),
  E('db-bench', 'Dumbbell bench press', 'push', 'dumbbell', 2.5),
  E('ohp', 'Overhead press', 'push', 'barbell', 5),
  E('db-press', 'Dumbbell shoulder press', 'push', 'dumbbell', 2.5),
  E('pushup', 'Push-up', 'push', 'bodyweight', 0),
  E('dip', 'Dip', 'push', 'bodyweight', 5),
  E('chest-press', 'Machine chest press', 'push', 'machine', 5),
  E('cable-fly', 'Cable fly', 'push', 'machine', 5),
  E('lateral-raise', 'Lateral raise', 'push', 'dumbbell', 2.5),
  E('pushdown', 'Triceps pushdown', 'push', 'machine', 5),
  E('overhead-triceps', 'Overhead triceps extension', 'push', 'dumbbell', 2.5),
  E('cgbp', 'Close-grip bench press', 'push', 'barbell', 5),
  E('row', 'Barbell row', 'pull', 'barbell', 5),
  E('db-row', 'Dumbbell row', 'pull', 'dumbbell', 2.5),
  E('pullup', 'Pull-up', 'pull', 'bodyweight', 5),
  E('chinup', 'Chin-up', 'pull', 'bodyweight', 5),
  E('pulldown', 'Lat pulldown', 'pull', 'machine', 5),
  E('cable-row', 'Seated cable row', 'pull', 'machine', 5),
  E('face-pull', 'Face pull', 'pull', 'machine', 5),
  E('curl', 'Barbell curl', 'pull', 'barbell', 5),
  E('db-curl', 'Dumbbell curl', 'pull', 'dumbbell', 2.5),
  E('hammer-curl', 'Hammer curl', 'pull', 'dumbbell', 2.5),
  E('cable-curl', 'Cable curl', 'pull', 'machine', 5),
  E('shrug', 'Shrug', 'pull', 'dumbbell', 5),
  E('plank', 'Plank', 'core', 'bodyweight', 0),
  E('knee-raise', 'Hanging knee raise', 'core', 'bodyweight', 5),
  E('cable-crunch', 'Cable crunch', 'core', 'machine', 5),
];

const item = (exerciseId: string, sets = 3, low = 8, high = 12): RoutineItem => ({
  exerciseId,
  sets,
  low,
  high,
});

export const DEFAULT_ROUTINES: Routine[] = [
  {
    id: 'a',
    name: 'Day A',
    items: [item('squat'), item('bench'), item('row'), item('db-curl'), item('knee-raise')],
  },
  {
    id: 'b',
    name: 'Day B',
    items: [
      item('rdl', 3, 5, 8),
      item('ohp'),
      item('pulldown'),
      item('lateral-raise'),
      item('calf-raise'),
    ],
  },
];

export const REST_DEFAULT = 90;
