import type { Day, ImportResult, Me, Split, Workout } from '../types';

/**
 * The export, read as it streams past. Two small parts: a scanner that cuts
 * text into tags without ever holding more than one unfinished tag, and a
 * collector that turns the tags it cares about into daily sums and workouts.
 * No DOM, no whole file in memory. No runtime imports, so node can test it.
 */

/** cuts XML text, arriving in any size of piece, into tag bodies (what sits between < and >) */
export class TagScanner {
  carry = '';
  onTag: (body: string) => void;

  constructor(onTag: (body: string) => void) {
    this.onTag = onTag;
  }

  feed(text: string): void {
    const buf = this.carry ? this.carry + text : text;
    let pos = 0;
    for (;;) {
      const i = buf.indexOf('<', pos);
      if (i < 0) {
        pos = buf.length;
        break;
      }
      let j = buf.indexOf('>', i + 1);
      if (j < 0) {
        pos = i;
        break;
      }
      const c = buf.charCodeAt(i + 1);
      // a '>' inside a quoted value does not end the tag (declarations and <? ?> are left alone)
      if (c !== 33 && c !== 63) while (j >= 0 && oddQuotes(buf, i, j)) j = buf.indexOf('>', j + 1);
      if (j < 0) {
        pos = i;
        break;
      }
      this.onTag(buf.slice(i + 1, j));
      pos = j + 1;
    }
    this.carry = buf.slice(pos);
  }
}

function oddQuotes(s: string, from: number, to: number): boolean {
  let n = 0;
  for (let k = from; k < to; k++) if (s.charCodeAt(k) === 34) n++;
  return (n & 1) === 1;
}

/** one attribute's raw value, or undefined */
export function attr(body: string, name: string): string | undefined {
  const k = body.indexOf(` ${name}="`);
  if (k < 0) return undefined;
  const s = k + name.length + 3;
  return body.slice(s, body.indexOf('"', s));
}

const unescape = (s: string): string =>
  s.indexOf('&') < 0
    ? s
    : s
        .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

/* ---------- dates: "2026-09-01 07:12:33 -0500" ---------- */

const midnights = new Map<string, number>();

/** seconds since the epoch */
export function epoch(s: string): number {
  const key = s.slice(0, 10) + s.slice(19);
  let base = midnights.get(key);
  if (base === undefined) {
    const off = s.slice(20).trim();
    const sign = off[0] === '-' ? -1 : 1;
    const offSec = off ? (Number(off.slice(1, 3)) * 3600 + Number(off.slice(3, 5)) * 60) * sign : 0;
    base = Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) / 1000 - offSec;
    midnights.set(key, base);
  }
  return base + Number(s.slice(11, 13)) * 3600 + Number(s.slice(14, 16)) * 60 + Number(s.slice(17, 19));
}

/** minutes past local midnight */
const clockMin = (s: string): number => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));

const utcDay = (d: string): number => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

export const shiftDate = (d: string, by: number): string =>
  new Date(utcDay(d) + by * 86_400_000).toISOString().slice(0, 10);

const daysBetween = (a: string, b: string): number => Math.round((utcDay(b) - utcDay(a)) / 86_400_000);

/* ---------- units ---------- */

const KM: Record<string, number> = { km: 1, mi: 1.609344, m: 0.001, ft: 0.0003048, yd: 0.0009144, cm: 0.00001 };
const KCAL: Record<string, number> = { kcal: 1, Cal: 1, cal: 0.001, kJ: 1 / 4.184, J: 1 / 4184 };
const KMH: Record<string, number> = { 'km/hr': 1, 'mi/hr': 1.609344, 'm/s': 3.6 };

const toKm = (v: number, unit = 'km'): number => v * (KM[unit] ?? 1);
const toKcal = (v: number, unit = 'kcal'): number => v * (KCAL[unit] ?? 1);

/* ---------- what is kept, and how ---------- */

type Cum = 'steps' | 'distKm' | 'active' | 'basal' | 'flights' | 'exMin';
type Mean = 'hrv' | 'rhr' | 'resp' | 'spo2' | 'temp' | 'vo2' | 'walkHr' | 'walkSpeed';
type Kind = Cum | Mean | 'heartRate' | 'sleep' | 'stand' | 'cycle';

