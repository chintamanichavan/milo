import { airport, distanceKm, localTime, type Airport } from './airports';
import { landed, type FocusState } from './store';

/* ---------- 69. the boarding pass ---------- */

export interface BoardingPass {
  number: string;
  gate: string;
  seat: string;
  from: string;
  to: string;
  departs: string;
  minutes: number;
  purpose: string;
  stripe: string;
}

const hash = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

export function boardingPass(
  from: Airport,
  to: Airport,
  minutes: number,
  purpose: string,
  when = new Date(),
): BoardingPass {
  const seed = `${from.iata}${to.iata}${when.toDateString()}${minutes}`;
  const n = hash(seed);
  return {
    number: `MLO ${String(100 + (n % 900))}`,
    gate: `${'ABCDE'[n % 5]}${1 + (n % 24)}`,
    seat: `${1 + (n % 32)}${'ABCDF'[(n >> 3) % 5]}`,
    from: from.iata,
    to: to.iata,
    departs: when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    minutes,
    purpose: purpose || 'focus',
    // a barcode-ish stripe, derived from the same seed
    stripe: Array.from({ length: 34 }, (_, i) => ((n >> i % 24) & 1 ? 3 : 1)).join(','),
  };
}

/* ---------- 72. phases and announcements ---------- */

export type Phase = 'taxi' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'landing';

export const phaseAt = (t: number): Phase =>
  t < 0.02 ? 'taxi' : t < 0.05 ? 'takeoff' : t < 0.12 ? 'climb' : t < 0.88 ? 'cruise' : t < 0.985 ? 'descent' : 'landing';

export const PHASE_LABEL: Record<Phase, string> = {
  taxi: 'taxiing',
  takeoff: 'takeoff roll',
  climb: 'climbing',
  cruise: 'cruising',
  descent: 'descending',
  landing: 'landing',
};

export function announcement(phase: Phase, city: string): string {
  switch (phase) {
    case 'taxi':
      return 'Cabin crew, doors to automatic. Phone down, please.';
    case 'takeoff':
      return 'Cleared for take-off.';
    case 'climb':
      return 'Climbing out. Nothing to do but the work.';
    case 'cruise':
      return 'We have reached cruising altitude. Settle in.';
    case 'descent':
      return `Beginning our descent into ${city}.`;
    case 'landing':
      return 'Cabin crew, seats for landing.';
  }
}

export const MID_FLIGHT = 'Halfway there. The weather ahead looks fine.';

/* ---------- 76. pilot rank ---------- */

export interface Rank {
  name: string;
  hours: number;
}

export const RANKS: Rank[] = [
  { name: 'Student', hours: 0 },
  { name: 'Private', hours: 10 },
  { name: 'Commercial', hours: 50 },
  { name: 'Airline Transport', hours: 150 },
  { name: 'Captain', hours: 400 },
];

export const rankFor = (hours: number): Rank =>
  [...RANKS].reverse().find((r) => hours >= r.hours) ?? RANKS[0];

export const nextRank = (hours: number): Rank | undefined => RANKS.find((r) => hours < r.hours);

export function wings(rank: string, size = 40): string {
  const bars = RANKS.findIndex((r) => r.name === rank) + 1;
  return `<svg class="wings" viewBox="0 0 64 24" width="${size}" height="${size * 0.375}" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 6 C26 6 22 9 12 11 C20 12 26 13 32 13 C38 13 44 12 52 11 C42 9 38 6 32 6Z"/>
    <circle cx="32" cy="10" r="3"/>
    ${Array.from({ length: bars }, (_, i) => `<path d="M${24 + i * 4} 17 L${28 + i * 4} 17"/>`).join('')}
  </svg>`;
}

/* ---------- 77. arrival card ---------- */

export interface Arrival {
  city: string;
  iata: string;
  local: string;
  km: number;
  lifetimeKm: number;
  laps: number;
}

export function arrivalFor(state: FocusState, from: string, to: string): Arrival {
  const a = airport(from);
  const b = airport(to);
  const km = distanceKm(a, b);
  const lifetimeKm = landed(state).reduce(
    (sum, f) => sum + (f.from && f.to ? distanceKm(airport(f.from), airport(f.to)) : 0),
    0,
  );
  return {
    city: b.city,
    iata: b.iata,
    local: localTime(b),
    km,
    lifetimeKm,
    laps: lifetimeKm / 40_075,
  };
}

export interface Weather {
  tempC: number;
  code: number;
  label: string;
}

const WEATHER_WORDS: [number[], string][] = [
  [[0, 1], 'clear'],
  [[2, 3], 'cloudy'],
  [[45, 48], 'foggy'],
  [[51, 53, 55, 56, 57], 'drizzle'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'rain'],
  [[71, 73, 75, 77, 85, 86], 'snow'],
  [[95, 96, 99], 'thunder'],
];

/** Open-Meteo needs no key; offline we simply say nothing. */
export async function weatherAt(iata: string): Promise<Weather | null> {
  if (!navigator.onLine) return null;
  const spot = airport(iata);
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}&current_weather=true`,
    );
    const data = (await response.json()) as {
      current_weather?: { temperature: number; weathercode: number };
    };
    if (!data.current_weather) return null;
    const code = data.current_weather.weathercode;
    return {
      tempC: Math.round(data.current_weather.temperature),
      code,
      label: WEATHER_WORDS.find(([codes]) => codes.includes(code))?.[1] ?? 'quiet',
    };
  } catch {
    return null;
  }
}

/* ---------- 75. the split-flap board ---------- */

export interface BoardRow {
  time: string;
  flight: string;
  to: string;
  purpose: string;
  status: string;
}

export function splitFlap(rows: BoardRow[]): string {
  const cell = (text: string, width: number, delay: number): string =>
    `<span class="flap-word">${text
      .padEnd(width, ' ')
      .slice(0, width)
      .split('')
      .map(
        (char, i) =>
          `<i class="flap" style="animation-delay:${delay + i * 28}ms">${char === ' ' ? '&nbsp;' : char}</i>`,
      )
      .join('')}</span>`;
  return `<div class="flapboard">
    <div class="flaprow head"><span>time</span><span>flight</span><span>to</span><span>purpose</span><span>status</span></div>
    ${rows
      .map(
        (row, r) => `<div class="flaprow">
          ${cell(row.time, 5, r * 60)}
          ${cell(row.flight, 7, r * 60 + 80)}
          ${cell(row.to, 3, r * 60 + 160)}
          ${cell(row.purpose, 10, r * 60 + 220)}
          ${cell(row.status, 9, r * 60 + 300)}
        </div>`,
      )
      .join('')}
  </div>`;
}
