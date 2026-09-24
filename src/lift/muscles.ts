import type { LiftState } from './store';
import { exerciseById } from './store';

/**
 * Sets per muscle, and a body to paint them on. A set counts in full for the
 * muscle that decides the exercise, and half for each muscle that helps.
 */
export const MUSCLE_ORDER = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
];

const HELPERS: Record<string, string> = {
  traps: 'back',
  'upper back': 'back',
  lats: 'back',
};

export function setsPerMuscle(state: LiftState, sinceMs: number): Map<string, number> {
  const out = new Map<string, number>(MUSCLE_ORDER.map((m) => [m, 0]));
  for (const session of state.sessions) {
    if (new Date(session.date).getTime() < sinceMs) continue;
    for (const entry of session.entries) {
      const exercise = exerciseById(state, entry.exerciseId);
      const sets = entry.sets.filter((s) => s.done && s.type !== 'w').length;
      if (!sets) continue;
      out.set(exercise.muscle, (out.get(exercise.muscle) ?? 0) + sets);
      for (const raw of exercise.also.split(',').map((x) => x.trim()).filter(Boolean)) {
        const helper = HELPERS[raw] ?? raw;
        if (out.has(helper)) out.set(helper, (out.get(helper) ?? 0) + sets / 2);
      }
    }
  }
  return out;
}

/** the regions of a simple figure, front and back, each named for the muscle it shows */
const FRONT: [string, string][] = [
  ['shoulders', '<ellipse cx="37" cy="54" rx="10" ry="9"/><ellipse cx="83" cy="54" rx="10" ry="9"/>'],
  ['chest', '<path d="M47 52h12v20c-6 2-11 1-15-3-2-6-1-13 3-17zM73 52H61v20c6 2 11 1 15-3 2-6 1-13-3-17z"/>'],
  ['biceps', '<ellipse cx="30" cy="78" rx="6.5" ry="13"/><ellipse cx="90" cy="78" rx="6.5" ry="13"/>'],
  ['forearms', '<ellipse cx="26" cy="106" rx="5.5" ry="14"/><ellipse cx="94" cy="106" rx="5.5" ry="14"/>'],
  ['core', '<rect x="48" y="75" width="24" height="42" rx="8"/>'],
  ['quads', '<ellipse cx="50" cy="152" rx="10" ry="26"/><ellipse cx="70" cy="152" rx="10" ry="26"/>'],
  ['calves', '<ellipse cx="50" cy="203" rx="6.5" ry="17"/><ellipse cx="70" cy="203" rx="6.5" ry="17"/>'],
];

const BACK: [string, string][] = [
  ['shoulders', '<ellipse cx="37" cy="54" rx="10" ry="9"/><ellipse cx="83" cy="54" rx="10" ry="9"/>'],
  ['back', '<path d="M60 40l14 10 4 16-6 24-12 8-12-8-6-24 4-16z"/>'],
  ['triceps', '<ellipse cx="30" cy="78" rx="6.5" ry="13"/><ellipse cx="90" cy="78" rx="6.5" ry="13"/>'],
  ['forearms', '<ellipse cx="26" cy="106" rx="5.5" ry="14"/><ellipse cx="94" cy="106" rx="5.5" ry="14"/>'],
  ['core', '<rect x="50" y="100" width="20" height="14" rx="5"/>'],
  ['glutes', '<ellipse cx="50" cy="126" rx="11" ry="10"/><ellipse cx="70" cy="126" rx="11" ry="10"/>'],
  ['hamstrings', '<ellipse cx="50" cy="160" rx="9" ry="22"/><ellipse cx="70" cy="160" rx="9" ry="22"/>'],
  ['calves', '<ellipse cx="50" cy="203" rx="7.5" ry="17"/><ellipse cx="70" cy="203" rx="7.5" ry="17"/>'],
];

const SILHOUETTE = `<g class="mm-body">
  <circle cx="60" cy="20" r="11"/><rect x="55" y="30" width="10" height="10" rx="3"/>
  <path d="M34 44h52l6 14-4 70-8 4-4-10-2-8H50l-2 8-4 10-8-4-4-70z"/>
  <path d="M22 60l10-6 4 30-6 40-10-2-2-40zM98 60l-10-6-4 30 6 40 10-2 2-40z"/>
  <path d="M40 128h40l-2 96H64l-4-72-4 72H42z"/>
</g>`;

function figure(regions: [string, string][], counts: Map<string, number>, top: number, label: string): string {
  return `<svg class="musclemap" viewBox="0 0 120 232" role="img" aria-label="${label}">
    ${SILHOUETTE}
    ${regions
      .map(([muscle, shapes]) => {
        const n = counts.get(muscle) ?? 0;
        const level = top > 0 ? n / top : 0;
        return `<g class="mm-region${n ? ' on' : ''}" data-muscle="${muscle}" style="fill-opacity:${n ? (0.25 + level * 0.75).toFixed(2) : 1}">
          <title>${muscle}: ${Math.round(n * 10) / 10} sets</title>${shapes}</g>`;
      })
      .join('')}
    <text class="mm-label" x="60" y="230">${label}</text>
  </svg>`;
}

/** front and back side by side, the busiest muscle at full colour */
export function muscleMap(counts: Map<string, number>): string {
  const top = Math.max(...counts.values(), 0);
  return `<div class="musclemaps">${figure(FRONT, counts, top, 'front')}${figure(BACK, counts, top, 'back')}</div>`;
}