const HK = 'HKQuantityTypeIdentifier';
export const KINDS: Record<string, Kind> = {
  [`${HK}StepCount`]: 'steps',
  [`${HK}DistanceWalkingRunning`]: 'distKm',
  [`${HK}DistanceCycling`]: 'cycle',
  [`${HK}ActiveEnergyBurned`]: 'active',
  [`${HK}BasalEnergyBurned`]: 'basal',
  [`${HK}FlightsClimbed`]: 'flights',
  [`${HK}AppleExerciseTime`]: 'exMin',
  [`${HK}HeartRateVariabilitySDNN`]: 'hrv',
  [`${HK}RestingHeartRate`]: 'rhr',
  [`${HK}RespiratoryRate`]: 'resp',
  [`${HK}OxygenSaturation`]: 'spo2',
  [`${HK}AppleSleepingWristTemperature`]: 'temp',
  [`${HK}VO2Max`]: 'vo2',
  [`${HK}WalkingHeartRateAverage`]: 'walkHr',
  [`${HK}WalkingSpeed`]: 'walkSpeed',
  [`${HK}HeartRate`]: 'heartRate',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep',
  HKCategoryTypeIdentifierAppleStandHour: 'stand',
};

const CUM = new Set<Kind>(['steps', 'distKm', 'active', 'basal', 'flights', 'exMin']);

/** sleep stages, as stored in an interval */
const IN_BED = 0;
const ASLEEP = 1;
const CORE = 2;
const DEEP = 3;
const REM = 4;
const AWAKE = 5;
const STAGE: Record<string, number> = {
  HKCategoryValueSleepAnalysisInBed: IN_BED,
  HKCategoryValueSleepAnalysisAsleep: ASLEEP,
  HKCategoryValueSleepAnalysisAsleepUnspecified: ASLEEP,
  HKCategoryValueSleepAnalysisAsleepCore: CORE,
  HKCategoryValueSleepAnalysisAsleepDeep: DEEP,
  HKCategoryValueSleepAnalysisAsleepREM: REM,
  HKCategoryValueSleepAnalysisAwake: AWAKE,
};

/** a typed array that grows, for samples we cannot place until the workouts arrive */
class Grow<T extends Uint32Array | Uint8Array | Float32Array> {
  a: T;
  n = 0;
  make: (size: number) => T;
  constructor(make: (size: number) => T) {
    this.make = make;
    this.a = make(1 << 14);
  }
  push(v: number): void {
    if (this.n === this.a.length) {
      const next = this.make(this.a.length * 2);
      next.set(this.a);
      this.a = next;
    }
    this.a[this.n++] = v;
  }
}

interface Open {
  w: Workout;
  end: number;
  srcName: string;
}

/** how many points a workout's heart-rate line keeps */
export const HR_POINTS = 240;

const round = (v: number, places = 1): number => {
  const f = 10 ** places;
  return Math.round(v * f) / f;
};

export class Collector {
  records = 0;
  counts: Record<string, number> = {};
  me: Me = {};
  private sources = new Map<string, number>();
  private cum = new Map<string, number>();
  private mean = new Map<string, [number, number]>();
  private standHours = new Map<string, Set<string>>();
  private summaries = new Map<string, Partial<Day>>();
  /** night date → [start min, end min, stage], minutes from that night's midnight */
  private nights = new Map<string, [number, number, number][]>();
  private hrT = new Grow((n) => new Uint32Array(n));
  private hrV = new Grow((n) => new Uint8Array(n));
  private dT = new Grow((n) => new Uint32Array(n));
  private dM = new Grow((n) => new Float32Array(n));
  private dS = new Grow((n) => new Uint8Array(n));
  private workouts: Open[] = [];
  private open: Open | null = null;

  private src(name: string | undefined): number {
    const key = name ?? '';
    let id = this.sources.get(key);
    if (id === undefined) {
      id = this.sources.size;
      this.sources.set(key, id);
    }
    return id;
  }

  private bump(kind: string): void {
    this.counts[kind] = (this.counts[kind] ?? 0) + 1;
  }

