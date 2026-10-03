import { loadWeights, trend as weightTrend } from '../../body/weight';
import { LIFT_KEY, RUN_KEY, WATER_KEY } from '../../keys';
import { DRINKS } from '../../water/drinks';
import { numbers } from '../charts';
import { addDays, compare, MIN_BUCKET, type Comparison } from '../scores';
import type { Ctx, View } from './pages';
import { noData, shell } from './shell';

/**
 * Milo's own logs set against the next morning's recovery and the next
 * night's sleep. A plain split into two buckets and their averages, with the
 * counts shown. No p-values, no pretending.
 */

const read = <T>(key: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const dayOf = (s: string | number): string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(s).toLocaleDateString('en-CA');

interface Sets {
  lifts: Map<string, number>;
  runs: Set<string>;
  water: Map<string, { oz: number; alcohol: boolean; goal?: number }>;
  weightDown: Map<string, boolean>;
}

function gather(): Sets {
  const lift = read<{ sessions?: { date: string; entries?: { sets?: { weightLb?: number; reps?: number; done?: boolean }[] }[] }[] }>(LIFT_KEY);
  const lifts = new Map<string, number>();
  for (const s of lift?.sessions ?? []) {
    const volume = (s.entries ?? []).reduce(
      (v, e) => v + (e.sets ?? []).reduce((x, set) => x + (set.done ? (set.weightLb ?? 0) * (set.reps ?? 0) : 0), 0),
      0,
    );
    const d = dayOf(s.date);
    lifts.set(d, (lifts.get(d) ?? 0) + volume);
  }
  const run = read<{ completedRuns?: { date: string }[] }>(RUN_KEY);
  const runs = new Set((run?.completedRuns ?? []).map((r) => dayOf(r.date)));

  const water = read<{ sips?: { at: number; oz: number; drinkId: string }[]; goals?: Record<string, number>; customs?: { id: string; kind?: string }[] }>(WATER_KEY);
  const kinds = new Map([...DRINKS, ...(water?.customs ?? [])].map((d) => [d.id, d.kind]));
  const byDay = new Map<string, { oz: number; alcohol: boolean; goal?: number }>();
  for (const sip of water?.sips ?? []) {
    const d = dayOf(sip.at);
    const row = byDay.get(d) ?? { oz: 0, alcohol: false, goal: water?.goals?.[d] };
    row.oz += sip.oz;
    if (kinds.get(sip.drinkId) === 'alcohol') row.alcohol = true;
    byDay.set(d, row);
  }

  const line = weightTrend(loadWeights());
  const weightDown = new Map<string, boolean>();
  for (const p of line) {
    // the trend a week before, or the nearest earlier point
    const earlier = line.filter((q) => q.date <= addDays(p.date, -7)).pop();
    if (earlier) weightDown.set(p.date, p.lb < earlier.lb);
  }
  return { lifts, runs, water: byDay, weightDown };
}

interface Row {
  name: string;
  yes: string;
  no: string;
  rec: Comparison;
  sleep: Comparison;
}

function rows(ctx: Ctx, s: Sets): Row[] {
  const dates = [...ctx.scores.keys()];
  const next = (d: string): { rec: number | null; perf: number | null } => {
    const sc = ctx.scores.get(addDays(d, 1));
    return { rec: sc?.recovery ?? null, perf: sc?.perf ?? null };
  };
  const build = (name: string, yes: string, no: string, universe: string[], flag: (d: string) => boolean): Row => {
    const pairs = universe.map((d) => ({ flag: flag(d), ...next(d) }));
    return {
      name,
      yes,
      no,
      rec: compare(pairs.map((p) => ({ flag: p.flag, value: p.rec }))),
      sleep: compare(pairs.map((p) => ({ flag: p.flag, value: p.perf }))),
    };
  };
  const out: Row[] = [];
  out.push(build('Lifting', 'after a lift day', 'after other days', dates, (d) => s.lifts.has(d)));
  const liftDays = dates.filter((d) => s.lifts.has(d));
  const vols = liftDays.map((d) => s.lifts.get(d)!).sort((a, b) => a - b);
  const median = vols[Math.floor(vols.length / 2)] ?? 0;
  out.push(build('Lift volume', 'after a heavier session', 'after a lighter one', liftDays, (d) => s.lifts.get(d)! >= median && median > 0));
  out.push(build('Running', 'after a Milo run', 'after other days', dates, (d) => s.runs.has(d)));
  const waterDays = dates.filter((d) => s.water.has(d));
  const medianOz = [...waterDays.map((d) => s.water.get(d)!.oz)].sort((a, b) => a - b)[Math.floor(waterDays.length / 2)] ?? 0;
  out.push(
    build('Water', 'after reaching the goal', 'after falling short', waterDays, (d) => {
      const w = s.water.get(d)!;
      return w.oz >= (w.goal ?? medianOz);
    }),
  );
  out.push(build('Alcohol-free', 'after a day without a drink', 'after a day with one', waterDays, (d) => !s.water.get(d)!.alcohol));
  out.push(build('Weight trend', 'while the trend is falling', 'while it is rising', dates.filter((d) => s.weightDown.has(d)), (d) => s.weightDown.get(d)!));
  out.push(build('A hard day', 'after strain of 14 or more', 'after easier days', dates, (d) => (ctx.scores.get(d)?.strain ?? 0) >= 14));
  return out;
}

const says = (c: Comparison, what: string, unit: string): string => {
  const n = `<small class="mono">n=${c.nWith}/${c.nWithout}</small>`;
  if (!c.nWith && !c.nWithout) return `<p class="line sub">${what}: nothing logged in Milo for these days yet.</p>`;
  if (!c.enough || c.withMean === null || c.withoutMean === null)
    return `<p class="line sub">${what}: too few days to say yet ${n}</p>`;
  const diff = c.withMean - c.withoutMean;
  const word = Math.abs(diff) <= 2 ? 'about the same' : diff > 0 ? `${diff}${unit} higher` : `${-diff}${unit} lower`;
  return `<p class="line">${what}: <b class="mono">${c.withMean}${unit}</b> against <b class="mono">${c.withoutMean}${unit}</b> — ${word}. ${n}</p>`;
};

export const behaviorsView: View = (root, ctx) => {
  if (!ctx.latest) {
    root.innerHTML = shell('behaviors', `<div class="hero"><p class="tag section">Health · behaviors</p><h1>Behaviors</h1></div>${noData()}`, 'hl-page');
    return;
  }
  const list = rows(ctx, gather());
  const ready = list.filter((r) => r.rec.enough || r.sleep.enough).length;
  root.innerHTML = shell(
    'behaviors',
    `<div class="hero">
      <p class="tag section">Health · behaviors</p>
      <h1>${ready}<span><i> · </i>of ${list.length} with enough days</span></h1>
      <p class="line sub">What you log in Milo — lifts, runs, water — set against the next morning's recovery and the next night's sleep.
        Plain averages of two groups of days, with how many days are in each. A difference here is a hint, not proof; under ${MIN_BUCKET} days
        on either side we do not guess.</p>
    </div>
    <div class="hl-cols">
      ${list
        .map(
          (r) => `<div class="panel hl-beh">
            <p class="tag">${r.name}</p>
            <p class="line sub">${r.yes[0].toUpperCase()}${r.yes.slice(1)}, against ${r.no}.</p>
            ${says(r.rec, 'Recovery next morning', '')}
            ${says(r.sleep, 'Sleep next night', '%')}
          </div>`,
        )
        .join('')}
      <div class="panel hl-wide">
        <p class="tag">All of it</p>
        ${numbers(
          ['behavior', 'recovery with', 'without', 'n', 'sleep with', 'without', 'n'],
          list.map((r) => [
            r.name,
            r.rec.withMean ?? '—',
            r.rec.withoutMean ?? '—',
            `${r.rec.nWith}/${r.rec.nWithout}`,
            r.sleep.withMean === null ? '—' : `${r.sleep.withMean}%`,
            r.sleep.withoutMean === null ? '—' : `${r.sleep.withoutMean}%`,
            `${r.sleep.nWith}/${r.sleep.nWithout}`,
          ]),
        )}
      </div>
    </div>`,
    'hl-page',
  );
};
