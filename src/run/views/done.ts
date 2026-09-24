import { miloMark } from '../../badge';
import { clock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { distanceLabel, paceLabel, routeSvg } from '../gps';
import { programmeById } from '../plans';
import { load, updateRun, weekDone, type CompletedRun } from '../store';
import { RUNS_PER_WEEK, TOTAL_WEEKS } from '../weeks';

export interface Result extends Partial<CompletedRun> {
  week: number;
  run: number;
  durationSec: number;
  partial: boolean;
  programme?: string;
}

let result: Result | null = null;

export function setResult(next: Result): void {
  result = next;
}

const PRAISE = [
  'That is one more run than yesterday.',
  'You showed up. That is the whole trick.',
  'Legs did the work. You did the deciding.',
  'Slow counts. Slow is the point.',
  'Rest up — the next one keeps.',
];

export function doneView(root: HTMLElement): () => void {
  const state = load();
  if (!result) {
    const last = state.completedRuns[state.completedRuns.length - 1];
    if (!last) {
      location.hash = '#/';
      return () => {};
    }
    result = { ...last, partial: false, programme: last.prog };
  }
  const { week, run, durationSec, partial } = result;
  const programme = programmeById(result.programme ?? 'c25k');
  const index = state.completedRuns.length - 1;
  const earned =
    programme.id === 'c25k' && run === RUNS_PER_WEEK && weekDone(state, week);
  const graduating = programme.id === 'c25k' && week === TOTAL_WEEKS && run === RUNS_PER_WEEK;
  const units = state.settings.units;

  root.innerHTML = `
    <section class="done">
      <div class="ring">
        <svg viewBox="0 0 160 160" width="184" height="184">
          <circle class="ring-bg" cx="80" cy="80" r="70"/>
          <circle class="ring-fg" cx="80" cy="80" r="70"/>
        </svg>
        <div class="ring-mid">
          <span class="check">${miloMark(30, 30)}</span>
          <b>${clock(durationSec)}</b><span>time moving</span>
        </div>
      </div>
      <h1>${programme.id === 'c25k' ? `Week ${week} Run ${run}` : `${programme.name} W${week}R${run}`}<br>${
        partial ? 'in the bag' : 'done'
      }</h1>
      <p class="say">${
        partial
          ? 'You stopped early, and that is fine. Some is better than none.'
          : PRAISE[(week + run) % PRAISE.length]
      }</p>
      ${
        result.distanceKm
          ? `<div class="tally">
              <div><b>${distanceLabel(result.distanceKm, units)}</b><span>distance</span></div>
              <div><b>${paceLabel(result.runPace ?? 0, units)}</b><span>running</span></div>
              <div><b>${paceLabel(result.walkPace ?? 0, units)}</b><span>walking</span></div>
            </div>
            <div class="route-wrap">${routeSvg(result.path ?? [])}</div>`
          : ''
      }
      ${
        state.settings.treadmill && !result.distanceKm
          ? `<label class="field treadmill"><span class="tag">Distance on the treadmill</span>
              <input class="num" id="tread" inputmode="decimal" placeholder="${units}"></label>`
          : ''
      }
      <div class="feel">
        <p class="tag">How did that feel?</p>
        <div class="chips" id="feel">
          ${(['easy', 'ok', 'hard'] as const)
            .map((f) => `<button class="chip tap" data-feel="${f}">${f}</button>`)
            .join('')}
        </div>
        <input class="dest" id="note" placeholder="a note, if you want one">
      </div>
      ${
        result.cues?.length
          ? `<details class="cuelog"><summary class="tag">What the coach said · ${result.cues.length}</summary>
              <ol>${result.cues
                .map(([sec, line]) => `<li><span class="mono">${clock(sec)}</span>${line}</li>`)
                .join('')}</ol></details>`
          : ''
      }
      ${
        earned && !graduating
          ? `<div class="earn">${miloMark(48, 30)}<span>Week ${week} finished. Badge earned!</span></div>`
          : ''
      }
      ${
        graduating
          ? `<a class="big tap" href="#/run/certificate">SEE YOUR CERTIFICATE</a>`
          : `<a class="big tap" href="#/">Back to today</a>`
      }
    </section>`;

  requestAnimationFrame(() => root.querySelector('.done')!.classList.add('sealed'));

  root.querySelector('#feel')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-feel]');
    if (!chip) return;
    for (const el of root.querySelectorAll('[data-feel]')) el.classList.remove('on');
    chip.classList.add('on');
    updateRun(index, { feel: chip.dataset.feel as CompletedRun['feel'] });
    toast('Noted');
  });
  root.querySelector('#tread')?.addEventListener('change', (ev) => {
    const value = Number((ev.target as HTMLInputElement).value);
    if (value > 0)
      updateRun(index, {
        distanceKm: units === 'km' ? value : value * 1.609_344,
      });
    toast('Distance saved');
  });
  root.querySelector('#note')!.addEventListener('change', (ev) => {
    updateRun(index, { note: (ev.target as HTMLInputElement).value.trim() });
  });

  result = null;
  return () => {};
}
