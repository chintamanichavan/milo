import { unlockAudio } from '../../audio';
import { miloMark } from '../../badge';
import { sheet } from '../../ui/sheet';
import { airport, planRoute } from '../airports';
import {
  boardingPass,
  nextRank,
  rankFor,
  splitFlap,
  wings,
  type BoardRow,
} from '../flightkit';
import { planeSilhouette } from '../aircraft3d';
import {
  colourOf,
  dayKey,
  hh,
  landedHours,
  hoursOn,
  lastAirport,
  loadFocus,
  recentLabels,
  setFocusSettings,
  streak,
  week,
  weekHours,
  type FocusState,
} from '../store';
import { createSky, type Sky } from '../sky';
import { editFlight, flightRows } from './logbook';

const CHIPS = [25, 50, 90, 120];

export function subNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/focus${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Board')}${link('routes', 'Routes')}${link(
    'hangar',
    'Hangar',
  )}${link('badges', 'Badges')}${link('stats', 'Stats')}${link('settings', 'Settings')}</nav>`;
}

function goalRing(done: number, goal: number, label: string): string {
  const t = Math.min(1, goal > 0 ? done / goal : 0);
  const c = 2 * Math.PI * 26;
  return `<div class="goal">
    <svg viewBox="0 0 64 64" width="64" height="64" aria-label="${label}">
      <circle class="goal-bg" cx="32" cy="32" r="26" fill="none" stroke-width="5"/>
      <circle class="goal-fg" cx="32" cy="32" r="26" fill="none" stroke-width="5"
        stroke-linecap="round" style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - t)}"/>
    </svg>
    <div><b>${hh(done)}</b><span>${label} · goal ${goal} h</span></div>
  </div>`;
}

function weekStrip(state: FocusState): string {
  const days = week(state);
  const goal = state.settings.dailyGoalH;
  const top = Math.max(goal, ...days.map((d) => d.hours)) * 1.1 || 1;
  const bars = days
    .map(
      (d) => `<div class="col"><div class="bar"><i style="height:${Math.min(
        100,
        (d.hours / top) * 100,
      )}%"></i></div><b>${d.label}</b></div>`,
    )
    .join('');
  return `<div class="week" style="--target:${(goal / top) * 100}%">
    <p class="tag">Last seven days<span>${goal} h line</span></p>
    <div class="bars">${bars}</div></div>`;
}

