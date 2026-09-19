import { beep, say, unlockAudio } from '../../audio';
import { now, whenAdvanced } from '../../clock';
import { clock } from '../../weeks';
import type { RoutineItem } from '../data';
import { suggest, type SetLog } from '../progression';
import {
  exerciseById,
  loadLift,
  pastSets,
  restFor,
  routineById,
  saveLift,
  setsDone,
  volumeOf,
  type Active,
  type LiftState,
} from '../store';

const lb = (n: number): string => `${Math.round(n).toLocaleString('en-US')} lb`;

const ghostFor = (past: SetLog[][], index: number): string => {
  const last = past[past.length - 1];
  const set = last?.filter((s) => s.done)[index];
  return set ? `${set.weightLb} × ${set.reps}` : '—';
};

function begin(state: LiftState, routineId: string): Active {
  const routine = routineById(state, routineId);
  return {
    date: new Date().toISOString(),
    routineId: routine.id,
    durationSec: 0,
    startedAt: now(),
    open: 0,
    entries: routine.items.map((item) => {
      const ex = exerciseById(state, item.exerciseId);
      const tip = suggest(pastSets(state, item.exerciseId), item, ex.inc);
      return {
        exerciseId: item.exerciseId,
        sets: Array.from({ length: item.sets }, () => ({
          weightLb: tip.weightLb ?? 0,
          reps: 0,
          done: false,
        })),
      };
    }),
  };
}

