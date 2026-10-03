import { barChart, hStack, lineChart, seq, wideW } from '../charts';
import { addDays, strainOf, timeInZones, workoutLoad, ZONE_FLOORS } from '../scores';
import type { Workout } from '../types';
import type { Ctx, View } from './pages';
import { dayLabel, dec, hm, int, monthLabel, noData, pace, shell, shortDay, workoutIcon, workoutName } from './shell';

let filter = 'all';

const KM_PER_MI = 1.609344;
const distOf = (ctx: Ctx, km: number): string => (ctx.units === 'mi' ? `${dec(km / KM_PER_MI, 2)} mi` : `${dec(km, 2)} km`);
const paceOf = (ctx: Ctx, w: Workout): string | null => {
  if (!w.distKm || w.distKm < 0.2) return null;
  const per = ctx.units === 'mi' ? w.distKm / KM_PER_MI : w.distKm;
  return `${pace((w.durMin * 60) / per)} /${ctx.units}`;
};
const timeOf = (w: Workout): string => new Date(w.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const workoutsView: View = (root, ctx, _arg, again) => {
  const all = [...ctx.data.workouts].reverse();
  if (!all.length) {
    root.innerHTML = shell('workouts', `<div class="hero"><p class="tag section">Health · workouts</p><h1>Workouts</h1></div>${noData()}`, 'hl-page');
    return;
  }
  const types = [...new Set(all.map((w) => workoutName(w.type)))].sort();
  if (filter !== 'all' && !types.includes(filter)) filter = 'all';
  const list = filter === 'all' ? all : all.filter((w) => workoutName(w.type) === filter);
  const latest = ctx.latest!;
  const month = list.filter((w) => w.date > addDays(latest, -30));

  // weekly minutes, twelve weeks to the latest day
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(latest, -7 * (11 - i) - 6));
  const minutes = weeks.map((from) => {
    const to = addDays(from, 6);
    return Math.round(list.filter((w) => w.date >= from && w.date <= to).reduce((s, w) => s + w.durMin, 0));
  });

  const groups = new Map<string, Workout[]>();
  for (const w of list) groups.set(w.date.slice(0, 7), [...(groups.get(w.date.slice(0, 7)) ?? []), w]);

  root.innerHTML = shell(
    'workouts',
    `<div class="hero">
      <p class="tag section">Health · workouts</p>
      <h1>${month.length}<span><i> · </i>in the last 30 days</span></h1>
      <p class="line sub">${hm(month.reduce((s, w) => s + w.durMin, 0))} in all, ${int(month.reduce((s, w) => s + (w.kcal ?? 0), 0))} kcal.</p>
    </div>
    <div class="chips" id="filter">${['all', ...types]
      .map((t) => `<button class="chip tap${t === filter ? ' on' : ''}" data-filter="${t}">${t === 'all' ? 'All' : t}</button>`)
      .join('')}</div>
    <div class="hl-cols">
      <div class="panel hl-wide"><p class="tag">Minutes a week<span>12 weeks</span></p>${barChart({
        caption: 'Workout minutes each week, Monday-ish to Sunday-ish, ending on the latest day.',
        labels: weeks.map((w) => `week of ${shortDay(w)}`),
        ticks: weeks.map((w, i) => (i % 3 === 0 || i === 11 ? shortDay(w) : '')),
        series: [{ name: 'Minutes', values: minutes }],
        fmt: (v) => `${Math.round(v)}`,
        what: 'week',
        height: 120,
        width: wideW(),
      })}</div>
      ${[...groups.entries()]
        .map(
          ([ym, ws]) => `<div class="panel hl-wk-month">
            <p class="tag">${monthLabel(ym, true)}<span>${ws.length}</span></p>
            ${ws
              .map(
                (w) => `<a class="hl-wk tap" href="#/health/workouts/${w.id}">
                  <span class="hl-wk-icon">${workoutIcon(w.type)}</span>
                  <span><b>${workoutName(w.type)}</b><small class="sub">${dayLabel(w.date)} · ${timeOf(w)}</small></span>
                  <span class="mono hl-wk-nums">${hm(w.durMin)}${w.distKm ? ` · ${distOf(ctx, w.distKm)}` : ''}<small>${w.kcal ? `${int(w.kcal)} kcal` : ''}${w.avgHr ? ` · ${w.avgHr} bpm` : ''}</small></span>
                </a>`,
              )
              .join('')}
          </div>`,
        )
        .join('')}
    </div>`,
    'hl-page',
  );
  const onClick = (ev: Event): void => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter!;
    again();
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
};

const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
/** faint steps of the teal behind the heart-rate line */
const BAND = [0.05, 0.09, 0.13, 0.17, 0.22].map((a) => `rgba(42, 160, 141, ${a})`);

