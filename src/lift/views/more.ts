import { miloMark } from '../../badge';
import { barList } from '../../ui/chart';
import { closeSheet, sheet } from '../../ui/sheet';
import { clock } from '../../ui/time';
import { toast } from '../../ui/toast';
import type { Routine } from '../data';
import { GEAR_NAMES, LIBRARY, type Exercise, type Gear } from '../library';
import { muscleMap, setsPerMuscle } from '../muscles';
import type { SetLog, SetType } from '../progression';
import {
  activeGym,
  ALL_GEAR,
  deleteGym,
  exerciseById,
  fromLb,
  loadLift,
  plates,
  saveGym,
  saveLift,
  saveRoutine,
  setsDone,
  showWeight,
  switchGym,
  toLb,
  volumeOf,
  type Gym,
  type LiftState,
  type Session,
  type Units,
} from '../store';
import { liftSubNav } from './pages';

const shell = (active: string, body: string): string => `
  <section class="today lift-page detail">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${liftSubNav(active)}
    ${body}
  </section>`;

const routineName = (state: LiftState, session: Session): string =>
  state.routines.find((r) => r.id === session.routineId)?.name ?? session.note?.split('\n')[0] ?? 'Workout';

const working = (sets: SetLog[]): SetLog[] => sets.filter((s) => s.done && s.type !== 'w');

const longDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

/* ---------- 115. a workout as plain text ---------- */

/** a summary to paste anywhere — a chat with a coach, or an AI */
export function sessionText(state: LiftState, session: Session): string {
  const units = state.settings.units;
  const lines = [
    `${routineName(state, session)} — ${longDate(session.date)}`,
    `${clock(session.durationSec)} · ${setsDone(session)} working sets · ${showWeight(volumeOf(session), units)} lifted`,
    '',
  ];
  for (const entry of session.entries) {
    const sets = entry.sets.filter((s) => s.done);
    if (!sets.length) continue;
    const ex = exerciseById(state, entry.exerciseId);
    lines.push(`${ex.name} (${ex.muscle}, ${GEAR_NAMES[ex.gear] ?? ex.gear})`);
    sets.forEach((s, i) => {
      const tag = s.type === 'w' ? ' warm-up' : s.type === 'f' ? ' to failure' : s.type === 'd' ? ' drop set' : '';
      lines.push(`  ${i + 1}. ${showWeight(s.weightLb, units)} × ${s.reps}${s.rpe ? ` @ RPE ${s.rpe}` : ''}${tag}`);
    });
    if (entry.note) lines.push(`  note: ${entry.note}`);
  }
  if (session.prs?.length)
    lines.push(
      '',
      `Records: ${session.prs
        .map((p) => `${exerciseById(state, p.exerciseId).name} ${p.kind === 'oneRm' ? 'est 1RM' : p.kind} ${showWeight(p.value, units)}`)
        .join('; ')}`,
    );
  if (session.note) lines.push('', `Notes: ${session.note}`);
  return lines.join('\n');
}

export async function copySession(state: LiftState, session: Session): Promise<void> {
  const text = sessionText(state, session);
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied — paste it anywhere');
  } catch {
    const host = sheet('Copy this', `<textarea class="dest area" rows="14" id="copyText">${text}</textarea>`);
    const area = host.querySelector<HTMLTextAreaElement>('#copyText')!;
    area.select();
  }
}

/* ---------- 112. a card to share ---------- */

