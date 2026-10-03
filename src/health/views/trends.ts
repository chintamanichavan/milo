import { barChart, lineChart } from '../charts';
import { addDays, dateRange, mean, trend, TREND_KEYS, ZONE_WORD, zoneOf, type DayScore, type TrendKey, type Zone } from '../scores';
import type { Day } from '../types';
import type { Ctx, View } from './pages';
import { arrow, dayLabel, dec, hm, int, noData, shell, sparseTicks, STATUS, status } from './shell';

/** everything a metric page needs to know about one number */
interface Metric {
  label: string;
  get: (d: Day | undefined, sc: DayScore | undefined) => number | undefined;
  fmt: (v: number) => string;
  /** how a day's worth is spoken: "a day", "a night", or nothing */
  per: string;
  bars: boolean;
  zero: boolean;
}

const KM_PER_MI = 1.609344;

function metrics(units: 'mi' | 'km'): Record<string, Metric> {
  const u = units === 'mi' ? KM_PER_MI : 1;
  const paceOf = (kmh: number): number => (60 * u) / kmh;
  const mmss = (min: number): string => `${Math.floor(min)}:${String(Math.round((min % 1) * 60)).padStart(2, '0')}`;
  return {
    active: { label: 'Move', get: (d) => d?.active, fmt: (v) => `${int(v)} kcal`, per: ' a day', bars: true, zero: true },
    exMin: { label: 'Exercise', get: (d) => d?.exMin, fmt: (v) => `${int(v)} min`, per: ' a day', bars: true, zero: true },
    stand: { label: 'Stand', get: (d) => d?.stand, fmt: (v) => `${dec(v, v % 1 ? 1 : 0)} hr`, per: ' a day', bars: true, zero: true },
    steps: { label: 'Steps', get: (d) => d?.steps, fmt: (v) => int(v), per: ' a day', bars: true, zero: true },
    walkSpeed: {
      label: 'Walking pace',
      get: (d) => (d?.walkSpeed ? paceOf(d.walkSpeed) : undefined),
      fmt: (v) => `${mmss(v)} /${units}`,
      per: '',
      bars: false,
      zero: false,
    },
    vo2: { label: 'Cardio fitness', get: (d) => d?.vo2, fmt: (v) => `${dec(v)} VO2`, per: '', bars: false, zero: false },
    asleep: { label: 'Sleep', get: (d) => d?.asleep, fmt: (v) => hm(v), per: ' a night', bars: true, zero: true },
    hrv: { label: 'HRV', get: (d) => d?.hrv, fmt: (v) => `${Math.round(v)} ms`, per: '', bars: false, zero: false },
    rhr: { label: 'Resting HR', get: (d) => d?.rhr, fmt: (v) => `${Math.round(v)} bpm`, per: '', bars: false, zero: false },
    resp: { label: 'Breathing rate', get: (d) => d?.resp, fmt: (v) => `${dec(v)} /min`, per: '', bars: false, zero: false },
    spo2: { label: 'Blood oxygen', get: (d) => d?.spo2, fmt: (v) => `${Math.round(v)}%`, per: '', bars: false, zero: false },
    temp: { label: 'Wrist temp', get: (d) => d?.temp, fmt: (v) => `${dec(v, 2)} °C`, per: '', bars: false, zero: false },
    recovery: { label: 'Recovery', get: (_, sc) => sc?.recovery ?? undefined, fmt: (v) => `${Math.round(v)}`, per: '', bars: true, zero: true },
    strain: { label: 'Day strain', get: (_, sc) => sc?.strain, fmt: (v) => dec(v), per: '', bars: true, zero: true },
    perf: { label: 'Sleep performance', get: (_, sc) => sc?.perf ?? undefined, fmt: (v) => `${Math.round(v)}%`, per: '', bars: true, zero: true },
  };
}

