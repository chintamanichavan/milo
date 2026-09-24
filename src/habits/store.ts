import { dayKey } from '../ui/time';
import type { Entry, Habit, HabitState, Mark, Reflection, Schedule } from './model';

export { HABITS_KEY } from '../keys';
import { HABITS_KEY } from '../keys';

const blank = (): HabitState => ({
  habits: [],
  entries: [],
  reflections: [],
  readLessons: [],
});

export function loadHabits(): HabitState {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return blank();
    return { ...blank(), ...(JSON.parse(raw) as Partial<HabitState>) };
  } catch {
    return blank();
  }
}

export function saveHabits(state: HabitState): void {
  localStorage.setItem(HABITS_KEY, JSON.stringify(state));
}

export function saveHabit(habit: Habit): void {
  const state = loadHabits();
  const at = state.habits.findIndex((h) => h.id === habit.id);
  if (at >= 0) state.habits[at] = habit;
  else state.habits.push({ ...habit, order: state.habits.length });
  saveHabits(state);
}

export function deleteHabit(id: string): void {
  const state = loadHabits();
  state.habits = state.habits.filter((h) => h.id !== id);
  state.entries = state.entries.filter((e) => e.habitId !== id);
  saveHabits(state);
}

export function moveHabit(id: string, by: number): void {
  const state = loadHabits();
  const list = [...state.habits].sort((a, b) => a.order - b.order);
  const at = list.findIndex((h) => h.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return;
  const [item] = list.splice(at, 1);
  list.splice(to, 0, item);
  list.forEach((h, i) => (h.order = i));
  state.habits = list;
  saveHabits(state);
}

export function mark(habitId: string, markAs: Mark, date = dayKey(), extra: Partial<Entry> = {}): void {
  const state = loadHabits();
  state.entries = state.entries.filter((e) => !(e.habitId === habitId && e.date === date));
  state.entries.push({ habitId, date, mark: markAs, ...extra });
  saveHabits(state);
}

export function unmark(habitId: string, date = dayKey()): void {
  const state = loadHabits();
  state.entries = state.entries.filter((e) => !(e.habitId === habitId && e.date === date));
  saveHabits(state);
}

export const targetOf = (habit: Habit): number => Math.max(1, Math.round(habit.target ?? 1));

/** one more (or one fewer) towards a numeric goal; done once it is reached */
export function bump(habitId: string, by = 1, date = dayKey()): { count: number; target: number } {
  const state = loadHabits();
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return { count: 0, target: 1 };
  const target = targetOf(habit);
  const entry = entryFor(state, habitId, date);
  const had = entry?.count ?? (entry?.mark === 'done' ? target : 0);
  const count = Math.max(0, had + by);
  state.entries = state.entries.filter((e) => !(e.habitId === habitId && e.date === date));
  if (count > 0) state.entries.push({ habitId, date, mark: count >= target ? 'done' : 'partial', count });
  saveHabits(state);
  return { count, target };
}

const PENDING_KEY = 'c25k.habits.pending';

/** a habit waiting on a Focus flight to land */
export function awaitFocus(habitId: string): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ habitId, at: Date.now() }));
}

/** called when a flight lands: the habit it was for is done */
export function claimFocus(): Habit | null {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as { habitId: string; at: number } | null;
    localStorage.removeItem(PENDING_KEY);
    if (!pending || Date.now() - pending.at > 8 * 3600_000) return null;
    const habit = loadHabits().habits.find((h) => h.id === pending.habitId);
    if (!habit) return null;
    bump(habit.id, targetOf(habit));
    return habit;
  } catch {
    return null;
  }
}

export const entryFor = (state: HabitState, habitId: string, date = dayKey()): Entry | undefined =>
  state.entries.find((e) => e.habitId === habitId && e.date === date);

const shift = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export function dueOn(habit: Habit, date: Date): boolean {
  if (habit.archived) return false;
  const key = dayKey(date);
  if (habit.paused && key >= habit.paused.from && key <= habit.paused.to) return false;
  const s: Schedule = habit.schedule;
  if (s.kind === 'daily') return true;
  if (s.kind === 'days') return s.days.includes(date.getDay());
  return true;
}

const counts = (mark?: Mark): boolean => mark === 'done' || mark === 'tiny';

