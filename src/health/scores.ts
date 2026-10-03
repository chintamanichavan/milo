import type { Day, Workout } from './types';

/**
 * Every score HEALTH shows, worked out from days and workouts alone. Pure
 * and deterministic: the same export always gives the same numbers. The
 * constants are the whole method; nothing is hidden elsewhere. No runtime
 * imports, so node runs the tests in scores.test.mjs straight from source.
 */

export interface ScoreSettings {
  age: number;
  sex: 'male' | 'female';
  /** beats per minute; 220 − age unless you set your own */
  maxHr: number;
  /** base sleep need, hours */
  needH: number;
}

/* ---------- dates ---------- */

const utc = (d: string): number => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
export const addDays = (d: string, by: number): string => new Date(utc(d) + by * 86_400_000).toISOString().slice(0, 10);
export const daysApart = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86_400_000);

/* ---------- small statistics ---------- */

export const mean = (xs: number[]): number => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);

export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/* ---------- recovery ---------- */

/** how far back a baseline looks, and how many of those days it needs */
export const BASELINE_DAYS = 30;
export const MIN_BASELINE = 4;
/** the four inputs and their weights; they add to 1 */
export const WEIGHTS = { hrv: 0.45, rhr: 0.25, sleep: 0.2, resp: 0.1 } as const;
/** a z-score never counts for more than this, so one odd night cannot swamp the rest */
export const Z_CAP = 3;
/**
 * The squash from a weighted z to 0–100: 100 / (1 + e^-(K·z + SHIFT)).
 * A typical day (z = 0) lands near 59; one standard deviation better is about 88, worse about 22.
 */
export const SQUASH_K = 1.6;
export const SQUASH_SHIFT = 0.35;
/** the smallest spread a baseline is allowed, so a very steady stretch does not magnify noise */
export const SD_FLOOR = { hrv: 3, rhr: 1, sleep: 5, resp: 0.3 } as const;

export type Zone = 'good' | 'caution' | 'serious';
/** ≥ 67 primed, 34–66 adequate, below 34 take it easy */
export const zoneOf = (score: number): Zone => (score >= 67 ? 'good' : score >= 34 ? 'caution' : 'serious');
export const ZONE_WORD: Record<Zone, string> = { good: 'primed', caution: 'adequate', serious: 'take it easy' };

export const squash = (z: number): number => Math.round(100 / (1 + Math.exp(-(SQUASH_K * z + SQUASH_SHIFT))));

/* ---------- strain ---------- */

/** heart-rate zones as fractions of max HR: 50–60, 60–70, 70–80, 80–90, 90+ */
export const ZONE_FLOORS = [0.5, 0.6, 0.7, 0.8, 0.9];
/** minutes in zone n count n times (Edwards' TRIMP) */
export const ZONE_WEIGHTS = [1, 2, 3, 4, 5];
/** a workout with no heart rate: one load point per this many kcal */
export const KCAL_PER_LOAD = 6;
/** everyday movement outside workouts: one load point per this many active kcal */
export const BACKGROUND_KCAL_PER_LOAD = 12;
/**
 * Strain = 21 · ln(1 + load / C) / ln(1 + LOAD_AT_21 / C), capped at 21.
 * Logarithmic, like WHOOP's: the first hour of effort moves it far more than the third.
 * 45 minutes in zone 3 (load ~135) is about 12.5; a rest day of 500 active kcal about 7.
 */
export const LOAD_C = 20;
export const LOAD_AT_21 = 600;

export const strainOf = (load: number): number =>
  Math.round(clamp((21 * Math.log(1 + Math.max(0, load) / LOAD_C)) / Math.log(1 + LOAD_AT_21 / LOAD_C), 0, 21) * 10) / 10;

/** seconds in each of the five zones, from a workout's heart-rate line */
export function timeInZones(w: Pick<Workout, 'hr' | 'durMin'>, maxHr: number): number[] {
  const out = [0, 0, 0, 0, 0];
  const hr = w.hr ?? [];
  for (let i = 0; i < hr.length; i++) {
    const next = i + 1 < hr.length ? hr[i + 1][0] : Math.max(hr[i][0], w.durMin * 60);
    const span = Math.max(0, Math.min(next - hr[i][0], 600));
    const frac = hr[i][1] / maxHr;
    let z = -1;
    for (let k = ZONE_FLOORS.length - 1; k >= 0; k--)
      if (frac >= ZONE_FLOORS[k]) {
        z = k;
        break;
      }
    if (z >= 0) out[z] += span;
  }
  return out;
}

