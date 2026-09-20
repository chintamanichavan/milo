import { beep, say, stopSpeech } from '../../audio';
import { now, whenAdvanced } from '../../clock';
import { sheet } from '../../ui/sheet';
import { clock } from '../../ui/time';
import { planRoute } from '../airports';
import { setAmbientVolume, startAmbientFromSettings, stopAmbient } from '../ambient';
import {
  addFlight,
  lastAirport,
  loadFocus,
  setFocusSettings,
  type Outcome,
  type SkyMode,
} from '../store';
import { createSky, type Sky } from '../sky';
import { setLanding } from './landed';

const HOLD_MS = 800;
const GRACE_MS = 20_000;
const SKIES: SkyMode[] = ['globe', 'satellite', 'flat'];

export function flightView(root: HTMLElement, minutes: number, label: string): () => void {
  const plannedSec = Math.max(60, Math.round(minutes * 60));
  const state = loadFocus();
  const settings = state.settings;
  const showHint = !settings.hintSeen;
  if (showHint) setFocusSettings({ hintSeen: true });
  const route = planRoute(lastAirport(state), minutes, String(state.flights.length));
  const grace = settings.strict ? 0 : GRACE_MS;

  const startedAt = now();
  const landsAt = new Date(Date.now() + plannedSec * 1000);

  root.innerHTML = `
    <section class="flight" id="stage" data-progress="0" tabindex="0" role="button"
      aria-label="Hold anywhere to divert">
      <div class="sky-host full" id="sky"></div>
      <div class="scrim"></div>
      <header class="run-head">
        <span class="tag">${route.from.iata} → ${route.to.iata} · ${Math.round(
          plannedSec / 60,
        )}′</span>
        <span class="head-tools">
          <button class="link tap" id="skyBtn">${settings.sky}</button>
          <button class="link tap" id="soundBtn">sound</button>
        </span>
      </header>
      <div class="stage-mid">
        <div class="count" id="count">${clock(plannedSec)}</div>
        <div class="next" id="dest">${label || 'focus'}</div>
        <p class="tag arrival">lands ${landsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })} · ${route.to.city}</p>
      </div>
      <footer class="run-foot">
        <div class="track one"><i class="fill" id="fill"></i><i class="marker" id="marker"></i></div>
        <div class="meta"><span id="elapsed">0:00</span><span>${clock(plannedSec)} planned</span></div>
        <p class="hint" id="hint">${showHint ? 'hold anywhere to divert' : ''}</p>
      </footer>
      <p class="note" id="note" hidden>turbulence — welcome back</p>
      <p class="sr" aria-live="polite" id="live"></p>
    </section>`;

  const stage = root.querySelector<HTMLElement>('#stage')!;
  const countEl = root.querySelector<HTMLElement>('#count')!;
  const fillEl = root.querySelector<HTMLElement>('#fill')!;
  const markerEl = root.querySelector<HTMLElement>('#marker')!;
  const elapsedEl = root.querySelector<HTMLElement>('#elapsed')!;
  const noteEl = root.querySelector<HTMLElement>('#note')!;
  const liveEl = root.querySelector<HTMLElement>('#live')!;
  const skyBtn = root.querySelector<HTMLElement>('#skyBtn')!;

  let sky: Sky | null = null;
  let mode: SkyMode = settings.sky;
  async function mountSky(next: SkyMode): Promise<void> {
    mode = next;
    sky?.dispose();
    sky = await createSky(
      root.querySelector<HTMLElement>('#sky')!,
      { route, showPlane: true, interactive: true },
      next,
    );
    skyBtn.textContent = sky.mode;
    sky.setProgress(Math.min(1, elapsed() / plannedSec));
  }

  let done = false;
  let halfway = false;
  let hiddenAt = 0;

  const elapsed = (): number => (now() - startedAt) / 1000;

  function record(outcome: Outcome, seconds: number, go = true): void {
    if (done) return;
    done = true;
    stopAmbient();
    const flight = {
      start: new Date(Date.now() - seconds * 1000).toISOString(),
      plannedSec,
      actualSec: Math.max(0, Math.round(seconds)),
      label,
      outcome,
      from: route.from.iata,
      to: outcome === 'landed' ? route.to.iata : route.from.iata,
      aircraft: settings.aircraft,
    };
    addFlight(flight);
    if (outcome === 'landed') {
      beep('landing');
      say('Landed.');
      setLanding(flight);
      location.hash = '#/focus/landed';
    } else if (go) location.hash = '#/focus';
  }

  function paint(): void {
    const e = Math.min(elapsed(), plannedSec);
    const t = e / plannedSec;
    countEl.textContent = clock(plannedSec - e);
    elapsedEl.textContent = clock(e);
    fillEl.style.width = `${t * 100}%`;
    markerEl.style.left = `${t * 100}%`;
    stage.dataset.progress = String(Math.round(t * 100));
    sky?.setProgress(t);
    if (!halfway && plannedSec >= 3000 && e >= plannedSec / 2) {
      halfway = true;
      beep('chime');
      liveEl.textContent = 'Halfway there';
    }
    if (hiddenAt && now() - hiddenAt >= grace) record('diverted', (hiddenAt - startedAt) / 1000);
    if (e >= plannedSec) record('landed', plannedSec);
  }

  const onVisible = (): void => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = now();
      sky?.pause();
      if (grace === 0) record('diverted', elapsed());
      return;
    }
    sky?.resume();
    void takeLock();
    if (!hiddenAt) return;
    const away = now() - hiddenAt;
    const wentAt = (hiddenAt - startedAt) / 1000;
    hiddenAt = 0;
    if (away >= grace) return record('diverted', wentAt);
    noteEl.hidden = false;
    window.setTimeout(() => (noteEl.hidden = true), 2000);
  };
  document.addEventListener('visibilitychange', onVisible);

  let holdTimer = 0;
  const holdStart = (ev: PointerEvent): void => {
    if ((ev.target as HTMLElement).closest('.link, .sheet-host')) return;
    stage.classList.add('holding');
    holdTimer = window.setTimeout(() => record('diverted', elapsed()), HOLD_MS);
  };
  const holdEnd = (): void => {
    clearTimeout(holdTimer);
    stage.classList.remove('holding');
  };
  stage.addEventListener('pointerdown', holdStart);
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    stage.addEventListener(evt, holdEnd);
  stage.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') record('diverted', elapsed());
  });

  skyBtn.addEventListener('click', () => {
    const next = SKIES[(SKIES.indexOf(mode) + 1) % SKIES.length];
    if (next === 'satellite' && !navigator.onLine) {
      liveEl.textContent = 'satellite map needs internet';
      skyBtn.textContent = 'needs internet';
      window.setTimeout(() => (skyBtn.textContent = sky?.mode ?? mode), 1600);
      return;
    }
    setFocusSettings({ sky: next });
    void mountSky(next);
  });

  root.querySelector<HTMLElement>('#soundBtn')!.addEventListener('click', () => {
    const { ambient } = loadFocus().settings;
    const host = sheet(
      'Cabin sound',
      `<div class="chips" id="sounds">
         ${(['off', 'cabin', 'rain', 'cafe'] as const)
           .map(
             (s) =>
               `<button class="chip tap${s === ambient.sound ? ' on' : ''}" data-sound="${s}">${s}</button>`,
           )
           .join('')}
       </div>
       <label class="field"><span class="tag">Volume</span>
         <input type="range" id="vol" min="0" max="1" step="0.05" value="${ambient.volume}"></label>`,
    );
    host.querySelector('#sounds')!.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-sound]');
      if (!chip) return;
      for (const el of host.querySelectorAll('[data-sound]')) el.classList.remove('on');
      chip.classList.add('on');
      const sound = chip.dataset.sound as typeof ambient.sound;
      setFocusSettings({ ambient: { ...loadFocus().settings.ambient, sound } });
      stopAmbient();
      startAmbientFromSettings();
    });
    host.querySelector('#vol')!.addEventListener('input', (ev) => {
      const volume = Number((ev.target as HTMLInputElement).value);
      setFocusSettings({ ambient: { ...loadFocus().settings.ambient, volume } });
      setAmbientVolume(volume);
    });
  });

  let dimAt = Date.now() + 10_000;
  const wake = (): void => {
    dimAt = Date.now() + 10_000;
    if (document.body.classList.contains('dim')) {
      document.body.classList.remove('dim');
      sky?.resume();
    }
  };
  for (const evt of ['pointerdown', 'keydown'] as const)
    document.addEventListener(evt, wake, true);

  const ticker = window.setInterval(() => {
    paint();
    if (Date.now() > dimAt && !document.body.classList.contains('dim')) {
      document.body.classList.add('dim');
      sky?.pause(); // battery matters mid-flight
    }
  }, 200);
  whenAdvanced(paint);

  let lock: WakeLockSentinel | null = null;
  const takeLock = async (): Promise<void> => {
    try {
      lock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      lock = null;
    }
  };
  void takeLock();
  void mountSky(mode);
  startAmbientFromSettings();
  beep('takeoff');
  paint();

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
    stopAmbient();
    sky?.dispose();
    if (!done && elapsed() > 10) record('aborted', elapsed(), false);
  };
}
