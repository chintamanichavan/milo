import { miloMark, tabBar } from '../../badge';
import { suggest, type SetLog } from '../progression';
import { exerciseById, loadLift, pastSets, restFor, sessionsWith } from '../store';

const best = (sets: SetLog[]): SetLog | undefined =>
  sets.filter((s) => s.done).sort((a, b) => b.weightLb * b.reps - a.weightLb * a.reps)[0];

const volume = (sets: SetLog[]): number =>
  sets.reduce((v, s) => v + (s.done ? s.weightLb * s.reps : 0), 0);

/** top-set weight over time */
function sparkline(tops: number[]): string {
  if (tops.length < 2) return '';
  const min = Math.min(...tops);
  const max = Math.max(...tops);
  const span = max - min || 1;
  const at = (w: number, i: number): [number, number] => [
    (i / (tops.length - 1)) * 296 + 2,
    span === 1 && max === min ? 24 : 42 - ((w - min) / span) * 36,
  ];
  const points = tops.map(at).map(([x, y]) => `${x},${y}`).join(' ');
  const dots = tops
    .map(at)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor"/>`)
    .join('');
  return `<svg class="spark" viewBox="0 0 300 48" width="100%" height="48" preserveAspectRatio="none"
    aria-label="top set weight over time">
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"
      vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>${dots}
  </svg>
  <span class="tag">top set · ${min === max ? `${max} lb` : `${min} to ${max} lb`}</span>`;
}

export function liftExerciseView(root: HTMLElement, id: string): () => void {
  const state = loadLift();
  const ex = exerciseById(state, id);
  const past = pastSets(state, id);
  const dates = sessionsWith(state, id);
  const item = state.routines.flatMap((r) => r.items).find((i) => i.exerciseId === id) ?? {
    exerciseId: id,
    sets: 3,
    low: 8,
    high: 12,
  };
  const tip = suggest(past, item, ex.inc);
  const tops = past.map((sets) => Math.max(...sets.filter((s) => s.done).map((s) => s.weightLb), 0));

  const rows = past
    .map((sets, i) => {
      const top = best(sets);
      const when = new Date(dates[i].date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `<tr><td>${when}</td><td>${top ? `${top.weightLb} × ${top.reps}` : '—'}</td>
        <td>${Math.round(volume(sets)).toLocaleString('en-US')} lb</td></tr>`;
    })
    .reverse()
    .join('');

  root.innerHTML = `
    <section class="today detail">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
        ${tabBar('lift')}
      </header>
      <div class="hero">
        <p class="tag section"><a class="tap" href="#/lift">← Lift</a></p>
        <h1>${ex.name}</h1>
        <p class="line sub">${ex.muscle} · ${ex.gear} · ${ex.inc || 'body'}${
          ex.inc ? ' lb steps' : 'weight'
        } · ${restFor(state, id)}s rest</p>
        <p class="line why">${tip.why}</p>
        ${tip.weightLb ? `<p class="line sub">Next time: <b>${tip.weightLb} lb</b></p>` : ''}
        <div class="spark-wrap">${sparkline(tops)}</div>
      </div>
      ${
        rows
          ? `<table class="log"><thead><tr><th>date</th><th>best set</th><th>volume</th></tr></thead>
             <tbody>${rows}</tbody></table>`
          : '<p class="line sub">No history yet.</p>'
      }
    </section>`;
  return () => {};
}