export function workoutLoad(w: Workout, maxHr: number): number {
  if (w.hr && w.hr.length > 2) return timeInZones(w, maxHr).reduce((s, sec, k) => s + (sec / 60) * ZONE_WEIGHTS[k], 0);
  return (w.kcal ?? 0) / KCAL_PER_LOAD;
}

export function dayLoad(day: Day | undefined, workouts: Workout[], maxHr: number): number {
  const fromWorkouts = workouts.reduce((s, w) => s + workoutLoad(w, maxHr), 0);
  const workoutKcal = workouts.reduce((s, w) => s + (w.kcal ?? 0), 0);
  const background = Math.max(0, (day?.active ?? 0) - workoutKcal) / BACKGROUND_KCAL_PER_LOAD;
  return fromWorkouts + background;
}

/** what to aim for today, from this morning's recovery */
export function strainTarget(recovery: number | null): [number, number] {
  if (recovery === null) return [10, 14];
  if (recovery >= 67) return [14, 18];
  if (recovery >= 50) return [11, 14];
  if (recovery >= 34) return [8, 11];
  return [4, 8];
}

/* ---------- sleep ---------- */

/** debt looks back two weeks; tonight's need takes back a quarter of it, at most 90 minutes */
export const DEBT_DAYS = 14;
export const DEBT_REPAY = 0.25;
export const DEBT_REPAY_CAP = 90;
/** a hard day asks for more: 4 minutes for each point of strain over 10, at most 45 */
export const STRAIN_NEED_FROM = 10;
export const STRAIN_NEED_PER_POINT = 4;
export const STRAIN_NEED_CAP = 45;

/**
 * Sleep need, minutes = base + min(90, debt × 0.25) + min(45, 4 × (yesterday's strain − 10)).
 * Debt is the two weeks' net shortfall against the base: long nights pay it back, it never goes below 0.
 */
export function sleepNeed(baseMin: number, debtMin: number, strainBefore: number): number {
  return Math.round(
    baseMin +
      Math.min(DEBT_REPAY_CAP, debtMin * DEBT_REPAY) +
      clamp((strainBefore - STRAIN_NEED_FROM) * STRAIN_NEED_PER_POINT, 0, STRAIN_NEED_CAP),
  );
}

export function sleepDebt(nights: (number | undefined)[], baseMin: number): number {
  return Math.max(0, Math.round(nights.reduce<number>((s, a) => (a === undefined ? s : s + baseMin - a), 0)));
}

export const consistencyWord = (sdMin: number): string => (sdMin <= 20 ? 'steady' : sdMin <= 45 ? 'a little loose' : 'all over the place');

/* ---------- everything, day by day ---------- */

export type InputKey = keyof typeof WEIGHTS;

export interface Input {
  key: InputKey;
  value: number;
  base: number;
  z: number;
}

export interface DayScore {
  date: string;
  recovery: number | null;
  inputs: Input[];
  /** days of history behind the baseline, so a new user sees it filling */
  history: number;
  load: number;
  strain: number;
  target: [number, number];
  /** the night that ended this morning */
  need: number | null;
  perf: number | null;
  efficiency: number | null;
  /** debt going into last night, minutes */
  debt: number;
  /** bedtime spread over the last seven nights, minutes */
  consistency: number | null;
}

function baselineOf(values: (number | undefined)[]): { m: number; s: number; n: number } {
  const xs = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
  return { m: mean(xs), s: sd(xs), n: xs.length };
}

