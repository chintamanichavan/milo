import { LIFT_KEY, WEEK_KEY } from '../keys';
import { load as loadRun, save as saveRun } from '../run/store';
import { dayKey } from '../ui/time';
import { DEFAULT_PLAN, mondayOf, runDays, score, weekday, weekDates, type Kind, type System } from './model';

export interface Review {
  slipped: string;
  fix: string;
}

export interface WeekSettings {
  workoutAt: string;
  studyWeekday: string;
  studyWeekend: string;
}

export interface WeekState {
  /** Mon … Sun */
  plan: Kind[];
  /** boxes ticked by hand, by day */
  ticks: Record<string, System[]>;
  /** what each study block was about */
  topics: Record<string, string>;
  /** Sunday reviews, keyed by that week's Monday */
  reviews: Record<string, Review>;
  settings: WeekSettings;
}

const blank = (): WeekState => ({
  plan: [...DEFAULT_PLAN],
  ticks: {},
  topics: {},
  reviews: {},
  settings: { workoutAt: '07:30', studyWeekday: '20:00–21:30', studyWeekend: '10:00–11:00' },
});

export function loadWeek(): WeekState {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEEK_KEY) ?? 'null') as Partial<WeekState> | null;
    if (!parsed) return blank();
    const b = blank();
    return {
      plan: parsed.plan?.length === 7 ? parsed.plan : b.plan,
      ticks: parsed.ticks ?? {},
      topics: parsed.topics ?? {},
      reviews: parsed.reviews ?? {},
      settings: { ...b.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return blank();
  }
}

export function saveWeek(state: WeekState): void {
  localStorage.setItem(WEEK_KEY, JSON.stringify(state));
}

/** Days with a run or a lift logged in Milo, and which. Read raw so the lift chunk stays unloaded. */
export function logged(): Map<string, 'run' | 'lift'> {
  const out = new Map<string, 'run' | 'lift'>();
  for (const r of loadRun().completedRuns) out.set(dayKey(r.date), 'run');
  try {
    const lift = JSON.parse(localStorage.getItem(LIFT_KEY) ?? 'null') as { sessions?: { date: string }[] } | null;
    for (const s of lift?.sessions ?? []) if (!out.has(dayKey(s.date))) out.set(dayKey(s.date), 'lift');
  } catch {
    /* a broken lift store never breaks the week */
  }
  return out;
}

export function isTicked(state: WeekState, logs: Map<string, unknown>, day: string, system: System): boolean {
  return (system === 'workout' && logs.has(day)) || (state.ticks[day]?.includes(system) ?? false);
}

/** Only this week, up to today: a missed day is skipped, never doubled up. */
export function canTick(day: Date, today: Date): boolean {
  return day <= today && mondayOf(day).getTime() === mondayOf(today).getTime();
}

export function toggle(state: WeekState, day: string, system: System): void {
  const list = state.ticks[day] ?? [];
  state.ticks[day] = list.includes(system) ? list.filter((s) => s !== system) : [...list, system];
  if (!state.ticks[day].length) delete state.ticks[day];
  saveWeek(state);
}

/** The week decides the run days; Run's reminder follows. */
export function setPlan(state: WeekState, day: number, kind: Kind): void {
  state.plan[day] = kind;
  saveWeek(state);
  const days = runDays(state.plan);
  if (!days.length) return;
  const run = loadRun();
  run.settings.reminder.days = days;
  saveRun(run);
}

export function weekScore(state: WeekState, logs: Map<string, unknown>, d: Date): number {
  const dates = weekDates(d).map((x) => dayKey(x));
  return score((system, i) => isTicked(state, logs, dates[i], system));
}

export const planFor = (state: WeekState, d: Date): Kind => state.plan[weekday(d)];