/** a 1080 × 1350 card, drawn on a canvas, with the session and any records */
export async function sessionCard(state: LiftState, session: Session): Promise<Blob> {
  const units = state.settings.units;
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--run').trim() || '#c5f74f';
  const sans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const mono = 'ui-monospace, Menlo, monospace';

  g.fillStyle = '#0b0d0f';
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.8, 120, 20, w * 0.8, 120, 700);
  glow.addColorStop(0, `${accent}33`);
  glow.addColorStop(1, 'transparent');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);

  g.fillStyle = accent;
  g.font = `600 30px ${mono}`;
  g.fillText('MILO · LIFT', 80, 110);
  g.fillStyle = '#e9eef1';
  g.font = `800 92px ${sans}`;
  g.fillText(routineName(state, session), 80, 230, w - 160);
  g.fillStyle = '#7d888f';
  g.font = `400 36px ${sans}`;
  g.fillText(longDate(session.date), 80, 290);

  const stats: [string, string][] = [
    [clock(session.durationSec), 'time'],
    [String(setsDone(session)), 'sets'],
    [showWeight(volumeOf(session), units), 'lifted'],
  ];
  stats.forEach(([value, label], i) => {
    const x = 80 + i * 320;
    g.fillStyle = '#e9eef1';
    g.font = `700 60px ${mono}`;
    g.fillText(value, x, 410, 300);
    g.fillStyle = '#7d888f';
    g.font = `400 28px ${mono}`;
    g.fillText(label.toUpperCase(), x, 455);
  });

  g.strokeStyle = '#222a2f';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(80, 510);
  g.lineTo(w - 80, 510);
  g.stroke();

  let y = 590;
  for (const entry of session.entries.slice(0, 7)) {
    const sets = working(entry.sets);
    if (!sets.length) continue;
    const top = sets.reduce((a, b) => (b.weightLb * b.reps > a.weightLb * a.reps ? b : a));
    g.fillStyle = '#e9eef1';
    g.font = `500 42px ${sans}`;
    g.fillText(exerciseById(state, entry.exerciseId).name, 80, y, 620);
    g.fillStyle = '#7d888f';
    g.font = `400 36px ${mono}`;
    g.textAlign = 'right';
    g.fillText(`${sets.length} sets · ${showWeight(top.weightLb, units)} × ${top.reps}`, w - 80, y);
    g.textAlign = 'left';
    y += 78;
  }

  if (session.prs?.length) {
    y += 20;
    g.fillStyle = accent;
    g.font = `600 30px ${mono}`;
    g.fillText(`${session.prs.length} RECORD${session.prs.length > 1 ? 'S' : ''}`, 80, y);
    y += 56;
    g.font = `500 36px ${sans}`;
    for (const pr of session.prs.slice(0, 3)) {
      g.fillStyle = '#e9eef1';
      g.fillText(
        `★ ${exerciseById(state, pr.exerciseId).name} — ${pr.kind === 'oneRm' ? 'est 1RM' : pr.kind === 'weight' ? 'heaviest' : 'volume'} ${showWeight(pr.value, units)}`,
        80,
        y,
        w - 160,
      );
      y += 56;
    }
  }

  g.fillStyle = '#7d888f';
  g.font = `400 26px ${mono}`;
  g.fillText('carried daily, grows slowly', 80, h - 70);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

