import { beep, say, stopSpeech } from '../audio';
import { now, whenAdvanced } from '../clock';
import { clock, planFor, shortDuration, spellDuration, type Plan } from '../weeks';
import { recordRun } from '../store';
import { setResult } from './done';

interface Spot {
  index: number;
  start: number;
  remaining: number;
}

function locate(plan: Plan, elapsed: number): Spot {
  let start = 0;
  for (let i = 0; i < plan.segments.length; i++) {
    const end = start + plan.segments[i].sec;
    if (elapsed < end) return { index: i, start, remaining: end - elapsed };
    start = end;
  }
  return { index: plan.segments.length, start, remaining: 0 };
}

function cueFor(plan: Plan, index: number, lastRunIndex: number): string {
  const seg = plan.segments[index];
  if (index === 0) return 'Warm up. Walk for five minutes.';
  if (index === plan.segments.length - 1) return 'Cool down. Walk it out for five minutes.';
  if (seg.kind === 'walk') return `Walk for ${spellDuration(seg.sec)}.`;
  if (index === lastRunIndex)
    return `Last one. Run for ${spellDuration(seg.sec)}. You've got this.`;
  return `Run for ${spellDuration(seg.sec)}.`;
}

export function runView(root: HTMLElement, week: number, run: number): () => void {
  const plan = planFor(week, run);
  const segs = plan.segments;
  const lastRunIndex = segs.reduce((best, s, i) => (s.kind === 'run' ? i : best), 0);

  root.innerHTML = `
    <section class="run" id="stage">
      <header class="run-head">
        <span class="tag">Week ${week} · Run ${run}</span>
        <button class="link" id="end">End early</button>
      </header>
      <div class="stage-mid">
        <div class="kind" id="kind">WALK</div>
        <div class="count" id="count">0:00</div>
        <div class="next" id="next"></div>
      </div>
      <div class="track" id="track">
        <div class="track-row" id="rowDim"></div>
        <div class="track-row track-lit" id="rowLit"></div>
      </div>
      <div class="run-foot"><span id="elapsed">0:00</span><span id="total"></span></div>
      <button class="big" id="pause">Pause</button>
    </section>`;

  const stage = root.querySelector<HTMLElement>('#stage')!;
  const kindEl = root.querySelector<HTMLElement>('#kind')!;
  const countEl = root.querySelector<HTMLElement>('#count')!;
  const nextEl = root.querySelector<HTMLElement>('#next')!;
  const litEl = root.querySelector<HTMLElement>('#rowLit')!;
  const elapsedEl = root.querySelector<HTMLElement>('#elapsed')!;
  const pauseBtn = root.querySelector<HTMLButtonElement>('#pause')!;

  const blocks = segs
    .map((s) => `<i class="blk ${s.kind}" style="flex-grow:${s.sec}"></i>`)
    .join('');
  root.querySelector<HTMLElement>('#rowDim')!.innerHTML = blocks;
  litEl.innerHTML = blocks;
  root.querySelector<HTMLElement>('#total')!.textContent = `${clock(plan.totalSec)} total`;

  const startedAt = now();
  let pausedAt: number | null = null;
  let pausedFor = 0;
  let cued = -1;
  let halfwayCued = -1;
  let finished = false;

  const elapsed = (): number => ((pausedAt ?? now()) - startedAt - pausedFor) / 1000;

  function paint(): void {
    const e = Math.min(elapsed(), plan.totalSec);
    const spot = locate(plan, e);
    if (spot.index >= segs.length) return finish(plan.totalSec, false);

    const seg = segs[spot.index];
    const next = segs[spot.index + 1];
    kindEl.textContent = seg.kind === 'run' ? 'RUN' : 'WALK';
    stage.dataset.kind = seg.kind;
    countEl.textContent = clock(spot.remaining);
    nextEl.textContent = next
      ? `next · ${next.kind} ${shortDuration(next.sec)}`
      : 'next · you are done';
    elapsedEl.textContent = clock(e);
    litEl.style.clipPath = `inset(0 ${100 - (e / plan.totalSec) * 100}% 0 0)`;

    if (spot.index !== cued) {
      cued = spot.index;
      beep(seg.kind);
      say(cueFor(plan, spot.index, lastRunIndex));
    }
    const half = spot.start + seg.sec / 2;
    if (seg.kind === 'run' && seg.sec >= 480 && halfwayCued !== spot.index && e >= half) {
      halfwayCued = spot.index;
      beep('halfway');
      say('Halfway. Keep it easy.');
    }
  }

  function finish(seconds: number, partial: boolean): void {
    if (finished) return;
    finished = true;
    beep('done');
    say(partial ? 'Stopping here. Some is better than none.' : 'Done. Nice work.');
    recordRun(week, run, seconds);
    setResult({ week, run, durationSec: seconds, partial });
    location.hash = '#/done';
  }

  pauseBtn.addEventListener('click', () => {
    if (pausedAt === null) {
      pausedAt = now();
      pauseBtn.textContent = 'Resume';
      stage.classList.add('paused');
      stopSpeech();
    } else {
      pausedFor += now() - pausedAt;
      pausedAt = null;
      pauseBtn.textContent = 'Pause';
      stage.classList.remove('paused');
    }
    paint();
  });

  root.querySelector<HTMLElement>('#end')!.addEventListener('click', () => {
    finish(Math.min(elapsed(), plan.totalSec), true);
  });

  // Dim the screen after 10s of stillness; any touch brings it back.
  let dimAt = Date.now() + 10_000;
  const wake = (): void => {
    dimAt = Date.now() + 10_000;
    document.body.classList.remove('dim');
  };
  for (const evt of ['pointerdown', 'keydown'] as const)
    document.addEventListener(evt, wake, true);

  const ticker = window.setInterval(() => {
    paint();
    if (Date.now() > dimAt && pausedAt === null) document.body.classList.add('dim');
  }, 200);
  whenAdvanced(paint);
  paint();

  let lock: WakeLockSentinel | null = null;
  const takeLock = async (): Promise<void> => {
    try {
      lock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      lock = null;
    }
  };
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') void takeLock();
  };
  void takeLock();
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(ticker);
    whenAdvanced(null);
    document.removeEventListener('visibilitychange', onVisible);
    for (const evt of ['pointerdown', 'keydown'] as const)
      document.removeEventListener(evt, wake, true);
    document.body.classList.remove('dim');
    void lock?.release();
    stopSpeech();
  };
}