/** current streak, one missed day forgiven, skips never break it */
export function streak(state: HabitState, habit: Habit): number {
  let run = 0;
  let forgiven = false;
  for (let i = 0; i < 400; i++) {
    const date = shift(-i);
    if (!dueOn(habit, date)) continue;
    const entry = entryFor(state, habit.id, dayKey(date));
    if (counts(entry?.mark) || entry?.mark === 'skip') run += entry?.mark === 'skip' ? 0 : 1;
    else if (i === 0) continue;
    else if (!forgiven) forgiven = true;
    else break;
  }
  return run;
}

export function bestStreak(state: HabitState, habit: Habit): number {
  const days = state.entries
    .filter((e) => e.habitId === habit.id && counts(e.mark))
    .map((e) => e.date)
    .sort();
  let best = 0;
  let run = 0;
  let previous = '';
  for (const day of days) {
    const gap = previous ? (new Date(day).getTime() - new Date(previous).getTime()) / 86_400_000 : 1;
    run = gap <= 1.5 ? run + 1 : 1;
    previous = day;
    best = Math.max(best, run);
  }
  return best;
}

export function votes(state: HabitState, habitId: string): number {
  return state.entries.filter((e) => e.habitId === habitId && counts(e.mark)).length;
}

export function votesForIdentity(state: HabitState, identity: string, sinceDays = 30): number {
  const ids = state.habits.filter((h) => h.identity === identity).map((h) => h.id);
  const since = dayKey(shift(-sinceDays));
  return state.entries.filter((e) => ids.includes(e.habitId) && counts(e.mark) && e.date >= since)
    .length;
}

export function consistency(state: HabitState, habit: Habit, days = 30): number {
  let due = 0;
  let hit = 0;
  for (let i = 0; i < days; i++) {
    const date = shift(-i);
    if (!dueOn(habit, date)) continue;
    due++;
    if (counts(entryFor(state, habit.id, dayKey(date))?.mark)) hit++;
  }
  return due ? Math.round((hit / due) * 100) : 0;
}

/** the day a habit was created, from its id */
const bornOn = (habit: Habit): number => {
  const stamp = Number(habit.id.split('-')[1]);
  return Number.isFinite(stamp) ? stamp : 0;
};

/** missed yesterday? two days? the copy changes, never the colour */
export function missState(state: HabitState, habit: Habit): 0 | 1 | 2 {
  let missed = 0;
  for (let i = 1; i <= 6 && missed < 2; i++) {
    const date = shift(-i);
    // a habit cannot have missed a day that came before it
    if (date.getTime() < bornOn(habit)) break;
    if (!dueOn(habit, date)) continue;
    const entry = entryFor(state, habit.id, dayKey(date));
    if (counts(entry?.mark) || entry?.mark === 'skip') break;
    missed++;
  }
  return missed as 0 | 1 | 2;
}

/** clean days since the last slip, for the habits you are quitting */
export function cleanDays(state: HabitState, habit: Habit): number {
  for (let i = 0; i < 400; i++) {
    const entry = entryFor(state, habit.id, dayKey(shift(-i)));
    if (entry?.mark === 'slip') return i;
  }
  return state.entries.some((e) => e.habitId === habit.id) ? 400 : 0;
}

export function weekdayPattern(state: HabitState, habit: Habit): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  const total = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 90; i++) {
    const date = shift(-i);
    if (!dueOn(habit, date)) continue;
    total[date.getDay()]++;
    if (counts(entryFor(state, habit.id, dayKey(date))?.mark)) out[date.getDay()]++;
  }
  return out.map((n, i) => (total[i] ? Math.round((n / total[i]) * 100) : 0));
}

export function dotGrid(state: HabitState, habit: Habit, days = 90): (Mark | 'none' | 'off')[] {
  return Array.from({ length: days }, (_, i) => {
    const date = shift(-(days - 1 - i));
    if (!dueOn(habit, date)) return 'off';
    return entryFor(state, habit.id, dayKey(date))?.mark ?? 'none';
  });
}

export function saveReflection(reflection: Reflection): void {
  const state = loadHabits();
  state.reflections = state.reflections.filter((r) => r.date !== reflection.date);
  state.reflections.push(reflection);
  saveHabits(state);
}

export function readLesson(id: string): void {
  const state = loadHabits();
  if (!state.readLessons.includes(id)) state.readLessons.push(id);
  state.lessonDay = dayKey();
  saveHabits(state);
}

