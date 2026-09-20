import { miloMark, tabBar } from '../../badge';
import { lineChart } from '../../ui/chart';
import { sheet } from '../../ui/sheet';
import { toast } from '../../ui/toast';
import { alternatives } from '../data';
import { epley, recordsFor } from '../records';
import { suggest, type SetLog } from '../progression';
import {
  exerciseById,
  fromLb,
  loadLift,
  pastSets,
  restFor,
  sessionsWith,
  showWeight,
  toggleFavourite,
} from '../store';
import { liftSubNav } from './pages';

type Range = '1M' | '3M' | '6M' | '1Y';
const DAYS: Record<Range, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

const best = (sets: SetLog[]): SetLog | undefined =>
  sets
    .filter((s) => s.done && s.type !== 'w')
    .sort((a, b) => b.weightLb * b.reps - a.weightLb * a.reps)[0];

const volume = (sets: SetLog[]): number =>
  sets.reduce((v, s) => v + (s.done && s.type !== 'w' ? s.weightLb * s.reps : 0), 0);

export function liftExerciseView(root: HTMLElement, id: string): () => void {
  const state = loadLift();
  const ex = exerciseById(state, id);
  const units = state.settings.units;
  const range = (new URLSearchParams(location.hash.split('?')[1] ?? '').get('r') ?? '3M') as Range;
  const since = Date.now() - DAYS[range] * 86_400_000;

  const sessions = sessionsWith(state, id).filter((s) => new Date(s.date).getTime() >= since);
  const past = sessions.map((s) => s.entries.find((e) => e.exerciseId === id)!.sets);
  const item = state.routines.flatMap((r) => r.items).find((i) => i.exerciseId === id) ?? {
    exerciseId: id,
    sets: 3,
    low: 8,
    high: 12,
  };
  const tip = suggest(pastSets(state, id), item, ex.inc, { rpe: item.rpe });
  const records = recordsFor(state.sessions, id);
  const topWeight = records.length ? Math.max(...records.map((r) => r.weight)) : 0;
  const topOneRm = records.length ? Math.max(...records.map((r) => r.oneRm)) : 0;
  const topVolume = records.length ? Math.max(...records.map((r) => r.volume)) : 0;

  const oneRmSeries = past.map((sets) => {
    const list = sets.filter((s) => s.done && s.type !== 'w');
    return list.length ? Math.round(Math.max(...list.map((s) => epley(s.weightLb, s.reps)))) : 0;
  });
  const weightSeries = past.map((sets) => {
    const top = best(sets);
    return top ? Math.round(fromLb(top.weightLb, units)) : 0;
  });
  const volumeSeries = past.map((sets) => Math.round(fromLb(volume(sets), units)));
  const repsAtTop = past.map((sets) => {
    const top = best(sets);
    return top ? sets.filter((s) => s.done && s.weightLb === top.weightLb).reduce((n, s) => n + s.reps, 0) : 0;
  });

  const rows = past
    .map((sets, i) => {
      const top = best(sets);
      const when = new Date(sessions[i].date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `<tr><td>${when}</td><td>${top ? `${fromLb(top.weightLb, units)} × ${top.reps}` : '—'}</td>
        <td>${showWeight(volume(sets), units)}</td></tr>`;
    })
    .reverse()
    .join('');

  root.innerHTML = `
    <section class="today lift-page detail">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
        ${tabBar('lift')}
      </header>
      ${liftSubNav('library')}
      <div class="hero">
        <p class="tag section"><a class="tap" href="#/lift/library">← Exercises</a></p>
        <h1>${ex.name}</h1>
        <p class="line sub">${ex.muscle}${ex.also ? ` · also ${ex.also}` : ''} · ${ex.gear} · ${
          ex.inc ? `${fromLb(ex.inc, units)} ${units} steps` : 'bodyweight'
        } · ${restFor(state, id)}s rest</p>
        <p class="line">${ex.how}</p>
        <p class="line why">${tip.why}</p>
        ${tip.weightLb ? `<p class="line sub">Next time: <b>${showWeight(tip.weightLb, units)}</b></p>` : ''}
        <div class="chips">
          <button class="chip tap" id="fav">${
            state.favourites.includes(id) ? '★ favourite' : '☆ favourite'
          }</button>
          <button class="chip tap" id="swap">alternatives</button>
        </div>
        <div class="chips">
          ${(['1M', '3M', '6M', '1Y'] as Range[])
            .map(
              (r) =>
                `<a class="chip tap${r === range ? ' on' : ''}" href="#/lift/exercise/${id}?r=${r}">${r}</a>`,
            )
            .join('')}
        </div>
      </div>
      <div class="records">
        <div><b>${topWeight ? showWeight(topWeight, units) : '—'}</b><span>heaviest set</span></div>
        <div><b>${topOneRm ? showWeight(Math.round(topOneRm), units) : '—'}</b><span>est. 1RM</span></div>
        <div><b>${topVolume ? showWeight(topVolume, units) : '—'}</b><span>best set volume</span></div>
      </div>
      <div class="panel"><p class="tag">Estimated 1RM</p>${lineChart(oneRmSeries, `est 1RM`)}</div>
      <div class="panel"><p class="tag">Top set weight</p>${lineChart(weightSeries, units)}</div>
      <div class="panel"><p class="tag">Volume per session</p>${lineChart(volumeSeries, units)}</div>
      <div class="panel"><p class="tag">Reps at top weight</p>${lineChart(repsAtTop, 'reps')}</div>
      ${
        rows
          ? `<table class="log"><thead><tr><th>date</th><th>best set</th><th>volume</th></tr></thead>
             <tbody>${rows}</tbody></table>`
          : '<p class="line sub">No history in this range.</p>'
      }
    </section>`;

  root.querySelector('#fav')!.addEventListener('click', () => {
    toggleFavourite(id);
    liftExerciseView(root, id);
  });
  root.querySelector('#swap')!.addEventListener('click', () => {
    sheet(
      `Instead of ${ex.name}`,
      `<div class="cards">${alternatives(ex, 10)
        .map(
          (a) => `<a class="card tap" href="#/lift/exercise/${a.id}"><b>${a.name}</b>
            <span class="tag">${a.muscle} · ${a.gear}</span></a>`,
        )
        .join('')}</div>`,
    );
    toast('Same muscle, different feel');
  });
  return () => {};
}
