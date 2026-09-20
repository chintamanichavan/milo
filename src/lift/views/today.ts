import { miloMark, tabBar } from '../../badge';
import { barList } from '../../ui/chart';
import { liftSubNav } from './pages';
import { REST_DEFAULT } from '../data';
import {
  daysAgo,
  exerciseById,
  loadLift,
  weeklyVolume,
  weekStreak,
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

/** quiet suggestions when a muscle is under the weekly band */
function nudges(state: LiftState): string {
  const volume = weeklyVolume(state);
  if (volume.size === 0) return '';
  const thin = [...volume.entries()].filter(([, sets]) => sets < 10);
  const rows = [...volume.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, note: value < 10 ? '· room for more' : '' }));
  return `<div class="panel">
    <p class="tag">Sets this week<span>10–20 per muscle</span></p>
    ${barList(rows, ' sets')}
    ${
      thin.length
        ? `<p class="line sub">Light on ${thin
            .slice(0, 3)
            .map(([m]) => m)
            .join(', ')} — one more set each would do it.</p>`
        : ''
    }
  </div>`;
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
      ${liftSubNav('')}
      <div class="hero">
        <p class="tag section">Lift · ${sessionsThisWeek(state)} this week${
          weekStreak(state) > 1 ? ` · ${weekStreak(state)}-week streak` : ''
        }${state.settings.deloadNext ? ' · deload next' : ''}</p>
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
      ${nudges(state)}
      ${historyBlock(state)}
    </section>`;
  return () => {};
}