/** every date from the first to the last, gaps included */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function scoreAll(days: Day[], workouts: Workout[], s: ScoreSettings): Map<string, DayScore> {
  const out = new Map<string, DayScore>();
  if (!days.length && !workouts.length) return out;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const wByDate = new Map<string, Workout[]>();
  for (const w of workouts) wByDate.set(w.date, [...(wByDate.get(w.date) ?? []), w]);
  const first = [days[0]?.date, workouts[0]?.date].filter(Boolean).sort()[0]!;
  const last = [days[days.length - 1]?.date, workouts[workouts.length - 1]?.date].filter(Boolean).sort().pop()!;
  const dates = dateRange(first, last);
  const baseMin = s.needH * 60;

  const perf: (number | undefined)[] = [];
  const strain: number[] = [];
  dates.forEach((date, i) => {
    const d = byDate.get(date);
    const load = dayLoad(d, wByDate.get(date) ?? [], s.maxHr);
    strain[i] = strainOf(load);

    // sleep: the night that ended this morning
    const asleepBefore = dates.slice(Math.max(0, i - DEBT_DAYS), i).map((x) => byDate.get(x)?.asleep);
    const debt = sleepDebt(asleepBefore, baseMin);
    const need = d?.asleep ? sleepNeed(baseMin, debt, i > 0 ? strain[i - 1] : 0) : null;
    perf[i] = d?.asleep && need ? Math.min(100, Math.round((d.asleep / need) * 100)) : undefined;
    const beds = dates
      .slice(Math.max(0, i - 6), i + 1)
      .map((x) => byDate.get(x)?.bed)
      .filter((b): b is number => b !== undefined);

    // recovery: each input against its own trailing 30 days
    const window = dates.slice(Math.max(0, i - BASELINE_DAYS), i);
    const inputs: Input[] = [];
    const add = (key: InputKey, value: number | undefined, past: (number | undefined)[]): void => {
      if (value === undefined) return;
      const b = baselineOf(past);
      if (b.n < MIN_BASELINE) return;
      const spread = Math.max(b.s, SD_FLOOR[key]);
      let z = (value - b.m) / spread;
      if (key === 'rhr') z = -z;
      // breathing rate: any step away from usual counts against, either way
      if (key === 'resp') z = -Math.abs(z);
      inputs.push({ key, value, base: b.m, z: clamp(z, -Z_CAP, Z_CAP) });
    };
    add('hrv', d?.hrv, window.map((x) => byDate.get(x)?.hrv));
    add('rhr', d?.rhr, window.map((x) => byDate.get(x)?.rhr));
    add('sleep', perf[i], perf.slice(Math.max(0, i - BASELINE_DAYS), i));
    add('resp', d?.resp, window.map((x) => byDate.get(x)?.resp));
    const core = inputs.some((x) => x.key === 'hrv' || x.key === 'rhr');
    const weight = inputs.reduce((sum, x) => sum + WEIGHTS[x.key], 0);
    const recovery = core ? squash(inputs.reduce((sum, x) => sum + WEIGHTS[x.key] * x.z, 0) / weight) : null;

    out.set(date, {
      date,
      recovery,
      inputs,
      history: window.filter((x) => byDate.get(x)?.hrv !== undefined || byDate.get(x)?.rhr !== undefined).length,
      load: Math.round(load),
      strain: strain[i],
      target: strainTarget(recovery),
      need,
      perf: perf[i] ?? null,
      efficiency: d?.asleep && d.inBed ? Math.round((d.asleep / d.inBed) * 100) : null,
      debt,
      consistency: beds.length >= 3 ? Math.round(sd(beds)) : null,
    });
  });
  return out;
}

/**
 * When to be asleep tonight for 100%: tonight's need (with today's strain and
 * the debt including last night), divided by your usual efficiency, back from
 * your usual wake time. Minutes from midnight; may run past 24:00 or below 0.
 */
export function bedtimeFor(days: Day[], today: string, todayStrain: number, s: ScoreSettings): { bed: number; need: number } | null {
  const recent = days.filter((d) => d.date <= today && daysApart(d.date, today) < 7 && d.wake !== undefined && d.asleep);
  if (!recent.length) return null;
  const wakes = recent.map((d) => d.wake!).sort((a, b) => a - b);
  const wake = wakes[Math.floor(wakes.length / 2)];
  const eff = mean(recent.filter((d) => d.inBed).map((d) => d.asleep! / d.inBed!)) || 0.9;
  const byDate = new Map(days.map((d) => [d.date, d]));
  const nights = Array.from({ length: DEBT_DAYS }, (_, k) => byDate.get(addDays(today, -k))?.asleep);
  const need = sleepNeed(s.needH * 60, sleepDebt(nights, s.needH * 60), todayStrain);
  return { bed: Math.round(wake + 1440 - need / clamp(eff, 0.7, 1)), need };
}

/* ---------- vitals ---------- */

export const VITAL_FLAG_Z = 1.5;
export type VitalKey = 'rhr' | 'hrv' | 'resp' | 'spo2' | 'temp';

export interface Vital {
  key: VitalKey;
  value: number;
  base: number;
  sd: number;
  n: number;
  /** high or low only when outside ±1.5σ of your own month */
  flag: 'high' | 'low' | null;
}

