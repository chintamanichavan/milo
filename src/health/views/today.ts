import { dial, hStack, numbers, rings, SERIES, W } from '../charts';
import {
  addDays,
  bedtimeFor,
  miloAge,
  strainOf,
  vitals,
  workoutLoad,
  ZONE_WORD,
  zoneOf,
  type DayScore,
  type InputKey,
  type VitalKey,
} from '../scores';
import type { Day } from '../types';
import type { Ctx, View } from './pages';
import { clockOf, dayLabel, dec, hm, int, noData, shell, signed, status, STATUS, workoutName } from './shell';

/** the day on show; null follows the newest */
let shown: string | null = null;

const INPUT_NAMES: Record<InputKey, string> = { hrv: 'HRV', rhr: 'Resting HR', sleep: 'Sleep', resp: 'Breathing' };
const inputValue = (key: InputKey, v: number): string =>
  key === 'hrv' ? `${Math.round(v)} ms` : key === 'rhr' ? `${Math.round(v)} bpm` : key === 'sleep' ? `${Math.round(v)}%` : `${dec(v)} /min`;
const inputDelta = (key: InputKey, v: number, base: number): string =>
  key === 'resp' ? signed(v - base, 1) : `${signed(v - base)}${key === 'sleep' ? ' pts' : ''}`;

function recoveryHero(ctx: Ctx, date: string, sc: DayScore | undefined, isLatest: boolean): string {
  const r = sc?.recovery ?? null;
  const zone = r === null ? null : zoneOf(r);
  const color = zone ? STATUS[zone].color : 'var(--line)';
  const label = r === null ? 'Recovery not ready yet' : `Recovery ${r}, ${ZONE_WORD[zone!]}`;
  const shownInputs = (sc?.inputs ?? []).filter((x) => x.key !== 'resp');
  const latest = ctx.latest!;
  return `<div class="hero hl-hero">
    <p class="tag section hl-daynav">
      <button class="link tap" data-step="-1" aria-label="The day before">‹</button>
      <span>Health · ${isLatest ? (latest === new Date().toLocaleDateString('en-CA') ? 'today' : `latest, ${dayLabel(date)}`) : dayLabel(date)}</span>
      <button class="link tap" data-step="1" aria-label="The day after"${date >= latest ? ' disabled' : ''}>›</button>
    </p>
    <figure class="hc hl-dial">
      <div data-tip="${label}">${dial(r, color, 220, label)}</div>
      <div class="hl-dial-mid"><b class="mono">${r ?? '—'}</b><span class="tag">recovery</span></div>
      <div class="hc-tip" aria-hidden="true"></div>
    </figure>
    <div class="hl-zone">${
      zone
        ? status(zone, ZONE_WORD[zone])
        : `<span class="line sub">Building your baseline — ${sc?.history ?? 0} of 4 days with heart data so far.</span>`
    }</div>
    ${
      shownInputs.length
        ? `<div class="hl-inputs">${shownInputs
            .map(
              (x) => `<div><span class="tag">${INPUT_NAMES[x.key]}</span><b class="mono">${inputValue(x.key, x.value)}</b>
                <small class="mono">${inputDelta(x.key, x.value, x.base)} vs 30d</small></div>`,
            )
            .join('')}</div>
          ${numbers(
            ['input', 'today', '30-day', 'weight'],
            (sc?.inputs ?? []).map((x) => [INPUT_NAMES[x.key], inputValue(x.key, x.value), inputValue(x.key, x.base), `${x.z >= 0 ? '+' : ''}${x.z.toFixed(1)} sd`]),
          )}`
        : ''
    }
  </div>`;
}

