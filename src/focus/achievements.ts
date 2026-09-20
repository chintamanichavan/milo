import { airport } from './airports';
import {
  dayKey,
  landed,
  landedHours,
  loadFocus,
  saveFocus,
  streak,
  type FocusState,
} from './store';

export interface Badge {
  id: string;
  name: string;
  hint: string;
  won: (state: FocusState) => boolean;
}

const hoursAtLeast = (h: number) => (s: FocusState) => landedHours(s) >= h;
const flightsAtLeast = (n: number) => (s: FocusState) => landed(s).length >= n;
const longestAtLeast = (min: number) => (s: FocusState) =>
  landed(s).some((f) => f.actualSec >= min * 60);

export const BADGES: Badge[] = [
  { id: 'first', name: 'First flight', hint: 'Land one flight', won: flightsAtLeast(1) },
  { id: 'ten', name: 'Ten flights', hint: 'Land ten', won: flightsAtLeast(10) },
  { id: 'hundred', name: 'Hundred flights', hint: 'Land a hundred', won: flightsAtLeast(100) },
  { id: 'h10', name: '10 hours', hint: 'Ten hours in the air', won: hoursAtLeast(10) },
  { id: 'h50', name: '50 hours', hint: 'Fifty hours', won: hoursAtLeast(50) },
  { id: 'h100', name: '100 hours', hint: 'A hundred hours', won: hoursAtLeast(100) },
  { id: 'h500', name: '500 hours', hint: 'Five hundred hours', won: hoursAtLeast(500) },
  { id: 'streak7', name: '7-day streak', hint: 'A week of landings', won: (s) => streak(s) >= 7 },
  { id: 'streak30', name: '30-day streak', hint: 'A month of landings', won: (s) => streak(s) >= 30 },
  { id: 'long90', name: '90-minute flight', hint: 'Land a 90′ flight', won: longestAtLeast(90) },
  { id: 'long120', name: '2-hour flight', hint: 'Land a 120′ flight', won: longestAtLeast(120) },
  { id: 'long180', name: '3-hour flight', hint: 'Land a 180′ flight', won: longestAtLeast(180) },
  {
    id: 'night',
    name: 'Night flight',
    hint: 'Land after 22:00',
    won: (s) => landed(s).some((f) => new Date(f.start).getHours() >= 22 || landedAfter22(f.start, f.actualSec)),
  },
  {
    id: 'early',
    name: 'Early bird',
    hint: 'Take off before 07:00',
    won: (s) => landed(s).some((f) => new Date(f.start).getHours() < 7),
  },
  {
    id: 'continents',
    name: 'Every continent',
    hint: 'Land on all six',
    won: (s) => {
      const seen = new Set(landed(s).map((f) => (f.to ? airport(f.to).continent : '')));
      seen.delete('');
      return seen.size >= 6;
    },
  },
];

const landedAfter22 = (start: string, sec: number): boolean =>
  new Date(new Date(start).getTime() + sec * 1000).getHours() >= 22;

/** Returns the badges won just now, and remembers them. */
export function checkBadges(): Badge[] {
  const state = loadFocus();
  const fresh = BADGES.filter((b) => !state.earned[b.id] && b.won(state));
  if (fresh.length) {
    for (const b of fresh) state.earned[b.id] = dayKey(new Date());
    saveFocus(state);
  }
  return fresh;
}