export function liftSessionView(root: HTMLElement, routineId: string): () => void {
  let state = loadLift();
  if (!state.active || (routineId && state.active.routineId !== routineId && setsDone(state.active) === 0))
    state.active = begin(state, routineId || state.routines[0].id);
  const active = state.active;
  const routine = routineById(state, active.routineId);

  const save = (): void => {
    if (finished) return;
    active.durationSec = (now() - active.startedAt) / 1000;
    state.active = active;
    saveLift(state);
  };

  let restEnd = 0;
  let restId = '';
  let resting = false;
  let finished = false;

  root.innerHTML = `
    <section class="lift">
      <header class="run-head">
        <span class="tag"><a class="tap" href="#/lift">${routine.name}</a></span>
        <span class="tag mono" id="clock">0:00</span>
        <button class="link tap" id="finish">Finish</button>
      </header>
      <div class="exs" id="exs"></div>
      <div class="rest" id="rest" hidden>
        <span class="tag">REST</span><b id="restClock">1:30</b>
        <button class="link tap" id="plus">+30s</button>
        <button class="link tap" id="skip">Skip</button>
      </div>
    </section>`;

  const exsEl = root.querySelector<HTMLElement>('#exs')!;
  const restEl = root.querySelector<HTMLElement>('#rest')!;
  const restClock = root.querySelector<HTMLElement>('#restClock')!;
  const clockEl = root.querySelector<HTMLElement>('#clock')!;

  function drawList(): void {
    exsEl.innerHTML = active.entries
      .map((entry, i) => {
        const item = routine.items[i] as RoutineItem;
        const ex = exerciseById(state, entry.exerciseId);
        const done = entry.sets.filter((s) => s.done).length;
        if (i !== active.open)
          return `<button class="ex tap" data-open="${i}">
            <span class="ex-name">${ex.name}</span>
            <span class="tag">${done} / ${entry.sets.length}</span></button>`;
        const past = pastSets(state, entry.exerciseId);
        const tip = suggest(past, item, ex.inc);
        const rows = entry.sets
          .map(
            (set, j) => `<div class="set${set.done ? ' done' : ''}" data-set="${j}">
              <span class="ghost">${ghostFor(past, j)}</span>
              <input class="num w" inputmode="decimal" enterkeyhint="next" aria-label="weight"
                value="${set.weightLb || ''}" placeholder="lb">
              <input class="num r" inputmode="numeric" enterkeyhint="done" aria-label="reps"
                value="${set.reps || ''}" placeholder="${item.low}–${item.high}">
              <button class="tick tap" aria-label="log set ${j + 1}">✓</button>
            </div>`,
          )
          .join('');
        return `<div class="ex open">
          <div class="ex-head">
            <a class="ex-name" href="#/lift/exercise/${ex.id}">${ex.name}</a>
            <span class="tag">${item.sets} × ${item.low}–${item.high}</span>
          </div>
          <p class="line sub why">${tip.why}</p>
          <div class="sets">${rows}</div>
          <div class="ex-foot">
            <button class="link tap" data-add="1">Add set</button>
            <button class="link tap" data-drop="1">Remove set</button>
          </div>
        </div>`;
      })
      .join('');
  }

  function startRest(exerciseId: string): void {
    restId = exerciseId;
    resting = true;
    restEnd = now() + restFor(state, exerciseId) * 1000;
    restEl.hidden = false;
  }

  function stopRest(): void {
    resting = false;
    restEl.hidden = true;
  }

  function tickSet(row: HTMLElement): void {
    const entry = active.entries[active.open];
    const j = Number(row.dataset.set);
    const set = entry.sets[j];
    const weight = Number(row.querySelector<HTMLInputElement>('.w')!.value);
    const reps = Number(row.querySelector<HTMLInputElement>('.r')!.value);
    if (set.done) {
      set.done = false;
      row.classList.remove('done');
      save();
      return;
    }
    if (!reps) return row.querySelector<HTMLInputElement>('.r')!.focus();
    unlockAudio();
    set.weightLb = weight;
    set.reps = reps;
    set.done = true;
    row.classList.add('done');
    row.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }], 220);
    beep('tick');
    save();
    startRest(entry.exerciseId);
    const left = entry.sets.filter((s) => !s.done).length;
    if (left === 0 && active.open < active.entries.length - 1) {
      active.open += 1;
      save();
      drawList();
    }
  }

  function finish(): void {
    finished = true;
    const session = {
      date: active.date,
      routineId: active.routineId,
      entries: active.entries,
      durationSec: Math.round((now() - active.startedAt) / 1000),
    };
    state.sessions.push(session);
    state.active = null;
    saveLift(state);
    state = loadLift();
    stopRest();
    beep('done');
    say('Session logged.');

    const changes = session.entries
      .map((entry, i) => {
        if (!entry.sets.some((s) => s.done)) return '';
        const ex = exerciseById(state, entry.exerciseId);
        const tip = suggest(pastSets(state, entry.exerciseId), routine.items[i], ex.inc);
        const from = Math.max(...entry.sets.filter((s) => s.done).map((s) => s.weightLb), 0);
        return tip.move === 'up' || tip.move === 'down'
          ? `<li>${ex.name}: ${from} → ${tip.weightLb} next time</li>`
          : '';
      })
      .join('');

    root.innerHTML = `
      <section class="done sealed">
        <h1>${routine.name}<br>logged</h1>
        <div class="tally">
          <div><b>${setsDone(session)}</b><span>sets</span></div>
          <div><b>${lb(volumeOf(session))}</b><span>lifted</span></div>
          <div><b>${clock(session.durationSec)}</b><span>time</span></div>
        </div>
        ${changes ? `<ul class="changes">${changes}</ul>` : '<p class="say">Same weights next time — chase the reps.</p>'}
        <a class="big tap" href="#/lift">Back to lift</a>
      </section>`;
  }

  drawList();
  save();

  exsEl.addEventListener('click', (ev) => {
    const el = ev.target as HTMLElement;
    const open = el.closest<HTMLElement>('[data-open]');
    if (open) {
      active.open = Number(open.dataset.open);
      save();
      return drawList();
    }
    if (el.closest('.tick')) return tickSet(el.closest<HTMLElement>('.set')!);
    const entry = active.entries[active.open];
    if (el.closest('[data-add]')) {
      const prev = entry.sets[entry.sets.length - 1];
      entry.sets.push({ weightLb: prev?.weightLb ?? 0, reps: 0, done: false });
      save();
      drawList();
    }
    if (el.closest('[data-drop]') && entry.sets.length > 1) {
      entry.sets.pop();
      save();
      drawList();
    }
  });

  exsEl.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement;
    const row = input.closest<HTMLElement>('.set');
    if (!row) return;
    const set = active.entries[active.open].sets[Number(row.dataset.set)];
    if (input.classList.contains('w')) set.weightLb = Number(input.value);
    else set.reps = Number(input.value);
    save();
  });

  root.querySelector<HTMLElement>('#finish')!.addEventListener('click', finish);
  root.querySelector<HTMLElement>('#skip')!.addEventListener('click', stopRest);
  root.querySelector<HTMLElement>('#plus')!.addEventListener('click', () => {
    restEnd += 30_000;
    state.rest[restId] = restFor(state, restId) + 30;
    saveLift(state);
  });

  unlockAudio();
  const ticker = window.setInterval(paint, 200);
  whenAdvanced(paint);
  paint();

  function paint(): void {
    clockEl.textContent = clock((now() - active.startedAt) / 1000);
    if (!resting) return;
    const left = (restEnd - now()) / 1000;
    restClock.textContent = clock(Math.max(0, left));
    if (left <= 0) {
      stopRest();
      beep('run');
      say('Time.');
    }
  }

  return () => {
    clearInterval(ticker);
    whenAdvanced(null);
    save();
  };
}