export async function shareSession(state: LiftState, session: Session): Promise<void> {
  const blob = await sessionCard(state, session);
  const file = new File([blob], `milo-${routineName(state, session).replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: routineName(state, session) });
      return;
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Card saved');
}

/* ---------- 108. the month in review ---------- */

const monthOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthName = (ym: string): string =>
  new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export function liftReportView(root: HTMLElement): () => void {
  const state = loadLift();
  const units = state.settings.units;
  const months = [...new Set(state.sessions.map((s) => monthOf(s.date)))].sort().reverse();
  const last = new Date();
  last.setDate(1);
  last.setMonth(last.getMonth() - 1);
  const fallback = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
  const ym = location.hash.split('/')[3] || (months.includes(fallback) ? fallback : months[0] ?? fallback);
  const sessions = state.sessions.filter((s) => monthOf(s.date) === ym);
  const [y, m] = ym.split('-').map(Number);
  const from = new Date(y, m - 1, 1).getTime();
  const to = new Date(y, m, 1).getTime();
  const inMonth: LiftState = { ...state, sessions };
  const split = setsPerMuscle(inMonth, from);
  const bySets = new Map<string, number>();
  for (const s of sessions)
    for (const e of s.entries) bySets.set(e.exerciseId, (bySets.get(e.exerciseId) ?? 0) + working(e.sets).length);
  const prs = sessions.flatMap((s) => (s.prs ?? []).map((p) => ({ ...p, date: s.date })));
  const time = sessions.reduce((a, s) => a + s.durationSec, 0);
  const previous = state.sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t < from && t >= from - (to - from);
  });
  const change = (now: number, before: number): string =>
    before ? ` <span class="${now >= before ? 'up' : 'down'}">${now >= before ? '↑' : '↓'} ${Math.abs(Math.round(((now - before) / before) * 100))}%</span>` : '';

  root.innerHTML = shell(
    'stats',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/lift/stats">← Stats</a> · Monthly report</p>
      <h1>${monthName(ym)}</h1>
      <p class="line sub">${sessions.length ? `${sessions.length} workouts, ${clock(time)} under the bar.` : 'No workouts logged this month.'}</p>
    </div>
    <div class="report-nums">
      <div><b>${sessions.length}${change(sessions.length, previous.length)}</b><span>workouts</span></div>
      <div><b>${clock(time)}</b><span>time</span></div>
      <div><b>${sessions.reduce((a, s) => a + setsDone(s), 0)}${change(
        sessions.reduce((a, s) => a + setsDone(s), 0),
        previous.reduce((a, s) => a + setsDone(s), 0),
      )}</b><span>sets</span></div>
      <div><b>${showWeight(sessions.reduce((a, s) => a + volumeOf(s), 0), units)}</b><span>volume</span></div>
    </div>
    <div class="panel muscle-split"><p class="tag">Muscle split<span>sets</span></p>
      ${muscleMap(split)}
      ${barList(
        [...split.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 })),
        ' sets',
      )}</div>
    <div class="panel"><p class="tag">Records<span>${prs.length}</span></p>${
      prs.length
        ? `<ul class="changes prs">${prs
            .map(
              (p) => `<li>${exerciseById(state, p.exerciseId).name} · ${p.kind === 'oneRm' ? 'est 1RM' : p.kind === 'weight' ? 'heaviest set' : 'best volume'} ${showWeight(p.value, units)} <span class="muted">${new Date(p.date).getDate()} ${monthName(ym).split(' ')[0].slice(0, 3)}</span></li>`,
            )
            .join('')}</ul>`
        : '<p class="line sub">None this month — the heavy days are coming.</p>'
    }</div>
    <div class="panel"><p class="tag">Top exercises<span>working sets</span></p>${barList(
      [...bySets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => ({ label: exerciseById(state, id).name, value: n })),
      ' sets',
    )}</div>
    <div class="panel"><p class="tag">Other months</p>
      <div class="chips">${months
        .map((mm) => `<a class="chip tap${mm === ym ? ' on' : ''}" href="#/lift/report/${mm}">${monthName(mm)}</a>`)
        .join('') || '<p class="line sub">Nothing yet.</p>'}</div></div>`,
  );
  return () => {};
}

/* ---------- 113. export, and import from Strong and Hevy ---------- */

function csvRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0];
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const csvCell = (v: string | number): string => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** every set, in the columns Strong uses, so other apps can read it */
export function liftCsv(state: LiftState): string {
  const units = state.settings.units;
  const header = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'RPE', 'Set Type', 'Notes', 'Workout Notes'];
  const lines = [header.join(',')];
  for (const s of state.sessions)
    for (const e of s.entries)
      e.sets
        .filter((x) => x.done)
        .forEach((x, i) =>
          lines.push(
            [
              new Date(s.date).toISOString().replace('T', ' ').slice(0, 19),
              routineName(state, s),
              `${Math.round(s.durationSec / 60)}m`,
              exerciseById(state, e.exerciseId).name,
              x.type === 'w' ? 'W' : String(i + 1),
              units === 'kg' ? Math.round(x.weightLb * 0.45359237 * 10) / 10 : x.weightLb,
              x.reps,
              x.rpe ?? '',
              x.type ?? 'n',
              e.note ?? '',
              s.note ?? '',
            ]
              .map(csvCell)
              .join(','),
          ),
        );
  return lines.join('\n');
}

