import { miloMark } from '../../badge';
import { barList, columns, lineChart } from '../../ui/chart';
import { toast } from '../../ui/toast';
import { BADGES } from '../achievements';
import { AIRPORTS, airport, type Continent } from '../airports';
import { FLEET, nextUnlock, planeGlyph, unlocked } from '../planes';
import { createSky, type Sky } from '../sky';
import {
  dayKey,
  hh,
  landed,
  landedHours,
  loadFocus,
  saveFocus,
  setFocusSettings,
  SWATCHES,
  totalHours,
} from '../store';
import { subNav } from './board';

const shell = (active: string, body: string): string => `
  <section class="today focus detail">
    <header class="head">
      <span class="wordmark">${miloMark()}<b>MILO</b></span>
    </header>
    ${subNav(active)}
    ${body}
  </section>`;

const CONTINENTS: Record<Continent, string> = {
  NA: 'North America',
  SA: 'South America',
  EU: 'Europe',
  AF: 'Africa',
  AS: 'Asia',
  OC: 'Oceania',
};

/* ---------- routes: the passport ---------- */

export function routesView(root: HTMLElement): () => void {
  const state = loadFocus();
  const visits = new Map<string, { first: string; count: number }>();
  for (const f of landed(state)) {
    if (!f.to) continue;
    const seen = visits.get(f.to);
    visits.set(f.to, { first: seen?.first ?? f.start, count: (seen?.count ?? 0) + 1 });
  }
  const rows = [...visits.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([iata, v]) => {
      const a = airport(iata);
      return `<tr data-city="${iata}"><td>${a.city} <span class="mono sub">${a.iata}</span></td>
        <td>${CONTINENTS[a.continent]}</td>
        <td class="mono">${new Date(v.first).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} · ${v.count}</td></tr>`;
    })
    .join('');
  const continents = new Set([...visits.keys()].map((i) => airport(i).continent));

  root.innerHTML = shell(
    'routes',
    `<div class="hero">
      <p class="tag section">Passport</p>
      <h1>${visits.size}<span><i> · </i>${visits.size === 1 ? 'city' : 'cities'}</span></h1>
      <p class="line sub">${continents.size} of 6 continents · ${AIRPORTS.length} airports in the world</p>
      <div class="sky-host wide" id="passport"></div>
    </div>
    ${
      rows
        ? `<table class="log"><thead><tr><th>city</th><th>continent</th><th>first · visits</th></tr></thead>
           <tbody>${rows}</tbody></table>`
        : '<p class="line sub">No stamps yet. Land somewhere.</p>'
    }`,
  );

  let sky: Sky | null = null;
  const first = [...visits.keys()][0];
  const host = root.querySelector<HTMLElement>('#passport')!;
  void (async () => {
    sky = await createSky(
      host,
      {
        route: { from: airport(first ?? 'ORD'), to: airport(first ?? 'LHR') },
        showPlane: false,
        interactive: true,
      },
      state.settings.sky === 'satellite' ? 'globe' : state.settings.sky,
    );
  })();
  root.querySelector('tbody')?.addEventListener('click', async (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-city]');
    if (!row) return;
    const a = airport(row.dataset.city!);
    sky?.dispose();
    sky = await createSky(host, { route: { from: a, to: a }, showPlane: false, interactive: true },
      state.settings.sky === 'satellite' ? 'globe' : state.settings.sky);
    toast(`${a.city} · ${a.iata}`);
  });
  return () => sky?.dispose();
}

/* ---------- hangar ---------- */

export function hangarView(root: HTMLElement): () => void {
  const state = loadFocus();
  const hours = landedHours(state);
  const next = nextUnlock(hours);
  const cards = FLEET.map((a) => {
    const open = hours >= a.hours;
    const on = state.settings.aircraft === a.id;
    return `<button class="card tap${open ? '' : ' locked'}${on ? ' on' : ''}" data-plane="${a.id}"
      ${open ? '' : 'disabled'}>
      <span class="glyph">${planeGlyph(a.id, 64)}</span>
      <b>${a.name}</b>
      <span class="tag">${open ? (on ? 'flying' : 'ready') : `${a.hours} h`}</span>
    </button>`;
  }).join('');

  root.innerHTML = shell(
    'hangar',
    `<div class="hero">
      <p class="tag section">Hangar</p>
      <h1>${unlocked(hours).length}<span><i> · </i>of ${FLEET.length} unlocked</span></h1>
      <p class="line sub">${hh(hours)} landed${
        next ? ` · ${(next.hours - hours).toFixed(1)} h to the ${next.name.toLowerCase()}` : ' · the whole fleet is yours'
      }</p>
    </div>
    <div class="cards">${cards}</div>`,
  );

  root.querySelector('.cards')!.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-plane]');
    if (!card || card.classList.contains('locked')) return;
    setFocusSettings({ aircraft: card.dataset.plane! });
    hangarView(root);
    toast('Aircraft changed');
  });
  return () => {};
}