/** one plain line of coaching per arrow */
function coach(key: TrendKey, dir: 'up' | 'flat' | 'down', a90: string, a365: string, per: string): string {
  if (key === 'walkSpeed')
    return dir === 'up'
      ? `Walking faster lately — ${a90} against ${a365} for the year.`
      : dir === 'down'
        ? `Walks have slowed to ${a90}. A few brisk ones bring it back toward ${a365}.`
        : `Walking pace is holding at about ${a90}.`;
  if (key === 'vo2')
    return dir === 'up'
      ? `Cardio fitness is climbing: ${a90} lately, ${a365} across the year.`
      : dir === 'down'
        ? `Cardio fitness has eased to ${a90}. Runs and brisk walks that get you breathing hard lift it.`
        : `Cardio fitness is steady around ${a90}.`;
  if (dir === 'up') return `Up lately: ${a90}${per} against ${a365} for the year. Keep it going.`;
  if (dir === 'flat') return `Holding steady around ${a90}${per}.`;
  return `Down to ${a90}${per} lately. About ${a365}${per} would turn the arrow back up.`;
}

const series = (ctx: Ctx, m: Metric, dates: string[]): (number | null)[] =>
  dates.map((d) => {
    const v = m.get(ctx.data.byDate.get(d), ctx.scores.get(d));
    return v === undefined || (m.zero && m.bars && v === 0 && !ctx.data.byDate.get(d)) ? null : v;
  });

const zoneFill = (v: number | null): string => (v === null ? 'none' : STATUS[zoneOf(v)].color);
const zoneLegend = (): string =>
  `<div class="hl-zones">${(['good', 'caution', 'serious'] as Zone[]).map((z) => status(z, ZONE_WORD[z])).join('')}</div>`;

/** recovery as bars coloured by zone, with the word for each in the tooltip */
export function recoveryBars(ctx: Ctx, dates: string[], caption: string): string {
  const values = dates.map((d) => ctx.scores.get(d)?.recovery ?? null);
  return `${barChart({
    caption,
    labels: dates.map(dayLabel),
    ticks: sparseTicks(dates),
    series: [{ name: 'Recovery', values }],
    fills: values.map(zoneFill),
    fmt: (v) => String(Math.round(v)),
    tips: dates.map((d, i) => `${dayLabel(d)}\n${values[i] === null ? 'no score' : `${values[i]} · ${ZONE_WORD[zoneOf(values[i]!)]}`}`),
    table: {
      head: ['day', 'recovery', 'zone'],
      rows: dates.map((d, i) => [dayLabel(d), values[i] ?? '—', values[i] === null ? '' : ZONE_WORD[zoneOf(values[i]!)]]),
    },
  })}${zoneLegend()}`;
}

export const trendsView: View = (root, ctx) => {
  if (!ctx.latest) {
    root.innerHTML = shell('trends', `<div class="hero"><p class="tag section">Health · trends</p><h1>Trends</h1></div>${noData()}`, 'hl-page');
    return;
  }
  const M = metrics(ctx.units);
  const list = TREND_KEYS.map((k) => trend(ctx.data.days, ctx.latest!, k));
  const ups = list.filter((t) => t.dir === 'up').length;
  const ready = list.filter((t) => t.dir).length;
  const month = dateRange(addDays(ctx.latest, -29), ctx.latest);
  const line = (key: string, caption: string): string =>
    lineChart({
      caption,
      labels: month.map(dayLabel),
      ticks: sparseTicks(month),
      series: [{ name: M[key].label, values: series(ctx, M[key], month) }],
      fmt: M[key].fmt,
      height: 110,
    });
  root.innerHTML = shell(
    'trends',
    `<div class="hero">
      <p class="tag section">Health · trends</p>
      <h1>${ready ? `${ups} of ${ready}<span><i> · </i>heading up</span>` : 'Trends need time'}</h1>
      <p class="line sub">The last 90 days against the last year. ${ready < 7 ? 'An arrow appears once a metric has about four months behind it.' : ''}</p>
    </div>
    <div class="hl-tiles">${list
      .map((t) => {
        const m = M[t.key];
        const a90 = t.avg90 === null ? '—' : m.fmt(m.get({ date: '', [t.key]: t.avg90 } as Day, undefined) ?? t.avg90);
        const a365 = t.avg365 === null ? '—' : m.fmt(m.get({ date: '', [t.key]: t.avg365 } as Day, undefined) ?? t.avg365);
        return `<a class="hl-tile tap" href="#/health/trends/${t.key}">
          <span class="hl-tile-top">${t.dir ? arrow(t.dir) : '<span class="hl-arrow none">·</span>'}<b>${m.label}</b></span>
          <span class="mono hl-tile-num">${a90}${t.dir ? `<small>year ${a365}</small>` : ''}</span>
          <span class="sub">${t.dir ? coach(t.key, t.dir, a90, a365, m.per) : `Needs more history — ${t.n365} ${t.key === 'vo2' ? 'readings' : 'days'} so far.`}</span>
        </a>`;
      })
      .join('')}</div>
    <div class="hl-cols">
      <div class="panel"><p class="tag">Recovery<span>30 days</span></p>${recoveryBars(ctx, month, 'Recovery each morning, coloured by zone.')}</div>
      <div class="panel"><p class="tag">Day strain<span>30 days</span></p>${barChart({
        caption: 'Day strain, 0 to 21.',
        labels: month.map(dayLabel),
        ticks: sparseTicks(month),
        series: [{ name: 'Strain', values: series(ctx, M.strain, month) }],
        fmt: (v) => dec(v),
      })}</div>
      <div class="panel"><p class="tag">HRV<span>30 days</span></p>${line('hrv', 'Heart rate variability, the day’s average. Higher is usually better rested.')}</div>
      <div class="panel"><p class="tag">Resting heart rate<span>30 days</span></p>${line('rhr', 'Resting heart rate. Lower is usually better rested.')}</div>
    </div>`,
    'hl-page',
  );
};

