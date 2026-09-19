import { beep, say, stopSpeech } from '../audio';
import { now, whenAdvanced } from '../clock';
import { claimHint, recordRun } from '../store';
import { clock, planFor, shortDuration, spellDuration, type Plan } from '../weeks';
import { setResult } from './done';

const COUNT_IN_MS = 3600;
const HOLD_MS = 400;

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

const replay = (el: HTMLElement, cls: string): void => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};

export function runView(root: HTMLElement, week: number, run: number): () => void {
  const plan = planFor(week, run);
  const segs = plan.segments;
  const lastRunIndex = segs.reduce((best, s, i) => (s.kind === 'run' ? i : best), 0);
  const showHint = claimHint();

  root.innerHTML = `
    <section class="run" id="stage" data-kind="walk" data-phase="count"
      tabindex="0" role="button" aria-label="Hold anywhere to pause">
      <div class="wash"></div>
      <header class="run-head">
        <span class="tag">Week ${week} · Run ${run}</span>
        <button class="link tap" id="end">End early</button>
      </header>
      <div class="stage-mid">
        <div class="kind" id="kind">WALK</div>
        <div class="count" id="count">5:00</div>
        <div class="next" id="next"></div>
      </div>
      <footer class="run-foot">
        <div class="track">
          <div class="track-row">${segs.map((s) => `<i class="blk ${s.kind}" style="flex-grow:${s.sec}"></i>`).join('')}</div>
          <div class="track-row track-lit" id="rowLit">${segs.map((s) => `<i class="blk ${s.kind}" style="flex-grow:${s.sec}"></i>`).join('')}</div>
          <i class="marker" id="marker"></i>
          <i class="shimmer" id="shimmer"></i>
        </div>
        <div class="meta"><span id="elapsed">0:00</span><span>${clock(plan.totalSec)} total</span></div>
        <p class="hint" id="hint">${showHint ? 'hold anywhere to pause' : ''}</p>
      </footer>
      <div class="countin" id="countin"><b id="digit">3</b></div>
      <p class="sr" aria-live="polite" id="live"></p>
    </section>`;

  const stage = root.querySelector<HTMLElement>('#stage')!;
  const kindEl = root.querySelector<HTMLElement>('#kind')!;
  const countEl = root.querySelector<HTMLElement>('#count')!;
  const nextEl = root.querySelector<HTMLElement>('#next')!;
  const litEl = root.querySelector<HTMLElement>('#rowLit')!;
  const markerEl = root.querySelector<HTMLElement>('#marker')!;
  const shimmerEl = root.querySelector<HTMLElement>('#shimmer')!;
  const elapsedEl = root.querySelector<HTMLElement>('#elapsed')!;
  const hintEl = root.querySelector<HTMLElement>('#hint')!;
  const digitEl = root.querySelector<HTMLElement>('#digit')!;
  const liveEl = root.querySelector<HTMLElement>('#live')!;

  const openedAt = now();
  const startedAt = openedAt + COUNT_IN_MS;
  let pausedAt: number | null = null;
  let pausedFor = 0;
  let counting = true;
  let digit = '';
  let cued = -1;
  let ticked = -1;
  let halfwaySaid = false;
  let finished = false;

  const elapsed = (): number => ((pausedAt ?? now()) - startedAt - pausedFor) / 1000;

  function countIn(): void {
    const left = startedAt - now();
    const want = left > 2600 ? '3' : left > 1600 ? '2' : left > 600 ? '1' : 'GO';
    if (want !== digit) {
      digit = want;
      digitEl.textContent = want;
      replay(digitEl, 'beat');
      if (want === 'GO') {
        beep('go');
        say(cueFor(plan, 0, lastRunIndex));
        liveEl.textContent = cueFor(plan, 0, lastRunIndex);
        cued = 0;
      } else beep('tick');
    }
    if (left <= 0) {
      counting = false;
      stage.dataset.phase = 'run';
    }
  }

  function paint(): void {
    if (counting && now() < startedAt) return countIn();
    if (counting) countIn();

    const e = Math.min(Math.max(elapsed(), 0), plan.totalSec);
    const spot = locate(plan, e);
    if (spot.index >= segs.length) return finish(plan.totalSec, false);
    const seg = segs[spot.index];
    const next = segs[spot.index + 1];
    const pct = (e / plan.totalSec) * 100;

    countEl.textContent = clock(spot.remaining);
    nextEl.textContent = next
      ? `next · ${next.kind} ${shortDuration(next.sec)}`
      : 'next · the finish';
    elapsedEl.textContent = clock(e);
    litEl.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    markerEl.style.left = `${pct}%`;

    if (spot.index !== cued) {
      cued = spot.index;
      ticked = -1;
      kindEl.textContent = seg.kind === 'run' ? 'RUN' : 'WALK';
      stage.dataset.kind = seg.kind;
      replay(kindEl, 'swap');
      replay(countEl, 'pulse');
      beep(seg.kind);
      const line = cueFor(plan, spot.index, lastRunIndex);
      say(line);
      liveEl.textContent = line;
    }

    const left = Math.ceil(spot.remaining);
    if (seg.kind === 'run' && left <= 3 && left > 0 && left !== ticked) {
      ticked = left;
      beep('tick');
      replay(countEl, 'tick');
    }

    if (!halfwaySaid && e >= plan.totalSec / 2) {
      halfwaySaid = true;
      say('Halfway through. Nice and steady.');
      replay(shimmerEl, 'shine');
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

  function setPaused(on: boolean): void {
    if (on === (pausedAt !== null) || counting || finished) return;
    if (on) {
      pausedAt = now();
      stage.classList.add('paused');
      hintEl.textContent = 'tap to resume';
      liveEl.textContent = 'Paused';
      stopSpeech();
    } else {
      pausedFor += now() - (pausedAt ?? now());
      pausedAt = null;
      stage.classList.remove('paused');
      hintEl.textContent = '';
      liveEl.textContent = 'Running again';
    }
    paint();
  }

  // Hold anywhere for 400ms to pause; a stray tap only wakes the screen.
  let holdTimer = 0;
  const holdStart = (ev: PointerEvent): void => {
    if ((ev.target as HTMLElement).closest('.tap')) return;
    if (pausedAt !== null) return setPaused(false);
    stage.classList.add('holding');
    holdTimer = window.setTimeout(() => {
      stage.classList.remove('holding');
      setPaused(true);
    }, HOLD_MS);
  };
  const holdEnd = (): void => {
    clearTimeout(holdTimer);
    stage.classList.remove('holding');
  };
  stage.addEventListener('pointerdown', holdStart);
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    stage.addEventListener(evt, holdEnd);
  stage.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      setPaused(pausedAt === null);
    }
  });

  root.querySelector<HTMLElement>('#end')!.addEventListener('click', () => {
    finish(Math.min(Math.max(elapsed(), 0), plan.totalSec), true);
  });

  // Pocket mode: sit still for ten seconds and the screen all but vanishes.
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
  }, 100);
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
    clearTimeout(holdTimer);
    whenAdvanced(null);
    document.removeEventListener('visibilitychange', onVisible);
    for (const evt of ['pointerdown', 'keydown'] as const)
      document.removeEventListener(evt, wake, true);
    document.body.classList.remove('dim');
    void lock?.release();
    stopSpeech();
  };
}