function strainPanel(ctx: Ctx, date: string, sc: DayScore | undefined, isLatest: boolean): string {
  if (!sc) return '';
  const [lo, hi] = sc.target;
  const x = (v: number): number => 4 + (v / 21) * (W - 8);
  const workouts = ctx.data.workouts.filter((w) => w.date === date);
  const where =
    sc.strain < lo
      ? isLatest
        ? `Room for about ${dec(lo - sc.strain)} more today, if you feel like it.`
        : `Under the ${lo}–${hi} range that day.`
      : sc.strain <= hi
        ? 'Right in the range.'
        : 'Past the range — tomorrow can be an easy one.';
  return `<div class="panel">
    <p class="tag">Day strain<span>target ${lo}–${hi}</span></p>
    <p class="hl-big"><b class="mono">${dec(sc.strain)}</b><span class="sub"> of 21 · ${where}</span></p>
    <figure class="hc">
      <svg class="hc-svg" viewBox="0 0 ${W} 40" role="img" aria-label="Strain ${dec(sc.strain)} against a target of ${lo} to ${hi}">
        <rect data-tip="Target ${lo}–${hi}, from this morning's recovery" x="${x(lo)}" y="6" width="${x(hi) - x(lo)}" height="20" rx="2" class="hl-target"/>
        <rect x="4" y="13" width="${W - 8}" height="6" rx="3" fill="var(--line)"/>
        ${sc.strain > 0 ? `<rect data-tip="Strain ${dec(sc.strain)} · load ${sc.load}" x="4" y="12" width="${Math.max(4, x(sc.strain) - 4)}" height="8" rx="4" fill="${SERIES[0]}"/>` : ''}
        ${[0, 7, 14, 21].map((t) => `<text class="hc-t" x="${x(t)}" y="38" text-anchor="middle">${t}</text>`).join('')}
      </svg>
      <div class="hc-tip" aria-hidden="true"></div>
      ${numbers(['', 'value'], [['strain', dec(sc.strain)], ['target', `${lo}–${hi}`], ['cardio load', sc.load]])}
    </figure>
    ${
      workouts.length
        ? `<div class="hl-rows">${workouts
            .map(
              (w) => `<a class="hl-row" href="#/health/workouts/${w.id}"><span>${workoutName(w.type)} · ${Math.round(w.durMin)} min</span>
                <span class="mono">${dec(strainOf(workoutLoad(w, ctx.s.maxHr)))} strain${w.avgHr ? ` · ${w.avgHr} bpm` : ''}</span></a>`,
            )
            .join('')}</div>`
        : '<p class="line sub">No workouts recorded; this is everyday movement.</p>'
    }
  </div>`;
}

function ringsPanel(ctx: Ctx, d: Day | undefined): string {
  if (!d || (d.active === undefined && d.exMin === undefined && d.stand === undefined))
    return `<div class="panel"><p class="tag">Activity</p><p class="line sub">No ring data this day.</p></div>`;
  const list = [
    { name: 'Move', value: d.active ?? 0, goal: d.moveGoal ?? 500, unit: 'kcal' },
    { name: 'Exercise', value: d.exMin ?? 0, goal: d.exGoal ?? 30, unit: 'min' },
    { name: 'Stand', value: d.stand ?? 0, goal: d.standGoal ?? 12, unit: 'hr' },
  ];
  const dist = d.distKm === undefined ? '' : ctx.units === 'mi' ? `${dec(d.distKm / 1.609344, 2)} mi` : `${dec(d.distKm, 2)} km`;
  return `<div class="panel">
    <p class="tag">Activity<span>${list.filter((r) => r.value >= r.goal).length} of 3 closed</span></p>
    <figure class="hc hl-rings">
      ${rings(list)}
      <div class="hl-ringlist">${list
        .map(
          (r, i) => `<div><span class="tag"><i style="background:${SERIES[i]}"></i>${r.name}</span>
            <b class="mono">${int(r.value)}<small>/${int(r.goal)} ${r.unit}</small></b></div>`,
        )
        .join('')}</div>
      <div class="hc-tip" aria-hidden="true"></div>
    </figure>
    ${numbers(['ring', 'done', 'goal', '%'], list.map((r) => [r.name, int(r.value), int(r.goal), `${Math.round((r.value / Math.max(1, r.goal)) * 100)}%`]))}
    <p class="line sub mono hl-small">${[
      d.steps !== undefined ? `${int(d.steps)} steps` : '',
      dist,
      d.flights !== undefined ? `${d.flights} flights` : '',
    ]
      .filter(Boolean)
      .join(' · ')}</p>
  </div>`;
}

function sleepPanel(ctx: Ctx, d: Day | undefined, sc: DayScore | undefined, isLatest: boolean): string {
  if (!d?.asleep || !sc?.need) return `<div class="panel"><p class="tag">Sleep</p><p class="line sub">No sleep recorded for this night.</p></div>`;
  const parts = [
    { name: 'Deep', value: d.deep ?? 0 },
    { name: 'Core', value: d.core ?? 0 },
    { name: 'REM', value: d.rem ?? 0 },
    { name: 'Awake', value: d.awake ?? 0 },
  ];
  const staged = parts.some((p) => p.value > 0);
  const tonight = isLatest ? bedtimeFor(ctx.data.days, d.date, sc.strain, ctx.s) : null;
  return `<div class="panel">
    <p class="tag">Sleep<span>${clockOf(d.bed ?? 0)} – ${clockOf(d.wake ?? 0)}</span></p>
    <p class="hl-big"><b class="mono">${sc.perf}%</b><span class="sub"> of what you needed</span></p>
    ${
      staged
        ? hStack(
            parts.map((p, i) => ({ ...p, fill: SERIES[i], tip: `${p.name} ${hm(p.value)}` })),
            'Sleep stages',
            { head: ['stage', 'time'], rows: parts.map((p) => [p.name, hm(p.value)]) },
          )
        : '<p class="line sub">No stages this night — just time asleep.</p>'
    }
    <div class="hl-rows">
      <div class="hl-row"><span>Needed</span><span class="mono">${hm(sc.need)}</span></div>
      <div class="hl-row"><span>Got</span><span class="mono">${hm(d.asleep)} asleep · ${hm(d.inBed ?? d.asleep)} in bed</span></div>
      <div class="hl-row"><span>Efficiency</span><span class="mono">${sc.efficiency ?? '—'}%</span></div>
      <div class="hl-row"><span>Debt going in</span><span class="mono">${hm(sc.debt)}</span></div>
    </div>
    ${
      tonight
        ? `<p class="line hl-tonight">Sleep by <b class="mono">${clockOf(tonight.bed)}</b> tonight for 100% — that is ${hm(tonight.need)} of sleep.</p>`
        : ''
    }
  </div>`;
}

