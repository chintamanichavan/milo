import { beep, say, stopSpeech } from '../../audio';
import { setStyle, setText } from '../../ui/dom';
import { toast } from '../../ui/toast';
import { now, whenAdvanced } from '../../clock';
import { sheet } from '../../ui/sheet';
import { clock } from '../../ui/time';
import { KM_TO_MI, localTime, planRoute } from '../airports';
import {
  announcement,
  boardingPass,
  MID_FLIGHT,
  PHASE_LABEL,
  phaseAt,
  type Phase,
} from '../flightkit';
import {
  duckAmbient,
  setAmbientVolume,
  setEnginePower,
  startAmbientFromSettings,
  stopAmbient,
} from '../ambient';
import {
  addFlight,
  lastAirport,
  loadFocus,
  setFocusSettings,
  type Outcome,
  type SkyMode,
} from '../store';
import { createSky, type Sky } from '../sky';
import type { CameraMode } from '../globe';
import { setLanding } from './landed';

const HOLD_MS = 800;
const GRACE_MS = 20_000;
const SKIES: SkyMode[] = ['globe', 'satellite', 'flat'];

/** the test hook can move the sun, so screenshots can show either face */
const sunClock = (): Date => {
  const forced = (window as unknown as { __c25kSun?: string }).__c25kSun;
  return forced ? new Date(forced) : new Date();
};

