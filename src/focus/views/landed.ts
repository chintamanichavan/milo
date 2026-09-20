import { miloMark } from '../../badge';
import { now, whenAdvanced } from '../../clock';
import { toast } from '../../ui/toast';
import { setText } from '../../ui/dom';
import { clock } from '../../ui/time';
import { checkBadges } from '../achievements';
import { airport, KM_TO_MI } from '../airports';
import { arrivalFor, rankFor, wings, weatherAt } from '../flightkit';
import { planeGlyph } from '../planes';
import {
  dayKey,
  hh,
  hoursOn,
  landedHours,
  loadFocus,
  mins,
  weekHours,
  type Flight,
} from '../store';

let landing: Flight | null = null;

export function setLanding(flight: Flight): void {
  landing = flight;
}

export function landedView(root: HTMLElement): () => void {
  const state = loadFocus();
  const flight = landing ?? state.flights[state.flights.length - 1];
  if (!flight) {
    location.hash = '#/focus';
    return () => {};
  }
  landing = null;
  const fresh = checkBadges();
  const { dailyGoalH, weeklyGoalH, breakMin, chain } = state.settings;
  const today = hoursOn(state, dayKey(flight.start));
  const thisWeek = weekHours(state);
  const breakSec = Math.max(60, breakMin * 60);

  root.innerHTML = `
    <section class="done landed">
      <div class="ring">
        <svg viewBox="0 0 160 160" width="184" height="184">
          <circle class="ring-bg" cx="80" cy="80" r="70"/>
          <circle class="ring-fg" cx="80" cy="80" r="70"/>
        </svg>
        <div class="ring-mid">
          <span class="check">${miloMark(30, 30)}</span>
          <b>${mins(flight.actualSec)}</b><span>${flight.label || 'focus'}</span>
        </div>
      </div>
      <h1>Landed<br>on time</h1>
      <p class="say">${
        flight.from && flight.to
          ? `${airport(flight.from).city} → ${airport(flight.to).city}`
          : 'Nice work'
      }</p>
      ${
        flight.from && flight.to
          ? (() => {
              const arrival = arrivalFor(state, flight.from, flight.to);
              return `<div class="panel arrival-card">
                <p class="tag">Arrival<span id="weather">—</span></p>
                <h2>${arrival.city}</h2>
                <p class="line sub">Local time ${arrival.local} · ${arrival.km.toLocaleString('en-US')} km
                  (${Math.round(arrival.km * KM_TO_MI).toLocaleString('en-US')} mi) flown</p>
                <p class="line sub">${arrival.lifetimeKm.toLocaleString('en-US')} km all told —
                  ${arrival.laps.toFixed(2)}× around the Earth</p>
                <p class="line sub flying">${wings(rankFor(landedHours(state)).name, 34)}
                  ${rankFor(landedHours(state)).name}</p>
              </div>`;
            })()
          : ''
      }
      <p class="line sub flying">${planeGlyph(flight.aircraft ?? 'paper', 40)}</p>
      <div class="tally">
        <div><b>${hh(today)}</b><span>today · ${dailyGoalH} h goal</span></div>
        <div><b>${hh(thisWeek)}</b><span>week · ${weeklyGoalH} h goal</span></div>
      </div>
      ${
        fresh.length
          ? `<ul class="changes">${fresh.map((b) => `<li>${b.name} earned</li>`).join('')}</ul>`
          : ''
      }
      <div class="rest" id="breakBar" hidden>
        <span class="tag">BREAK</span><b id="breakClock">${clock(breakSec)}</b>
        <button class="link tap" id="skip">Skip</button>
      </div>
      <button class="big tap" id="break">TAKE A ${breakMin}′ BREAK</button>
      <a class="link tap" href="#/focus">back to the board</a>
    </section>`;

  requestAnimationFrame(() => root.querySelector('.done')!.classList.add('sealed'));
  if (flight.to)
    void weatherAt(flight.to).then((weather) => {
      const slot = root.querySelector('#weather');
      if (slot && weather) slot.textContent = `${weather.label} · ${weather.tempC}°C`;
      else if (slot) slot.textContent = '';
    });
  for (const badge of fresh) toast(`${badge.name} earned`, true);
  if (today >= dailyGoalH) toast('Daily goal met', true);

  const bar = root.querySelector<HTMLElement>('#breakBar')!;
  const clockEl = root.querySelector<HTMLElement>('#breakClock')!;
  const button = root.querySelector<HTMLButtonElement>('#break')!;
  let endsAt = 0;

  const stop = (): void => {
    endsAt = 0;
    bar.hidden = true;
    button.hidden = false;
  };
  const paint = (): void => {
    if (!endsAt) return;
    const left = (endsAt - now()) / 1000;
    setText(clockEl, clock(Math.max(0, left)));
    if (left > 0) return;
    stop();
    // chain flights: straight back out to the runway
    if (chain)
      location.hash = `#/focus/flight/${Math.round(flight.plannedSec / 60)}/${encodeURIComponent(
        flight.label,
      )}`;
  };

  button.addEventListener('click', () => {
    endsAt = now() + breakSec * 1000;
    bar.hidden = false;
    button.hidden = true;
    paint();
  });
  root.querySelector<HTMLElement>('#skip')!.addEventListener('click', stop);

  const ticker = window.setInterval(paint, 200);
  whenAdvanced(paint);
  return () => {
    clearInterval(ticker);
    whenAdvanced(null);
  };
}