  tag(body: string): void {
    const c = body.charCodeAt(0);
    if (c === 82 /* R */) {
      if (body.startsWith('Record ')) this.record(body);
    } else if (c === 87 /* W */) {
      if (body.startsWith('Workout ')) this.workout(body);
      else if (body.startsWith('WorkoutStatistics ')) this.statistic(body);
    } else if (c === 77 /* M */) {
      if (body.startsWith('MetadataEntry ')) this.metadata(body);
      else if (body.startsWith('Me ')) this.person(body);
    } else if (c === 65 /* A */) {
      if (body.startsWith('ActivitySummary ')) this.summary(body);
    } else if (c === 47 /* / */) {
      if (body.startsWith('/Workout') && body.length === 8) this.closeWorkout();
    }
  }

  private person(body: string): void {
    const birth = attr(body, 'HKCharacteristicTypeIdentifierDateOfBirth');
    const sex = attr(body, 'HKCharacteristicTypeIdentifierBiologicalSex');
    if (birth) this.me.birth = birth;
    if (sex === 'HKBiologicalSexMale') this.me.sex = 'male';
    else if (sex === 'HKBiologicalSexFemale') this.me.sex = 'female';
  }

  private record(body: string): void {
    this.records++;
    const type = attr(body, 'type');
    const kind = type ? KINDS[type] : undefined;
    if (!kind) return;
    const start = attr(body, 'startDate');
    const raw = attr(body, 'value');
    if (!start || raw === undefined) return;
    this.bump(kind);
    const date = start.slice(0, 10);

    if (kind === 'sleep') return this.sleep(start, attr(body, 'endDate') ?? start, raw);
    if (kind === 'stand') {
      if (!raw.endsWith('Stood')) return;
      let set = this.standHours.get(date);
      if (!set) this.standHours.set(date, (set = new Set()));
      set.add(start.slice(11, 13));
      return;
    }

    let v = Number(raw);
    if (!Number.isFinite(v)) return;
    const unit = attr(body, 'unit');

    if (kind === 'heartRate') {
      this.hrT.push(epoch(start));
      this.hrV.push(Math.min(255, Math.round(v)));
      return;
    }
    if (kind === 'distKm' || kind === 'cycle') {
      const km = toKm(v, unit);
      this.dT.push(epoch(attr(body, 'endDate') ?? start));
      this.dM.push(km * 1000);
      this.dS.push(Math.min(255, this.src(attr(body, 'sourceName'))));
      if (kind === 'cycle') return;
      v = km;
    }
    if (CUM.has(kind)) {
      if (kind === 'active' || kind === 'basal') v = toKcal(v, unit);
      const key = `${kind}|${date}|${this.src(attr(body, 'sourceName'))}`;
      this.cum.set(key, (this.cum.get(key) ?? 0) + v);
      return;
    }
    if (kind === 'spo2' && v <= 1.5) v *= 100;
    if (kind === 'temp' && unit === 'degF') v = ((v - 32) * 5) / 9;
    if (kind === 'walkSpeed') v *= KMH[unit ?? 'km/hr'] ?? 1;
    // a wrist temperature is taken overnight and belongs to the morning, as sleep does
    const key = `${kind}|${kind === 'temp' && Number(start.slice(11, 13)) >= 18 ? shiftDate(date, 1) : date}`;
    const m = this.mean.get(key);
    if (m) {
      m[0] += v;
      m[1]++;
    } else this.mean.set(key, [v, 1]);
  }

  /** a night belongs to the morning it ends on: anything starting from 6 PM counts toward the next day */
  private sleep(start: string, end: string, value: string): void {
    const stage = STAGE[value];
    if (stage === undefined) return;
    const startDay = start.slice(0, 10);
    const night = Number(start.slice(11, 13)) >= 18 ? shiftDate(startDay, 1) : startDay;
    const from = clockMin(start) + daysBetween(night, startDay) * 1440;
    const to = clockMin(end) + daysBetween(night, end.slice(0, 10)) * 1440;
    if (to <= from) return;
    let list = this.nights.get(night);
    if (!list) this.nights.set(night, (list = []));
    list.push([from, to, stage]);
  }

