import { HEALTH_KEY } from '../keys';
import { clear, getAll, putAll } from './db';
import type { Day, ImportResult, Me, Workout } from './types';

export { HEALTH_KEY };

/**
 * localStorage keeps only the small things: when you last imported, which
 * months have what, and your settings. The days and workouts live in
 * IndexedDB (./db) and come back from the export zip, not the JSON backup.
 */
export interface HealthSettings {
  /** your own entry beats the one in the export */
  birthYear?: number;
  sex?: 'male' | 'female';
  /** beats 220 − age */
  maxHr?: number;
  /** the base sleep need, hours */
  needH: number;
}

export interface ImportLog {
  at: number;
  file: string;
  mb: number;
  ms: number;
  records: number;
  days: number;
  workouts: number;
  /** days the store had not seen before */
  added: number;
}

/** what the coverage strip draws */
export const COVER = ['sleep', 'hrv', 'rhr', 'resp', 'spo2', 'temp', 'vo2', 'rings', 'steps', 'workouts'] as const;
export type Cover = (typeof COVER)[number];

export interface HealthMeta {
  lastImport?: number;
  history: ImportLog[];
  /** YYYY-MM → days in that month with each kind of data */
  coverage: Record<string, Partial<Record<Cover, number>>>;
  /** rows holding each kind, across everything stored */
  totals: Partial<Record<Cover, number>>;
  me: Me;
  settings: HealthSettings;
}

const blank = (): HealthMeta => ({ history: [], coverage: {}, totals: {}, me: {}, settings: { needH: 8 } });

export function loadMeta(): HealthMeta {
  try {
    const parsed = JSON.parse(localStorage.getItem(HEALTH_KEY) ?? 'null') as Partial<HealthMeta> | null;
    const b = blank();
    return { ...b, ...(parsed ?? {}), settings: { ...b.settings, ...(parsed?.settings ?? {}) } };
  } catch {
    return blank();
  }
}

const saveMeta = (meta: HealthMeta): void => localStorage.setItem(HEALTH_KEY, JSON.stringify(meta));

export function setHealthSettings(patch: Partial<HealthSettings>): HealthSettings {
  const meta = loadMeta();
  meta.settings = { ...meta.settings, ...patch };
  for (const k of Object.keys(meta.settings) as (keyof HealthSettings)[])
    if (meta.settings[k] === undefined) delete meta.settings[k];
  saveMeta(meta);
  return meta.settings;
}

/** your age today, from your own entry or the export; 30 when neither says */
export function ageOf(meta: HealthMeta, on = new Date()): { age: number; known: boolean } {
  const year = meta.settings.birthYear ?? (meta.me.birth ? Number(meta.me.birth.slice(0, 4)) : undefined);
  if (!year) return { age: 30, known: false };
  let age = on.getFullYear() - year;
  if (!meta.settings.birthYear && meta.me.birth) {
    const md = meta.me.birth.slice(5);
    const today = `${String(on.getMonth() + 1).padStart(2, '0')}-${String(on.getDate()).padStart(2, '0')}`;
    if (today < md) age--;
  }
  return { age, known: true };
}

export const sexOf = (meta: HealthMeta): 'male' | 'female' => meta.settings.sex ?? meta.me.sex ?? 'male';

export const maxHrOf = (meta: HealthMeta): number => meta.settings.maxHr ?? 220 - ageOf(meta).age;

/* ---------- the data ---------- */

export interface HealthData {
  days: Day[];
  workouts: Workout[];
  byDate: Map<string, Day>;
}

let cache: Promise<HealthData> | null = null;

/** everything stored, read once and kept until the next import or delete */
export function loadHealth(): Promise<HealthData> {
  cache ??= Promise.all([getAll('days'), getAll('workouts')]).then(([days, workouts]) => {
    days.sort((a, b) => a.date.localeCompare(b.date));
    workouts.sort((a, b) => a.start - b.start);
    return { days, workouts, byDate: new Map(days.map((d) => [d.date, d])) };
  });
  return cache;
}

const has = (d: Day, c: Cover): boolean =>
  c === 'sleep'
    ? !!d.asleep
    : c === 'rings'
      ? d.active !== undefined
      : c === 'workouts'
        ? false
        : (d as unknown as Record<string, unknown>)[c] !== undefined;

export function coverage(days: Day[], workouts: Workout[]): Pick<HealthMeta, 'coverage' | 'totals'> {
  const out: HealthMeta['coverage'] = {};
  const totals: HealthMeta['totals'] = {};
  for (const d of days) {
    const m = (out[d.date.slice(0, 7)] ??= {});
    for (const c of COVER)
      if (has(d, c)) {
        m[c] = (m[c] ?? 0) + 1;
        totals[c] = (totals[c] ?? 0) + 1;
      }
  }
  const workoutDays = new Set(workouts.map((w) => w.date));
  for (const date of workoutDays) {
    const m = (out[date.slice(0, 7)] ??= {});
    m.workouts = (m.workouts ?? 0) + 1;
  }
  totals.workouts = workouts.length;
  return { coverage: out, totals };
}

/**
 * Tops up what is stored: a day already here takes the newer values and
 * keeps any it had that the new file lacks; a workout is replaced by its
 * start time. The same file twice changes nothing.
 */
export async function mergeImport(result: ImportResult, file: { name: string; size: number }): Promise<ImportLog> {
  const old = new Map((await getAll('days')).map((d) => [d.date, d]));
  let added = 0;
  const merged = result.days.map((d) => {
    const before = old.get(d.date);
    if (!before) added++;
    return before ? { ...before, ...d } : d;
  });
  await putAll('days', merged);
  await putAll('workouts', result.workouts);
  cache = null;
  const all = await loadHealth();

  const meta = loadMeta();
  const log: ImportLog = {
    at: Date.now(),
    file: file.name,
    mb: Math.round((file.size / 1048576) * 10) / 10,
    ms: result.ms,
    records: result.records,
    days: result.days.length,
    workouts: result.workouts.length,
    added,
  };
  Object.assign(meta, coverage(all.days, all.workouts));
  meta.lastImport = log.at;
  meta.history = [log, ...meta.history].slice(0, 20);
  if (result.me.birth || result.me.sex) meta.me = { ...meta.me, ...result.me };
  saveMeta(meta);
  return log;
}

/** every day and workout gone, and the import history with them; your settings stay */
export async function deleteAllHealth(): Promise<void> {
  await clear('days');
  await clear('workouts');
  cache = null;
  const meta = loadMeta();
  saveMeta({ ...blank(), settings: meta.settings });
}