export const todaysHabits = (state: HabitState): Habit[] =>
  state.habits
    .filter((h) => dueOn(h, new Date()))
    .sort((a, b) => a.order - b.order);

export const identities = (state: HabitState): string[] => [
  ...new Set(state.habits.filter((h) => !h.archived).map((h) => h.identity)),
];

/** monthly summary, in one plain sentence */
export function monthSummary(state: HabitState): string {
  const since = dayKey(shift(-30));
  const kept = state.entries.filter((e) => e.date >= since && counts(e.mark)).length;
  const best = identities(state)
    .map((id) => ({ id, n: votesForIdentity(state, id) }))
    .sort((a, b) => b.n - a.n)[0];
  if (!kept) return 'Nothing logged in the last month. A single tick tomorrow starts it again.';
  return `${kept} kept days in the last month${
    best ? `, most of them votes for ${best.id}` : ''
  }.`;
}

/* ---------- the coach ---------- */

export interface Tip {
  habitId: string;
  title: string;
  why: string;
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

/**
 * Suggestions from the last two weeks, in plain words: what the misses, the
 * skips and the tiny versions say about how a habit is set up.
 */
export function coachTips(state: HabitState, max = 3): Tip[] {
  const tips: (Tip & { weight: number })[] = [];
  const live = state.habits.filter((h) => !h.archived && !h.avoid);
  const steadiest = [...live].sort((a, b) => consistency(state, b, 14) - consistency(state, a, 14))[0];
  for (const h of live) {
    const born = bornOn(h);
    let due = 0;
    let missed = 0;
    let tiny = 0;
    let done = 0;
    const missDays = [0, 0, 0, 0, 0, 0, 0];
    const reasons: Record<string, number> = {};
    for (let i = 1; i <= 14; i++) {
      const date = shift(-i);
      if (date.getTime() < born || !dueOn(h, date)) continue;
      due++;
      const entry = entryFor(state, h.id, dayKey(date));
      if (entry?.mark === 'done') done++;
      else if (entry?.mark === 'tiny') tiny++;
      else if (entry?.mark === 'skip') reasons[entry.reason ?? 'other'] = (reasons[entry.reason ?? 'other'] ?? 0) + 1;
      else {
        missed++;
        missDays[date.getDay()]++;
      }
    }
    if (due < 3) continue;
    const name = h.behaviour;
    const worst = missDays.indexOf(Math.max(...missDays));
    if (missed >= 3 && missDays[worst] >= 2)
      tips.push({ habitId: h.id, weight: 5, title: `Plan around ${WEEKDAYS[worst]}`, why: `“${name}” slips most on ${WEEKDAYS[worst]}. Move it to a different time that day, or give it a tiny version just for then.` });
    else if (missed >= 4)
      tips.push({ habitId: h.id, weight: 4, title: `Shrink “${name}”`, why: `${missed} misses in two weeks. For the next seven days, the whole habit is “${h.tiny}” — nothing more.` });
    if (missed >= 3 && h.timeOfDay === 'evening')
      tips.push({ habitId: h.id, weight: 3, title: 'Move it earlier', why: `Evenings are when willpower runs out. Try “${name}” in the morning or at lunch.` });
    if (missed >= 3 && h.anchor && steadiest && steadiest.id !== h.id)
      tips.push({ habitId: h.id, weight: 3, title: 'Re-stack it', why: `“After I ${h.anchor}” is not holding. Stack it after “${steadiest.behaviour}” instead — that one you keep.` });
    if ((reasons.travelling ?? 0) >= 2)
      tips.push({ habitId: h.id, weight: 2, title: 'Give it a travel version', why: `You skipped “${name}” for travel twice. Decide now what the hotel-room version is.` });
    if (tiny > done && tiny >= 3)
      tips.push({ habitId: h.id, weight: 2, title: 'The tiny version is the habit', why: `You mostly do “${h.tiny}”. That is fine — keep showing up, and grow it once it feels automatic.` });
    if (missed === 0 && done >= 10)
      tips.push({ habitId: h.id, weight: 1, title: `Ready to grow “${name}”`, why: 'Two weeks without a miss. Add a minute, or a page — about one percent more.' });
  }
  return tips.sort((a, b) => b.weight - a.weight).slice(0, max);
}