/* ---------- badges ---------- */

export function badgesView(root: HTMLElement): () => void {
  const state = loadFocus();
  const cards = BADGES.map((b) => {
    const date = state.earned[b.id];
    return `<div class="card badge${date ? ' on' : ''}">
      <span class="glyph">${miloMark(40, date ? 34 : 24)}</span>
      <b>${b.name}</b>
      <span class="tag">${
        date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : b.hint
      }</span>
    </div>`;
  }).join('');
  const won = Object.keys(state.earned).length;
  root.innerHTML = shell(
    'badges',
    `<div class="hero">
      <p class="tag section">Badges</p>
      <h1>${won}<span><i> · </i>of ${BADGES.length}</span></h1>
      <p class="line sub">Earned quietly, in the background, while you worked.</p>
    </div>
    <div class="cards">${cards}</div>`,
  );
  return () => {};
}

/* ---------- stats ---------- */

export function statsView(root: HTMLElement): () => void {
  const state = loadFocus();
  const all = state.flights;
  const ok = landed(state);
  const picked = new URLSearchParams(location.hash.split('?')[1] ?? '').get('label') ?? '';
  const flights = picked ? all.filter((f) => f.label === picked) : all;

  const byLabel = new Map<string, number>();
  for (const f of flights) byLabel.set(f.label || 'unnamed', (byLabel.get(f.label || 'unnamed') ?? 0) + f.actualSec / 3600);
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const f of flights) byHour[new Date(f.start).getHours()] += f.actualSec / 3600;
  const byDay = new Map<string, number>();
  for (const f of flights) byDay.set(dayKey(f.start), (byDay.get(dayKey(f.start)) ?? 0) + f.actualSec / 3600);
  const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];

  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const hours = flights
      .filter((f) => {
        const t = new Date(f.start);
        return `${t.getFullYear()}-${t.getMonth()}` === key;
      })
      .reduce((s, f) => s + f.actualSec / 3600, 0);
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), value: hours });
  }

  const weeks: number[] = [];
  for (let w = 11; w >= 0; w--) {
    const start = new Date();
    start.setDate(start.getDate() - w * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    weeks.push(
      flights
        .filter((f) => {
          const t = new Date(f.start);
          return t >= start && t < end;
        })
        .reduce((s, f) => s + f.actualSec / 3600, 0),
    );
  }

  const avg = flights.length ? flights.reduce((s, f) => s + f.actualSec, 0) / flights.length / 60 : 0;
  const rate = all.length ? Math.round((ok.length / all.length) * 100) : 0;

  root.innerHTML = shell(
    'stats',
    `<div class="hero">
      <p class="tag section">Stats${picked ? ` · ${picked}` : ''}</p>
      <h1>${hh(totalHours(state))}<span><i> · </i>all time</span></h1>
      <div class="tally">
        <div><b>${flights.length}</b><span>flights</span></div>
        <div><b>${Math.round(avg)}′</b><span>average</span></div>
        <div><b>${rate}%</b><span>landed</span></div>
      </div>
      <div class="chips" id="labelFilter">
        <a class="chip tap${picked ? '' : ' on'}" href="#/focus/stats">all</a>
        ${state.labels
          .map(
            (l) =>
              `<a class="chip tap${picked === l.name ? ' on' : ''}" href="#/focus/stats?label=${encodeURIComponent(
                l.name,
              )}"><i class="dot" style="background:${SWATCHES[l.colour]}"></i>${l.name}</a>`,
          )
          .join('')}
      </div>
    </div>
    <div class="panel">
      <p class="tag">Hours by destination</p>
      ${barList([...byLabel.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })), ' h')}
    </div>
    <div class="panel">
      <p class="tag">Hours by time of day</p>
      ${columns(byHour, Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? String(i) : '')))}
    </div>
    <div class="panel">
      <p class="tag">Last twelve weeks</p>
      ${lineChart(weeks, 'hours per week')}
    </div>
    <div class="panel">
      <p class="tag">Last six months</p>
      ${barList(months.map((m) => ({ label: m.label, value: m.value })), ' h')}
    </div>
    <p class="line sub">Best day: ${
      bestDay ? `${new Date(bestDay[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${hh(bestDay[1])}` : '—'
    } · best week: ${hh(Math.max(...weeks, 0))}</p>`,
  );
  return () => {};
}

/* ---------- settings ---------- */

export function focusSettingsView(root: HTMLElement): () => void {
  const state = loadFocus();
  const s = state.settings;
  const labelRows = state.labels
    .map(
      (l, i) => `<div class="label-row" data-label="${i}">
        <button class="swatch tap" data-swatch="${i}" style="background:${SWATCHES[l.colour]}"
          aria-label="colour for ${l.name}"></button>
        <input class="dest" data-name="${i}" value="${l.name}">
        <button class="link tap" data-archive="${i}">${l.archived ? 'restore' : 'archive'}</button>
      </div>`,
    )
    .join('');

  root.innerHTML = shell(
    'settings',
    `<div class="hero">
      <p class="tag section">Settings</p>
      <h1>Focus<span><i> · </i>how it flies</span></h1>
    </div>
    <div class="panel">
      <p class="tag">Goals</p>
      <label class="field row"><span>Daily hours</span>
        <input class="num" id="daily" inputmode="decimal" value="${s.dailyGoalH}"></label>
      <label class="field row"><span>Weekly hours</span>
        <input class="num" id="weekly" inputmode="decimal" value="${s.weeklyGoalH}"></label>
    </div>
    <div class="panel">
      <p class="tag">Flight rules</p>
      <label class="sw tap"><input type="checkbox" id="strict" ${s.strict ? 'checked' : ''}>
        <span>Strict mode — leaving the app diverts the flight at once</span></label>
      <label class="sw tap"><input type="checkbox" id="chain" ${s.chain ? 'checked' : ''}>
        <span>Chain flights — take off again when the break ends</span></label>
      <label class="field row"><span>Break minutes</span>
        <input class="num" id="breakMin" inputmode="numeric" value="${s.breakMin}"></label>
      <div class="chips" id="breakChips">
        ${[5, 10, 15].map((m) => `<button class="chip tap${s.breakMin === m ? ' on' : ''}" data-break="${m}">${m}′</button>`).join('')}
      </div>
    </div>
    <div class="panel">
      <p class="tag">View</p>
      <div class="chips" id="skyChips">
        ${(['globe', 'satellite', 'flat'] as const)
          .map((m) => `<button class="chip tap${s.sky === m ? ' on' : ''}" data-sky="${m}">${m}</button>`)
          .join('')}
      </div>
      <p class="line sub">The globe works offline. The satellite map needs internet and comes from Esri.</p>
    </div>
    <div class="panel">
      <p class="tag">Destinations</p>
      ${labelRows || '<p class="line sub">Labels appear once you fly somewhere.</p>'}
      <p class="line sub">Rename a label to merge it into another with the same name.</p>
    </div>`,
  );

  const num = (id: string): number => Number((root.querySelector(`#${id}`) as HTMLInputElement).value);
  root.querySelector('#daily')!.addEventListener('change', () => setFocusSettings({ dailyGoalH: num('daily') }));
  root.querySelector('#weekly')!.addEventListener('change', () => setFocusSettings({ weeklyGoalH: num('weekly') }));
  root.querySelector('#breakMin')!.addEventListener('change', () => setFocusSettings({ breakMin: num('breakMin') }));
  root.querySelector('#strict')!.addEventListener('change', (ev) =>
    setFocusSettings({ strict: (ev.target as HTMLInputElement).checked }),
  );
  root.querySelector('#chain')!.addEventListener('change', (ev) =>
    setFocusSettings({ chain: (ev.target as HTMLInputElement).checked }),
  );
  root.querySelector('#breakChips')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-break]');
    if (!chip) return;
    setFocusSettings({ breakMin: Number(chip.dataset.break) });
    focusSettingsView(root);
  });
  root.querySelector('#skyChips')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-sky]');
    if (!chip) return;
    setFocusSettings({ sky: chip.dataset.sky as typeof s.sky });
    focusSettingsView(root);
  });

  root.addEventListener('click', (ev) => {
    const swatch = (ev.target as HTMLElement).closest<HTMLElement>('[data-swatch]');
    if (!swatch) return;
    const i = Number(swatch.dataset.swatch);
    const next = loadFocus();
    next.labels[i].colour = (next.labels[i].colour + 1) % SWATCHES.length;
    saveFocus(next);
    focusSettingsView(root);
  });
  root.addEventListener('change', (ev) => {
    const input = (ev.target as HTMLElement).closest<HTMLInputElement>('[data-name]');
    if (!input) return;
    const i = Number(input.dataset.name);
    void import('../store').then(({ renameLabel }) => {
      renameLabel(loadFocus().labels[i].name, input.value.trim());
      focusSettingsView(root);
      toast('Label updated');
    });
  });
  root.addEventListener('click', (ev) => {
    const button = (ev.target as HTMLElement).closest<HTMLElement>('[data-archive]');
    if (!button) return;
    const i = Number(button.dataset.archive);
    const next = loadFocus();
    next.labels[i].archived = !next.labels[i].archived;
    saveFocus(next);
    focusSettingsView(root);
  });
  return () => {};
}
