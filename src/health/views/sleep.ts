import { barChart, lineChart, rangeChart, wideW } from '../charts';
import { addDays, consistencyWord, dateRange, mean, sd } from '../scores';
import type { View } from './pages';
import { clockOf, dayLabel, hm, noData, shell, sparseTicks } from './shell';

let nights = 14;

/** clock labels on an axis: 11 PM, 7 AM */
const hourLabel = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

export const sleepView: View = (root, ctx, _arg, again) => {
  if (!ctx.latest) {
    root.innerHTML = shell('sleep', `<div class="hero"><p class="tag section">Health · sleep</p><h1>Sleep</h1></div>${noData()}`, 'hl-page');
    return;
  }
  const { byDate } = ctx.data;
  const recent = dateRange(addDays(ctx.latest, -(nights - 1)), ctx.latest);
  const month = dateRange(addDays(ctx.latest, -29), ctx.latest);
  const week = dateRange(addDays(ctx.latest, -6), ctx.latest);
  const slept = week.map((d) => byDate.get(d)?.asleep).filter((v): v is number => !!v);
  const perfs = week.map((d) => ctx.scores.get(d)?.perf).filter((v): v is number => v != null);
  const effs = week.map((d) => ctx.scores.get(d)?.efficiency).filter((v): v is number => v != null);
  const beds = week.map((d) => byDate.get(d)?.bed).filter((v): v is number => v !== undefined);
  const spread = beds.length >= 3 ? Math.round(sd(beds)) : null;
  const debtNow = ctx.scores.get(ctx.latest)?.debt ?? 0;
  const debtWeekAgo = ctx.scores.get(addDays(ctx.latest, -7))?.debt ?? 0;

  const stage = (key: 'deep' | 'core' | 'rem' | 'awake'): (number | null)[] =>
    recent.map((d) => {
      const day = byDate.get(d);
      if (!day?.asleep) return null;
      // a night with no stages shows its whole sleep as core, and says so in the tooltip
      if (key === 'core' && day.core === undefined) return day.asleep;
      return day[key] ?? 0;
    });
  const stages = barChart({
    caption: `Sleep stages, the last ${nights} nights.`,
    labels: recent.map(dayLabel),
    ticks: sparseTicks(recent),
    series: [
      { name: 'Deep', values: stage('deep') },
      { name: 'Core', values: stage('core') },
      { name: 'REM', values: stage('rem') },
      { name: 'Awake', values: stage('awake') },
    ],
    fmt: hm,
    direct: true,
    width: wideW(),
    step: 120,
    tips: recent.map((d) => {
      const day = byDate.get(d);
      if (!day?.asleep) return `${dayLabel(d)}\nno sleep recorded`;
      if (day.core === undefined) return `${dayLabel(d)}\nasleep ${hm(day.asleep)} (no stages)`;
      return `${dayLabel(d)}\ndeep ${hm(day.deep ?? 0)} · core ${hm(day.core)}\nREM ${hm(day.rem ?? 0)} · awake ${hm(day.awake ?? 0)}`;
    }),
  });

  const bedVals = month.map((d) => byDate.get(d)?.bed ?? null);
  const typicalBed = (() => {
    const xs = bedVals.filter((v): v is number => v !== null).sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  })();
  const dots = lineChart({
    caption: typicalBed === null ? 'Bedtimes.' : `Bedtime each night; the dashed line is your usual, ${clockOf(typicalBed)}. Earlier is higher.`,
    labels: month.map(dayLabel),
    ticks: sparseTicks(month),
    series: [{ name: 'Bedtime', values: bedVals }],
    fmt: hourLabel,
    dots: true,
    invert: true,
    step: 60,
    ref: typicalBed === null ? undefined : { value: typicalBed, label: 'usual' },
    height: 120,
    tips: month.map((d, i) => `${dayLabel(d)}\n${bedVals[i] === null ? 'no sleep recorded' : `asleep from ${clockOf(bedVals[i]!)}`}`),
    table: { head: ['night', 'bedtime'], rows: month.map((d, i) => [dayLabel(d), bedVals[i] === null ? '—' : clockOf(bedVals[i]!)]) },
  });

  const debt = lineChart({
    caption: 'Sleep debt going into each night: two weeks of shortfall against your need.',
    labels: month.map(dayLabel),
    ticks: sparseTicks(month),
    series: [{ name: 'Debt', values: month.map((d) => ctx.scores.get(d)?.debt ?? null) }],
    fmt: hm,
    zero: true,
    step: 120,
    height: 110,
    width: wideW(),
  });

  const band = rangeChart({
    caption: 'In bed to up, each night of the month.',
    labels: month.map(dayLabel),
    ticks: sparseTicks(month),
    name: 'Asleep',
    ranges: month.map((d) => {
      const day = byDate.get(d);
      return day?.bed !== undefined && day.wake !== undefined ? [day.bed, day.wake] : null;
    }),
    fmt: hourLabel,
    step: 60,
    tips: month.map((d) => {
      const day = byDate.get(d);
      return day?.bed !== undefined && day.wake !== undefined
        ? `${dayLabel(d)}\n${clockOf(day.bed)} – ${clockOf(day.wake)}`
        : `${dayLabel(d)}\nno sleep recorded`;
    }),
    table: {
      head: ['night', 'down', 'up', 'asleep'],
      rows: month.map((d) => {
        const day = byDate.get(d);
        return [dayLabel(d), day?.bed !== undefined ? clockOf(day.bed) : '—', day?.wake !== undefined ? clockOf(day.wake) : '—', day?.asleep ? hm(day.asleep) : '—'];
      }),
    },
  });

  const debtWord =
    debtNow === debtWeekAgo ? 'Debt is where it was a week ago.' : debtNow < debtWeekAgo ? `Debt is down ${hm(debtWeekAgo - debtNow)} on a week ago.` : `Debt is up ${hm(debtNow - debtWeekAgo)} on a week ago.`;

  root.innerHTML = shell(
    'sleep',
    `<div class="hero">
      <p class="tag section">Health · sleep</p>
      <h1>${slept.length ? hm(mean(slept)) : '—'}<span><i> · </i>a night, last 7</span></h1>
      <p class="line sub">${debtWord} ${spread !== null ? `Bedtimes are ${consistencyWord(spread)} (±${spread} min).` : ''}</p>
    </div>
    <div class="panel">
      <div class="hl-nums hl-nums4">
        <div><b class="mono">${perfs.length ? `${Math.round(mean(perfs))}%` : '—'}</b><span class="tag">performance</span></div>
        <div><b class="mono">${effs.length ? `${Math.round(mean(effs))}%` : '—'}</b><span class="tag">efficiency</span></div>
        <div><b class="mono">${spread !== null ? `±${spread}m` : '—'}</b><span class="tag">consistency</span></div>
        <div><b class="mono">${hm(debtNow)}</b><span class="tag">debt</span></div>
      </div>
    </div>
    <div class="hl-cols">
      <div class="panel hl-wide">
        <p class="tag">Stages<span class="chips hl-inline" id="nights">${[14, 30]
          .map((n) => `<button class="chip tap${n === nights ? ' on' : ''}" data-nights="${n}">${n}</button>`)
          .join('')}</span></p>
        ${stages}
      </div>
      <div class="panel"><p class="tag">Consistency<span>30 nights</span></p>${dots}</div>
      <div class="panel"><p class="tag">Bed and wake<span>30 nights</span></p>${band}</div>
      <div class="panel hl-wide"><p class="tag">Debt<span>30 days</span></p>${debt}</div>
    </div>`,
    'hl-page',
  );
  const onClick = (ev: Event): void => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-nights]');
    if (!b) return;
    nights = Number(b.dataset.nights);
    again();
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
};