  private summary(body: string): void {
    const date = attr(body, 'dateComponents');
    if (!date) return;
    const n = (name: string): number => Number(attr(body, name) ?? 0) || 0;
    const moveGoal = n('activeEnergyBurnedGoal');
    const active = n('activeEnergyBurned');
    // days before a watch come through as all zeros, which says nothing
    if (!moveGoal && !active) return;
    this.bump('rings');
    this.summaries.set(date, {
      active: toKcal(active, attr(body, 'activeEnergyBurnedUnit')),
      moveGoal: toKcal(moveGoal, attr(body, 'activeEnergyBurnedUnit')),
      exMin: n('appleExerciseTime'),
      exGoal: n('appleExerciseTimeGoal') || undefined,
      stand: n('appleStandHours'),
      standGoal: n('appleStandHoursGoal') || undefined,
    });
  }

  private workout(body: string): void {
    const start = attr(body, 'startDate');
    const end = attr(body, 'endDate');
    if (!start || !end) return;
    this.bump('workouts');
    const startSec = epoch(start);
    const endSec = epoch(end);
    const durUnit = attr(body, 'durationUnit');
    const dur = Number(attr(body, 'duration') ?? 0);
    const durMin = dur ? (durUnit === 's' ? dur / 60 : durUnit === 'hr' ? dur * 60 : dur) : (endSec - startSec) / 60;
    const w: Workout = {
      id: String(startSec * 1000),
      type: (attr(body, 'workoutActivityType') ?? 'Other').replace('HKWorkoutActivityType', ''),
      start: startSec * 1000,
      date: start.slice(0, 10),
      durMin: round(durMin, 1),
    };
    const dist = Number(attr(body, 'totalDistance') ?? 0);
    if (dist) w.distKm = toKm(dist, attr(body, 'totalDistanceUnit'));
    const kcal = Number(attr(body, 'totalEnergyBurned') ?? 0);
    if (kcal) w.kcal = toKcal(kcal, attr(body, 'totalEnergyBurnedUnit'));
    const srcName = unescape(attr(body, 'sourceName') ?? '');
    if (srcName) w.source = srcName;
    const open: Open = { w, end: endSec, srcName };
    this.workouts.push(open);
    this.open = body.endsWith('/') ? null : open;
  }

  private statistic(body: string): void {
    const w = this.open?.w;
    if (!w) return;
    const type = attr(body, 'type') ?? '';
    const unit = attr(body, 'unit');
    const sum = Number(attr(body, 'sum') ?? 0);
    if (type.endsWith('ActiveEnergyBurned') && sum && !w.kcal) w.kcal = toKcal(sum, unit);
    else if (type.includes('Distance') && sum && !w.distKm) w.distKm = toKm(sum, unit);
    else if (type.endsWith('HeartRate')) {
      const avg = Number(attr(body, 'average') ?? 0);
      const max = Number(attr(body, 'maximum') ?? 0);
      if (avg) w.avgHr = Math.round(avg);
      if (max) w.maxHr = Math.round(max);
    }
  }

  private metadata(body: string): void {
    const w = this.open?.w;
    if (!w || attr(body, 'key') !== 'HKElevationAscended') return;
    const [num, unit] = (attr(body, 'value') ?? '').split(' ');
    const v = Number(num);
    if (v) w.elevM = round(unit === 'cm' ? v / 100 : unit === 'ft' ? v * 0.3048 : v, 0);
  }

  private closeWorkout(): void {
    this.open = null;
  }

