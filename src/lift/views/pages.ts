import { miloMark } from '../../badge';
import { barList, columns, lineChart } from '../../ui/chart';
import { sheet } from '../../ui/sheet';
import { clock, dayKey } from '../../ui/time';
import { toast } from '../../ui/toast';
import { alternatives, REP_PRESETS, item as newItem, type Routine } from '../data';
import { GEARS, LIBRARY, MUSCLES, type Exercise } from '../library';
import { generatePlan, isDeloadWeek, phaseFor, type Answers } from '../plan';
import { recordsFor, standardFor } from '../records';
import {
  addCustomExercise,
  addMeasurement,
  deleteRoutine,
  deleteSession,
  exerciseById,
  fromLb,
  lastPerformed,
  loadLift,
  plates,
  saveLift,
  saveRoutine,
  setLiftSettings,
  setsDone,
  showWeight,
  toLb,
  toggleFavourite,
  trendWeight,
  volumeOf,
  weeklyVolume,
  weekStreak,
  type LiftState,
} from '../store';

export function liftSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/lift${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Board')}${link('library', 'Exercises')}${link(
    'routines',
    'Routines',
  )}${link('history', 'History')}${link('body', 'Body')}${link('stats', 'Stats')}${link(
    'progress',
    'Progress',
  )}${link('settings', 'Settings')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today lift-page detail">
    <header class="head">
      <span class="wordmark">${miloMark()}<b>MILO</b></span>
    </header>
    ${liftSubNav(active)}
    ${body}
  </section>`;

const allExercises = (state: LiftState): Exercise[] => [...LIBRARY, ...state.customs];

/* ---------- 12. exercise library ---------- */

export function libraryView(root: HTMLElement): () => void {
  const state = loadLift();
  let query = '';
  let muscle = '';
  let gear = '';
  let favesOnly = false;

  const draw = (): void => {
    const list = allExercises(state).filter((e) => {
      if (favesOnly && !state.favourites.includes(e.id)) return false;
      if (muscle && e.muscle !== muscle) return false;
      if (gear && e.gear !== gear) return false;
      if (!query) return true;
      const hay = `${e.name} ${e.muscle} ${e.also} ${e.gear}`.toLowerCase();
      return query
        .toLowerCase()
        .split(/\s+/)
        .every((word) => hay.includes(word));
    });
    root.querySelector('#libList')!.innerHTML = list.length
      ? list
          .map(
            (e) => `<details class="day ex-row"><summary>
              <span>${state.favourites.includes(e.id) ? '★ ' : ''}${e.name}</span>
              <span class="sub">${e.muscle} · ${e.gear}</span></summary>
              <p class="line sub">${e.how}</p>
              <p class="line sub">Also works: ${e.also || '—'}</p>
              <div class="ex-foot">
                <button class="link tap" data-fav="${e.id}">${
                  state.favourites.includes(e.id) ? 'unfavourite' : 'favourite'
                }</button>
                <a class="link tap" href="#/lift/exercise/${e.id}">history</a>
              </div></details>`,
          )
          .join('')
      : '<p class="line sub">Nothing matches that.</p>';
  };

  root.innerHTML = shell(
    'library',
    `<div class="hero">
      <p class="tag section">Exercises</p>
      <h1>${allExercises(state).length}<span><i> · </i>in the book</span></h1>
      <input class="dest" id="q" placeholder="search by name, muscle or kit" aria-label="search">
      <div class="chips" id="muscles">
        <button class="chip tap on" data-muscle="">all</button>
        ${MUSCLES.map((m) => `<button class="chip tap" data-muscle="${m}">${m}</button>`).join('')}
      </div>
      <div class="chips" id="gears">
        <button class="chip tap on" data-gear="">any kit</button>
        ${GEARS.map((g) => `<button class="chip tap" data-gear="${g}">${g}</button>`).join('')}
        <button class="chip tap" id="faves">★ favourites</button>
        <button class="chip tap" id="addEx">+ custom</button>
      </div>
    </div>
    <div id="libList"></div>`,
  );
  draw();

  root.querySelector('#q')!.addEventListener('input', (ev) => {
    query = (ev.target as HTMLInputElement).value;
    draw();
  });
  const chipGroup = (id: string, key: 'muscle' | 'gear'): void => {
    root.querySelector(`#${id}`)!.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>(`[data-${key}]`);
      if (!chip) return;
      for (const el of root.querySelectorAll(`[data-${key}]`)) el.classList.remove('on');
      chip.classList.add('on');
      const value = chip.dataset[key] ?? '';
      if (key === 'muscle') muscle = value;
      else gear = value;
      draw();
    });
  };
  chipGroup('muscles', 'muscle');
  chipGroup('gears', 'gear');
  root.querySelector('#faves')!.addEventListener('click', (ev) => {
    favesOnly = !favesOnly;
    (ev.target as HTMLElement).classList.toggle('on', favesOnly);
    draw();
  });
  root.querySelector('#libList')!.addEventListener('click', (ev) => {
    const fav = (ev.target as HTMLElement).closest<HTMLElement>('[data-fav]');
    if (!fav) return;
    toggleFavourite(fav.dataset.fav!);
    state.favourites = loadLift().favourites;
    draw();
  });
  root.querySelector('#addEx')!.addEventListener('click', () => {
    const host = sheet(
      'New exercise',
      `<label class="field"><span class="tag">Name</span><input class="dest" id="nName"></label>
       <label class="field"><span class="tag">Main muscle</span>
         <select class="dest" id="nMuscle">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select></label>
       <label class="field"><span class="tag">Kit</span>
         <select class="dest" id="nGear">${GEARS.map((g) => `<option>${g}</option>`).join('')}</select></label>
       <label class="field"><span class="tag">Notes</span><input class="dest" id="nHow"></label>
       <button class="big tap" data-done="1" id="nSave">ADD IT</button>`,
    );
    host.querySelector('#nSave')!.addEventListener('click', () => {
      const value = (id: string): string => (host.querySelector(`#${id}`) as HTMLInputElement).value;
      const name = value('nName').trim();
      if (!name) return;
      addCustomExercise({
        id: `custom-${Date.now()}`,
        name,
        muscle: value('nMuscle'),
        also: '',
        gear: value('nGear') as Exercise['gear'],
        inc: value('nGear') === 'dumbbell' ? 2.5 : 5,
        how: value('nHow'),
      });
      libraryView(root);
      toast('Exercise added');
    });
  });
  return () => {};
}