export function vitals(days: Day[], date: string): Vital[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const today = byDate.get(date);
  const keys: VitalKey[] = ['rhr', 'hrv', 'resp', 'spo2', 'temp'];
  const out: Vital[] = [];
  for (const key of keys) {
    const value = today?.[key];
    if (value === undefined) continue;
    const past = Array.from({ length: BASELINE_DAYS }, (_, k) => byDate.get(addDays(date, -k - 1))?.[key]).filter(
      (v): v is number => v !== undefined,
    );
    const b = { m: mean(past), s: sd(past), n: past.length };
    const z = b.n >= MIN_BASELINE && b.s > 0 ? (value - b.m) / b.s : 0;
    out.push({ key, value, base: b.m, sd: b.s, n: b.n, flag: z > VITAL_FLAG_Z ? 'high' : z < -VITAL_FLAG_Z ? 'low' : null });
  }
  return out;
}

/* ---------- Milo Age ---------- */

/** VO2max at the 50th percentile by age (mL/kg/min), from the usual fitness tables */
export const VO2_NORM: Record<'male' | 'female', [number, number][]> = {
  male: [[25, 42.5], [35, 41], [45, 38.1], [55, 35.2], [65, 31.8], [75, 28.7]],
  female: [[25, 36.1], [35, 34.4], [45, 32.3], [55, 29.4], [65, 27.2], [75, 24.5]],
};
/** each mL above the norm takes off 0.6 years, up to 8 either way */
export const VO2_YEARS_PER_ML = 0.6;
/** 150 minutes a week is even; every 50 more or less moves a year, up to 3 */
export const EXERCISE_EVEN = 150;
export const EXERCISE_MIN_PER_YEAR = 50;
/** resting heart rate 62 is even; each beat moves 0.2 years, up to 3 */
export const RHR_EVEN = 62;
export const RHR_YEARS_PER_BPM = 0.2;