  /** everything gathered, as days and workouts */
  finish(): Omit<ImportResult, 'ms'> {
    const days = new Map<string, Day>();
    const day = (date: string): Day => {
      let d = days.get(date);
      if (!d) days.set(date, (d = { date }));
      return d;
    };

    // two devices count the same steps; the one that saw the most wins, as Health itself roughly does
    const best = new Map<string, number>();
    for (const [key, v] of this.cum) {
      const cut = key.lastIndexOf('|');
      const k = key.slice(0, cut);
      best.set(k, Math.max(best.get(k) ?? 0, v));
    }
    for (const [key, v] of best) {
      const [kind, date] = key.split('|') as [Cum, string];
      day(date)[kind] = kind === 'distKm' ? round(v, 2) : Math.round(v);
    }
    for (const [key, [sum, n]] of this.mean) {
      const [kind, date] = key.split('|') as [Mean, string];
      day(date)[kind] = round(sum / n, kind === 'temp' || kind === 'walkSpeed' ? 2 : 1);
    }
    for (const [date, set] of this.standHours) day(date).stand = set.size;
    for (const [date, s] of this.summaries) {
      const d = day(date);
      for (const [k, v] of Object.entries(s)) if (v !== undefined) (d as unknown as Record<string, number>)[k] = Math.round(v as number);
    }
    for (const [date, list] of this.nights) {
      const n = nightOf(list);
      if (n) Object.assign(day(date), n);
    }

    const workouts = this.placeSamples();
    for (const w of workouts) if (w.distKm) w.distKm = round(w.distKm, 2);
    for (const w of workouts) if (w.kcal) w.kcal = Math.round(w.kcal);

    return {
      days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      workouts,
      counts: this.counts,
      records: this.records,
      me: this.me,
    };
  }

