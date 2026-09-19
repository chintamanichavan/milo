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
      label: '8 × 60″ run / 90″ walk',
      watch: `${WARM_COOL}8 × (work 1:00 + recover 1:30) · cool-down 5:00`,
      mid: alt(8, 60, 90),
    },
  ],
  [
    {
      label: '6 × 90″ run / 2′ walk',
      watch: `${WARM_COOL}6 × (work 1:30 + recover 2:00) · cool-down 5:00`,
      mid: alt(6, 90, 120),
    },
  ],
  [
    {
      label: '90″ and 3′ runs, twice through',
      watch: `${WARM_COOL}2 × (work 1:30 + recover 1:30 + work 3:00 + recover 3:00) · cool-down 5:00`,
      mid: [r(90), w(90), r(180), w(180), r(90), w(90), r(180)],
    },
  ],
  [
    {
      label: '3′ · 5′ · 3′ · 5′ run, walks between',
      watch: `${WARM_COOL}work 3:00 · recover 1:30 · work 5:00 · recover 2:30 · work 3:00 · recover 1:30 · work 5:00 · cool-down 5:00`,
      mid: [r(180), w(90), r(300), w(150), r(180), w(90), r(300)],
    },
  ],
  [
    {
      label: '3 × 5′ run / 3′ walk',
      watch: `${WARM_COOL}3 × (work 5:00 + recover 3:00) · cool-down 5:00`,
      mid: alt(3, 300, 180),
    },
    {
      label: '2 × 8′ run / 5′ walk',
      watch: `${WARM_COOL}2 × (work 8:00 + recover 5:00) · cool-down 5:00`,
      mid: alt(2, 480, 300),
    },
    { label: '20′ run, no walking', watch: straight(20), mid: [r(1200)] },
  ],
  [
    {
      label: '5′ · 8′ · 5′ run / 3′ walks',
      watch: `${WARM_COOL}work 5:00 · recover 3:00 · work 8:00 · recover 3:00 · work 5:00 · cool-down 5:00`,
      mid: [r(300), w(180), r(480), w(180), r(300)],
    },
    {
      label: '2 × 10′ run / 3′ walk',
      watch: `${WARM_COOL}2 × (work 10:00 + recover 3:00) · cool-down 5:00`,
      mid: alt(2, 600, 180),
    },
    { label: '25′ run, no walking', watch: straight(25), mid: [r(1500)] },
  ],
  [{ label: '25′ run, no walking', watch: straight(25), mid: [r(1500)] }],
  [{ label: '28′ run, no walking', watch: straight(28), mid: [r(1680)] }],
  [{ label: '30′ run, no walking', watch: straight(30), mid: [r(1800)] }],
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

/** "8 × 60″ run / 90″ walk · 29 min total" */
export function planLine(plan: Plan): string {
  return `${plan.label} · ${Math.round(plan.totalSec / 60)} min total`;
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
