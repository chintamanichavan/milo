/**
 * The weekly page: four systems, 22 boxes, redrawn every Monday and reviewed on Sunday.
 * Days are counted Monday first (0 = Mon … 6 = Sun), the way the paper page is drawn.
 * No imports, so the tests can load it straight into node.
 */

export type System = 'clean' | 'cook' | 'workout' | 'study';
export type Kind = 'run' | 'lift' | 'active' | 'long' | 'easy';

export const SYSTEMS: { id: System; label: string }[] = [
  { id: 'clean', label: 'Clean' },
  { id: 'cook', label: 'Cook' },
  { id: 'workout', label: 'Workout' },
  { id: 'study', label: 'Study' },
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** one room a day, Sunday off; Saturday's job comes from DEEP */
export const CLEAN: (string | null)[] = [
  'Bathroom: toilet, sink, mirror, shower, fresh hand towel',
  'Bedroom: sheets, bedside, clothes away, wardrobe top',
  'Floors: sweep and mop, before cooking',
  'Kitchen: stove, counters, sink, cabinet fronts, clear dead food',
  'Laundry and dust: wash running while dusting shelves, fan, sills',
  'deep',
  null,
];

/** Saturday's deep job, by week of the month */
export const DEEP = [
  'Fridge inside, dishwasher filter and a hot empty cycle',
  'Windows and grilles',
  'Under bed and sofa, behind furniture',
  'Wardrobe sort-out, bathroom grout, drains',
];

/** Wednesday cooks for Thu–Sat, Sunday for Mon–Wed */
export const COOK: (string | null)[] = [null, null, 'Cook for Thu–Sat', null, null, null, 'Cook for Mon–Wed, then reset the kitchen'];

export const KINDS: { id: Kind; label: string; line: string }[] = [
  { id: 'run', label: 'Run', line: 'Run day' },
  { id: 'lift', label: 'Lift', line: 'Lift day' },
  { id: 'active', label: 'Active', line: 'Active: 20–30 min walk, mobility, stretching' },
  { id: 'long', label: 'Long', line: 'Long: a longer run, hike or ride' },
  { id: 'easy', label: 'Easy', line: 'Easy: a light walk' },
];

/** lift Mon/Wed/Fri, run Tue/Thu/Sat, easy Sunday */
export const DEFAULT_PLAN: Kind[] = ['lift', 'run', 'lift', 'run', 'lift', 'run', 'easy'];

export const weekday = (d: Date): number => (d.getDay() + 6) % 7;

export function due(system: System, day: number): boolean {
  if (system === 'clean') return CLEAN[day] !== null;
  if (system === 'cook') return COOK[day] !== null;
  return true;
}

/** boxes on a full week: 6 clean, 2 cook, 7 workout, 7 study */
export const MAX = SYSTEMS.reduce((n, s) => n + DAYS.filter((_, d) => due(s.id, d)).length, 0);

export function deepTask(d: Date): string {
  return DEEP[Math.floor((d.getDate() - 1) / 7) % DEEP.length];
}

export function cleanTask(d: Date): string | null {
  const job = CLEAN[weekday(d)];
  return job === 'deep' ? `Deep: ${deepTask(d)}` : job;
}

/** midnight on the Monday that starts d's week */
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - weekday(m));
  return m;
}

export const weekDates = (d: Date): Date[] => {
  const m = mondayOf(d);
  return DAYS.map((_, i) => new Date(m.getFullYear(), m.getMonth(), m.getDate() + i));
};

/** Run's reminder counts Sunday as 0; the week counts Monday as 0 */
export const runDays = (plan: Kind[]): number[] =>
  plan
    .map((k, i) => (k === 'run' ? (i + 1) % 7 : -1))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);

/** ticks out of MAX; a box that was not due never counts */
export function score(ticked: (system: System, day: number) => boolean): number {
  let n = 0;
  for (const s of SYSTEMS) for (let d = 0; d < 7; d++) if (due(s.id, d) && ticked(s.id, d)) n++;
  return n;
}
