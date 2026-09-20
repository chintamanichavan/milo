import { sheet } from '../../ui/sheet';
import { airport } from '../airports';
import {
  colourOf,
  dayKey,
  deleteFlight,
  hh,
  hoursOn,
  loadFocus,
  mins,
  updateFlight,
  type FocusState,
} from '../store';

const dayLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const leg = (from?: string, to?: string): string =>
  from && to
    ? `${from} → ${to}<span class="cityname"> · ${airport(from).city} to ${airport(to).city}</span>`
    : 'local hop';

/** Day-grouped flights; tap one to edit it. */
export function flightRows(state: FocusState): string {
  if (state.flights.length === 0)
    return '<p class="line sub">No flights yet. Pick a length, name the work, take off.</p>';
  const days = new Map<string, number[]>();
  state.flights.forEach((f, i) => {
    const key = dayKey(f.start);
    days.set(key, [...(days.get(key) ?? []), i]);
  });
  return [...days.entries()]
    .reverse()
    .slice(0, 21)
    .map(([key, indices]) => {
      const rows = indices
        .slice()
        .reverse()
        .map((i) => {
          const f = state.flights[i];
          return `<tr class="${f.outcome}" data-flight="${i}">
            <td><i class="dot" style="background:${colourOf(state, f.label)}"></i>
              ${mins(f.plannedSec)} ${f.label || 'focus'}</td>
            <td class="mono">${leg(f.from, f.to)}</td>
            <td>${
              f.outcome === 'landed'
                ? 'landed'
                : `${f.outcome === 'aborted' ? 'left' : 'diverted'} at ${mins(f.actualSec)}`
            }</td></tr>`;
        })
        .join('');
      return `<details class="day"><summary>
        <span>${dayLabel(state.flights[indices[0]].start)}</span>
        <span class="sub">${hh(hoursOn(state, key))} · ${indices.length} flight${
          indices.length > 1 ? 's' : ''
        }</span></summary><table>${rows}</table></details>`;
    })
    .join('');
}

/** Edit or delete a logged flight. */
export function editFlight(index: number, done: () => void): void {
  const state = loadFocus();
  const f = state.flights[index];
  if (!f) return;
  const host = sheet(
    'Flight',
    `<p class="line sub">${dayLabel(f.start)} · ${leg(f.from, f.to)}${
      f.to ? ` · ${airport(f.to).city}` : ''
    }</p>
     <label class="field"><span class="tag">Minutes flown</span>
       <input class="num" id="eMin" inputmode="numeric" value="${Math.round(f.actualSec / 60)}"></label>
     <label class="field"><span class="tag">Destination</span>
       <input class="dest" id="eLabel" value="${f.label}"></label>
     <label class="field"><span class="tag">Outcome</span>
       <select class="dest" id="eOut">
         ${(['landed', 'diverted', 'aborted'] as const)
           .map((o) => `<option value="${o}"${o === f.outcome ? ' selected' : ''}>${o}</option>`)
           .join('')}
       </select></label>
     <div class="row-actions">
       <button class="big tap" data-done="1" id="eSave">SAVE</button>
       <button class="link tap" data-done="1" id="eDelete">Delete this flight</button>
     </div>`,
  );
  host.querySelector('#eSave')!.addEventListener('click', () => {
    updateFlight(index, {
      actualSec: Math.max(0, Number((host.querySelector('#eMin') as HTMLInputElement).value) * 60),
      label: (host.querySelector('#eLabel') as HTMLInputElement).value.trim(),
      outcome: (host.querySelector('#eOut') as HTMLSelectElement).value as typeof f.outcome,
    });
    done();
  });
  host.querySelector('#eDelete')!.addEventListener('click', () => {
    deleteFlight(index);
    done();
  });
}