export function vo2Norm(age: number, sex: 'male' | 'female'): number {
  const t = VO2_NORM[sex];
  if (age <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++)
    if (age <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (age - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
  return t[t.length - 1][1];
}

export interface MiloAge {
  age: number;
  /** negative is younger than the calendar */
  delta: number;
  parts: { what: string; years: number; note: string }[];
}

export function miloAge(days: Day[], today: string, s: ScoreSettings): MiloAge | null {
  const month = days.filter((d) => d.date <= today && daysApart(d.date, today) < 28);
  const quarter = days.filter((d) => d.date <= today && daysApart(d.date, today) < 90);
  const vo2s = quarter.map((d) => d.vo2).filter((v): v is number => v !== undefined);
  const ex = month.map((d) => d.exMin).filter((v): v is number => v !== undefined);
  const rhr = month.map((d) => d.rhr).filter((v): v is number => v !== undefined);
  if (!vo2s.length && !ex.length && !rhr.length) return null;
  const parts: MiloAge['parts'] = [];
  if (vo2s.length) {
    const v = vo2s[vo2s.length - 1];
    const norm = vo2Norm(s.age, s.sex);
    parts.push({
      what: 'Cardio fitness',
      years: clamp(-(v - norm) * VO2_YEARS_PER_ML, -8, 8),
      note: `VO2 max ${v.toFixed(1)} against ${norm.toFixed(1)} typical at ${s.age}`,
    });
  }
  if (ex.length) {
    const week = mean(ex) * 7;
    parts.push({
      what: 'Exercise',
      years: clamp(-(week - EXERCISE_EVEN) / EXERCISE_MIN_PER_YEAR, -3, 3),
      note: `${Math.round(week)} minutes a week against ${EXERCISE_EVEN}`,
    });
  }
  if (rhr.length) {
    const r = mean(rhr);
    parts.push({
      what: 'Resting heart rate',
      years: clamp((r - RHR_EVEN) * RHR_YEARS_PER_BPM, -3, 3),
      note: `${Math.round(r)} bpm against ${RHR_EVEN}`,
    });
  }
  const delta = Math.round(parts.reduce((sum, p) => sum + p.years, 0) * 10) / 10;
  for (const p of parts) p.years = Math.round(p.years * 10) / 10;
  return { age: Math.round((s.age + delta) * 10) / 10, delta, parts };
}

/* ---------- trends: 90 days against the year ---------- */

export type TrendKey = 'active' | 'exMin' | 'stand' | 'steps' | 'walkSpeed' | 'vo2' | 'asleep';
export const TREND_KEYS: TrendKey[] = ['active', 'exMin', 'stand', 'steps', 'walkSpeed', 'vo2', 'asleep'];
/** a change under 3% either way is flat */
export const TREND_FLAT = 0.03;
/** at least this many days in each window before an arrow is drawn */
export const TREND_MIN_90 = 30;
export const TREND_MIN_365 = 120;
/** VO2 max is only estimated now and then, so it needs far fewer readings */
export const TREND_MIN_SPARSE: Partial<Record<TrendKey, [number, number]>> = { vo2: [4, 10] };

export interface Trend {
  key: TrendKey;
  dir: 'up' | 'flat' | 'down' | null;
  avg90: number | null;
  avg365: number | null;
  n90: number;
  n365: number;
}

export function trend(days: Day[], today: string, key: TrendKey): Trend {
  const vals = (span: number): number[] =>
    days
      .filter((d) => d.date <= today && daysApart(d.date, today) < span)
      .map((d) => d[key])
      .filter((v): v is number => v !== undefined && (key !== 'asleep' || v > 0));
  const a = vals(90);
  const b = vals(365);
  const [min90, min365] = TREND_MIN_SPARSE[key] ?? [TREND_MIN_90, TREND_MIN_365];
  const enough = a.length >= min90 && b.length >= min365;
  const avg90 = a.length ? mean(a) : null;
  const avg365 = b.length ? mean(b) : null;
  let dir: Trend['dir'] = null;
  if (enough && avg90 !== null && avg365) {
    const change = (avg90 - avg365) / avg365;
    dir = change > TREND_FLAT ? 'up' : change < -TREND_FLAT ? 'down' : 'flat';
  }
  return { key, dir, avg90, avg365, n90: a.length, n365: b.length };
}

/* ---------- rings and awards ---------- */

export const closed = (d: Day | undefined, ring: 'move' | 'exercise' | 'stand'): boolean => {
  if (!d) return false;
  if (ring === 'move') return !!d.moveGoal && (d.active ?? 0) >= d.moveGoal;
  if (ring === 'exercise') return (d.exMin ?? 0) >= (d.exGoal ?? 30);
  return (d.stand ?? 0) >= (d.standGoal ?? 12);
};
export const allClosed = (d: Day | undefined): boolean => closed(d, 'move') && closed(d, 'exercise') && closed(d, 'stand');

export interface Awards {
  /** move goal met, days running up to today */
  moveStreak: number;
  longestMove: number;
  longestAll: number;
  /** Monday-to-Sunday weeks with every ring closed every day */
  perfectWeeks: number;
  /** days the move ring closed twice over */
  doubles: number;
}

export function awards(days: Day[], today: string): Awards {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const ring = days.filter((d) => d.moveGoal);
  if (!ring.length) return { moveStreak: 0, longestMove: 0, longestAll: 0, perfectWeeks: 0, doubles: 0 };
  const dates = dateRange(ring[0].date, today);
  let run = 0;
  let longestMove = 0;
  let runAll = 0;
  let longestAll = 0;
  for (const date of dates) {
    const d = byDate.get(date);
    run = closed(d, 'move') ? run + 1 : 0;
    runAll = allClosed(d) ? runAll + 1 : 0;
    longestMove = Math.max(longestMove, run);
    longestAll = Math.max(longestAll, runAll);
  }
  // today still open does not break the streak
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (closed(byDate.get(dates[i]), 'move')) streak++;
    else if (i !== dates.length - 1) break;
  }
  let perfectWeeks = 0;
  for (let i = 0; i < dates.length; i++) {
    const wd = new Date(utc(dates[i])).getUTCDay();
    if (wd !== 1 || i + 6 >= dates.length) continue;
    if (dates.slice(i, i + 7).every((x) => allClosed(byDate.get(x)))) perfectWeeks++;
  }
  const doubles = ring.filter((d) => (d.active ?? 0) >= 2 * (d.moveGoal ?? Infinity)).length;
  return { moveStreak: streak, longestMove, longestAll, perfectWeeks, doubles };
}

/* ---------- behaviours: a plain bucketed comparison ---------- */

/** fewer days than this on either side and we say so, rather than guess */
export const MIN_BUCKET = 8;

export interface Comparison {
  withMean: number | null;
  withoutMean: number | null;
  nWith: number;
  nWithout: number;
  enough: boolean;
}

export function compare(rows: { flag: boolean; value: number | null | undefined }[]): Comparison {
  const a = rows.filter((r) => r.flag && r.value != null).map((r) => r.value as number);
  const b = rows.filter((r) => !r.flag && r.value != null).map((r) => r.value as number);
  return {
    withMean: a.length ? Math.round(mean(a)) : null,
    withoutMean: b.length ? Math.round(mean(b)) : null,
    nWith: a.length,
    nWithout: b.length,
    enough: a.length >= MIN_BUCKET && b.length >= MIN_BUCKET,
  };
}