export const workoutDetailView: View = (root, ctx, id) => {
  const w = ctx.data.workouts.find((x) => x.id === id);
  if (!w) {
    root.innerHTML = shell('workouts', `<div class="hero"><p class="tag section"><a class="tap" href="#/health/workouts">← Workouts</a></p><h1>Not found</h1>
      <p class="line sub">This workout is not stored any more.</p></div>`, 'hl-page');
    return;
  }
  const max = ctx.s.maxHr;
  const hr = w.hr ?? [];
  const zones = hr.length > 2 ? timeInZones(w, max) : null;
  const strain = strainOf(workoutLoad(w, max));
  const bounds = ZONE_FLOORS.map((f) => Math.round(f * max));
  const splits = (ctx.units === 'mi' ? w.splitsMi : w.splits) ?? [];
  const p = paceOf(ctx, w);

  let hrChart = '';
  if (hr.length > 2) {
    const lo = Math.min(Math.min(...hr.map((x) => x[1])) - 5, bounds[0] - 5);
    const hi = Math.max(Math.max(...hr.map((x) => x[1])) + 5, bounds[4] + 8);
    const every = w.durMin > 60 ? 20 : w.durMin > 25 ? 10 : 5;
    hrChart = lineChart({
      caption: `Heart rate through the workout, over the five zones (shaded, from ${bounds[0]} bpm up; top ${max} bpm).`,
      labels: hr.map(([t]) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')} in`),
      xs: hr.map(([t]) => t),
      ticks: hr.map(([t], i) => {
        const m = Math.floor(t / 60);
        const prev = i ? Math.floor(hr[i - 1][0] / 60) : -1;
        return m % every === 0 && Math.floor(prev / every) !== Math.floor(m / every) ? `${m}′` : '';
      }),
      series: [{ name: 'Heart rate', values: hr.map(([, v]) => v) }],
      fmt: (v) => `${Math.round(v)}`,
      lo,
      hi,
      bands: bounds.map((b, k) => ({ from: b, to: k < 4 ? bounds[k + 1] : hi, fill: BAND[k], label: `Z${k + 1}` })),
      what: 'time',
      height: 200,
      width: wideW(),
    });
  }

  const zoneBar = zones
    ? hStack(
        zones.map((sec, k) => ({
          name: `Z${k + 1}`,
          value: sec,
          fill: seq(k),
          tip: `${ZONE_NAMES[k]}, ${bounds[k]}${k < 4 ? `–${bounds[k + 1] - 1}` : '+'} bpm: ${hm(sec / 60)}`,
        })),
        'Time in each heart-rate zone',
        {
          head: ['zone', 'bpm', 'time'],
          rows: zones.map((sec, k) => [ZONE_NAMES[k], `${bounds[k]}${k < 4 ? `–${bounds[k + 1] - 1}` : '+'}`, hm(sec / 60)]),
        },
        18,
      )
    : '';

  const splitChart = splits.length
    ? barChart({
        caption: `Time for each ${ctx.units === 'mi' ? 'mile' : 'kilometre'}; taller is slower. The last may be part of one.`,
        labels: splits.map((s) => `${ctx.units} ${s.n}${s.len < 1 ? ` (${s.len})` : ''}`),
        ticks: splits.map((s) => String(s.n)),
        series: [{ name: 'Pace', values: splits.map((s) => s.sec / s.len) }],
        fmt: (v) => pace(v),
        step: 120,
        what: 'split',
        height: 120,
        table: {
          head: ['split', 'time', 'pace', 'bpm'],
          rows: splits.map((s) => [`${s.n}${s.len < 1 ? ` (${s.len})` : ''}`, pace(s.sec), pace(s.sec / s.len), s.hr ?? '—']),
        },
      })
    : '';

  root.innerHTML = shell(
    'workouts',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/health/workouts">← Workouts</a> · ${dayLabel(w.date)} · ${timeOf(w)}</p>
      <h1 class="hl-wk-title">${workoutIcon(w.type)} ${workoutName(w.type)}<span><i> · </i>${hm(w.durMin)}</span></h1>
    </div>
    <div class="panel">
      <div class="hl-nums">
        ${w.distKm ? `<div><b class="mono">${distOf(ctx, w.distKm)}</b><span class="tag">distance</span></div>` : ''}
        ${p ? `<div><b class="mono">${p}</b><span class="tag">pace</span></div>` : ''}
        ${w.kcal ? `<div><b class="mono">${int(w.kcal)}</b><span class="tag">active kcal</span></div>` : ''}
        ${w.avgHr ? `<div><b class="mono">${w.avgHr}</b><span class="tag">avg bpm</span></div>` : ''}
        ${w.maxHr ? `<div><b class="mono">${w.maxHr}</b><span class="tag">max bpm</span></div>` : ''}
        ${w.elevM ? `<div><b class="mono">${ctx.units === 'mi' ? `${int(w.elevM * 3.28084)} ft` : `${int(w.elevM)} m`}</b><span class="tag">climbed</span></div>` : ''}
        <div><b class="mono">${dec(strain)}</b><span class="tag">strain</span></div>
      </div>
    </div>
    <div class="hl-cols">
      ${hrChart ? `<div class="panel hl-wide"><p class="tag">Heart rate<span>${hr.length} points</span></p>${hrChart}</div>` : '<div class="panel"><p class="tag">Heart rate</p><p class="line sub">No heart rate was recorded for this one, so its strain comes from its calories.</p></div>'}
      ${zoneBar ? `<div class="panel"><p class="tag">Time in zones<span>top ${max} bpm</span></p>${zoneBar}</div>` : ''}
      ${splitChart ? `<div class="panel"><p class="tag">Splits<span>${splits.length}</span></p>${splitChart}</div>` : ''}
    </div>
    ${w.source ? `<p class="line sub">Recorded by ${w.source}.</p>` : ''}`,
    'hl-page',
  );
};
