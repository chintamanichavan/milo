export type Kind = 'run' | 'walk';

export interface Segment {
  kind: Kind;
  sec: number;
}

export interface Plan {
  week: number;
  run: number;
  label: string;
  /** How to build this run as a custom interval workout on the Watch. */
  watch: string;
  segments: Segment[];
  totalSec: number;
}

const WARM_UP = 300;
const COOL_DOWN = 300;

const r = (sec: number): Segment => ({ kind: 'run', sec });
const w = (sec: number): Segment => ({ kind: 'walk', sec });

/** n run blocks, separated by walks. Always starts and ends on a run —
 *  the cool-down walk stands in for the last recovery walk. */
const alt = (n: number, runSec: number, walkSec: number): Segment[] => {
  const out: Segment[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) out.push(w(walkSec));
    out.push(r(runSec));
  }
  return out;
};

interface Shape {
  label: string;
  watch: string;
  mid: Segment[];
}

const WARM_COOL = 'warm-up 5:00 · ';
const straight = (mins: number): string => `${WARM_COOL}work ${mins}:00 · cool-down 5:00`;

/** One entry per week. One shape = all three runs the same. */
const WEEKS: Shape[][] = [
  [
    {
      label: 'Eight one-minute runs, ninety seconds of walking between',
      watch: `${WARM_COOL}8 × (work 1:00 + recover 1:30) · cool-down 5:00`,
      mid: alt(8, 60, 90),
    },
  ],
  [
    {
      label: 'Six ninety-second runs, two minutes of walking between',
      watch: `${WARM_COOL}6 × (work 1:30 + recover 2:00) · cool-down 5:00`,
      mid: alt(6, 90, 120),
    },
  ],
  [
    {
      label: 'Ninety seconds, then three minutes of running. Twice through.',
      watch: `${WARM_COOL}2 × (work 1:30 + recover 1:30 + work 3:00 + recover 3:00) · cool-down 5:00`,
      mid: [r(90), w(90), r(180), w(180), r(90), w(90), r(180)],
    },
  ],
  [
    {
      label: 'Three minutes, five, three, then five again, walking between',
      watch: `${WARM_COOL}work 3:00 · recover 1:30 · work 5:00 · recover 2:30 · work 3:00 · recover 1:30 · work 5:00 · cool-down 5:00`,
      mid: [r(180), w(90), r(300), w(150), r(180), w(90), r(300)],
    },
  ],
  [
    {
      label: 'Three five-minute runs, three minutes of walking between',
      watch: `${WARM_COOL}3 × (work 5:00 + recover 3:00) · cool-down 5:00`,
      mid: alt(3, 300, 180),
    },
    {
      label: 'Two eight-minute runs, five minutes of walking between',
      watch: `${WARM_COOL}2 × (work 8:00 + recover 5:00) · cool-down 5:00`,
      mid: alt(2, 480, 300),
    },
    { label: 'Twenty minutes of running, no walk breaks', watch: straight(20), mid: [r(1200)] },
  ],
  [
    {
      label: 'Five minutes, then eight, then five, walking between',
      watch: `${WARM_COOL}work 5:00 · recover 3:00 · work 8:00 · recover 3:00 · work 5:00 · cool-down 5:00`,
      mid: [r(300), w(180), r(480), w(180), r(300)],
    },
    {
      label: 'Two ten-minute runs, three minutes of walking between',
      watch: `${WARM_COOL}2 × (work 10:00 + recover 3:00) · cool-down 5:00`,
      mid: alt(2, 600, 180),
    },
    { label: 'Twenty-five minutes of running, no walk breaks', watch: straight(25), mid: [r(1500)] },
  ],
  [{ label: 'Twenty-five minutes of running, no walk breaks', watch: straight(25), mid: [r(1500)] }],
  [{ label: 'Twenty-eight minutes of running, no walk breaks', watch: straight(28), mid: [r(1680)] }],
  [{ label: 'Thirty minutes of running, no walk breaks', watch: straight(30), mid: [r(1800)] }],
];

export const TOTAL_WEEKS = WEEKS.length;
export const RUNS_PER_WEEK = 3;
export const TOTAL_RUNS = TOTAL_WEEKS * RUNS_PER_WEEK;

export function planFor(week: number, run: number): Plan {
  const shapes = WEEKS[week - 1];
  const shape = shapes[shapes.length === 1 ? 0 : run - 1];
  const segments = [w(WARM_UP), ...shape.mid, w(COOL_DOWN)];
  return {
    week,
    run,
    label: shape.label,
    watch: shape.watch,
    segments,
    totalSec: segments.reduce((sum, s) => sum + s.sec, 0),
  };
}

/** "29 minutes, warm-up and cool-down walks included" */
export function totalLine(plan: Plan): string {
  return `${Math.round(plan.totalSec / 60)} minutes, warm-up and cool-down walks included`;
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Spoken and written length: "90 seconds", "5 minutes". */
export function spellDuration(sec: number): string {
  if (sec < 120) return `${sec} seconds`;
  const min = sec / 60;
  return `${Number.isInteger(min) ? min : min.toFixed(1)} minutes`;
}

/** Short written length: 90″ or 5′ */
export function shortDuration(sec: number): string {
  return sec < 120 ? `${sec}″` : `${+(sec / 60).toFixed(1)}′`;
}