/* ---------- 17. history, calendar and editing ---------- */

export function liftHistoryView(root: HTMLElement): () => void {
  const state = loadLift();
  const units = state.settings.units;
  const month = new Date();
  month.setDate(1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (month.getDay() + 6) % 7;
  const byDay = new Map<string, number>();
  state.sessions.forEach((s, i) => byDay.set(dayKey(s.date), i));

  const cells = [
    ...Array.from({ length: lead }, () => '<i class="cal empty"></i>'),
    ...Array.from({ length: days }, (_, i) => {
      const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
      const at = byDay.get(dayKey(d));
      return `<i class="cal${at !== undefined ? ' on' : ''}"${
        at !== undefined ? ` data-session="${at}"` : ''
      }><b>${i + 1}</b></i>`;
    }),
  ].join('');

  const rows = state.sessions
    .map((s, i) => ({ s, i }))
    .reverse()
    .map(
      ({ s, i }) => `<tr data-session="${i}">
        <td>${new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td>${state.routines.find((r) => r.id === s.routineId)?.name ?? s.routineId}</td>
        <td class="mono">${setsDone(s)} sets · ${showWeight(volumeOf(s), units)}</td>
        <td class="mono">${clock(s.durationSec)}</td></tr>`,
    )
    .join('');

  root.innerHTML = shell(
    'history',
    `<div class="hero">
      <p class="tag section">History</p>
      <h1>${state.sessions.length}<span><i> · </i>sessions</span></h1>
      <p class="line sub">${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      <div class="calendar">${cells}</div>
    </div>
    ${
      rows
        ? `<table class="log"><thead><tr><th>date</th><th>routine</th><th>work</th><th>time</th></tr></thead>
           <tbody>${rows}</tbody></table>`
        : '<p class="line sub">No sessions yet.</p>'
    }`,
  );

  const open = (index: number): void => {
    const session = loadLift().sessions[index];
    if (!session) return;
    const host = sheet(
      new Date(session.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      `<p class="line">${state.routines.find((r) => r.id === session.routineId)?.name ?? ''} · ${setsDone(
        session,
      )} sets · ${showWeight(volumeOf(session), units)}</p>
       ${session.entries
         .map(
           (e) => `<p class="line sub"><b>${exerciseById(state, e.exerciseId).name}</b> ${e.sets
             .filter((x) => x.done)
             .map((x) => `${fromLb(x.weightLb, units)}×${x.reps}`)
             .join(', ')}</p>`,
         )
         .join('')}
       <div class="row-actions">
         <button class="link tap" data-done="1" id="dup">Save as a new routine</button>
         <button class="link tap" data-done="1" id="del">Delete this session</button>
       </div>`,
    );
    host.querySelector('#dup')!.addEventListener('click', () => {
      const next = loadLift();
      saveRoutine({
        id: `copy-${Date.now()}`,
        name: `${state.routines.find((r) => r.id === session.routineId)?.name ?? 'Session'} copy`,
        folder: 'Copies',
        items: session.entries.map((e) =>
          newItem(e.exerciseId, e.sets.filter((s) => s.type !== 'w').length || 3, 8, 12),
        ),
      });
      void next;
      toast('Routine saved');
      liftHistoryView(root);
    });
    host.querySelector('#del')!.addEventListener('click', () => {
      deleteSession(index);
      liftHistoryView(root);
      toast('Session deleted');
    });
  };

  root.firstElementChild!.addEventListener('click', (ev) => {
    const cell = (ev.target as HTMLElement).closest<HTMLElement>('[data-session]');
    if (cell) open(Number(cell.dataset.session));
  });
  return () => {};
}

/* ---------- 19. measurements ---------- */

const MEASURES: { key: keyof MeasureKeys; label: string; unit: string }[] = [
  { key: 'weightLb', label: 'Body weight', unit: 'lb' },
  { key: 'bodyFat', label: 'Body fat', unit: '%' },
  { key: 'chest', label: 'Chest', unit: 'in' },
  { key: 'waist', label: 'Waist', unit: 'in' },
  { key: 'hips', label: 'Hips', unit: 'in' },
  { key: 'arm', label: 'Arm', unit: 'in' },
  { key: 'thigh', label: 'Thigh', unit: 'in' },
];

interface MeasureKeys {
  weightLb?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arm?: number;
  thigh?: number;
}

export function bodyView(root: HTMLElement): () => void {
  const state = loadLift();
  const units = state.settings.units;
  const series = (key: keyof MeasureKeys): number[] =>
    state.measurements.map((m) => m[key]).filter((v): v is number => typeof v === 'number');

  const weights = series('weightLb');
  const trend: number[] = weights.map((_, i) => {
    const window = weights.slice(Math.max(0, i - 6), i + 1);
    return window.reduce((s, v) => s + v, 0) / window.length;
  });

  root.innerHTML = shell(
    'body',
    `<div class="hero">
      <p class="tag section">Body</p>
      <h1>${weights.length ? showWeight(trendWeight(state), units) : '—'}<span><i> · </i>trend weight</span></h1>
      <p class="line sub">${state.measurements.length} entries · a seven-day average smooths the noise</p>
      <button class="big tap" data-done="1" id="addM">LOG A MEASUREMENT</button>
    </div>
    <div class="panel">
      <p class="tag">Weight</p>
      ${lineChart(trend.length ? trend : [], 'trend weight')}
    </div>
    ${MEASURES.filter((m) => m.key !== 'weightLb')
      .map((m) => {
        const values = series(m.key);
        return values.length
          ? `<div class="panel"><p class="tag">${m.label}</p>${lineChart(values, `${m.label} (${m.unit})`)}</div>`
          : '';
      })
      .join('')}`,
  );

  root.querySelector('#addM')!.addEventListener('click', () => {
    const host = sheet(
      'New measurement',
      `${MEASURES.map(
        (m) => `<label class="field row"><span>${m.label} (${
          m.key === 'weightLb' ? units : m.unit
        })</span><input class="num" data-m="${m.key}" inputmode="decimal"></label>`,
      ).join('')}
       <button class="big tap" data-done="1" id="mSave">SAVE</button>`,
    );
    host.querySelector('#mSave')!.addEventListener('click', () => {
      const entry: MeasureKeys & { date: string } = { date: new Date().toISOString() };
      for (const m of MEASURES) {
        const input = host.querySelector(`[data-m="${m.key}"]`) as HTMLInputElement;
        const value = Number(input.value);
        if (value > 0) entry[m.key] = m.key === 'weightLb' ? toLb(value, units) : value;
      }
      addMeasurement(entry);
      bodyView(root);
      toast('Logged');
    });
  });
  return () => {};
}

/* ---------- 20 + 29. statistics ---------- */

const BAND = { low: 10, high: 20 };

export function liftStatsView(root: HTMLElement): () => void {
  const state = loadLift();
  const units = state.settings.units;
  const weeks: number[] = [];
  const volumes: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const end = Date.now() - w * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const mine = state.sessions.filter((s) => {
      const t = new Date(s.date).getTime();
      return t >= start && t < end;
    });
    weeks.push(mine.length);
    volumes.push(mine.reduce((sum, s) => sum + volumeOf(s), 0));
  }
  const volume = weeklyVolume(state);
  const counts = new Map<string, number>();
  for (const session of state.sessions)
    for (const entry of session.entries)
      counts.set(entry.exerciseId, (counts.get(entry.exerciseId) ?? 0) + 1);
  const most = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, n]) => ({ label: exerciseById(state, id).name, value: n }));

  root.innerHTML = shell(
    'stats',
    `<div class="hero">
      <p class="tag section">Stats</p>
      <h1>${weekStreak(state)}<span><i> · </i>week streak</span></h1>
      <p class="line sub">Weeks in a row with two sessions or more.</p>
    </div>
    <div class="panel"><p class="tag">Sessions per week</p>${columns(
      weeks,
      weeks.map((_, i) => (i % 3 === 0 ? `${12 - i}w` : '')),
    )}</div>
    <div class="panel"><p class="tag">Volume per week</p>${lineChart(
      volumes.map((v) => Math.round(v)),
      `${units} lifted`,
    )}</div>
    <div class="panel">
      <p class="tag">Sets per muscle this week<span>${BAND.low}–${BAND.high} is a good band</span></p>
      ${barList(
        [...volume.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => ({
            label,
            value,
            note: value < BAND.low ? '· room for more' : value > BAND.high ? '· plenty' : '· in band',
          })),
        ' sets',
      )}
    </div>
    <div class="panel"><p class="tag">Most trained</p>${barList(most, '×')}</div>`,
  );
  return () => {};
}

