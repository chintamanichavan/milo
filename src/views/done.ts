import { laurel } from '../badge';
import { load, weekDone } from '../store';
import { clock, RUNS_PER_WEEK } from '../weeks';

export interface Result {
  week: number;
  run: number;
  durationSec: number;
  partial: boolean;
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
  if (!result) {
    const last = load().completedRuns[load().completedRuns.length - 1];
    if (!last) {
      location.hash = '#/';
      return () => {};
    }
    result = { week: last.week, run: last.run, durationSec: last.durationSec, partial: false };
  }
  const { week, run, durationSec, partial } = result;
  const earned = run === RUNS_PER_WEEK && weekDone(load(), week);

  root.innerHTML = `
    <section class="done">
      <div class="ring">
        <svg viewBox="0 0 160 160" width="180" height="180">
          <circle class="ring-bg" cx="80" cy="80" r="70"/>
          <circle class="ring-fg" cx="80" cy="80" r="70"/>
        </svg>
        <div class="ring-mid"><b>${clock(durationSec)}</b><span>time moving</span></div>
      </div>
      <h1>Week ${week} Run ${run}<br>${partial ? 'in the bag' : 'done'}</h1>
      <p class="say">${
        partial
          ? 'You stopped early, and that is fine. Some is better than none.'
          : PRAISE[(week + run) % PRAISE.length]
      }</p>
      ${
        earned
          ? `<div class="earn">${laurel(week, 64)}<span>Week ${week} finished — badge earned</span></div>`
          : ''
      }
      <a class="big" href="#/">Back to today</a>
    </section>`;

  const fg = root.querySelector<SVGCircleElement>('.ring-fg')!;
  requestAnimationFrame(() => fg.classList.add('full'));
  result = null;
  return () => {};
}
