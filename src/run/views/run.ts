import { beep, metronome, say, stopMetronome, stopSpeech } from '../../audio';
import { now, whenAdvanced } from '../../clock';
import { setStyle, setText } from '../../ui/dom';
import { clock, shortDuration } from '../../ui/time';
import { cueLine, personaById } from '../coach';
import { distanceLabel, paceLabel, Tracker } from '../gps';
import { planOf } from '../plans';
import { claimHint, load, recordRun, type CompletedRun } from '../store';
import type { Plan } from '../weeks';
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

const replay = (el: HTMLElement, cls: string): void => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};

export function runView(
  root: HTMLElement,
  week: number,
  run: number,
  programme = 'c25k',
): () => void {
  const state = load();
  const settings = state.settings;
  const persona = personaById(settings.coach);
  const plan = planOf(programme, week, run);
  const segs = plan.segments;
  const lastRunIndex = segs.reduce((best, s, i) => (s.kind === 'run' ? i : best), 0);
  const showHint = claimHint();
  const tracking = settings.gps && !settings.treadmill;
  const tracker = tracking ? new Tracker() : null;

  const cueFor = (index: number): string => {
    const seg = segs[index];
    if (index === 0) return cueLine(persona, 'takeoff');
    if (index === segs.length - 1) return cueLine(persona, 'cool');
    if (seg.kind === 'walk') return cueLine(persona, 'walk', seg.sec);
    if (index === lastRunIndex) return cueLine(persona, 'last', seg.sec);
    return cueLine(persona, 'run', seg.sec);
  };

  root.innerHTML = `
    <section class="run" id="stage" data-kind="walk" data-phase="count"
      tabindex="0" role="button" aria-label="Hold anywhere to pause">
      <div class="wash"></div>
      <header class="run-head">
        <span class="tag">${programme === 'c25k' ? `Week ${week} · Run ${run}` : `${programme} · W${week}R${run}`}</span>
        <button class="link tap" id="end">End early</button>
      </header>
      <div class="stage-mid">
        <div class="kind" id="kind">WALK</div>
        <div class="count" id="count">5:00</div>
        <div class="next" id="next"></div>
        <p class="caption" id="caption" aria-hidden="true"></p>
      </div>
      <footer class="run-foot">
        <div class="track">
          <div class="track-row">${segs
            .map((s) => `<i class="blk ${s.kind}${s.effort ? ` ${s.effort}` : ''}" style="flex-grow:${s.sec}"></i>`)
            .join('')}</div>
          <div class="track-row track-lit" id="rowLit">${segs
            .map((s) => `<i class="blk ${s.kind}${s.effort ? ` ${s.effort}` : ''}" style="flex-grow:${s.sec}"></i>`)
            .join('')}</div>
          <i class="marker" id="marker"></i>
          <i class="shimmer" id="shimmer"></i>
        </div>
        <div class="meta">
          <span id="elapsed">0:00</span>
          <span id="dist">${tracking ? 'finding you…' : `${clock(plan.totalSec)} total`}</span>
        </div>
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
  const distEl = root.querySelector<HTMLElement>('#dist')!;
  const hintEl = root.querySelector<HTMLElement>('#hint')!;
  const digitEl = root.querySelector<HTMLElement>('#digit')!;
  const liveEl = root.querySelector<HTMLElement>('#live')!;
  const captionEl = root.querySelector<HTMLElement>('#caption')!;
  /** everything the coach said, with when, for the transcript after the run */
  const cues: [number, string][] = [];

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
  let lastPaint = 0;

  const elapsed = (): number => ((pausedAt ?? now()) - startedAt - pausedFor) / 1000;

  /** heard, captioned on screen, and written down */
  const speak = (line: string): void => {
    say(line, persona);
    liveEl.textContent = line;
    captionEl.textContent = line;
    replay(captionEl, 'said');
    cues.push([Math.max(0, Math.round(elapsed())), line]);
  };

  if (tracker && !tracker.start(() => paintDistance())) distEl.textContent = 'no location';

  function paintDistance(): void {
    if (!tracker) return;
    setText(distEl, `${distanceLabel(tracker.distanceKm, settings.units)} · ${paceLabel(
      tracker.lastSpeedKmh > 0.5 ? 3600 / tracker.lastSpeedKmh : 0,
      settings.units,
    )}`);
  }

  function countIn(): void {
    const left = startedAt - now();
    const want = left > 2600 ? '3' : left > 1600 ? '2' : left > 600 ? '1' : 'GO';
    if (want !== digit) {
      digit = want;
      setText(digitEl, want);
      replay(digitEl, 'beat');
      if (want === 'GO') {
        beep('go');
        speak(cueFor(0));
        cued = 0;
        if (segs[0].bpm && settings.metronome) metronome(segs[0].bpm);
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
    if (tracker) {
      tracker.tickSeconds(Math.max(0, e - lastPaint));
      lastPaint = e;
    }
    const spot = locate(plan, e);
    if (spot.index >= segs.length) return finish(plan.totalSec, false);
    const seg = segs[spot.index];
    const next = segs[spot.index + 1];
    const pct = (e / plan.totalSec) * 100;

    // a segment measured in kilometres ends when the distance lands
    if (seg.untilKm && tracker && tracker.runKm >= seg.untilKm) return finish(e, false);

    setText(countEl, clock(spot.remaining));
    setText(
      nextEl,
      next
        ? `next · ${next.kind} ${shortDuration(next.sec)}`
        : seg.untilKm
          ? `next · ${seg.untilKm} km in`
          : 'next · the finish',
    );
    setText(elapsedEl, clock(e));
    setStyle(litEl, 'clip-path', `inset(0 ${(100 - pct).toFixed(2)}% 0 0)`);
    setStyle(markerEl, 'left', `${pct.toFixed(2)}%`);

    if (spot.index !== cued) {
      cued = spot.index;
      ticked = -1;
      kindEl.textContent = seg.kind === 'run' ? 'RUN' : 'WALK';
      stage.dataset.kind = seg.kind;
      stage.dataset.effort = seg.effort ?? '';
      replay(kindEl, 'swap');
      replay(countEl, 'pulse');
      beep(seg.kind);
      speak(cueFor(spot.index));
      tracker?.setKind(seg.kind, 0);
      if (spot.index === segs.length - 1)
        hintEl.innerHTML = '<a class="tap" href="#/run/tips">cool-down stretches →</a>';
      if (seg.bpm && settings.metronome) metronome(seg.bpm);
      else stopMetronome();
    }

    const left = Math.ceil(spot.remaining);
    if (seg.kind === 'run' && left <= 3 && left > 0 && left !== ticked) {
      ticked = left;
      beep('tick');
      replay(countEl, 'tick');
    }

    if (!halfwaySaid && e >= plan.totalSec / 2) {
      halfwaySaid = true;
      speak(cueLine(persona, 'halfway'));
      replay(shimmerEl, 'shine');
    }
  }

  function finish(seconds: number, partial: boolean): void {
    if (finished) return;
    finished = true;
    stopMetronome();
    beep('done');
    speak(partial ? 'Stopping here. Some is better than none.' : cueLine(persona, 'finish'));
    const extra: Partial<CompletedRun> = { prog: programme, cues };
    if (tracker) {
      const summary = tracker.stop();
      if (summary.distanceKm > 0.02) {
        extra.distanceKm = Number(summary.distanceKm.toFixed(3));
        extra.path = summary.path;
        extra.runPace = Math.round(summary.runPace);
        extra.walkPace = Math.round(summary.walkPace);
      }
    }
    recordRun(week, run, seconds, extra);
    setResult({ week, run, durationSec: seconds, partial, programme, ...extra });
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
      stopMetronome();
    } else {
      pausedFor += now() - (pausedAt ?? now());
      pausedAt = null;
      stage.classList.remove('paused');
      hintEl.textContent = '';
      liveEl.textContent = 'Running again';
      const seg = segs[Math.max(0, cued)];
      if (seg?.bpm && settings.metronome) metronome(seg.bpm);
    }
    paint();
  }

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
  stage.addEventListener('pointerdown', holdStart, { passive: true });
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    stage.addEventListener(evt, holdEnd, { passive: true });
  stage.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      setPaused(pausedAt === null);
    }
  });

  root.querySelector<HTMLElement>('#end')!.addEventListener('click', () => {
    finish(Math.min(Math.max(elapsed(), 0), plan.totalSec), true);
  });

  let dimAt = Date.now() + 10_000;
  const wake = (): void => {
    dimAt = Date.now() + 10_000;
    document.body.classList.remove('dim');
  };
  for (const evt of ['pointerdown', 'keydown'] as const)
    document.addEventListener(evt, wake, { capture: true, passive: true });

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
      document.removeEventListener(evt, wake, { capture: true } as EventListenerOptions);
    document.body.classList.remove('dim');
    void lock?.release();
    stopSpeech();
    stopMetronome();
    tracker?.stop();
  };
}
