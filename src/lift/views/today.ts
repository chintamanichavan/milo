import { miloMark, tabBar } from '../../badge';
import { REST_DEFAULT } from '../data';
import {
  daysAgo,
  exerciseById,
  loadLift,
  nextRoutine,
  routineById,
  sessionsThisWeek,
  setsDone,
  volumeOf,
  type LiftState,
} from '../store';

const lb = (n: number): string => `${Math.round(n).toLocaleString('en-US')} lb`;

const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function historyBlock(state: LiftState): string {
  if (state.sessions.length === 0)
    return `<p class="line sub">No sessions yet. The first one is the hard one.</p>`;
  const rows = [...state.sessions]
    .reverse()
    .slice(0, 12)
    .map((s) => {
      const lines = s.entries
        .filter((e) => e.sets.some((x) => x.done))
        .map((e) => {
          const ex = exerciseById(state, e.exerciseId);
          const done = e.sets.filter((x) => x.done);
          const reps = done.map((x) => x.reps).join(', ');
          return `<tr><td><a href="#/lift/exercise/${ex.id}">${ex.name}</a></td>
            <td>${done[0]?.weightLb || ''} × ${reps}</td></tr>`;
        })
        .join('');
      return `<details class="day"><summary><span>${day(s.date)} · ${routineById(state, s.routineId).name}</span>
        <span class="sub">${setsDone(s)} sets · ${lb(volumeOf(s))}</span></summary>
        <table>${lines}</table></details>`;
    })
    .join('');
  return `<div class="hist"><p class="tag">History</p>${rows}</div>`;
}

export function liftTodayView(root: HTMLElement): () => void {
  const state = loadLift();
  const active = state.active;
  const routine = active ? routineById(state, active.routineId) : nextRoutine(state);
  const last = [...state.sessions].reverse().find((s) => s.routineId === routine.id);
  const names = routine.items.map((i) => exerciseById(state, i.exerciseId).name);
  const sets = routine.items.reduce((n, i) => n + i.sets, 0);
  const others = state.routines.filter((r) => r.id !== routine.id);

  root.innerHTML = `
    <section class="today">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
        ${tabBar('lift')}
      </header>
      <div class="hero">
        <p class="tag section">Lift · ${sessionsThisWeek(state)} this week</p>
        <h1>${routine.name}<span><i> · </i>${
          active ? 'in progress' : last ? `last ${daysAgo(last.date)}` : 'not yet done'
        }</span></h1>
        <p class="line">${names.join(' · ')}</p>
        <p class="line sub">${routine.items.length} exercises · ${sets} sets · ${REST_DEFAULT}s rest</p>
        <a class="big tap" id="start" href="#/lift/session/${routine.id}">${
          active ? 'CONTINUE' : 'START'
        }</a>
        ${
          others.length
            ? `<p class="line sub mid">or ${others
                .map((r) => `<a class="tap" href="#/lift/session/${r.id}">${r.name}</a>`)
                .join(' · ')}</p>`
            : ''
        }
      </div>
      ${historyBlock(state)}
    </section>`;
  return () => {};
}
