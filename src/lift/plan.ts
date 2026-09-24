import { item, type Routine, type RoutineItem } from './data';
import { LIBRARY } from './library';

export type Goal = 'strength' | 'hypertrophy' | 'general';
export type Experience = 'new' | 'intermediate' | 'advanced';
export type Kit = 'gym' | 'dumbbells' | 'bodyweight';

export interface Answers {
  goal: Goal;
  days: number;
  experience: Experience;
  kit: Kit;
  minutes: number;
  /** what the active gym has; when given, it decides instead of the kit */
  equipment?: string[];
}

export interface GeneratedPlan {
  id: string;
  name: string;
  shape: string;
  answers: Answers;
  /** four-week blocks; each block names its phase */
  phases: { name: string; low: number; high: number }[];
  routines: Routine[];
}

const PICKS: Record<string, string[]> = {
  squat: ['squat', 'front-squat', 'smith-squat', 'goblet-squat', 'kb-goblet', 'leg-press', 'split-squat', 'wall-sit'],
  hinge: ['deadlift', 'rdl', 'trap-bar', 'smith-rdl', 'kb-deadlift', 'hip-hinge', 'glute-bridge', 'back-extension'],
  push: ['bench', 'incline-bench', 'smith-bench', 'db-bench', 'ohp', 'db-press', 'kb-press', 'pushup', 'pike-pushup'],
  pull: ['row', 'pulldown', 'db-row', 'cable-row', 'kb-row', 'band-row', 'chinup', 'inverted-row'],
  shoulder: ['lateral-raise', 'face-pull', 'band-face-pull', 'rear-delt-fly', 'band-pull-apart', 'pike-pushup'],
  arms: ['db-curl', 'pushdown', 'ez-curl', 'hammer-curl', 'band-curl', 'overhead-triceps', 'band-pushdown', 'bench-dip'],
  core: ['plank', 'knee-raise', 'cable-crunch', 'band-pallof', 'ab-wheel', 'hollow-hold'],
  calves: ['calf-raise', 'seated-calf', 'smith-calf', 'calf-jump'],
};

const allowed = (kit: Kit, equipment?: string[]) => (id: string): boolean => {
  const exercise = LIBRARY.find((e) => e.id === id);
  if (!exercise) return false;
  if (equipment) return exercise.gear === 'bodyweight' || equipment.includes(exercise.gear);
  if (kit === 'gym') return true;
  if (kit === 'dumbbells') return exercise.gear === 'dumbbell' || exercise.gear === 'bodyweight';
  return exercise.gear === 'bodyweight';
};

const pick = (slot: keyof typeof PICKS, kit: Kit, offset = 0, equipment?: string[]): string => {
  const options = PICKS[slot].filter(allowed(kit, equipment));
  return (options.length ? options : PICKS[slot])[offset % Math.max(1, options.length)];
};

const RANGES: Record<Goal, { low: number; high: number; sets: number; rest: number; rpe: number }> = {
  strength: { low: 4, high: 6, sets: 4, rest: 180, rpe: 8 },
  hypertrophy: { low: 8, high: 12, sets: 3, rest: 90, rpe: 8 },
  general: { low: 8, high: 15, sets: 3, rest: 75, rpe: 7 },
};

/** how many exercises fit the time you have */
const sizeFor = (minutes: number): number =>
  minutes <= 30 ? 4 : minutes <= 45 ? 5 : minutes <= 60 ? 6 : 7;

function makeItems(slots: (keyof typeof PICKS)[], answers: Answers, offset: number): RoutineItem[] {
  const { low, high, sets, rest, rpe } = RANGES[answers.goal];
  return slots.map((slot, i) =>
    item(pick(slot, answers.kit, offset + i, answers.equipment), sets, low, high, { restSec: rest, rpe }),
  );
}

