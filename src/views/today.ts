import { unlockAudio } from '../audio';
import { miloMark, tabBar, watchGlyph } from '../badge';
import {
  claimCelebrate,
  doneCount,
  exportFile,
  importFile,
  isDone,
  load,
  nextUp,
  setSettings,
  weekDone,
} from '../store';
import { planFor, RUNS_PER_WEEK, TOTAL_RUNS, TOTAL_WEEKS, totalLine } from '../weeks';

const FIRST_RUN = 'Sunday, Sep 20';

const watchHint = (recipe: string): string =>
  `<details class="watch"><summary><span class="tap">${watchGlyph()} set up on Watch</span></summary>
     <div><b>Workout → Outdoor Run → Create Custom</b><p>${recipe}</p></div></details>`;

export function todayView(root: HTMLElement): () => void {
  const state = load();
  const up = nextUp(state);
  const week = up?.week ?? TOTAL_WEEKS;
  const run = up?.run ?? RUNS_PER_WEEK;
  const plan = planFor(week, run);
  const celebrate = claimCelebrate();

  let order = 0;
  const grid = Array.from({ length: TOTAL_WEEKS }, (_, wi) => {
    const w = wi + 1;
    const cells = Array.from({ length: RUNS_PER_WEEK }, (_, ri) => {
      const done = isDone(state, w, ri + 1);
      const now = up && up.week === w && up.run === ri + 1;
      const cls = done ? 'cell on' : now ? 'cell now' : 'cell';
      return `<i class="${cls}"${done ? ` style="--i:${order++}"` : ''}></i>`;
    }).join('');
    const foot = weekDone(state, w) ? `<span class="won">${miloMark(22, 44)}</span>` : `<b>${w}</b>`;
    return `<div class="col">${cells}${foot}</div>`;
  }).join('');

  const repeatWeek = up && up.run === 1 && up.week > 1 ? up.week - 1 : null;

  root.innerHTML = `
    <section class="today${celebrate ? ' celebrate' : ''}">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
        ${tabBar('run')}
      </header>
      <div class="hero">
        <p class="tag section">Couch to 5K · ${doneCount(state)} of ${TOTAL_RUNS} runs</p>
        ${
          up
            ? `<h1>Week ${week}<span><i> · </i>Run ${run} of 3</span></h1>
               <p class="line">${plan.label}.</p>
               <p class="line sub">${totalLine(plan)}</p>
               ${watchHint(plan.watch)}
               <a class="big tap" id="start" href="#/run/${week}/${run}">START</a>
               ${state.completedRuns.length === 0 ? `<p class="line sub mid">First run: ${FIRST_RUN}</p>` : ''}`
            : `<h1>All nine weeks<span><i> · </i>done</span></h1>
               <p class="line">You run 5k now. Go again whenever you like.</p>
               <p class="line sub">${totalLine(plan)}</p>
               ${watchHint(plan.watch)}
               <a class="big tap" id="start" href="#/run/9/3">RUN 30′</a>`
        }
        ${
          repeatWeek
            ? `<p class="line sub">Week ${repeatWeek} felt hard? <a class="tap" href="#/run/${repeatWeek}/1">Repeat week ${repeatWeek}</a> — a week done twice still counts.</p>`
            : ''
        }
      </div>
      <div class="grid">${grid}</div>
      <footer class="foot">
        <label class="sw tap"><input type="checkbox" id="voice" ${state.settings.voice ? 'checked' : ''}><span>Voice cues</span></label>
        <label class="sw tap"><input type="checkbox" id="beep" ${state.settings.beep ? 'checked' : ''}><span>Beeps</span></label>
        <button class="link tap" id="export">Export</button>
        <label class="link tap" tabindex="0">Import<input type="file" id="import" accept="application/json" hidden></label>
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
