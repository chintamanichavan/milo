/**
 * What HEALTH keeps from an Apple Health export: one row a day and one per
 * workout. Raw samples never land here, except a workout's heart rate,
 * squeezed to at most 240 points.
 */
export interface Day {
  /** local date, YYYY-MM-DD */
  date: string;
  /** the night that ended this morning, in minutes */
  inBed?: number;
  asleep?: number;
  core?: number;
  deep?: number;
  rem?: number;
  awake?: number;
  /** lights out and up, minutes from this day's midnight (bed is usually negative) */
  bed?: number;
  wake?: number;
  /** heart rate variability, SDNN ms, the day's mean */
  hrv?: number;
  rhr?: number;
  /** breaths a minute */
  resp?: number;
  /** blood oxygen, percent */
  spo2?: number;
  /** sleeping wrist temperature, °C (the deviation is worked out against your own baseline) */
  temp?: number;
  vo2?: number;
  /** kcal */
  active?: number;
  basal?: number;
  exMin?: number;
  stand?: number;
  steps?: number;
  distKm?: number;
  walkHr?: number;
  /** walking speed, km/h */
  walkSpeed?: number;
  flights?: number;
  /** the ring goals Apple had that day */
  moveGoal?: number;
  exGoal?: number;
  standGoal?: number;
}

export interface Split {
  /** which kilometre (or mile), 1-based; the last one may be part of one */
  n: number;
  /** how much of a whole unit this split is: 1, or less for the last */
  len: number;
  sec: number;
  hr?: number;
}

export interface Workout {
  /** the start, epoch ms, as a string: the same workout always has the same id */
  id: string;
  /** Running, Walking, TraditionalStrengthTraining … */
  type: string;
  start: number;
  date: string;
  durMin: number;
  distKm?: number;
  kcal?: number;
  avgHr?: number;
  maxHr?: number;
  /** [seconds from start, bpm], at most 240 points */
  hr?: [number, number][];
  elevM?: number;
  /** kilometre splits, and mile splits */
  splits?: Split[];
  splitsMi?: Split[];
  source?: string;
}

/** a metric name the progress list and the coverage strip use */
export type Metric =
  | 'sleep'
  | 'hrv'
  | 'rhr'
  | 'resp'
  | 'spo2'
  | 'temp'
  | 'vo2'
  | 'active'
  | 'basal'
  | 'exMin'
  | 'stand'
  | 'steps'
  | 'distKm'
  | 'walkHr'
  | 'walkSpeed'
  | 'flights'
  | 'heartRate'
  | 'workouts';

export interface Me {
  birth?: string;
  sex?: 'male' | 'female';
}

/** what the worker hands back */
export interface ImportResult {
  days: Day[];
  workouts: Workout[];
  counts: Record<string, number>;
  records: number;
  me: Me;
  ms: number;
}

/** what the worker says while it works */
export interface Progress {
  /** bytes of the file read so far, and how many there are */
  read: number;
  total: number;
  /** bytes of XML scanned */
  xml: number;
  records: number;
  counts: Record<string, number>;
  phase: 'reading' | 'sorting';
}