const SHAPES: Record<number, { name: string; slots: (keyof typeof PICKS)[] }[]> = {
  2: [
    { name: 'Full body A', slots: ['squat', 'push', 'pull', 'hinge', 'core'] },
    { name: 'Full body B', slots: ['hinge', 'push', 'pull', 'shoulder', 'calves'] },
  ],
  3: [
    { name: 'Full body A', slots: ['squat', 'push', 'pull', 'arms', 'core'] },
    { name: 'Full body B', slots: ['hinge', 'push', 'pull', 'shoulder', 'calves'] },
    { name: 'Full body C', slots: ['squat', 'push', 'pull', 'arms', 'core'] },
  ],
  4: [
    { name: 'Upper A', slots: ['push', 'pull', 'shoulder', 'arms', 'core'] },
    { name: 'Lower A', slots: ['squat', 'hinge', 'calves', 'core'] },
    { name: 'Upper B', slots: ['push', 'pull', 'shoulder', 'arms'] },
    { name: 'Lower B', slots: ['hinge', 'squat', 'calves', 'core'] },
  ],
  5: [
    { name: 'Push', slots: ['push', 'shoulder', 'arms', 'core'] },
    { name: 'Pull', slots: ['pull', 'arms', 'core'] },
    { name: 'Legs', slots: ['squat', 'hinge', 'calves'] },
    { name: 'Upper', slots: ['push', 'pull', 'shoulder', 'arms'] },
    { name: 'Lower', slots: ['hinge', 'squat', 'calves', 'core'] },
  ],
  6: [
    { name: 'Push A', slots: ['push', 'shoulder', 'arms'] },
    { name: 'Pull A', slots: ['pull', 'arms', 'core'] },
    { name: 'Legs A', slots: ['squat', 'hinge', 'calves'] },
    { name: 'Push B', slots: ['push', 'shoulder', 'arms'] },
    { name: 'Pull B', slots: ['pull', 'arms', 'core'] },
    { name: 'Legs B', slots: ['hinge', 'squat', 'calves'] },
  ],
};

/** Answers in, a real programme out — editable afterwards like any routine. */
export function generatePlan(answers: Answers): GeneratedPlan {
  const shape = SHAPES[Math.min(6, Math.max(2, answers.days))] ?? SHAPES[3];
  const size = sizeFor(answers.minutes);
  const routines: Routine[] = shape.map((day, i) => ({
    id: `gen-${i + 1}`,
    name: day.name,
    folder: 'My plan',
    items: makeItems(day.slots.slice(0, size), answers, i),
  }));
  const phases =
    answers.goal === 'strength'
      ? [
          { name: 'hypertrophy block', low: 8, high: 12 },
          { name: 'strength block', low: 4, high: 6 },
        ]
      : [{ name: `${answers.goal} block`, low: RANGES[answers.goal].low, high: RANGES[answers.goal].high }];
  return {
    id: `plan-${Date.now()}`,
    name:
      answers.days <= 3
        ? 'Full body'
        : answers.days === 4
          ? 'Upper / lower'
          : 'Push / pull / legs',
    shape: `${answers.days} days · ${answers.minutes} minutes · ${answers.goal}`,
    answers,
    phases,
    routines,
  };
}

/** every fourth week is lighter, on purpose */
export const isDeloadWeek = (week: number): boolean => week % 4 === 0;

export function phaseFor(plan: GeneratedPlan, week: number): { name: string; weekOfBlock: number } {
  const block = Math.floor((week - 1) / 4);
  const phase = plan.phases[Math.min(block, plan.phases.length - 1)];
  return { name: phase.name, weekOfBlock: ((week - 1) % 4) + 1 };
}

/** Warm-up ladder for the first working set. */
export function warmupSets(workingLb: number, barLb = 45): { weightLb: number; reps: number }[] {
  if (!workingLb || workingLb <= barLb) return [{ weightLb: barLb, reps: 10 }];
  const round = (lb: number): number => Math.max(barLb, Math.round(lb / 5) * 5);
  return [
    { weightLb: barLb, reps: 10 },
    { weightLb: round(workingLb * 0.5), reps: 8 },
    { weightLb: round(workingLb * 0.7), reps: 5 },
    { weightLb: round(workingLb * 0.85), reps: 3 },
  ];
}
