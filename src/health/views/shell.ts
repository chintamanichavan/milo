import { miloMark } from '../../badge';
type Zone = 'good' | 'caution' | 'serious';

export function healthSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/health${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('trends', 'Trends')}${link('sleep', 'Sleep')}${link(
    'workouts',
    'Workouts',
  )}${link('report', 'Reports')}${link('behaviors', 'Behaviors')}${link('data', 'Data')}</nav>`;
}

export const shell = (active: string, body: string, extra = ''): string => `
  <section class="today health detail ${extra}">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${healthSubNav(active)}
    ${body}
  </section>`;

/* ---------- words and numbers ---------- */

export const int = (n: number): string => Math.round(n).toLocaleString('en-US');
export const dec = (n: number, places = 1): string => n.toFixed(places);
export const signed = (n: number, places = 0): string => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(places)}`;

/** 7h 05m, or 45m */
export function hm(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(Math.abs(m) / 60);
  const r = Math.abs(m) % 60;
  return `${m < 0 ? '−' : ''}${h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r}m`}`;
}

/** 10:45 PM from minutes past midnight (any day either side) */
export function clockOf(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const at = (date: string): Date => new Date(`${date}T12:00:00`);
export const dayLabel = (date: string): string =>
  at(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const shortDay = (date: string): string => at(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const monthLabel = (ym: string, long = false): string =>
  at(`${ym}-01`).toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
export const weekday = (date: string): string => at(date).toLocaleDateString('en-US', { weekday: 'narrow' });

/** a few dates along an axis: the first, the last and some between */
export function sparseTicks(dates: string[], count = 4, label = shortDay): string[] {
  const n = dates.length;
  if (n <= 8) return dates.map((d) => (n <= 8 ? weekday(d) : ''));
  const every = Math.ceil(n / count);
  return dates.map((d, i) => (i === n - 1 || (i % every === 0 && n - 1 - i > every / 2) ? label(d) : ''));
}

/* ---------- status: always a word and an icon with the colour ---------- */

const I = (body: string, size = 16): string =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6.5"/>${body}</svg>`;

export const STATUS: Record<Zone, { color: string; icon: string }> = {
  good: { color: 'var(--good)', icon: I('<path d="M5 8.2l2 2 4-4.4"/>') },
  caution: { color: 'var(--caution)', icon: I('<path d="M5 8h6"/>') },
  serious: { color: 'var(--serious)', icon: I('<path d="M8 4.8v5M5.6 7.8 8 10.2l2.4-2.4"/>') },
};

export const status = (zone: Zone, word: string): string =>
  `<span class="hl-status ${zone}" style="--st:${STATUS[zone].color}">${STATUS[zone].icon}<b>${word}</b></span>`;

export const ARROWS = {
  up: '<path d="M8 12.5v-9M4.5 7 8 3.5 11.5 7"/>',
  flat: '<path d="M3.5 8h9M9 4.5 12.5 8 9 11.5"/>',
  down: '<path d="M8 3.5v9M4.5 9 8 12.5 11.5 9"/>',
};
export const arrow = (dir: keyof typeof ARROWS, size = 20): string =>
  `<svg class="hl-arrow ${dir}" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ARROWS[dir]}</svg>`;

/** a small laurel round the Milo mark, for the awards list */
export const laurel = (): string => `<span class="hl-laurel" aria-hidden="true">
  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
    <path d="M12 33c-5-3-8-8-8-14 0-3 .8-6 2.2-8.5M28 33c5-3 8-8 8-14 0-3-.8-6-2.2-8.5"/>
    <path d="M6.5 14.5c2 .2 3.3 1.4 3.6 3.3M4.6 20.5c2-.3 3.6.6 4.3 2.4M6 26.5c1.9-.8 3.7-.3 4.8 1.2M33.5 14.5c-2 .2-3.3 1.4-3.6 3.3M35.4 20.5c-2-.3-3.6.6-4.3 2.4M34 26.5c-1.9-.8-3.7-.3-4.8 1.2"/>
  </svg>${miloMark(18)}</span>`;

/** the empty state every page shares before there is any data */
export const noData = (): string => `<div class="panel hl-empty">
  <p class="tag">Nothing here yet</p>
  <p class="line">Bring in your Apple Health export and this fills with recovery, strain, rings and sleep.</p>
  <p class="line sub">On your iPhone: Health → your picture → Export All Health Data → save the zip to Files. Then pick it on the Data page.</p>
  <a class="big tap" href="#/health/data">BRING IT IN</a>
</div>`;

/** workout names, short */
const NAMES: Record<string, string> = {
  TraditionalStrengthTraining: 'Strength',
  FunctionalStrengthTraining: 'Functional strength',
  HighIntensityIntervalTraining: 'HIIT',
  MixedCardio: 'Mixed cardio',
  CoreTraining: 'Core',
  Elliptical: 'Elliptical',
  StairClimbing: 'Stairs',
  CrossTraining: 'Cross training',
  MindAndBody: 'Mind and body',
};
export const workoutName = (type: string): string => NAMES[type] ?? type.replace(/([a-z])([A-Z])/g, '$1 $2');

const G = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const WORKOUT_ICONS: Record<string, string> = {
  run: G('<circle cx="14" cy="4.5" r="1.4"/><path d="M9 21l2.5-5 3-2-1-4-3.5 2-2 3"/><path d="M14.5 10l3 1.5 2.5-1"/>'),
  walk: G('<circle cx="12.5" cy="4.5" r="1.4"/><path d="M10 21l1.6-6 2.4 2.5V21M11.6 15l.9-6-3 1.6-1 3M12.5 9l2 3 2.5.6"/>'),
  cycle: G('<circle cx="6" cy="16" r="3.6"/><circle cx="18" cy="16" r="3.6"/><path d="M6 16l4-7h5l3 7M10 9l2.5 7H6M13 6h2.5"/>'),
  lift: G('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'),
  hiit: G('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  calm: G('<circle cx="12" cy="5" r="1.6"/><path d="M4 19c3-1 5.5-1.4 8-1.4s5 .4 8 1.4M12 8v5M7 12.5l5 1 5-1"/>'),
  swim: G('<path d="M3 17c2 0 2-1.2 4.5-1.2S9.5 17 12 17s2.5-1.2 4.5-1.2S19 17 21 17M3 20.5c2 0 2-1.2 4.5-1.2s2 1.2 4.5 1.2 2.5-1.2 4.5-1.2 2.5 1.2 4.5 1.2"/><circle cx="16" cy="7" r="1.5"/><path d="M6 13l4-4.5 3 2.5"/>'),
  other: G('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
};
export function workoutIcon(type: string): string {
  if (/Run/.test(type)) return WORKOUT_ICONS.run;
  if (/Walk|Hik/.test(type)) return WORKOUT_ICONS.walk;
  if (/Cycl|Bik/.test(type)) return WORKOUT_ICONS.cycle;
  if (/Strength|Core/.test(type)) return WORKOUT_ICONS.lift;
  if (/Interval|Cardio|Cross/.test(type)) return WORKOUT_ICONS.hiit;
  if (/Yoga|Pilates|Mind|Cool|Flex|Tai/.test(type)) return WORKOUT_ICONS.calm;
  if (/Swim|Water|Pad|Row/.test(type)) return WORKOUT_ICONS.swim;
  return WORKOUT_ICONS.other;
}

/** min:sec a kilometre */
export function pace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
