import { unlockAudio } from '../audio';
import { laurel } from '../badge';
import {
  doneCount,
  exportFile,
  importFile,
  isDone,
  load,
  nextUp,
  setSettings,
  weekDone,
} from '../store';
import { planFor, planLine, RUNS_PER_WEEK, TOTAL_RUNS, TOTAL_WEEKS } from '../weeks';

const FIRST_RUN = 'Sunday, Sep 20';

const watchHint = (recipe: string): string =>
  `<details class="watch"><summary>⌚ set up on Watch</summary>
     <div><b>Workout → Outdoor Run → Create Custom</b><p>${recipe}</p></div></details>`;

export function todayView(root: HTMLElement): () => void {
  const state = load();
  const up = nextUp(state);
  const week = up?.week ?? TOTAL_WEEKS;
  const run = up?.run ?? RUNS_PER_WEEK;
  const plan = planFor(week, run);

  const grid = Array.from({ length: TOTAL_WEEKS }, (_, wi) => {
    const w = wi + 1;
    const cells = Array.from({ length: RUNS_PER_WEEK }, (_, ri) => {
      const state2 = isDone(state, w, ri + 1)
        ? 'on'
        : up && up.week === w && up.run === ri + 1
          ? 'now'
          : '';
      return `<i class="cell ${state2}"></i>`;
    }).join('');
    return `<div class="col">${cells}<b>${w}</b></div>`;
  }).join('');

  const badges = Array.from({ length: TOTAL_WEEKS }, (_, wi) => wi + 1)
    .filter((w) => weekDone(state, w))
    .map((w) => laurel(w))
    .join('');

  const repeatWeek = up && up.run === 1 && up.week > 1 ? up.week - 1 : null;

  root.innerHTML = `
    <section class="today">
      <header class="head"><span class="tag">C25K</span><span class="tag">${doneCount(state)} / ${TOTAL_RUNS} runs</span></header>
      ${
        up
          ? `<h1>Week ${week}<span> · Run ${run} of 3</span></h1>
             <p class="line">${planLine(plan)}</p>
             ${watchHint(plan.watch)}
             <a class="big" id="start" href="#/run/${week}/${run}">START</a>
             ${state.completedRuns.length === 0 ? `<p class="line quiet mid">First run: ${FIRST_RUN}</p>` : ''}`
          : `<h1>All nine weeks<span> · done</span></h1>
             <p class="line">You run 5k now. Go again whenever you like.</p>
             <a class="big" id="start" href="#/run/9/3">RUN 30′</a>`
      }
      ${
        repeatWeek
          ? `<p class="line quiet">Week ${repeatWeek} felt hard? <a href="#/run/${repeatWeek}/1">Repeat week ${repeatWeek}</a> — a week done twice still counts.</p>`
          : ''
      }
      <div class="grid">${grid}</div>
      ${badges ? `<div class="badges">${badges}</div>` : ''}
      <footer class="foot">
        <label class="sw"><input type="checkbox" id="voice" ${state.settings.voice ? 'checked' : ''}><span>Voice cues</span></label>
        <label class="sw"><input type="checkbox" id="beep" ${state.settings.beep ? 'checked' : ''}><span>Beeps</span></label>
        <button class="link" id="export">Export</button>
        <label class="link">Import<input type="file" id="import" accept="application/json" hidden></label>
      </footer>
    </section>`;

  root.querySelector<HTMLElement>('#start')!.addEventListener('click', unlockAudio);
  root.querySelector<HTMLInputElement>('#voice')!.addEventListener('change', (e) => {
    setSettings({ voice: (e.target as HTMLInputElement).checked });
  });
  root.querySelector<HTMLInputElement>('#beep')!.addEventListener('change', (e) => {
    setSettings({ beep: (e.target as HTMLInputElement).checked });
  });
  root.querySelector<HTMLElement>('#export')!.addEventListener('click', exportFile);
  root.querySelector<HTMLInputElement>('#import')!.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file && (await importFile(file))) todayView(root);
  });
  return () => {};
}