/* ---------- 32. progress overview ---------- */

export function progressView(root: HTMLElement): () => void {
  const state = loadLift();
  const units = state.settings.units;
  const body = trendWeight(state);
  const lifts = ['squat', 'bench', 'deadlift', 'ohp'];
  const cards = lifts
    .map((id) => {
      const best = recordsFor(state.sessions, id);
      const oneRm = best.length ? Math.max(...best.map((b) => b.oneRm)) : 0;
      const series = best.map((b) => Math.round(b.oneRm));
      return `<div class="panel">
        <p class="tag">${exerciseById(state, id).name}<span>${
          oneRm ? showWeight(Math.round(oneRm), units) : '—'
        }</span></p>
        ${series.length > 1 ? lineChart(series, 'estimated 1RM') : '<p class="line sub">Log it twice and a line appears.</p>'}
        ${
          oneRm && body
            ? `<p class="line sub">About ${(oneRm / body).toFixed(2)} × bodyweight — ${standardFor(
                id,
                oneRm,
                body,
              )}.</p>`
            : ''
        }
      </div>`;
    })
    .join('');
  const total = lifts.reduce((sum, id) => {
    const best = recordsFor(state.sessions, id);
    return sum + (best.length ? Math.max(...best.map((b) => b.oneRm)) : 0);
  }, 0);

  root.innerHTML = shell(
    'progress',
    `<div class="hero">
      <p class="tag section">Progress</p>
      <h1>${total ? showWeight(Math.round(total), units) : '—'}<span><i> · </i>four-lift total</span></h1>
      <p class="line sub">${
        body
          ? `Against a body weight of ${showWeight(body, units)}. Standards are a rough reference, not a verdict.`
          : 'Log a body weight in Body and the standards appear.'
      }</p>
    </div>
    ${cards}`,
  );
  return () => {};
}