interface ImportedSet {
  date: string;
  workout: string;
  exercise: string;
  set: SetLog;
  durationSec: number;
}

const tokens = (name: string): string[] =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\bbent over\b/g, '')
    .replace(/\bpull ?up\b/g, 'pullup')
    .replace(/\bchin ?up\b/g, 'chinup')
    .replace(/\bpush ?up\b/g, 'pushup')
    .replace(/\boverhead press\b|\bmilitary press\b/g, 'overhead press')
    .replace(/\bbicep\b/g, 'curl')
    .split(/\s+/)
    .filter((t) => t && !['the', 'a', 'with'].includes(t));

const GEAR_WORDS: [RegExp, Gear][] = [
  [/barbell/i, 'barbell'],
  [/dumbbell/i, 'dumbbell'],
  [/cable/i, 'cable'],
  [/machine/i, 'machine'],
  [/smith/i, 'smith'],
  [/kettlebell/i, 'kettlebell'],
  [/band/i, 'band'],
  [/ez ?bar/i, 'ezbar'],
  [/trap ?bar|hex/i, 'trapbar'],
  [/bodyweight|assisted/i, 'bodyweight'],
];

/** the closest exercise by name, nudged by the equipment in brackets */
export function bestMatches(name: string, pool: Exercise[], n = 5): { exercise: Exercise; score: number }[] {
  const want = tokens(name);
  const gear = GEAR_WORDS.find(([re]) => re.test(name))?.[1];
  return pool
    .map((exercise) => {
      const have = tokens(exercise.name);
      const shared = want.filter((t) => have.includes(t) || have.includes(t.replace(/s$/, ''))).length;
      const score = shared / Math.max(1, new Set([...want, ...have]).size) + (gear && exercise.gear === gear ? 0.25 : 0);
      return { exercise, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

function readImport(text: string): { format: string; sets: ImportedSet[]; weightIn: Units | null } {
  const rows = csvRows(text);
  const head = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const col = (...names: string[]): number => head.findIndex((h) => names.includes(h));
  const data = rows.slice(1);
  const sets: ImportedSet[] = [];
  if (col('exercise_title') >= 0) {
    // Hevy
    const kg = col('weight_kg');
    const lbs = col('weight_lbs');
    for (const r of data) {
      const type = (r[col('set_type')] ?? '').toLowerCase();
      const weight = Number(r[kg >= 0 ? kg : lbs]) || 0;
      const start = r[col('start_time')];
      const end = r[col('end_time')];
      sets.push({
        date: new Date(start.replace(',', '')).toISOString(),
        workout: r[col('title')] || 'Workout',
        exercise: r[col('exercise_title')],
        durationSec: Math.max(0, (new Date(end.replace(',', '')).getTime() - new Date(start.replace(',', '')).getTime()) / 1000) || 0,
        set: {
          weightLb: kg >= 0 ? toLb(weight, 'kg') : weight,
          reps: Number(r[col('reps')]) || 0,
          done: true,
          type: (type.startsWith('warm') ? 'w' : type.startsWith('fail') ? 'f' : type.startsWith('drop') ? 'd' : 'n') as SetType,
          ...(Number(r[col('rpe')]) ? { rpe: Number(r[col('rpe')]) } : {}),
        },
      });
    }
    return { format: 'Hevy', sets, weightIn: null };
  }
  if (col('exercise name') >= 0) {
    // Strong: weights are in whatever unit the app was set to, which the file does not say
    const duration = (v: string): number => {
      const h = Number(/(\d+)h/.exec(v)?.[1] ?? 0);
      const m = Number(/(\d+)m/.exec(v)?.[1] ?? 0);
      return h * 3600 + m * 60;
    };
    for (const r of data) {
      const order = r[col('set order')] ?? '';
      sets.push({
        date: new Date(r[col('date')].replace(' ', 'T')).toISOString(),
        workout: r[col('workout name')] || 'Workout',
        exercise: r[col('exercise name')],
        durationSec: duration(r[col('duration')] ?? ''),
        set: {
          weightLb: Number(r[col('weight')]) || 0,
          reps: Number(r[col('reps')]) || 0,
          done: true,
          type: (order === 'W' ? 'w' : order === 'D' ? 'd' : order === 'F' ? 'f' : 'n') as SetType,
          ...(Number(r[col('rpe')]) ? { rpe: Number(r[col('rpe')]) } : {}),
        },
      });
    }
    return { format: 'Strong', sets, weightIn: 'lb' };
  }
  return { format: '', sets, weightIn: null };
}

export function liftDataView(root: HTMLElement): () => void {
  const state = loadLift();
  root.innerHTML = shell(
    'stats',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/lift/stats">← Stats</a> · Export and import</p>
      <h1>${state.sessions.length}<span><i> · </i>workouts on record</span></h1>
    </div>
    <div class="panel"><p class="tag">Export</p>
      <p class="line sub">Every set, one row each, in the columns Strong uses — most apps and spreadsheets read it.</p>
      <button class="chip tap" id="csvOut">download CSV</button></div>
    <div class="panel"><p class="tag">Import from Strong or Hevy</p>
      <p class="line sub">Export a CSV from either app and pick it here. You will see how each exercise maps before anything is saved.</p>
      <label class="chip tap">choose a CSV<input type="file" id="csvIn" accept=".csv,text/csv" hidden></label>
      <div id="review"></div></div>`,
  );
  root.querySelector('#csvOut')!.addEventListener('click', () => {
    const blob = new Blob([liftCsv(loadLift())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'milo-lifts.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('CSV saved');
  });
  root.querySelector('#csvIn')!.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const { format, sets, weightIn } = readImport(await file.text());
    const review = root.querySelector<HTMLElement>('#review')!;
    if (!format || !sets.length) {
      review.innerHTML = '<p class="line">That does not look like a Strong or Hevy export.</p>';
      return;
    }
    const pool = [...LIBRARY, ...loadLift().customs];
    const names = [...new Set(sets.map((s) => s.exercise))];
    const sessions = new Set(sets.map((s) => `${s.date}|${s.workout}`)).size;
    review.innerHTML = `<p class="line"><b>${format}</b>: ${sessions} workouts, ${sets.length} sets, ${names.length} exercises.</p>
      ${
        weightIn
          ? `<div class="chips" id="unitsIn"><span class="tag">weights in</span>
              <button class="chip tap on" data-u="lb">lb</button><button class="chip tap" data-u="kg">kg</button></div>`
          : ''
      }
      <div class="map-table">${names
        .map((name) => {
          const best = bestMatches(name, pool);
          const pick = best[0].score >= 0.34 ? best[0].exercise.id : '__new';
          const count = sets.filter((s) => s.exercise === name).length;
          return `<label class="map-row"><span>${name}<small>${count} sets</small></span>
            <select class="dest" data-map="${name.replace(/"/g, '&quot;')}">
              <option value="__new"${pick === '__new' ? ' selected' : ''}>keep as a new exercise</option>
              ${best.map((b) => `<option value="${b.exercise.id}"${b.exercise.id === pick ? ' selected' : ''}>${b.exercise.name}</option>`).join('')}
              <option disabled>──────</option>
              ${pool.map((e) => `<option value="${e.id}">${e.name}</option>`).join('')}
            </select></label>`;
        })
        .join('')}</div>
      <button class="big tap" id="doImport">IMPORT ${sessions} WORKOUTS</button>`;
    let units: Units = 'lb';
    review.querySelector('#unitsIn')?.addEventListener('click', (e2) => {
      const chip = (e2.target as HTMLElement).closest<HTMLElement>('[data-u]');
      if (!chip) return;
      units = chip.dataset.u as Units;
      review.querySelectorAll('[data-u]').forEach((c) => c.classList.toggle('on', c === chip));
    });
    review.querySelector('#doImport')!.addEventListener('click', () => {
      const next = loadLift();
      const map = new Map<string, string>();
      for (const select of review.querySelectorAll<HTMLSelectElement>('[data-map]')) {
        let id = select.value;
        if (id === '__new') {
          const name = select.dataset.map!;
          const existing = next.customs.find((c) => c.name.toLowerCase() === name.toLowerCase());
          id = existing?.id ?? `custom-${Date.now()}-${map.size}`;
          if (!existing) {
            const gear = GEAR_WORDS.find(([re]) => re.test(name))?.[1] ?? 'barbell';
            next.customs.push({ id, name: name.replace(/\s*\(.*?\)\s*/g, ' ').trim(), muscle: bestMatches(name, LIBRARY, 1)[0].exercise.muscle, also: '', gear, inc: 5, how: `Imported from ${format}.` });
          }
        }
        map.set(select.dataset.map!, id);
      }
      const known = new Set(next.sessions.map((s) => s.date));
      const grouped = new Map<string, Session>();
      for (const s of sets) {
        const key = `${s.date}|${s.workout}`;
        if (known.has(s.date)) continue;
        const session = grouped.get(key) ?? {
          date: s.date,
          routineId: 'imported',
          entries: [],
          durationSec: s.durationSec,
          note: s.workout,
        };
        const id = map.get(s.exercise)!;
        let entry = session.entries.find((e) => e.exerciseId === id);
        if (!entry) {
          entry = { exerciseId: id, sets: [] };
          session.entries.push(entry);
        }
        entry.sets.push({ ...s.set, weightLb: weightIn && units === 'kg' ? toLb(s.set.weightLb, 'kg') : s.set.weightLb });
        grouped.set(key, session);
      }
      next.sessions = [...next.sessions, ...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
      saveLift(next);
      toast(`${grouped.size} workouts imported`);
      liftDataView(root);
    });
  });
  return () => {};
}

/* ---------- 119. a routine to pass on ---------- */

interface Shared {
  v: 1;
  name: string;
  items: (Routine['items'][number] & { name: string })[];
}

const toBase64Url = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (code: string): string => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64 + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function sharedRoutine(state: LiftState, routine: Routine): Shared {
  return {
    v: 1,
    name: routine.name,
    items: routine.items.map((i) => ({ ...i, name: exerciseById(state, i.exerciseId).name })),
  };
}

export const routineLink = (shared: Shared): string =>
  `${location.origin}${location.pathname}#/lift/import?d=${toBase64Url(JSON.stringify(shared))}`;

export function shareRoutine(state: LiftState, routine: Routine): void {
  const shared = sharedRoutine(state, routine);
  const link = routineLink(shared);
  const host = sheet(
    `Share ${routine.name}`,
    `<p class="line sub">Anyone with Milo can open the link and add the routine. The file does the same by import.</p>
     <input class="dest" id="shareLink" readonly value="${link}">
     <div class="chips">
       <button class="chip tap" id="copyLink">copy link</button>
       <button class="chip tap" id="saveJson">save as a file</button>
       ${'share' in navigator ? '<button class="chip tap" id="sendLink">share…</button>' : ''}
     </div>`,
  );
  host.querySelector('#copyLink')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied');
    } catch {
      (host.querySelector('#shareLink') as HTMLInputElement).select();
    }
  });
  host.querySelector('#saveJson')!.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(shared, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routine.name.replace(/\s+/g, '-').toLowerCase()}.milo-routine.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Routine file saved');
  });
  host.querySelector('#sendLink')?.addEventListener('click', () => {
    void navigator.share({ title: routine.name, url: link }).catch(() => {});
  });
}

/** read a shared routine from a link's code or a file's text */
export function readShared(text: string): Shared | null {
  try {
    const data = JSON.parse(text) as Shared;
    return data && data.v === 1 && Array.isArray(data.items) ? data : null;
  } catch {
    try {
      return readShared(fromBase64Url(text));
    } catch {
      return null;
    }
  }
}

export function liftImportView(root: HTMLElement): () => void {
  const code = new URLSearchParams(location.hash.split('?')[1] ?? '').get('d') ?? '';
  const shared = readShared(code);
  const state = loadLift();
  if (!shared) {
    root.innerHTML = shell('routines', `<div class="hero"><h1>That link did not open</h1><p class="line">It may have been cut short when it was copied.</p></div>`);
    return () => {};
  }
  const resolve = (i: Shared['items'][number]): Exercise | undefined =>
    [...LIBRARY, ...state.customs].find((e) => e.id === i.exerciseId) ??
    [...LIBRARY, ...state.customs].find((e) => e.name.toLowerCase() === i.name.toLowerCase());
  root.innerHTML = shell(
    'routines',
    `<div class="hero">
      <p class="tag section">A routine for you</p>
      <h1>${shared.name}</h1>
      <p class="line sub">${shared.items.length} exercises</p>
    </div>
    <div class="panel">${shared.items
      .map((i) => {
        const ex = resolve(i);
        return `<p class="line"><b>${ex?.name ?? i.name}</b> <span class="muted">${i.sets} × ${i.low}–${i.high}${i.rpe ? ` @${i.rpe}` : ''}${
          ex ? '' : ' · new to you'
        }</span></p>`;
      })
      .join('')}</div>
    <button class="big tap" id="adopt">ADD TO MY ROUTINES</button>`,
  );
  root.querySelector('#adopt')!.addEventListener('click', () => {
    adoptShared(shared);
    toast(`${shared.name} added`);
    location.hash = '#/lift/routines';
  });
  return () => {};
}

export function adoptShared(shared: Shared): void {
  const next = loadLift();
  const items = shared.items.map(({ name, ...i }) => {
    const known =
      [...LIBRARY, ...next.customs].find((e) => e.id === i.exerciseId) ??
      [...LIBRARY, ...next.customs].find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (known) return { ...i, exerciseId: known.id };
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    next.customs.push({ id, name, muscle: 'other', also: '', gear: 'barbell', inc: 5, how: 'From a shared routine.' });
    return { ...i, exerciseId: id };
  });
  saveLift(next);
  saveRoutine({ id: `shared-${Date.now()}`, name: shared.name, folder: 'Shared with me', items });
}

/* ---------- 116. gyms ---------- */

/** the quick switch from the session header */
export function gymSwitcher(onSwitch: () => void): void {
  const state = loadLift();
  const current = activeGym(state);
  const host = sheet(
    'Where are you training?',
    `<div class="cards">${state.settings.gyms
      .map(
        (g) => `<button class="card tap${g.id === current.id ? ' on' : ''}" data-gym="${g.id}">
          <b>${g.name}</b><span class="tag">${g.equipment.length} kinds of kit · ${showWeight(g.barLb, state.settings.units)} bar</span></button>`,
      )
      .join('')}</div>
     <a class="link tap" href="#/lift/settings" data-done="1">Edit gyms</a>`,
  );
  host.querySelector('.cards')!.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-gym]');
    if (!card) return;
    switchGym(card.dataset.gym!);
    closeSheet(host);
    toast(`Training at ${loadLift().settings.gyms.find((g) => g.id === card.dataset.gym)!.name}`);
    onSwitch();
  });
}

