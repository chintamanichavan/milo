import { beep, say, unlockAudio } from '../../audio';
import { now, whenAdvanced } from '../../clock';
import { sheet } from '../../ui/sheet';
import { setText } from '../../ui/dom';
import { clock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { ratingHtml } from '../evaluate';
import { GEAR_NAMES } from '../library';
import { alternatives, type RoutineItem } from '../data';
import { warmupSets } from '../plan';
import { findPrs } from '../records';
import { suggest, type SetLog, type SetType } from '../progression';
import {
  exerciseById,
  fromLb,
  loadLift,
  pastSets,
  plates,
  restFor,
  routineById,
  saveLift,
  setsDone,
  showWeight,
  toLb,
  volumeOf,
  type Active,
  type LiftState,
  activeGym,
} from '../store';

const TYPES: { id: SetType; label: string; hint: string }[] = [
  { id: 'w', label: 'W', hint: 'warm-up — does not count' },
  { id: 'n', label: '·', hint: 'working set' },
  { id: 'f', label: 'F', hint: 'to failure' },
  { id: 'd', label: 'D', hint: 'drop set' },
];

const nextType = (type: SetType = 'n'): SetType =>
  TYPES[(TYPES.findIndex((t) => t.id === type) + 1) % TYPES.length].id;

const ghostFor = (past: SetLog[][], index: number): string => {
  const last = past[past.length - 1];
  const set = last?.filter((s) => s.done && s.type !== 'w')[index];
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
    entries: routine.items.map((entry) => {
      const ex = exerciseById(state, entry.exerciseId);
      const tip = suggest(pastSets(state, entry.exerciseId), entry, ex.inc, {
        rpe: entry.rpe,
        deload: state.settings.deloadNext,
      });
      return {
        exerciseId: entry.exerciseId,
        sets: Array.from({ length: entry.sets }, () => ({
          weightLb: tip.weightLb ?? 0,
          reps: 0,
          done: false,
          type: 'n' as SetType,
        })),
      };
    }),
  };
}

