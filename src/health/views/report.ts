import { addDays, allClosed, awards, closed, dateRange, mean, ZONE_WORD, zoneOf } from '../scores';
import type { Workout } from '../types';
import type { Ctx, View } from './pages';
import { dec, hm, int, laurel, monthLabel, noData, pace, shell, shortDay, status, workoutName } from './shell';

const KM_PER_MI = 1.609344;

/** what this stretch beat, against everything of the same kind before it */
function bests(ctx: Ctx, from: string, inside: Workout[]): string[] {
  const out: string[] = [];
  const before = ctx.data.workouts.filter((w) => w.date < from);
  const dist = (km: number): string => (ctx.units === 'mi' ? `${dec(km / KM_PER_MI, 2)} mi` : `${dec(km, 2)} km`);
  for (const name of [...new Set(inside.map((w) => workoutName(w.type)))]) {
    const mine = inside.filter((w) => workoutName(w.type) === name);
    const old = before.filter((w) => workoutName(w.type) === name);
    if (!old.length) continue;
    const far = Math.max(0, ...mine.map((w) => w.distKm ?? 0));
    if (far > 0 && far > Math.max(0, ...old.map((w) => w.distKm ?? 0))) out.push(`longest ${name.toLowerCase()}, ${dist(far)}`);
    const long = Math.max(...mine.map((w) => w.durMin));
    if (long > Math.max(...old.map((w) => w.durMin))) out.push(`longest ${name.toLowerCase()} by time, ${hm(long)}`);
    const speed = (w: Workout): number | undefined => (w.distKm && w.distKm >= 1 ? (w.durMin * 60) / w.distKm : undefined);
    const fast = mine.map(speed).filter((v): v is number => v !== undefined);
    const oldFast = old.map(speed).filter((v): v is number => v !== undefined);
    if (fast.length && oldFast.length && Math.min(...fast) < Math.min(...oldFast)) {
      const per = ctx.units === 'mi' ? Math.min(...fast) * KM_PER_MI : Math.min(...fast);
      out.push(`fastest ${name.toLowerCase()}, ${pace(per)} /${ctx.units}`);
    }
  }
  return out;
}

function card(ctx: Ctx, title: string, from: string, to: string, open: boolean): string {
  const dates = dateRange(from, to > ctx.latest! ? ctx.latest! : to);
  const days = dates.map((d) => ctx.data.byDate.get(d));
  const scores = dates.map((d) => ctx.scores.get(d));
  const recs = scores.map((s) => s?.recovery).filter((v): v is number => v != null);
  const strain = scores.reduce((s, x) => s + (x?.strain ?? 0), 0);
  const ws = ctx.data.workouts.filter((w) => w.date >= from && w.date <= to);
  const slept = days.map((d) => d?.asleep).filter((v): v is number => !!v);
  const debtStart = ctx.scores.get(from)?.debt;
  const debtEnd = scores[scores.length - 1]?.debt;
  const allThree = days.filter(allClosed).length;
  const move = days.filter((d) => closed(d, 'move')).length;
  const pbs = bests(ctx, from, ws);
  const avg = recs.length ? Math.round(mean(recs)) : null;

  const lines: string[] = [];
  if (avg !== null) lines.push(`Recovery averaged ${avg} — ${ZONE_WORD[zoneOf(avg)]}.`);
  lines.push(
    ws.length
      ? `You built ${dec(strain)} strain across ${ws.length} workout${ws.length === 1 ? '' : 's'} (${hm(ws.reduce((s, w) => s + w.durMin, 0))}).`
      : `${dec(strain)} strain, all from everyday movement.`,
  );
  if (slept.length) {
    const change = debtStart !== undefined && debtEnd !== undefined ? debtEnd - debtStart : null;
    lines.push(
      `Sleep averaged ${hm(mean(slept))}${
        change === null ? '.' : change === 0 ? '; debt held steady.' : change < 0 ? `; debt went down ${hm(-change)}.` : `; debt went up ${hm(change)}.`
      }`,
    );
  }
  if (days.some((d) => d?.moveGoal)) lines.push(`All three rings closed on ${allThree} of ${dates.length} days; move on ${move}.`);
  if (pbs.length) lines.push(`New best: ${pbs.join('; ')}.`);

  return `<details class="panel hl-report"${open ? ' open' : ''}>
    <summary><span class="tag">${title}</span>${avg !== null ? status(zoneOf(avg), ZONE_WORD[zoneOf(avg)]) : ''}</summary>
    <div class="hl-nums hl-nums4">
      <div><b class="mono">${avg ?? '—'}</b><span class="tag">recovery</span></div>
      <div><b class="mono">${dec(strain, 0)}</b><span class="tag">strain</span></div>
      <div><b class="mono">${allThree}</b><span class="tag">rings closed</span></div>
      <div><b class="mono">${pbs.length}</b><span class="tag">bests</span></div>
    </div>
    ${lines.map((l) => `<p class="line">${l}</p>`).join('')}
  </details>`;
}

const mondayOf = (date: string): string => {
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((wd + 6) % 7));
};

export const reportView: View = (root, ctx) => {
  if (!ctx.latest) {
    root.innerHTML = shell('report', `<div class="hero"><p class="tag section">Health · reports</p><h1>Reports</h1></div>${noData()}`, 'hl-page');
    return;
  }
  const latest = ctx.latest;
  const thisWeek = mondayOf(latest);
  const weeks = [0, 1, 2, 3].map((k) => addDays(thisWeek, -7 * k));
  const ym = latest.slice(0, 7);
  const months = [0, 1, 2].map((k) => {
    const d = new Date(`${ym}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - k);
    return d.toISOString().slice(0, 7);
  });
  const lastOf = (m: string): string => {
    const d = new Date(`${m}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  };
  const a = awards(ctx.data.days, latest);
  const list: [string, string, number][] = [
    ['Move streak', 'days in a row with the move ring closed', a.moveStreak],
    ['Longest move streak', 'your best run of move days', a.longestMove],
    ['Longest all-rings streak', 'every ring, every day', a.longestAll],
    ['Perfect weeks', 'Monday to Sunday, all three rings each day', a.perfectWeeks],
    ['Double move days', 'twice your move goal', a.doubles],
  ];

  root.innerHTML = shell(
    'report',
    `<div class="hero">
      <p class="tag section">Health · reports</p>
      <h1>Week of ${shortDay(thisWeek)}<span><i> · </i>so far</span></h1>
      <p class="line sub">Weekly and monthly, worked out from what is stored. Tap a card to open it.</p>
    </div>
    <div class="hl-cols">
      <div>
        <p class="tag section">Weeks</p>
        ${weeks.map((w, i) => card(ctx, i === 0 ? `This week · from ${shortDay(w)}` : `Week of ${shortDay(w)}`, w, addDays(w, 6), i < 2)).join('')}
      </div>
      <div>
        <p class="tag section">Months</p>
        ${months.map((m, i) => card(ctx, `${monthLabel(m, true)}${i === 0 ? ' · so far' : ''}`, `${m}-01`, lastOf(m), i === 0)).join('')}
        <div class="panel">
          <p class="tag">Awards</p>
          <div class="hl-awards">${list
            .map(
              ([name, how, n]) => `<div class="hl-award${n ? '' : ' none'}">${laurel()}<span><b>${name}</b><small class="sub">${how}</small></span>
                <b class="mono">${int(n)}</b></div>`,
            )
            .join('')}</div>
        </div>
      </div>
    </div>`,
    'hl-page',
  );
};