/** 75. today's flights, on a split-flap board */
function departuresBoard(state: FocusState, next: { from: { iata: string }; to: { iata: string; city: string } }, minutes: number): string {
  const today = dayKey(new Date());
  const rows: BoardRow[] = state.flights
    .filter((f) => dayKey(f.start) === today)
    .slice(-5)
    .map((f) => ({
      time: new Date(f.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      flight: f.pass?.number ?? 'MLO ---',
      to: f.to ?? '---',
      purpose: (f.label || 'focus').slice(0, 10),
      status: f.outcome === 'landed' ? 'landed' : f.outcome === 'aborted' ? 'left' : 'diverted',
    }));
  rows.push({
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    flight: boardingPass(airport(next.from.iata), airport(next.to.iata), minutes, '').number,
    to: next.to.iata,
    purpose: 'next',
    status: 'boarding',
  });
  return `<div class="panel departures"><p class="tag">Departures<span class="cityname">${
    next.from.iata
  } ${airport(next.from.iata).city} → ${next.to.iata} ${next.to.city}</span></p>${splitFlap(rows)}</div>`;
}

export function focusBoardView(root: HTMLElement): () => void {
  const state = loadFocus();
  const { defaultMin, dailyGoalH, weeklyGoalH, aircraft } = state.settings;
  const labels = recentLabels(state);
  let minutes = defaultMin;
  let route = planRoute(lastAirport(state), minutes, String(state.flights.length));

  root.innerHTML = `
    <section class="today focus">
      <header class="head">
        <span class="wordmark">${miloMark()}<b>MILO</b></span>
      </header>
      ${subNav('')}
      <div class="hero">
        <p class="tag section">Focus${streak(state) ? ` · ${streak(state)}-day streak` : ''}</p>
        <h1>${hh(weekHours(state))}<span><i> · </i>this week</span></h1>
        <div class="goals">
          ${goalRing(hoursOn(state, dayKey(new Date())), dailyGoalH, 'today')}
          ${goalRing(weekHours(state), weeklyGoalH, 'this week')}
        </div>
        <div class="preview">
          <div class="sky-host small" id="preview"></div>
          <p class="tag route" id="routeLine">next · ${route.from.iata} → ${route.to.iata}
            <span>${route.to.city} · ${route.km.toLocaleString('en-US')} km · ${route.band}</span></p>
        </div>
        <div class="chips" id="lens">
          ${CHIPS.map(
            (m) => `<button class="chip tap${m === defaultMin ? ' on' : ''}" data-min="${m}">${m}′</button>`,
          ).join('')}
          <input class="chip num" id="custom" inputmode="numeric" aria-label="custom minutes"
            value="${CHIPS.includes(defaultMin) ? '' : defaultMin}" placeholder="min">
        </div>
        <input class="dest" id="dest" aria-label="destination" enterkeyhint="go"
          placeholder="what are you working on?" value="${labels[0] ?? ''}">
        ${
          labels.length
            ? `<div class="chips">${labels
                .map(
                  (l) =>
                    `<button class="chip tap ghost-chip" data-label="${l}">
                      <i class="dot" style="background:${colourOf(state, l)}"></i>${l}</button>`,
                )
                .join('')}</div>`
            : ''
        }
        <button class="big tap" data-done="1" id="takeoff">TAKE OFF</button>
        <p class="line sub mid flying">${planeSilhouette(30, 1.5)}<span>flying the ${
          aircraft === 'paper' ? 'paper plane' : aircraft
        }</span>${wings(rankFor(landedHours(state)).name, 34)}<span>${
          rankFor(landedHours(state)).name
        }${
          nextRank(landedHours(state))
            ? ` · ${(nextRank(landedHours(state))!.hours - landedHours(state)).toFixed(1)} h to ${nextRank(landedHours(state))!.name}`
            : ''
        }</span></p>
      </div>
      ${departuresBoard(state, route, minutes)}
      ${weekStrip(state)}
      <div class="hist">
        <p class="tag">Logbook<button class="link tap" id="manual">Add a flight</button></p>
        ${flightRows(state)}
      </div>
    </section>`;

  const customEl = root.querySelector<HTMLInputElement>('#custom')!;
  const destEl = root.querySelector<HTMLInputElement>('#dest')!;
  const routeLine = root.querySelector<HTMLElement>('#routeLine')!;
  let sky: Sky | null = null;

  const redrawRoute = (): void => {
    route = planRoute(lastAirport(state), minutes, String(state.flights.length));
    routeLine.innerHTML = `next · ${route.from.iata} → ${route.to.iata}
      <span>${route.to.city} · ${route.km.toLocaleString('en-US')} km · ${route.band}</span>`;
    void refreshSky();
  };

  async function refreshSky(): Promise<void> {
    sky?.dispose();
    sky = await createSky(
      root.querySelector<HTMLElement>('#preview')!,
      { route, showPlane: false, interactive: false },
      state.settings.sky === 'satellite' ? 'globe' : state.settings.sky,
    );
  }
  void refreshSky();

  const pick = (m: number): void => {
    minutes = m;
    for (const el of root.querySelectorAll('.chip[data-min]'))
      el.classList.toggle('on', Number((el as HTMLElement).dataset.min) === m);
    redrawRoute();
  };

  root.querySelector<HTMLElement>('#lens')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-min]');
    if (!chip) return;
    customEl.value = '';
    pick(Number(chip.dataset.min));
  });
  customEl.addEventListener('input', () => {
    const m = Number(customEl.value);
    if (m > 0) pick(m);
  });
  for (const chip of root.querySelectorAll<HTMLElement>('[data-label]'))
    chip.addEventListener('click', () => {
      destEl.value = chip.dataset.label ?? '';
    });

  root.querySelector<HTMLElement>('#takeoff')!.addEventListener('click', () => {
    unlockAudio();
    const m = Math.min(300, Math.max(1, Math.round(minutes)));
    setFocusSettings({ defaultMin: m });
    const purpose = destEl.value.trim();
    const pass = boardingPass(route.from, route.to, m, purpose);
    const host = sheet(
      'Boarding pass',
      `<div class="pass" id="pass">
        <div class="pass-main">
          <p class="tag">${pass.number} · ${pass.departs}</p>
          <div class="pass-route">
            <div><b>${route.from.iata}</b><span>${route.from.city}</span></div>
            <i class="pass-arrow">✈</i>
            <div><b>${route.to.iata}</b><span>${route.to.city}</span></div>
          </div>
          <div class="pass-grid">
            <div><span class="tag">gate</span><b>${pass.gate}</b></div>
            <div><span class="tag">seat</span><b>${pass.seat}</b></div>
            <div><span class="tag">duration</span><b>${m}′</b></div>
          </div>
          <p class="tag">purpose · ${pass.purpose}</p>
        </div>
        <div class="pass-tear"></div>
        <div class="pass-stub">
          <p class="tag">${pass.number}</p>
          <div class="barcode">${pass.stripe
            .split(',')
            .map((w) => `<i style="width:${w}px"></i>`)
            .join('')}</div>
          <p class="tag">tear to board</p>
        </div>
      </div>
      <button class="big tap" id="board">TEAR THE STUB</button>`,
    );
    const tear = (): void => {
      host.querySelector('#pass')!.classList.add('torn');
      window.setTimeout(() => {
        (host as HTMLElement & { close: () => void }).close();
        location.hash = `#/focus/flight/${m}/${encodeURIComponent(purpose)}`;
      }, 620);
    };
    host.querySelector('#board')!.addEventListener('click', tear);
    host.querySelector('.pass-stub')!.addEventListener('click', tear);
  });

  root.querySelector<HTMLElement>('.hist')!.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-flight]');
    if (row) editFlight(Number(row.dataset.flight), () => focusBoardView(root));
  });

  root.querySelector<HTMLElement>('#manual')!.addEventListener('click', () => {
    const host = sheet(
      'Add a flight',
      `<label class="field"><span class="tag">Minutes</span>
         <input class="num" id="mMin" inputmode="numeric" value="50"></label>
       <label class="field"><span class="tag">Destination</span>
         <input class="dest" id="mLabel" value="${labels[0] ?? ''}"></label>
       <label class="field"><span class="tag">Date</span>
         <input class="dest" id="mDate" type="date" value="${dayKey(new Date())}"></label>
       <button class="big tap" data-done="1" id="mSave">LOG IT</button>`,
    );
    host.querySelector('#mSave')!.addEventListener('click', () => {
      const m = Math.max(1, Number((host.querySelector('#mMin') as HTMLInputElement).value) || 0);
      const label = (host.querySelector('#mLabel') as HTMLInputElement).value.trim();
      const date = (host.querySelector('#mDate') as HTMLInputElement).value;
      const when = new Date(`${date}T12:00:00`);
      const plan = planRoute(lastAirport(state), m, `manual${state.flights.length}`);
      import('../store').then(({ addFlight }) => {
        addFlight({
          start: when.toISOString(),
          plannedSec: m * 60,
          actualSec: m * 60,
          label,
          outcome: 'landed',
          from: plan.from.iata,
          to: plan.to.iata,
          aircraft,
        });
        focusBoardView(root);
      });
    });
  });

  if (Number(customEl.value) > 0) minutes = Number(customEl.value);
  return () => {
    sky?.dispose();
  };
}
