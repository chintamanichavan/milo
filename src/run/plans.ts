import { planFor, type Plan, type Segment } from './weeks';

export interface Programme {
  id: string;
  name: string;
  blurb: string;
  weeks: number;
  runsPerWeek: number;
  /** what the badge for a finished week is called */
  badge: string;
  plan: (week: number, run: number) => Plan;
}

const r = (sec: number, extra: Partial<Segment> = {}): Segment => ({ kind: 'run', sec, ...extra });
const w = (sec: number): Segment => ({ kind: 'walk', sec });
const WARM = w(300);
const COOL = w(300);

const wrap = (
  id: string,
  week: number,
  run: number,
  label: string,
  watch: string,
  mid: Segment[],
): Plan => {
  const segments = [WARM, ...mid, COOL];
  return {
    week,
    run,
    label,
    watch,
    segments,
    totalSec: segments.reduce((s, x) => s + x.sec, 0),
    programme: id,
  };
};

/** Stepping Stones: one steady run, cadence rising week by week. */
function stones(week: number, run: number): Plan {
  const bpm = 150 + (week - 1) * 5;
  const minutes = 25 + week * 2 + (run - 1);
  return wrap(
    'stones',
    week,
    run,
    `${minutes}′ at a steady rhythm, ${bpm} steps a minute`,
    `warm-up 5:00 · work ${minutes}:00 · cool-down 5:00`,
    [r(minutes * 60, { effort: 'steady', bpm })],
  );
}

/** Speed: hard minutes with easy minutes between, more of them each week. */
function speed(week: number, run: number): Plan {
  const reps = 5 + week + (run === 3 ? 1 : 0);
  const mid: Segment[] = [];
  for (let i = 0; i < reps; i++) {
    mid.push(r(60, { effort: 'hard' }));
    if (i < reps - 1) mid.push(r(60, { effort: 'easy' }));
  }
  return wrap(
    'speed',
    week,
    run,
    `${reps} × 1′ hard with 1′ easy between`,
    `warm-up 5:00 · ${reps} × (work 1:00 + recover 1:00) · cool-down 5:00`,
    mid,
  );
}

/** Stamina: one long run with the middle lifted. */
function stamina(week: number, run: number): Plan {
  const total = 35 + week * 1 + (run - 1);
  const block = Math.round((total * 60) / 3);
  return wrap(
    'stamina',
    week,
    run,
    `${total}′ continuous — easy, steady, then easy again`,
    `warm-up 5:00 · work ${total}:00 · cool-down 5:00`,
    [
      r(block, { effort: 'easy' }),
      r(block, { effort: 'steady' }),
      r(total * 60 - block * 2, { effort: 'easy' }),
    ],
  );
}

/** Bridge to 5K: one long run a week, the last one measured in kilometres. */
function bridge(week: number, run: number): Plan {
  if (week === 3 && run === 1)
    return wrap(
      'bridge',
      week,
      run,
      '5 kilometres, however long it takes',
      'warm-up 5:00 · work: 5 km · cool-down 5:00',
      [r(45 * 60, { effort: 'steady', untilKm: 5 })],
    );
  const minutes = week === 1 ? 32 : 35;
  return wrap(
    'bridge',
    week,
    run,
    `${minutes}′ steady, building towards 5 km`,
    `warm-up 5:00 · work ${minutes}:00 · cool-down 5:00`,
    [r(minutes * 60, { effort: 'steady' })],
  );
}

export const PROGRAMMES: Programme[] = [
  {
    id: 'c25k',
    name: 'Couch to 5K',
    blurb: 'Nine weeks from walking to a half hour of running.',
    weeks: 9,
    runsPerWeek: 3,
    badge: 'week',
    plan: planFor,
  },
  {
    id: 'stones',
    name: 'Stepping Stones',
    blurb: 'Steady rhythm runs. The metronome does the coaching.',
    weeks: 4,
    runsPerWeek: 3,
    badge: 'stone',
    plan: stones,
  },
  {
    id: 'speed',
    name: 'Speed',
    blurb: 'Hard minutes, easy minutes, more of them each week.',
    weeks: 4,
    runsPerWeek: 3,
    badge: 'sprint',
    plan: speed,
  },
  {
    id: 'stamina',
    name: 'Stamina',
    blurb: 'One long run that grows. Effort, not pace.',
    weeks: 4,
    runsPerWeek: 3,
    badge: 'hour',
    plan: stamina,
  },
  {
    id: 'bridge',
    name: 'Bridge to 5K distance',
    blurb: 'Three weeks to the distance itself. The last one is measured in kilometres.',
    weeks: 3,
    runsPerWeek: 1,
    badge: 'bridge',
    plan: bridge,
  },
];

export const programmeById = (id: string): Programme =>
  PROGRAMMES.find((p) => p.id === id) ?? PROGRAMMES[0];

export const planOf = (programme: string, week: number, run: number): Plan =>
  programmeById(programme).plan(week, run);