export function flightView(root: HTMLElement, minutes: number, label: string): () => void {
  const plannedSec = Math.max(60, Math.round(minutes * 60));
  const state = loadFocus();
  const settings = state.settings;
  const showHint = !settings.hintSeen;
  if (showHint) setFocusSettings({ hintSeen: true });
  const route = planRoute(lastAirport(state), minutes, String(state.flights.length));
  const pass = boardingPass(route.from, route.to, minutes, label);
  const grace = settings.strict ? 0 : GRACE_MS;

  const startedAt = now();
  const landsAt = new Date(Date.now() + plannedSec * 1000);

  root.innerHTML = `
    <section class="flight" id="stage" data-progress="0" tabindex="0" role="button"
      aria-label="Hold anywhere to divert">
      <div class="sky-stage">
        <div class="sky-host stage" id="sky"></div>
        <div class="pip" id="pip" hidden>
          <svg viewBox="0 0 120 70" width="110" height="64" aria-label="route tracker">
            <path id="pipArc" d="M12 54 Q60 12 108 54" fill="none" stroke="currentColor"
              stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>
            <path id="pipFlown" d="M12 54 Q60 12 108 54" fill="none" stroke="currentColor"
              stroke-width="2" pathLength="1"/>
            <circle cx="12" cy="54" r="2.4" fill="currentColor" opacity=".7"/>
            <circle cx="108" cy="54" r="2.8" fill="currentColor"/>
            <circle id="pipPlane" cx="12" cy="54" r="3.4" fill="#fff"/>
            <text x="12" y="66" font-size="8" fill="currentColor" text-anchor="middle"
              font-family="ui-monospace,monospace">${route.from.iata}</text>
            <text x="108" y="66" font-size="8" fill="currentColor" text-anchor="middle"
              font-family="ui-monospace,monospace">${route.to.iata}</text>
          </svg>
        </div>
        <div class="sky-fade"></div>
      </div>
      <div class="strip">
        <div class="strip-line">
          <b>${route.from.iata}</b>
          <i class="strip-track"><span class="strip-flown" id="stripFlown"></span>
            <span class="strip-plane" id="stripPlane">✈</span></i>
          <b>${route.to.iata}</b>
        </div>
        <div class="strip-figures">
          <span id="flownKm">0 km</span>
          <span id="leftKm">${route.km.toLocaleString('en-US')} km left</span>
          <span id="eta">ETA —</span>
        </div>
      </div>
      <header class="run-head">
        <span class="tag">${route.from.iata} → ${route.to.iata} · ${Math.round(
          plannedSec / 60,
        )}′</span>
        <span class="head-tools">
          <button class="link tap" id="camBtn">view</button>
          <button class="link tap" id="skyBtn">${settings.sky}</button>
          <button class="link tap" id="soundBtn">sound</button>
        </span>
      </header>
      <div class="stage-mid">
        <div class="count" id="count">${clock(plannedSec)}</div>
        <div class="next" id="dest">${label || 'focus'}</div>
        <p class="tag phase" id="phase">taxiing</p>
        <p class="tag arrival">lands ${landsAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })} · ${route.to.city}</p>
        <p class="tag clocks"><span id="clockFrom">${route.from.iata} ${localTime(route.from)}</span>
          <span id="clockTo">${route.to.iata} ${localTime(route.to)}</span></p>
      </div>
      <footer class="run-foot">
        <div class="track one"><i class="fill" id="fill"></i><i class="marker plane-marker" id="marker"></i></div>
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
  const pip = root.querySelector<HTMLElement>('#pip')!;
  const pipFlown = root.querySelector<SVGPathElement>('#pipFlown')!;
  const pipPlane = root.querySelector<SVGCircleElement>('#pipPlane')!;
  const pipArc = root.querySelector<SVGPathElement>('#pipArc')!;
  const pipLength = pipArc.getTotalLength();
  const stripFlown = root.querySelector<HTMLElement>('#stripFlown')!;
  const stripPlane = root.querySelector<HTMLElement>('#stripPlane')!;
  const flownEl = root.querySelector<HTMLElement>('#flownKm')!;
  const leftEl = root.querySelector<HTMLElement>('#leftKm')!;
  const etaEl = root.querySelector<HTMLElement>('#eta')!;
  const clockFromEl = root.querySelector<HTMLElement>('#clockFrom')!;
  const clockToEl = root.querySelector<HTMLElement>('#clockTo')!;
  const phaseLabel = root.querySelector<HTMLElement>('#phase')!;

  let sky: Sky | null = null;
  let mode: SkyMode = settings.sky;
  async function mountSky(next: SkyMode): Promise<void> {
    mode = next;
    sky?.dispose();
    sky = await createSky(
      root.querySelector<HTMLElement>('#sky')!,
      {
        route,
        showPlane: true,
        interactive: true,
        flyIn: true,
        now: sunClock,
        aircraft: settings.aircraft,
      },
      next,
    );
    skyBtn.textContent = sky.mode;
    sky.setProgress(Math.min(1, elapsed() / plannedSec));
  }

  const CAMERAS: CameraMode[] = ['chase', 'wing', 'orbit', 'overhead'];
  let camIndex = 0;
  let done = false;
  let halfway = false;
  let hiddenAt = 0;
  let phase: Phase | '' = '';

  const speak = (line: string): void => {
    duckAmbient(true, settings.ambient.volume);
    say(line);
    liveEl.textContent = line;
    window.setTimeout(() => duckAmbient(false, settings.ambient.volume), 3200);
  };

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
      pass: {
        number: pass.number,
        gate: pass.gate,
        seat: pass.seat,
        departs: pass.departs,
        stripe: pass.stripe,
      },
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
    setText(countEl, clock(plannedSec - e));
    setText(elapsedEl, clock(e));
    setStyle(fillEl, 'width', `${(t * 100).toFixed(2)}%`);
    setStyle(markerEl, 'left', `${(t * 100).toFixed(2)}%`);
    stage.dataset.progress = String(Math.round(t * 100));
    sky?.setProgress(t);

    // the tracking never disappears: strip below, inset when the camera is close in
    setStyle(stripFlown, 'width', `${(t * 100).toFixed(2)}%`);
    setStyle(stripPlane, 'left', `${(t * 100).toFixed(2)}%`);
    const flownKm = Math.round(route.km * t);
    setText(
      flownEl,
      `${flownKm.toLocaleString('en-US')} km · ${Math.round(flownKm * KM_TO_MI).toLocaleString('en-US')} mi`,
    );
    setText(leftEl, `${Math.round(route.km - flownKm).toLocaleString('en-US')} km left`);
    setText(etaEl, `ETA ${localTime(route.to, new Date(Date.now() + (plannedSec - e) * 1000))}`);
    pipFlown.style.strokeDasharray = `${t} 1`;
    const at = pipArc.getPointAtLength(pipLength * t);
    pipPlane.setAttribute('cx', String(at.x));
    pipPlane.setAttribute('cy', String(at.y));
    const live = sky?.cameraMode?.() ?? CAMERAS[camIndex];
    pip.hidden = !['chase', 'wing'].includes(live);

    const nextPhase = phaseAt(t);
    if (nextPhase !== phase) {
      phase = nextPhase;
      setText(phaseLabel, PHASE_LABEL[nextPhase]);
      stage.dataset.phase = nextPhase;
      speak(announcement(nextPhase, route.to.city));
      if (nextPhase === 'landing') beep('chime');
      // engines: loud on the roll, soft at altitude
      setEnginePower(nextPhase === 'takeoff' ? 1 : nextPhase === 'climb' ? 0.7 : nextPhase === 'descent' ? 0.4 : 0.25);
    }
    setText(clockFromEl, `${route.from.iata} ${localTime(route.from)}`);
    setText(clockToEl, `${route.to.iata} ${localTime(route.to)}`);
    if (!halfway && e >= plannedSec / 2) {
      halfway = true;
      beep('chime');
      speak(MID_FLIGHT);
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
    sky?.shake?.(1);
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
  stage.addEventListener('pointerdown', holdStart, { passive: true });
  for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const)
    stage.addEventListener(evt, holdEnd, { passive: true });
  stage.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') record('diverted', elapsed());
  });

  root.querySelector<HTMLElement>('#camBtn')!.addEventListener('click', () => {
    camIndex = (camIndex + 1) % CAMERAS.length;
    sky?.setCamera?.(CAMERAS[camIndex], true);
    toast(`${CAMERAS[camIndex]} view`);
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

  // 74. the phone moving is turbulence, if the reader allows motion events
  let lastMotion = 0;
  const onMotion = (ev: DeviceMotionEvent): void => {
    const a = ev.accelerationIncludingGravity;
    if (!a) return;
    const force = Math.abs((a.x ?? 0) + (a.y ?? 0) + (a.z ?? 0) - 9.8);
    if (force > 6 && Date.now() - lastMotion > 6000) {
      lastMotion = Date.now();
      sky?.shake?.(Math.min(2, force / 8));
      noteEl.textContent = 'turbulence — keep the phone down';
      noteEl.hidden = false;
      window.setTimeout(() => (noteEl.hidden = true), 2200);
    }
  };
  if (settings.motion) window.addEventListener('devicemotion', onMotion);

  let dimAt = Date.now() + 10_000;
  const wake = (): void => {
    dimAt = Date.now() + 10_000;
    if (document.body.classList.contains('dim')) {
      document.body.classList.remove('dim');
      sky?.resume();
    }
  };
  for (const evt of ['pointerdown', 'keydown'] as const)
    document.addEventListener(evt, wake, { capture: true, passive: true });

  const ticker = window.setInterval(() => {
    paint();
    if (Date.now() > dimAt && !document.body.classList.contains('dim')) {
      document.body.classList.add('dim');
      sky?.setQuality?.('low');
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
    window.removeEventListener('devicemotion', onMotion);
    for (const evt of ['pointerdown', 'keydown'] as const)
      document.removeEventListener(evt, wake, { capture: true } as EventListenerOptions);
    document.body.classList.remove('dim');
    void lock?.release();
    stopSpeech();
    stopAmbient();
    sky?.dispose();
    if (!done && elapsed() > 10) record('aborted', elapsed(), false);
  };
}