const RANGES: [string, number][] = [
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
  ['6m', 182],
  ['1y', 365],
];
let range = 30;

export const trendDetailView: View = (root, ctx, key, again) => {
  const M = metrics(ctx.units);
  const m = key ? M[key] : undefined;
  if (!m || !ctx.latest) {
    root.innerHTML = shell('trends', `<div class="hero"><p class="tag section"><a class="tap" href="#/health/trends">← Trends</a></p><h1>Nothing to show</h1></div>${ctx.latest ? '' : noData()}`, 'hl-page');
    return;
  }
  const dates = dateRange(addDays(ctx.latest, -(range - 1)), ctx.latest);
  const values = series(ctx, m, dates);
  const have = values.filter((v): v is number => v !== null);
  const avg = have.length ? mean(have) : null;
  const t = (TREND_KEYS as string[]).includes(key!) ? trend(ctx.data.days, ctx.latest, key as TrendKey) : null;
  const opts = {
    caption: `${m.label}, the last ${range} days${avg !== null ? `; the dashed line is the average, ${m.fmt(avg)}` : ''}.`,
    labels: dates.map(dayLabel),
    ticks: sparseTicks(dates),
    series: [{ name: m.label, values }],
    fmt: m.fmt,
    ref: avg !== null ? { value: avg, label: 'avg' } : undefined,
  };
  const chart =
    key === 'recovery' && range <= 90
      ? recoveryBars(ctx, dates, opts.caption)
      : m.bars && range <= 30
        ? barChart(opts)
        : lineChart({ ...opts, zero: m.zero, dots: range <= 30 && !m.bars });
  root.innerHTML = shell(
    'trends',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/health/trends">← Trends</a> · ${m.label}</p>
      <h1>${avg === null ? '—' : m.fmt(avg)}<span><i> · </i>average, ${range} days</span></h1>
      ${
        t?.dir && t.avg90 !== null && t.avg365 !== null
          ? `<p class="line hl-trendline">${arrow(t.dir, 18)} ${coach(t.key, t.dir, m.fmt(m.get({ date: '', [t.key]: t.avg90 } as Day, undefined)!), m.fmt(m.get({ date: '', [t.key]: t.avg365 } as Day, undefined)!), m.per)}</p>`
          : ''
      }
    </div>
    <div class="chips" id="range">${RANGES.map(([label, n]) => `<button class="chip tap${n === range ? ' on' : ''}" data-range="${n}">${label}</button>`).join('')}</div>
    <div class="panel">
      ${chart}
    </div>
    <div class="panel">
      <p class="tag">In these ${range} days</p>
      <div class="hl-nums">
        <div><b class="mono">${have.length ? m.fmt(Math.min(...have)) : '—'}</b><span class="tag">low</span></div>
        <div><b class="mono">${have.length ? m.fmt(Math.max(...have)) : '—'}</b><span class="tag">high</span></div>
        <div><b class="mono">${have.length}</b><span class="tag">days with data</span></div>
      </div>
    </div>`,
    'hl-page',
  );
  const onClick = (ev: Event): void => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-range]');
    if (!b) return;
    range = Number(b.dataset.range);
    again();
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
};