/** the gyms panel for lift settings */
export function gymsPanel(state: LiftState): string {
  const gym = activeGym(state);
  const units = state.settings.units;
  const kg = 0.45359237;
  const show = (lb: number): number => (units === 'kg' ? Math.round(lb * kg * 10) / 10 : lb);
  return `<div class="panel gyms">
    <p class="tag">Gyms<span>${state.settings.gyms.length}</span></p>
    <div class="chips" id="gymPick">${state.settings.gyms
      .map((g) => `<button class="chip tap${g.id === gym.id ? ' on' : ''}" data-gym="${g.id}">${g.name}</button>`)
      .join('')}<button class="chip tap" id="gymAdd">+ gym</button></div>
    <label class="field row"><span>Name</span><input class="dest" id="gymName" value="${gym.name}"></label>
    <p class="tag">What it has</p>
    <div class="chips" id="gymKit">${ALL_GEAR.filter((g) => g !== 'bodyweight')
      .map((g) => `<button class="chip tap${gym.equipment.includes(g) ? ' on' : ''}" data-kit="${g}">${GEAR_NAMES[g]}</button>`)
      .join('')}</div>
    <label class="field row"><span>Bar weight (${units})</span><input class="num" id="bar" value="${show(gym.barLb)}"></label>
    <label class="field"><span class="tag">Plates here (${units}, comma separated)</span>
      <input class="dest" id="plates" value="${gym.plates.map(show).join(', ')}"></label>
    <p class="line sub">Example: ${showWeight(225, units)} → ${plates(225, gym.barLb, gym.plates)
      .map((p) => fromLb(p, units))
      .join(' + ')} a side.</p>
    <p class="line sub">Swaps, the plate calculator and generated plans all use the gym you are in.</p>
    ${state.settings.gyms.length > 1 ? '<button class="link tap" id="gymDelete">Delete this gym</button>' : ''}
  </div>`;
}

