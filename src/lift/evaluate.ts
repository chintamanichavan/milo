import type { Exercise, Gear } from './library';

/**
 * A quick evaluation of every exercise, on three things that decide how well
 * it builds muscle: how long a range it trains through, how stable it is (so
 * the target muscle, not balance, is what gives out), and how much stimulus
 * it gives for the fatigue it costs. One to five each, and one plain line.
 */
export interface Rating {
  rom: number;
  stability: number;
  sfr: number;
  line: string;
}

const STABILITY: Record<Gear, number> = {
  machine: 5,
  smith: 5,
  cable: 4,
  trapbar: 4,
  barbell: 3,
  ezbar: 3,
  dumbbell: 3,
  bodyweight: 3,
  kettlebell: 2,
  band: 2,
};

const LONG = /rdl|stiff-leg|bulgarian|incline-curl|overhead|skull|fly|db-incline|pullover|sissy|nordic|hack|deficit|seated-curl|good-morning|dip$/;
const FULLISH = /squat|lunge|pull(up|down)|chinup|press|bench|row|leg-press|calf|preacher|curl|extension|kickback/;
const SHORT = /shrug|upright|bridge|abduction|band-walk|pull-apart|jump|hop/;
const HELD = /plank|hollow|wall-sit|carry|farmer|dead-?bug|bird-dog|pallof|copenhagen/;
const CARDIO = /sprint|rowing|bike|rope|burpee|mountain|sled|incline-walk|box-jump/;
const TAXING = /^(deadlift|good-morning|clean|snatch|pendlay|thruster|power|trap-bar$|zercher)|burpee|sprint|kb-snatch|turkish/;

const clamp = (n: number): number => Math.max(1, Math.min(5, Math.round(n)));

const cache = new Map<string, Rating>();

export function rate(exercise: Exercise): Rating {
  const hit = cache.get(exercise.id);
  if (hit) return hit;
  const id = exercise.id;
  const held = HELD.test(id);
  const cardio = CARDIO.test(id);
  const isolation = !exercise.also;

  const rom = held ? 1 : LONG.test(id) ? 5 : SHORT.test(id) ? 2 : FULLISH.test(id) ? 4 : 3;
  const stability = clamp(STABILITY[exercise.gear] + (/single|one|kb-|turkish|split|bulgarian|lunge/.test(id) ? -1 : 0));
  let sfr = isolation ? 4 : 3;
  if (exercise.gear === 'machine' || exercise.gear === 'cable' || exercise.gear === 'smith') sfr += 1;
  if (TAXING.test(id)) sfr -= 1;
  if (cardio) sfr = 2;
  if (held) sfr = 3;
  sfr = clamp(sfr);

  const parts: string[] = [];
  if (held) parts.push('Held, not moved: builds control and endurance more than size');
  else if (cardio) parts.push('Conditioning more than muscle; count it as cardio');
  else {
    if (rom >= 5) parts.push('A long stretch under load — the range that grows muscle best');
    if (sfr >= 5) parts.push('lots of stimulus for little fatigue, easy to take close to failure');
    else if (sfr <= 2) parts.push('costly to recover from, so keep it for strength rather than volume');
    if (stability >= 5 && parts.length < 2) parts.push('the path is guided, so the target muscle is what gives out');
    else if (stability <= 2 && parts.length < 2) parts.push('balance and control limit how hard the target muscle can work');
    if (rom <= 2 && parts.length < 2) parts.push('a short range, better as a finisher than a main lift');
    if (!parts.length) parts.push('A solid all-rounder: a fair range, fair stability and a fair recovery cost');
  }
  const line = parts.map((p, i) => (i === 0 ? p[0].toUpperCase() + p.slice(1) : p)).join('; ') + '.';
  const rating = { rom, stability, sfr, line };
  cache.set(id, rating);
  return rating;
}

const dots = (n: number): string => '●'.repeat(n) + '○'.repeat(5 - n);

/** three small meters and the line, for a card or a sheet */
export function ratingHtml(exercise: Exercise, withLine = true): string {
  const r = rate(exercise);
  return `<span class="rating" aria-label="range ${r.rom} of 5, stability ${r.stability} of 5, stimulus for fatigue ${r.sfr} of 5">
    <span><i>ROM</i>${dots(r.rom)}</span><span><i>stable</i>${dots(r.stability)}</span><span><i>SFR</i>${dots(r.sfr)}</span>
  </span>${withLine ? `<span class="rating-line">${r.line}</span>` : ''}`;
}