const VITAL_NAMES: Record<VitalKey, string> = {
  rhr: 'Resting HR',
  hrv: 'HRV',
  resp: 'Breathing rate',
  spo2: 'Blood oxygen',
  temp: 'Wrist temp',
};
const vitalValue = (key: VitalKey, v: number, base: number): string =>
  key === 'rhr'
    ? `${Math.round(v)} bpm`
    : key === 'hrv'
      ? `${Math.round(v)} ms`
      : key === 'resp'
        ? `${dec(v)} /min`
        : key === 'spo2'
          ? `${Math.round(v)}%`
          : `${signed(v - base, 2)} °C`;
const vitalBase = (key: VitalKey, base: number): string =>
  key === 'temp' ? `${dec(base, 2)} °C` : key === 'resp' ? dec(base) : String(Math.round(base));

function vitalsPanel(days: Day[], date: string): string {
  const list = vitals(days, date);
  if (!list.length) return '';
  const flagged = list.filter((v) => v.flag).length;
  return `<div class="panel">
    <p class="tag">Overnight vitals<span>${flagged ? `${flagged} outside usual` : 'all usual'}</span></p>
    <div class="hl-rows">${list
      .map(
        (v) => `<a class="hl-row hl-vital" href="#/health/trends/${v.key}"><span>${VITAL_NAMES[v.key]}<small class="sub">usual ${vitalBase(v.key, v.base)}${
          v.n < 4 ? ', still learning' : v.flag ? '' : ' · in range'
        }</small></span>
          <b class="mono">${vitalValue(v.key, v.value, v.base)}</b>
          ${v.flag ? `<span class="hl-vital-s">${status('caution', `a touch ${v.flag} — keep an eye`)}</span>` : ''}</a>`,
      )
      .join('')}</div>
    <p class="line sub">Each against your own last 30 days; flagged only past one and a half times your usual spread.</p>
  </div>`;
}

function agePanel(ctx: Ctx, date: string): string {
  const a = miloAge(ctx.data.days, date, ctx.s);
  if (!a) return '';
  const word = a.delta < -0.05 ? `${dec(-a.delta)} years younger than` : a.delta > 0.05 ? `${dec(a.delta)} years older than` : 'the same as';
  return `<div class="panel">
    <p class="tag">Milo Age<span>an estimate, for fun</span></p>
    <p class="hl-big"><b class="mono">${dec(a.age)}</b><span class="sub"> — ${word} your calendar ${ctx.s.age}${ctx.ageKnown ? '' : ' (a stand-in age; set yours on Data)'}</span></p>
    <div class="hl-rows">${a.parts
      .map((p) => `<div class="hl-row"><span>${p.what}<small class="sub">${p.note}</small></span><span class="mono">${signed(p.years, 1)} y</span></div>`)
      .join('')}</div>
  </div>`;
}

export const todayView: View = (root, ctx, _arg, again) => {
  if (!ctx.latest) {
    root.innerHTML = shell('', `<div class="hero"><p class="tag section">Health · today</p><h1>Recovery, strain, rings, sleep</h1></div>${noData()}`, 'hl-page');
    return;
  }
  if (shown && shown > ctx.latest) shown = null;
  const date = shown ?? ctx.latest;
  const isLatest = date === ctx.latest;
  const sc = ctx.scores.get(date);
  const d = ctx.data.byDate.get(date);
  root.innerHTML = shell(
    '',
    `<div class="hl-split">
      <div class="hl-left">
        ${recoveryHero(ctx, date, sc, isLatest)}
        ${strainPanel(ctx, date, sc, isLatest)}
        ${ringsPanel(ctx, d)}
      </div>
      <div class="hl-side">
        ${sleepPanel(ctx, d, sc, isLatest)}
        ${vitalsPanel(ctx.data.days, date)}
        ${agePanel(ctx, date)}
      </div>
    </div>`,
    'hl-page hl-today',
  );
  const onClick = (ev: Event): void => {
    const step = (ev.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (!step || (step as HTMLButtonElement).disabled) return;
    const next = addDays(date, Number(step.dataset.step));
    const first = ctx.data.days[0]?.date ?? date;
    if (next < first || next > ctx.latest!) return;
    shown = next === ctx.latest ? null : next;
    again();
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
};