export function bindGymsPanel(root: HTMLElement, redraw: () => void): void {
  const state = loadLift();
  const gym = (): Gym => activeGym(loadLift());
  const units = state.settings.units;
  root.querySelector('#gymPick')?.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-gym]');
    if (!chip) return;
    switchGym(chip.dataset.gym!);
    redraw();
  });
  root.querySelector('#gymAdd')?.addEventListener('click', () => {
    const id = `gym-${Date.now()}`;
    saveGym({ id, name: 'Hotel gym', equipment: ['dumbbell', 'machine', 'cable'], barLb: 45, plates: [45, 25, 10, 5, 2.5] });
    switchGym(id);
    redraw();
  });
  root.querySelector('#gymName')?.addEventListener('change', (ev) => {
    saveGym({ ...gym(), name: (ev.target as HTMLInputElement).value.trim() || 'Gym' });
    redraw();
  });
  root.querySelector('#gymKit')?.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-kit]');
    if (!chip) return;
    const g = gym();
    const kit = chip.dataset.kit as Gear;
    saveGym({ ...g, equipment: g.equipment.includes(kit) ? g.equipment.filter((x) => x !== kit) : [...g.equipment, kit] });
    redraw();
  });
  root.querySelector('#bar')?.addEventListener('change', (ev) => {
    saveGym({ ...gym(), barLb: toLb(Number((ev.target as HTMLInputElement).value), units) });
    redraw();
  });
  root.querySelector('#plates')?.addEventListener('change', (ev) => {
    const list = (ev.target as HTMLInputElement).value
      .split(',')
      .map((x) => toLb(Number(x.trim()), units))
      .filter((x) => x > 0);
    saveGym({ ...gym(), plates: list });
    redraw();
  });
  root.querySelector('#gymDelete')?.addEventListener('click', () => {
    deleteGym(gym().id);
    redraw();
  });
}
