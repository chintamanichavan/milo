import { unlockAudio } from '../../audio';
import { miloMark, watchGlyph } from '../../badge';
import { toast } from '../../ui/toast';
import { nextRunDay } from '../ics';
import { planOf, programmeById } from '../plans';
import {
  claimCelebrate,
  doneCount,
  graduated,
  isDone,
  load,
  nextUp,
  runsIn,
  weekDone,
  type State,
} from '../store';
import { WEEK_TIPS } from '../tips';
import { TOTAL_RUNS, totalLine } from '../weeks';
import { runSubNav } from './pages';

const watchHint = (recipe: string): string =>
  `<details class="watch"><summary><span class="tap">${watchGlyph()} set up on Watch</span></summary>
     <div><b>Workout → Outdoor Run → Create Custom</b><p>${recipe}</p></div></details>`;

/** two hard runs in the last three is worth a quiet word */
function hardLately(state: State, prog: string): boolean {
  const recent = runsIn(state, prog).slice(-3);
  return recent.filter((r) => r.feel === 'hard').length >= 2;
}

export function todayView(root: HTMLElement): () => void {
  const state = load();
  const prog = programmeById(state.settings.programme);
  const up = nextUp(state, prog.id, prog.weeks, prog.runsPerWeek);
  const week = up?.week ?? prog.weeks;
  const run = up?.run ?? prog.runsPerWeek;
  const plan = planOf(prog.id, week, run);
  const celebrate = claimCelebrate();
  const tip = prog.id === 'c25k' ? WEEK_TIPS[week] : undefined;
  const done = runsIn(state, prog.id).length;

  let order = 0;
  const grid = Array.from({ length: prog.weeks }, (_, wi) => {
    const w = wi + 1;
    const cells = Array.from({ length: prog.runsPerWeek }, (_, ri) => {
      const isThere = isDone(state, w, ri + 1, prog.id);
      const isNow = up && up.week === w && up.run === ri + 1;
      const cls = isThere ? 'cell on' : isNow ? 'cell now' : 'cell';
      return `<i class="${cls}"${isThere ? ` style="--i:${order++}"` : ''}></i>`;
    }).join('');
    const foot =
      prog.id === 'c25k' && weekDone(state, w)
        ? `<span class="won">${miloMark(22, 44)}</span>`
        : `<b>${w}</b>`;
    return `<div class="col">${cells}${foot}</div>`;
  }).join('');

  const repeatWeek = up && up.run === 1 && up.week > 1 ? up.week - 1 : null;
  const nextDay = nextRunDay(state.settings.reminder);

  root.innerHTML = `
    <section class="today${celebrate ? ' celebrate' : ''}">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
      </header>
      ${runSubNav('')}
      <div class="hero">
        <p class="tag section">${prog.name} · ${
          prog.id === 'c25k' ? `${doneCount(state)} of ${TOTAL_RUNS} runs` : `${done} runs in`
        }</p>
        ${
          up
            ? `<h1>Week ${week}<span><i> · </i>Run ${run} of ${prog.runsPerWeek}</span></h1>
               <p class="line">${plan.label}.</p>
               <p class="line sub">${totalLine(plan)}</p>
               ${watchHint(plan.watch)}
               <a class="big tap" id="start" href="#/run/${prog.id}/${week}/${run}">START</a>
               <p class="line sub mid">${
                 state.completedRuns.length === 0
                   ? `First run: ${nextDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
                   : `Next run day: ${nextDay.toLocaleDateString('en-US', { weekday: 'long' })} at ${state.settings.reminder.time}`
               }</p>`
            : `<h1>${prog.name}<span><i> · </i>done</span></h1>
               <p class="line">${
                 prog.id === 'c25k'
                   ? 'You run 5k now. Go again whenever you like.'
                   : 'Plan complete. Pick another, or run it again.'
               }</p>
               <a class="big tap" id="start" href="#/run/${prog.id}/${prog.weeks}/${prog.runsPerWeek}">RUN IT AGAIN</a>
               <p class="line sub mid"><a class="tap" href="#/run/plans">See the 5K+ plans</a></p>`
        }
        ${
          hardLately(state, prog.id)
            ? `<p class="line sub">Two of your last three felt hard. Repeating a week is a normal thing to do.</p>`
            : ''
        }
        ${
          repeatWeek
            ? `<p class="line sub">Week ${repeatWeek} felt hard? A week done twice still counts.</p>
               <a class="link tap" href="#/run/${prog.id}/${repeatWeek}/1">Repeat week ${repeatWeek}</a>`
            : ''
        }
        ${
          tip
            ? `<a class="tipcard tap" href="#/run/tips"><span class="tag">This week</span>
                 <b>${tip.title}</b><span class="line sub">${tip.body[0].slice(0, 96)}…</span></a>`
            : ''
        }
        ${
          graduated(state) && prog.id === 'c25k'
            ? `<p class="line sub mid"><a class="tap" href="#/run/certificate">Your certificate</a></p>`
            : ''
        }
      </div>
      <div class="grid">${grid}</div>
    </section>`;

  root.querySelector<HTMLElement>('#start')!.addEventListener('click', () => {
    unlockAudio();
    if (state.settings.gps && !state.settings.treadmill)
      navigator.geolocation?.getCurrentPosition(
        () => {},
        () => toast('Location is off — the run still counts'),
      );
  });
  return () => {};
}