/* ---------- 21 + 25. routines and the plan generator ---------- */

export function routinesView(root: HTMLElement): () => void {
  const state = loadLift();
  const folders = new Map<string, Routine[]>();
  for (const routine of state.routines) {
    const key = routine.folder ?? 'Routines';
    folders.set(key, [...(folders.get(key) ?? []), routine]);
  }

  root.innerHTML = shell(
    'routines',
    `<div class="hero">
      <p class="tag section">Routines</p>
      <h1>${state.routines.length}<span><i> · </i>saved</span></h1>
      <div class="chips">
        <button class="chip tap" id="newRoutine">+ routine</button>
        <button class="chip tap" id="empty">Empty workout</button>
        <button class="chip tap" id="generate">Build me a plan</button>
      </div>
      ${
        state.settings.planId
          ? `<p class="line sub">Plan week ${state.settings.planWeek ?? 1}${
              isDeloadWeek(state.settings.planWeek ?? 1) ? ' · deload week' : ''
            }</p>`
          : ''
      }
    </div>
    ${[...folders.entries()]
      .map(
        ([folder, list]) => `<div class="panel">
          <p class="tag">${folder}</p>
          ${list
            .map((r) => {
              const last = lastPerformed(state, r.id);
              return `<div class="routine-row">
                <a class="ex-name" href="#/lift/routine/${r.id}">${r.name}</a>
                <span class="tag">${r.items.length} exercises${
                  last
                    ? ` · last ${new Date(last.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : ' · never'
                }</span>
                <a class="link tap" href="#/lift/session/${r.id}">start</a>
              </div>`;
            })
            .join('')}
        </div>`,
      )
      .join('')}`,
  );

  root.querySelector('#newRoutine')!.addEventListener('click', () => {
    const id = `r-${Date.now()}`;
    saveRoutine({ id, name: 'New routine', folder: 'Routines', items: [newItem('squat')] });
    location.hash = `#/lift/routine/${id}`;
  });
  root.querySelector('#empty')!.addEventListener('click', () => {
    const id = `empty-${Date.now()}`;
    saveRoutine({ id, name: 'Empty workout', folder: 'One-offs', items: [] });
    location.hash = `#/lift/session/${id}`;
  });
  root.querySelector('#generate')!.addEventListener('click', () => {
    const host = sheet(
      'Build a plan',
      `<label class="field"><span class="tag">Goal</span>
         <select class="dest" id="gGoal">
           <option value="hypertrophy">build muscle</option>
           <option value="strength">get stronger</option>
           <option value="general">general fitness</option>
         </select></label>
       <label class="field"><span class="tag">Days a week</span>
         <select class="dest" id="gDays">${[2, 3, 4, 5, 6]
           .map((d) => `<option${d === 3 ? ' selected' : ''}>${d}</option>`)
           .join('')}</select></label>
       <label class="field"><span class="tag">Experience</span>
         <select class="dest" id="gExp">
           <option value="new">new to this</option>
           <option value="intermediate">a year or two in</option>
           <option value="advanced">experienced</option>
         </select></label>
       <label class="field"><span class="tag">Equipment</span>
         <select class="dest" id="gKit">
           <option value="gym">full gym</option>
           <option value="dumbbells">dumbbells only</option>
           <option value="bodyweight">bodyweight only</option>
         </select></label>
       <label class="field"><span class="tag">Session length</span>
         <select class="dest" id="gMin">${[30, 45, 60, 90]
           .map((m) => `<option${m === 60 ? ' selected' : ''}>${m}</option>`)
           .join('')}</select></label>
       <button class="big tap" data-done="1" id="gGo">GENERATE</button>`,
    );
    host.querySelector('#gGo')!.addEventListener('click', () => {
      const value = (id: string): string => (host.querySelector(`#${id}`) as HTMLSelectElement).value;
      const answers: Answers = {
        goal: value('gGoal') as Answers['goal'],
        days: Number(value('gDays')),
        experience: value('gExp') as Answers['experience'],
        kit: value('gKit') as Answers['kit'],
        minutes: Number(value('gMin')),
      };
      const plan = generatePlan(answers);
      const next = loadLift();
      next.routines = [...next.routines.filter((r) => r.folder !== 'My plan'), ...plan.routines];
      next.settings.planId = plan.id;
      next.settings.planWeek = 1;
      saveLift(next);
      routinesView(root);
      toast(`${plan.name} · ${plan.shape}`);
    });
  });
  return () => {};
}

export function routineEditView(root: HTMLElement, id: string): () => void {
  const state = loadLift();
  const routine = state.routines.find((r) => r.id === id);
  if (!routine) {
    location.hash = '#/lift/routines';
    return () => {};
  }
  const rows = routine.items
    .map(
      (it, i) => `<div class="routine-item" data-i="${i}">
        <div class="routine-head">
          <b>${exerciseById(state, it.exerciseId).name}</b>
          <span class="tag">${it.group ? `superset ${it.group} · ` : ''}${it.sets} × ${it.low}–${it.high}</span>
        </div>
        <div class="ex-foot">
          <button class="link tap" data-up="${i}">↑</button>
          <button class="link tap" data-down="${i}">↓</button>
          <button class="link tap" data-edit="${i}">edit</button>
          <button class="link tap" data-swap="${i}">swap</button>
          <button class="link tap" data-group="${i}">superset</button>
          <button class="link tap" data-remove="${i}">remove</button>
        </div>
      </div>`,
    )
    .join('');

  root.innerHTML = shell(
    'routines',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/lift/routines">← Routines</a></p>
      <input class="dest big-input" id="rName" value="${routine.name}" aria-label="routine name">
      <input class="dest" id="rFolder" value="${routine.folder ?? ''}" placeholder="folder" aria-label="folder">
      <div class="chips">
        <button class="chip tap" id="addItem">+ exercise</button>
        <a class="chip tap" href="#/lift/session/${routine.id}">start it</a>
        <button class="chip tap" id="delRoutine">delete</button>
      </div>
    </div>
    <div class="panel">${rows || '<p class="line sub">No exercises yet.</p>'}</div>`,
  );

  const persist = (): void => {
    routine.name = (root.querySelector('#rName') as HTMLInputElement).value;
    routine.folder = (root.querySelector('#rFolder') as HTMLInputElement).value || undefined;
    saveRoutine(routine);
  };
  root.querySelector('#rName')!.addEventListener('change', persist);
  root.querySelector('#rFolder')!.addEventListener('change', persist);
  root.querySelector('#delRoutine')!.addEventListener('click', () => {
    deleteRoutine(routine.id);
    location.hash = '#/lift/routines';
  });
  root.querySelector('#addItem')!.addEventListener('click', () => {
    const host = sheet(
      'Add an exercise',
      `<input class="dest" id="pick" placeholder="search" aria-label="search">
       <div class="cards" id="pickList"></div>`,
    );
    const draw = (q = ''): void => {
      const list = [...LIBRARY, ...state.customs]
        .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 24);
      host.querySelector('#pickList')!.innerHTML = list
        .map(
          (e) => `<button class="card tap" data-done="1" data-add="${e.id}"><b>${e.name}</b>
            <span class="tag">${e.muscle}</span></button>`,
        )
        .join('');
    };
    draw();
    host.querySelector('#pick')!.addEventListener('input', (ev) =>
      draw((ev.target as HTMLInputElement).value),
    );
    host.querySelector('#pickList')!.addEventListener('click', (ev) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-add]');
      if (!card) return;
      routine.items.push(newItem(card.dataset.add!));
      saveRoutine(routine);
      routineEditView(root, id);
      toast('Added');
    });
  });

  root.querySelector('.panel')!.addEventListener('click', (ev) => {
    const el = ev.target as HTMLElement;
    const grab = (key: string): number | null => {
      const node = el.closest<HTMLElement>(`[data-${key}]`);
      return node ? Number(node.dataset[key]) : null;
    };
    const up = grab('up');
    const down = grab('down');
    const remove = grab('remove');
    const edit = grab('edit');
    const swap = grab('swap');
    const group = grab('group');
    const move = (from: number, to: number): void => {
      if (to < 0 || to >= routine.items.length) return;
      const [x] = routine.items.splice(from, 1);
      routine.items.splice(to, 0, x);
      saveRoutine(routine);
      routineEditView(root, id);
    };
    if (up !== null) return move(up, up - 1);
    if (down !== null) return move(down, down + 1);
    if (remove !== null) {
      routine.items.splice(remove, 1);
      saveRoutine(routine);
      return routineEditView(root, id);
    }
    if (group !== null) {
      const it = routine.items[group];
      it.group = it.group ? undefined : (routine.items[group - 1]?.group ?? group + 1);
      saveRoutine(routine);
      return routineEditView(root, id);
    }
    if (swap !== null) {
      const current = exerciseById(state, routine.items[swap].exerciseId);
      const host = sheet(
        `Swap ${current.name}`,
        `<div class="cards">${alternatives(current, 10)
          .map(
            (a) => `<button class="card tap" data-done="1" data-alt="${a.id}"><b>${a.name}</b>
              <span class="tag">${a.muscle} · ${a.gear}</span></button>`,
          )
          .join('')}</div>`,
      );
      host.querySelector('.cards')!.addEventListener('click', (e2) => {
        const card = (e2.target as HTMLElement).closest<HTMLElement>('[data-alt]');
        if (!card) return;
        routine.items[swap].exerciseId = card.dataset.alt!;
        saveRoutine(routine);
        routineEditView(root, id);
      });
      return;
    }
    if (edit !== null) {
      const it = routine.items[edit];
      const host = sheet(
        'Sets and reps',
        `<label class="field row"><span>Sets</span><input class="num" id="eSets" value="${it.sets}"></label>
         <label class="field row"><span>From</span><input class="num" id="eLow" value="${it.low}"></label>
         <label class="field row"><span>To</span><input class="num" id="eHigh" value="${it.high}"></label>
         <label class="field row"><span>Rest (s)</span><input class="num" id="eRest" value="${it.restSec ?? state.settings.restSec}"></label>
         <label class="field row"><span>Target RPE</span><input class="num" id="eRpe" value="${it.rpe ?? ''}"></label>
         <label class="field"><span class="tag">Note</span><input class="dest" id="eNote" value="${it.note ?? ''}"></label>
         <div class="chips" id="presets">${REP_PRESETS.map(
           (p) => `<button class="chip tap" data-preset="${p.low}-${p.high}">${p.name} ${p.low}–${p.high}</button>`,
         ).join('')}</div>
         <button class="big tap" data-done="1" id="eSave">SAVE</button>`,
      );
      host.querySelector('#presets')!.addEventListener('click', (e2) => {
        const chip = (e2.target as HTMLElement).closest<HTMLElement>('[data-preset]');
        if (!chip) return;
        const [low, high] = chip.dataset.preset!.split('-');
        (host.querySelector('#eLow') as HTMLInputElement).value = low;
        (host.querySelector('#eHigh') as HTMLInputElement).value = high;
      });
      host.querySelector('#eSave')!.addEventListener('click', () => {
        const num = (sel: string): number => Number((host.querySelector(sel) as HTMLInputElement).value);
        it.sets = num('#eSets');
        it.low = num('#eLow');
        it.high = num('#eHigh');
        it.restSec = num('#eRest');
        it.rpe = num('#eRpe') || undefined;
        it.note = (host.querySelector('#eNote') as HTMLInputElement).value.trim() || undefined;
        saveRoutine(routine);
        routineEditView(root, id);
      });
    }
  });
  return () => {};
}

/* ---------- 22 + 23 + 30. lift settings ---------- */

export function liftSettingsView(root: HTMLElement): () => void {
  const state = loadLift();
  const s = state.settings;
  const plan = s.planId ? phaseFor({ phases: [{ name: 'block', low: 8, high: 12 }] } as never, s.planWeek ?? 1) : null;

  root.innerHTML = shell(
    'settings',
    `<div class="hero">
      <p class="tag section">Settings</p>
      <h1>Lift<span><i> · </i>units, bars and blocks</span></h1>
    </div>
    <div class="panel">
      <p class="tag">Units</p>
      <div class="chips" id="units">
        ${(['lb', 'kg'] as const)
          .map((u) => `<button class="chip tap${s.units === u ? ' on' : ''}" data-unit="${u}">${u}</button>`)
          .join('')}
      </div>
      <p class="line sub">Everything is stored in pounds and shown in your units, so switching never moves a number.</p>
    </div>
    <div class="panel">
      <p class="tag">Rest</p>
      <label class="field row"><span>Default rest (s)</span>
        <input class="num" id="rest" value="${s.restSec}"></label>
    </div>
    <div class="panel">
      <p class="tag">Plate calculator</p>
      <label class="field row"><span>Bar weight (${s.units})</span>
        <input class="num" id="bar" value="${fromLb(s.barLb, s.units)}"></label>
      <label class="field"><span class="tag">Plates you own (${s.units}, comma separated)</span>
        <input class="dest" id="plates" value="${s.plates.map((p) => fromLb(p, s.units)).join(', ')}"></label>
      <p class="line sub">Example: ${showWeight(225, s.units)} → ${plates(225, s.barLb, s.plates)
        .map((p) => fromLb(p, s.units))
        .join(' + ')} a side.</p>
    </div>
    <div class="panel">
      <p class="tag">Blocks</p>
      <label class="sw tap"><input type="checkbox" id="deload" ${s.deloadNext ? 'checked' : ''}>
        <span>Make the next session a deload — lighter, one set fewer</span></label>
      ${plan ? `<p class="line sub">Generated plan · week ${s.planWeek}</p>` : ''}
      <label class="field row"><span>Plan week</span>
        <input class="num" id="planWeek" value="${s.planWeek ?? 1}"></label>
    </div>`,
  );

  root.querySelector('#units')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-unit]');
    if (!chip) return;
    setLiftSettings({ units: chip.dataset.unit as 'lb' | 'kg' });
    liftSettingsView(root);
  });
  root.querySelector('#rest')!.addEventListener('change', (ev) =>
    setLiftSettings({ restSec: Number((ev.target as HTMLInputElement).value) }),
  );
  root.querySelector('#bar')!.addEventListener('change', (ev) =>
    setLiftSettings({ barLb: toLb(Number((ev.target as HTMLInputElement).value), s.units) }),
  );
  root.querySelector('#plates')!.addEventListener('change', (ev) => {
    const list = (ev.target as HTMLInputElement).value
      .split(',')
      .map((x) => toLb(Number(x.trim()), s.units))
      .filter((x) => x > 0);
    setLiftSettings({ plates: list });
    liftSettingsView(root);
  });
  root.querySelector('#deload')!.addEventListener('change', (ev) =>
    setLiftSettings({ deloadNext: (ev.target as HTMLInputElement).checked }),
  );
  root.querySelector('#planWeek')!.addEventListener('change', (ev) => {
    const week = Number((ev.target as HTMLInputElement).value);
    setLiftSettings({ planWeek: week, deloadNext: isDeloadWeek(week) });
    liftSettingsView(root);
  });
  return () => {};
}