  /** heart rate and distance samples, sorted into the workouts they fall in */
  private placeSamples(): Workout[] {
    const seen = new Set<string>();
    const list = this.workouts
      .sort((a, b) => a.w.start - b.w.start)
      .filter((o) => !seen.has(o.w.id) && !!seen.add(o.w.id));
    const starts = list.map((o) => o.w.start / 1000);
    const find = (t: number): number => {
      let lo = 0;
      let hi = starts.length - 1;
      let at = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (starts[mid] <= t) {
          at = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      return at >= 0 && t <= list[at].end ? at : -1;
    };

    const hr: number[][] = list.map(() => []);
    for (let i = 0; i < this.hrT.n; i++) {
      const at = find(this.hrT.a[i]);
      if (at >= 0) hr[at].push(this.hrT.a[i], this.hrV.a[i]);
    }
    const dist: number[][] = list.map(() => []);
    for (let i = 0; i < this.dT.n; i++) {
      const at = find(this.dT.a[i]);
      if (at >= 0) dist[at].push(this.dT.a[i], this.dM.a[i], this.dS.a[i]);
    }

    return list.map((o, i) => {
      const w = o.w;
      const startSec = w.start / 1000;
      const pairs: [number, number][] = [];
      for (let k = 0; k < hr[i].length; k += 2) pairs.push([hr[i][k] - startSec, hr[i][k + 1]]);
      pairs.sort((a, b) => a[0] - b[0]);
      if (pairs.length) {
        if (!w.avgHr) w.avgHr = Math.round(pairs.reduce((s, p) => s + p[1], 0) / pairs.length);
        if (!w.maxHr) w.maxHr = Math.max(...pairs.map((p) => p[1]));
        w.hr = downsample(pairs, o.end - startSec);
      }
      const splits = splitsOf(dist[i], startSec, this.sources.get(o.srcName), pairs, 1000);
      if (splits.length) {
        w.splits = splits;
        w.splitsMi = splitsOf(dist[i], startSec, this.sources.get(o.srcName), pairs, 1609.344);
        if (!w.distKm) w.distKm = splits.reduce((s, x) => s + x.len, 0);
      }
      return w;
    });
  }
}

/** a night's intervals from every source, folded into one night without counting anything twice */
export function nightOf(list: [number, number, number][]): Partial<Day> | null {
  // naps and the main sleep: keep the longest cluster (gaps over two hours split them)
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const clusters: [number, number, number][][] = [];
  let end = -Infinity;
  for (const iv of sorted) {
    if (iv[0] - end > 120 || !clusters.length) clusters.push([]);
    clusters[clusters.length - 1].push(iv);
    end = Math.max(end, iv[1]);
  }
  const asleepOf = (c: [number, number, number][]): number =>
    union(c.filter((x) => x[2] >= ASLEEP && x[2] <= REM));
  const main = clusters.reduce((a, b) => (asleepOf(b) > asleepOf(a) ? b : a));
  const of = (stage: number): number => union(main.filter((x) => x[2] === stage));
  const core = of(CORE);
  const deep = of(DEEP);
  const rem = of(REM);
  const staged = core + deep + rem;
  const asleep = staged ? union(main.filter((x) => x[2] >= CORE && x[2] <= REM)) : of(ASLEEP);
  if (!asleep) return null;
  const awake = of(AWAKE);
  const inBed = Math.max(of(IN_BED), union(main.filter((x) => x[2] !== IN_BED)));
  const sleeping = main.filter((x) => x[2] !== IN_BED && x[2] !== AWAKE);
  const out: Partial<Day> = {
    asleep: Math.round(asleep),
    inBed: Math.round(inBed),
    bed: Math.min(...main.map((x) => x[0])),
    wake: Math.max(...sleeping.map((x) => x[1])),
  };
  if (staged) Object.assign(out, { core: Math.round(core), deep: Math.round(deep), rem: Math.round(rem) });
  if (awake || staged) out.awake = Math.round(awake);
  return out;
}

/** total length covered by a set of intervals, overlaps counted once */
export function union(list: [number, number, number][]): number {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [from, to] = s[0];
  for (const [a, b] of s.slice(1)) {
    if (a > to) {
      total += to - from;
      from = a;
      to = b;
    } else to = Math.max(to, b);
  }
  return total + to - from;
}

/** at most HR_POINTS points: the mean of each equal slice of time */
export function downsample(pairs: [number, number][], span: number): [number, number][] {
  if (pairs.length <= HR_POINTS) return pairs.map(([t, v]) => [Math.round(t), v]);
  const width = Math.max(span, pairs[pairs.length - 1][0] + 1) / HR_POINTS;
  const sum = new Float64Array(HR_POINTS);
  const tsum = new Float64Array(HR_POINTS);
  const n = new Uint32Array(HR_POINTS);
  for (const [t, v] of pairs) {
    const b = Math.min(HR_POINTS - 1, Math.max(0, Math.floor(t / width)));
    sum[b] += v;
    tsum[b] += t;
    n[b]++;
  }
  const out: [number, number][] = [];
  for (let b = 0; b < HR_POINTS; b++) if (n[b]) out.push([Math.round(tsum[b] / n[b]), Math.round(sum[b] / n[b])]);
  return out;
}

/** splits of `unit` metres from distance samples [end sec, metres, source]…, one source only */
function splitsOf(flat: number[], startSec: number, preferred: number | undefined, hr: [number, number][], unit: number): Split[] {
  if (flat.length < 6) return [];
  const bySource = new Map<number, number>();
  for (let k = 0; k < flat.length; k += 3) bySource.set(flat[k + 2], (bySource.get(flat[k + 2]) ?? 0) + flat[k + 1]);
  const src =
    preferred !== undefined && bySource.has(preferred)
      ? preferred
      : [...bySource.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const pts: [number, number][] = [];
  for (let k = 0; k < flat.length; k += 3) if (flat[k + 2] === src) pts.push([flat[k] - startSec, flat[k + 1]]);
  pts.sort((a, b) => a[0] - b[0]);
  const total = pts.reduce((s, p) => s + p[1], 0);
  if (total < 500) return [];

  const hrBetween = (a: number, b: number): number | undefined => {
    const inside = hr.filter((p) => p[0] >= a && p[0] < b);
    return inside.length ? Math.round(inside.reduce((s, p) => s + p[1], 0) / inside.length) : undefined;
  };
  const out: Split[] = [];
  let cum = 0;
  let prevT = 0;
  let mark = 0;
  for (const [t, m0] of pts) {
    // this sample covers (from, t]; a kilometre mark inside it is placed in proportion
    let m = m0;
    let from = prevT;
    while (m > 0 && cum + m >= (out.length + 1) * unit) {
      const need = (out.length + 1) * unit - cum;
      const at = from + ((t - from) * need) / m;
      out.push({ n: out.length + 1, len: 1, sec: Math.round(at - mark), hr: hrBetween(mark, at) });
      mark = at;
      cum += need;
      m -= need;
      from = at;
    }
    cum += m;
    prevT = t;
  }
  const left = (cum - out.length * unit) / unit;
  if (left >= 0.1) out.push({ n: out.length + 1, len: round(left, 2), sec: Math.round(prevT - mark), hr: hrBetween(mark, prevT) });
  return out;
}