export function liftSessionView(root: HTMLElement, routineId: string): () => void {
  let state = loadLift();
  if (
    !state.active ||
    (routineId && state.active.routineId !== routineId && setsDone(state.active) === 0)
  )
    state.active = begin(state, routineId || state.routines[0].id);
  const active = state.active;
  const routine = routineById(state, active.routineId);
  const units = state.settings.units;

  let finished = false;
  const save = (): void => {
    if (finished) return;
    active.durationSec = (now() - active.startedAt) / 1000;
    state.active = active;
    saveLift(state);
  };

  let restEnd = 0;
  let restId = '';
  let resting = false;

  root.innerHTML = `
    <section class="lift">
      <header class="run-head">
        <span class="tag"><a class="tap" href="#/lift">${routine.name}</a>${
          state.settings.deloadNext ? ' · deload' : ''
        }</span>
        <button class="link tap gym-chip" id="gym">${activeGym(state).name}</button>
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
        const cfg = routine.items[i] as RoutineItem;
        const ex = exerciseById(state, entry.exerciseId);
        const done = entry.sets.filter((s) => s.done).length;
        const superset = cfg?.group ? `<span class="tag ss">superset ${cfg.group}</span>` : '';
        if (i !== active.open)
          return `<button class="ex tap${cfg?.group ? ' grouped' : ''}" data-open="${i}">
            <span class="ex-name">${ex.name}</span>
            <span class="tag">${superset}${done} / ${entry.sets.length}</span></button>`;
        const past = pastSets(state, entry.exerciseId);
        const tip = suggest(past, cfg, ex.inc, { rpe: cfg?.rpe, deload: state.settings.deloadNext });
        const rows = entry.sets
          .map((set, j) => {
            const type = set.type ?? 'n';
            return `<div class="set${set.done ? ' done' : ''} type-${type}" data-set="${j}">
              <button class="settype tap" data-type="${j}" aria-label="set type">${
                TYPES.find((t) => t.id === type)!.label
              }</button>
              <span class="ghost">${ghostFor(past, j)}</span>
              <input class="num w" inputmode="decimal" aria-label="weight"
                value="${set.weightLb ? fromLb(set.weightLb, units) : ''}" placeholder="${units}">
              <input class="num r" inputmode="numeric" aria-label="reps"
                value="${set.reps || ''}" placeholder="${cfg?.low}–${cfg?.high}">
              <input class="num rpe" inputmode="decimal" aria-label="RPE"
                value="${set.rpe ?? ''}" placeholder="rpe">
              <button class="tick tap" aria-label="log set ${j + 1}">✓</button>
            </div>`;
          })
          .join('');
        return `<div class="ex open">
          <div class="ex-head">
            <a class="ex-name" href="#/lift/exercise/${ex.id}">${ex.name}</a>
            <span class="tag">${superset}${cfg?.sets} × ${cfg?.low}–${cfg?.high}${
              cfg?.rpe ? ` @${cfg.rpe}` : ''
            }</span>
          </div>
          <p class="line sub why">${tip.why}</p>
          <div class="sets">${rows}</div>
          <div class="ex-foot">
            <button class="link tap" data-add="1">Add set</button>
            <button class="link tap" data-drop="1">Remove set</button>
            <button class="link tap" data-warm="1">Warm-up sets</button>
            <button class="link tap" data-plates="1">Plates</button>
            <button class="link tap" data-swap="1">Swap</button>
            <button class="link tap" data-note="1">Note</button>
          </div>
          ${entry.note ? `<p class="line sub note-line">${entry.note}</p>` : ''}
        </div>`;
      })
      .join('');
  }

  function startRest(exerciseId: string): void {
    const cfg = routine.items.find((x) => x.exerciseId === exerciseId);
    restId = exerciseId;
    resting = true;
    restEnd = now() + (cfg?.restSec ?? restFor(state, exerciseId)) * 1000;
    restEl.hidden = false;
  }

  const stopRest = (): void => {
    resting = false;
    restEl.hidden = true;
  };

  function tickSet(row: HTMLElement): void {
    const entry = active.entries[active.open];
    const j = Number(row.dataset.set);
    const set = entry.sets[j];
    const weight = toLb(Number(row.querySelector<HTMLInputElement>('.w')!.value), units);
    const reps = Number(row.querySelector<HTMLInputElement>('.r')!.value);
    const rpe = Number(row.querySelector<HTMLInputElement>('.rpe')!.value);
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
    if (rpe) set.rpe = rpe;
    set.done = true;
    row.classList.add('done');
    row.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.02)' }, { transform: 'scale(1)' }],
      220,
    );
    beep('tick');
    save();
    if (set.type !== 'w') startRest(entry.exerciseId);
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
      note: active.note,
    };
    const history = state.sessions;
    const prs = findPrs(session, history);
    state.sessions.push({ ...session, prs });
    state.active = null;
    if (state.settings.deloadNext) state.settings.deloadNext = false;
    saveLift(state);
    state = loadLift();
    stopRest();
    beep('done');
    say('Session logged.');
    for (const pr of prs.slice(0, 3))
      toast(`${exerciseById(state, pr.exerciseId).name} · ${pr.kind === 'oneRm' ? 'est 1RM' : pr.kind} record`, true);

    const changes = session.entries
      .map((entry, i) => {
        if (!entry.sets.some((s) => s.done && s.type !== 'w')) return '';
        const ex = exerciseById(state, entry.exerciseId);
        const tip = suggest(pastSets(state, entry.exerciseId), routine.items[i], ex.inc, {
          rpe: routine.items[i]?.rpe,
        });
        const from = Math.max(
          ...entry.sets.filter((s) => s.done && s.type !== 'w').map((s) => s.weightLb),
          0,
        );
        return tip.move === 'up' || tip.move === 'down'
          ? `<li>${ex.name}: ${showWeight(from, units)} → ${showWeight(tip.weightLb ?? from, units)} next time</li>`
          : '';
      })
      .join('');

    root.innerHTML = `
      <section class="done sealed">
        <h1>${routine.name}<br>logged</h1>
        <div class="tally">
          <div><b>${setsDone(session)}</b><span>sets</span></div>
          <div><b>${showWeight(volumeOf(session), units)}</b><span>lifted</span></div>
          <div><b>${clock(session.durationSec)}</b><span>time</span></div>
        </div>
        ${
          prs.length
            ? `<ul class="changes prs">${prs
                .map(
                  (p) =>
                    `<li>${exerciseById(state, p.exerciseId).name} · ${
                      p.kind === 'oneRm' ? 'estimated 1RM' : p.kind === 'weight' ? 'heaviest set' : 'best set volume'
                    } ${p.kind === 'volume' ? showWeight(p.value, units) : showWeight(p.value, units)}</li>`,
                )
                .join('')}</ul>`
            : ''
        }
        ${changes ? `<ul class="changes">${changes}</ul>` : '<p class="say">Same weights next time — chase the reps.</p>'}
        <div class="chips">
          <button class="chip tap" id="card">share a card</button>
          <button class="chip tap" id="copyText">copy as text</button>
        </div>
        <a class="big tap" href="#/lift">Back to lift</a>
      </section>`;
    const saved = state.sessions[state.sessions.length - 1];
    root.querySelector('#card')!.addEventListener('click', () =>
      void import('./more').then(({ shareSession }) => shareSession(loadLift(), saved)),
    );
    root.querySelector('#copyText')!.addEventListener('click', () =>
      void import('./more').then(({ copySession }) => copySession(loadLift(), saved)),
    );
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
    const entry = active.entries[active.open];
    const ex = exerciseById(state, entry.exerciseId);

    const typeBtn = el.closest<HTMLElement>('[data-type]');
    if (typeBtn) {
      const set = entry.sets[Number(typeBtn.dataset.type)];
      set.type = nextType(set.type);
      save();
      return drawList();
    }
    if (el.closest('.tick')) return tickSet(el.closest<HTMLElement>('.set')!);
    if (el.closest('[data-add]')) {
      const prev = entry.sets[entry.sets.length - 1];
      entry.sets.push({ weightLb: prev?.weightLb ?? 0, reps: 0, done: false, type: 'n' });
      save();
      return drawList();
    }
    if (el.closest('[data-drop]') && entry.sets.length > 1) {
      entry.sets.pop();
      save();
      return drawList();
    }
    if (el.closest('[data-warm]')) {
      const working = entry.sets.find((s) => s.weightLb)?.weightLb ?? 0;
      const warm = warmupSets(working, state.settings.barLb).map((w) => ({
        weightLb: w.weightLb,
        reps: w.reps,
        done: false,
        type: 'w' as SetType,
      }));
      entry.sets = [...warm, ...entry.sets.filter((s) => s.type !== 'w')];
      save();
      drawList();
      return toast('Warm-up sets added');
    }
    if (el.closest('[data-plates]')) {
      const working = entry.sets.find((s) => s.weightLb)?.weightLb ?? 0;
      const side = plates(working, state.settings.barLb, state.settings.plates);
      sheet(
        'Plates per side',
        `<p class="line">${showWeight(working, units)} on a ${showWeight(state.settings.barLb, units)} bar</p>
         <p class="plates">${
           side.length ? side.map((p) => `<span>${fromLb(p, units)}</span>`).join('') : 'just the bar'
         }</p>
         <p class="line sub">Change the bar and the plates you own in lift settings.</p>`,
      );
      return;
    }
    if (el.closest('[data-swap]')) {
      const host = sheet(
        `Swap ${ex.name}`,
        `<p class="line sub">What ${activeGym(state).name} has, same muscle first.</p>
         <div class="cards swap-cards">${alternatives(ex, 8, activeGym(state).equipment)
          .map(
            (a) => `<button class="card tap" data-alt="${a.id}">
              <b>${a.name}</b><span class="tag">${a.muscle} · ${GEAR_NAMES[a.gear]}</span>${ratingHtml(a)}</button>`,
          )
          .join('')}</div>
         <label class="sw tap"><input type="checkbox" id="forever"><span>Keep it in the routine, not just today</span></label>`,
      );
      host.querySelector('.cards')!.addEventListener('click', (e2) => {
        const card = (e2.target as HTMLElement).closest<HTMLElement>('[data-alt]');
        if (!card) return;
        const id = card.dataset.alt!;
        entry.exerciseId = id;
        if ((host.querySelector('#forever') as HTMLInputElement).checked) {
          const next = loadLift();
          const target = next.routines.find((r) => r.id === routine.id);
          if (target && target.items[active.open]) target.items[active.open].exerciseId = id;
          saveLift(next);
        }
        save();
        drawList();
        toast('Swapped');
        (host as HTMLElement & { close: () => void }).close();
      });
      return;
    }
    if (el.closest('[data-note]')) {
      const host = sheet(
        `Note · ${ex.name}`,
        `<label class="field"><span class="tag">This exercise</span>
           <input class="dest" id="exNote" value="${entry.note ?? ''}"></label>
         <label class="field"><span class="tag">The whole session</span>
           <input class="dest" id="sessNote" value="${active.note ?? ''}"></label>
         <button class="big tap" data-done="1" id="noteSave">SAVE</button>`,
      );
      host.querySelector('#noteSave')!.addEventListener('click', () => {
        entry.note = (host.querySelector('#exNote') as HTMLInputElement).value.trim();
        active.note = (host.querySelector('#sessNote') as HTMLInputElement).value.trim();
        save();
        drawList();
        (host as HTMLElement & { close: () => void }).close();
      });
    }
  });

  exsEl.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement;
    const row = input.closest<HTMLElement>('.set');
    if (!row) return;
    const set = active.entries[active.open].sets[Number(row.dataset.set)];
    if (input.classList.contains('w')) set.weightLb = toLb(Number(input.value), units);
    else if (input.classList.contains('r')) set.reps = Number(input.value);
    else set.rpe = Number(input.value) || undefined;
    save();
  });

  root.querySelector<HTMLElement>('#finish')!.addEventListener('click', finish);
  root.querySelector<HTMLElement>('#gym')!.addEventListener('click', () =>
    void import('./more').then(({ gymSwitcher }) =>
      gymSwitcher(() => {
        state = loadLift();
        state.active = active;
        root.querySelector<HTMLElement>('#gym')!.textContent = activeGym(state).name;
        drawList();
      }),
    ),
  );
  root.querySelector<HTMLElement>('#skip')!.addEventListener('click', stopRest);
  root.querySelector<HTMLElement>('#plus')!.addEventListener('click', () => {
    restEnd += 30_000;
    const next = loadLift();
    next.rest[restId] = restFor(next, restId) + 30;
    saveLift(next);
  });

  unlockAudio();
  const ticker = window.setInterval(paint, 200);
  whenAdvanced(paint);
  paint();

  function paint(): void {
    setText(clockEl, clock((now() - active.startedAt) / 1000));
    if (!resting) return;
    const left = (restEnd - now()) / 1000;
    setText(restClock, clock(Math.max(0, left)));
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
