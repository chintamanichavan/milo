import { miloMark } from '../../badge';
import { now } from '../../clock';
import { downloadIcs } from '../../run/ics';
import { barList, columns } from '../../ui/chart';
import { closeSheet, sheet } from '../../ui/sheet';
import { toast } from '../../ui/toast';
import { moodFor, petSvg } from '../art';
import { factFor } from '../facts';
import { chime, CHIMES } from '../sound';
import {
  ACHIEVEMENTS,
  amount,
  CHALLENGES,
  COMPANIONS,
  CUPS_OZ,
  fromUnit,
  glyph,
  GLYPH_PICKS,
  toUnit,
  type ChallengeId,
  type CharacterId,
  type Drink,
  type GlyphId,
} from '../model';
import {
  allDrinks,
  bestStreak,
  caffeine,
  challengeStatus,
  cupFor,
  deleteCustom,
  deleteSip,
  drinkKcal,
  drinkById,
  dropChallenge,
  effectiveOf,
  effectiveOn,
  goalParts,
  goalToday,
  loadWater,
  logSip,
  monthGrid,
  panelDrinks,
  recap,
  rawOf,
  refreshHeat,
  remindersIcs,
  saveCustom,
  schedule,
  setWaterSettings,
  sipsOn,
  startChallenge,
  streak,
  summary,
  today,
  undoLast,
  unlocked,
  updateSip,
  weekBars,
  weekConsistency,
  type Sip,
  type WaterState,
} from '../store';

export function waterSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/water${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('stats', 'Stats')}${link(
    'challenges',
    'Challenges',
  )}${link('pets', 'Pets')}${link('settings', 'Settings')}</nav>`;
}

const shell = (active: string, body: string, extra = ''): string => `
  <section class="today water detail ${extra}">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${waterSubNav(active)}
    ${body}
  </section>`;

const hourLabel = (h: number): string => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

const two = (n: number): string => String(n).padStart(2, '0');

/** a progress ring, any size */
function ring(fraction: number, size: number, stroke: number, cls = ''): string {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const t = Math.min(1, Math.max(0, fraction));
  return `<svg class="wl-ring ${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="goal-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="goal-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - t)).toFixed(1)}"/>
  </svg>`;
}

function celebrate(earned: string[]): void {
  if (earned.length) toast(earned.join(' · '), true);
}

/** the chime on a pour, or the cheer when that pour meets the goal */
function sound(state: WaterState, cheer: boolean): void {
  if (!state.settings.sound) return;
  chime(cheer ? state.settings.cheer : state.settings.chime);
}

/** log a drink with its chime; the cheer if it is the one that meets the goal */
function pourNow(drinkId: string, oz?: number): { text: string; earned: string[] } {
  const before = loadWater();
  const wasMet = effectiveOn(before) >= goalToday(before) - 0.05;
  const { sip, earned } = logSip(drinkId, oz);
  const after = loadWater();
  const nowMet = effectiveOn(after) >= goalToday(after) - 0.05;
  sound(after, !wasMet && nowMet);
  return { text: `${amount(sip.oz, after.settings.unit)} ${drinkById(after, sip.drinkId).name.toLowerCase()}`, earned };
}

/** the cup the next tap pours, when you want something other than the drink's own */
let cupOverride: number | null = null;
/** how full the companion was when last drawn, so the water can rise from there */
let lastFraction: number | null = null;

/* ---------- 95 + 98: today ---------- */

export function waterTodayView(root: HTMLElement): () => void {
  const draw = (): void => {
    const state = loadWater();
    const unit = state.settings.unit;
    const goal = goalToday(state);
    const parts = goalParts(state);
    const sips = sipsOn(state);
    const drunk = effectiveOf(state, sips);
    const raw = rawOf(sips);
    const fraction = drunk / Math.max(1, goal);
    const left = Math.max(0, goal - drunk);
    const who = COMPANIONS.find((c) => c.id === state.settings.character)!;
    const caf = caffeine(state);
    const kcal = drinkKcal(state);
    const nudges = schedule(state);
    const due = nudges.filter((n) => n.state === 'due').pop();
    const lastSip = sips.length ? sips[sips.length - 1].at : 0;
    const later = nudges.find((n) => n.state === 'later');
    const mood = moodFor(fraction);

    const byHour = new Map<number, Sip[]>();
    for (const s of sips) {
      const h = new Date(s.at).getHours();
      byHour.set(h, [...(byHour.get(h) ?? []), s]);
    }

    const why = parts.manual
      ? `Your own goal: ${amount(parts.manual, unit)}.`
      : `${amount(parts.base, unit)} for ${Math.round(parts.weightLb)} lb${parts.weighed ? '' : ' (a guess — weigh in under Lift → Body)'}${
          parts.activity ? ` + ${amount(parts.activity, unit)} for today's training` : ''
        }${parts.heat ? ` + ${amount(parts.heat, unit)} for a hot day` : ''}.`;

    const cups = CUPS_OZ.map(
      (oz) => `<button class="chip tap${cupOverride === oz ? ' on' : ''}" data-cup="${oz}">${amount(oz, unit)}</button>`,
    ).join('');

    root.innerHTML = shell(
      '',
      `<div class="wl-split">
        <div class="hero wl-hero">
          <p class="tag section">Water · ${streak(state) ? `${streak(state)}-day streak` : 'today'}</p>
          <div class="wl-stage" data-mood="${mood}">
            ${ring(fraction, 280, 8, 'wl-big')}
            <div class="wl-pet">${petSvg(state.settings.character, lastFraction ?? fraction, 200, `${who.name}, ${Math.round(fraction * 100)} percent full`)}</div>
          </div>
          <h1>${left > 0 ? amount(left, unit) : fraction >= 1.25 ? 'Overflowing' : 'Goal met'}<span><i> · </i>${
            left > 0 ? 'to go' : `${Math.round(fraction * 100)}% of today`
          }</span></h1>
          <p class="line mono wl-count">${amount(drunk, unit)} of ${amount(goal, unit)}${
            Math.abs(raw - drunk) > 0.05 ? ` <span class="muted">· ${amount(raw, unit)} poured</span>` : ''
          }</p>
          <p class="line sub">${why} <a class="link" href="#/water/settings">change</a></p>
          ${
            due && now() - lastSip > 45 * 60_000 && left > 0
              ? `<p class="line wl-due">Time for a glass — the ${due.label} reminder is waiting.</p>`
              : later && left > 0
                ? `<p class="line sub">Next reminder ${later.label}.</p>`
                : ''
          }
        </div>
        <div class="wl-side">
          <div class="panel">
            <p class="tag">Pour<span>${cupOverride ? `cup ${amount(cupOverride, unit)}` : 'each drink its own cup'}</span></p>
            <div class="chips wl-cups" id="cups">
              <button class="chip tap${cupOverride ? '' : ' on'}" data-cup="0">own cup</button>${cups}
              <button class="chip tap" data-cup="custom">custom</button>
            </div>
            <div class="wl-grid" id="drinks">
              ${panelDrinks(state)
                .map(
                  (d) => `<button class="wl-drink tap" data-drink="${d.id}" aria-label="${d.name}, ${amount(cupOverride ?? cupFor(state, d.id), unit)}">
                    ${glyph(d.glyph, 26)}<b>${d.name}</b>
                    <span class="mono">${amount(cupOverride ?? cupFor(state, d.id), unit)}${d.factor !== 1 ? ` · ×${d.factor}` : ''}</span>
                  </button>`,
                )
                .join('')}
            </div>
            <div class="chips">
              <button class="chip tap" id="undo"${state.sips.length ? '' : ' disabled'}>undo last</button>
              <button class="chip tap" id="earlier">+ earlier</button>
              <button class="chip tap" id="allDrinks">all ${allDrinks(state).length - state.settings.hidden.length} drinks</button>
              <button class="chip tap" id="newDrink">+ new drink</button>
            </div>
          </div>
          <div class="panel">
            <p class="tag">Today<span>${sips.length} drinks</span></p>
            ${
              sips.length
                ? [...byHour.entries()]
                    .map(
                      ([h, list]) => `<div class="wl-hour"><span class="mono">${hourLabel(h)}</span><div>${list
                        .map(
                          (s) => `<button class="wl-sip tap" data-sip="${s.id}">${glyph(drinkById(state, s.drinkId).glyph, 16)}
                            ${drinkById(state, s.drinkId).name} ${amount(s.oz, unit)}${s.note ? ' ·' : ''}</button>`,
                        )
                        .join('')}</div></div>`,
                    )
                    .join('')
                : `<p class="line sub">Nothing yet. ${who.name.split(' ')[0]} is ${mood === 'sleepy' ? 'dozing' : 'waiting'}; one glass wakes them.</p>`
            }
          </div>
          ${
            kcal
              ? `<div class="panel"><p class="tag">Calories from drinks<span>${kcal} kcal</span></p>
</div>`
              : ''
          }
          <div class="panel wl-fact"><p class="tag">Did you know</p><p class="line">${factFor(today())}</p></div>
          ${
            caf.mg
              ? `<div class="panel"><p class="tag">Caffeine<span>${caf.mg} mg</span></p>
                <p class="line sub">About ${caf.mg} mg today, of the 400 mg most adults stay under.${
                  caf.late ? ` ${caf.late} mg of it came after 2 PM — that can still be around at bedtime.` : ''
                }</p></div>`
              : ''
          }
        </div>
      </div>`,
      'wl-today',
    );

    // the water rises from where it was, not from the bottom
    if (lastFraction !== null && lastFraction !== fraction) {
      const fresh = petSvg(state.settings.character, fraction, 200);
      const target = /translateY\(([-\d.]+)px\)/.exec(fresh)?.[1];
      const water = root.querySelector<SVGGElement>('.wl-pet .pet-water');
      if (water && target)
        requestAnimationFrame(() => requestAnimationFrame(() => (water.style.transform = `translateY(${target}px)`)));
      const pet = root.querySelector('.wl-pet');
      // the face changes with the level
      if (pet && moodFor(lastFraction) !== mood)
        setTimeout(() => (pet.innerHTML = fresh), 700);
    }
    lastFraction = fraction;
  };

  draw();
  void refreshHeat().then((changed) => changed && draw());

  const onClick = (ev: Event): void => {
    const target = ev.target as HTMLElement;
    const cup = target.closest<HTMLElement>('[data-cup]');
    if (cup) {
      if (cup.dataset.cup === 'custom') return customCup(draw);
      cupOverride = Number(cup.dataset.cup) || null;
      return draw();
    }
    const d = target.closest<HTMLElement>('[data-drink]');
    if (d) {
      const { text, earned } = pourNow(d.dataset.drink!, cupOverride ?? undefined);
      draw();
      if (earned.length) celebrate(earned);
      else toast(text);
      return;
    }
    if (target.closest('#allDrinks')) return catalogue(draw);
    const s = target.closest<HTMLElement>('[data-sip]');
    if (s) return sipSheet(s.dataset.sip!, draw);
    if (target.closest('#undo')) {
      const gone = undoLast();
      draw();
      return toast(gone ? 'Took the last one back' : 'Nothing to undo');
    }
    if (target.closest('#earlier')) return sipSheet(null, draw);
    if (target.closest('#newDrink')) return drinkSheet(null, draw);
  };
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    lastFraction = null;
  };
}

/** every drink there is, by kind, with a search box: tap to pour */
function catalogue(done: () => void): void {
  const state = loadWater();
  const unit = state.settings.unit;
  const list = allDrinks(state).filter((d) => !state.settings.hidden.includes(d.id));
  const kinds = [...new Set(list.map((d) => d.kind ?? 'yours'))];
  const host = sheet(
    'All drinks',
    `<input class="dest" id="drinkSearch" placeholder="search ${list.length} drinks" autocomplete="off">
     <div id="drinkList">${kinds
       .map(
         (k) => `<div class="wl-kind" data-kind="${k}"><p class="tag">${k}</p>${list
           .filter((d) => (d.kind ?? 'yours') === k)
           .map(
             (d) => `<button class="food-row tap wl-cat" data-pour="${d.id}" data-name="${d.name.toLowerCase()}">
               <span>${glyph(d.glyph, 18)} ${d.name}</span>
               <span class="mono">${amount(cupFor(state, d.id), unit)} · ×${d.factor}${d.kcalPer8 ? ` · ${Math.round((d.kcalPer8 * cupFor(state, d.id)) / 8)} kcal` : ''}</span>
             </button>`,
           )
           .join('')}</div>`,
       )
       .join('')}</div>`,
  );
  const search = host.querySelector<HTMLInputElement>('#drinkSearch')!;
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    for (const row of host.querySelectorAll<HTMLElement>('[data-pour]'))
      row.hidden = !!q && !row.dataset.name!.includes(q);
    for (const group of host.querySelectorAll<HTMLElement>('.wl-kind'))
      group.hidden = ![...group.querySelectorAll<HTMLElement>('[data-pour]')].some((r) => !r.hidden);
  });
  host.querySelector('#drinkList')!.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-pour]');
    if (!row) return;
    const { text, earned } = pourNow(row.dataset.pour!, cupOverride ?? undefined);
    closeSheet(host);
    done();
    if (earned.length) celebrate(earned);
    else toast(text);
  });
}

function customCup(done: () => void): void {
  const unit = loadWater().settings.unit;
  const host = sheet(
    'A cup of your own',
    `<label class="field row"><span>Size (${unit})</span><input class="num" id="cupSize" inputmode="decimal" value="${toUnit(10, unit)}"></label>
     <button class="big tap" id="cupGo" data-done="1">USE THIS CUP</button>`,
  );
  host.querySelector('#cupGo')!.addEventListener('click', () => {
    const v = Number((host.querySelector('#cupSize') as HTMLInputElement).value);
    if (v > 0) cupOverride = fromUnit(v, unit);
    done();
  });
}

/** edit a drink already logged, or log one for earlier (null) */
function sipSheet(id: string | null, done: () => void): void {
  const state = loadWater();
  const unit = state.settings.unit;
  const sip = id ? state.sips.find((s) => s.id === id) : undefined;
  const when = new Date(sip?.at ?? now() - 30 * 60_000);
  const day = `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}`;
  let drinkId = sip?.drinkId ?? 'water';
  const host = sheet(
    sip ? 'Edit drink' : 'Log an earlier drink',
    `<div class="chips" id="pick">${allDrinks(state)
      .map((d) => `<button class="chip tap${d.id === drinkId ? ' on' : ''}" data-pick="${d.id}">${d.name}</button>`)
      .join('')}</div>
     <label class="field row"><span>Amount (${unit})</span><input class="num" id="sipAmount" inputmode="decimal"
       value="${toUnit(sip?.oz ?? cupFor(state, drinkId), unit)}"></label>
     <label class="field row"><span>Day</span><input class="num" id="sipDay" type="date" value="${day}"></label>
     <label class="field row"><span>Time</span><input class="num" id="sipTime" type="time"
       value="${two(when.getHours())}:${two(when.getMinutes())}"></label>
     <input class="dest" id="sipNote" placeholder="a note, if you like" value="${sip?.note ?? ''}">
     <button class="big tap" id="sipSave" data-done="1">${sip ? 'SAVE' : 'LOG IT'}</button>
     ${sip ? '<button class="link tap" id="sipDelete" data-done="1">Delete this drink</button>' : ''}`,
  );
  host.querySelector('#pick')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-pick]');
    if (!chip) return;
    drinkId = chip.dataset.pick!;
    host.querySelectorAll('[data-pick]').forEach((c) => c.classList.toggle('on', c === chip));
    if (!sip) (host.querySelector('#sipAmount') as HTMLInputElement).value = String(toUnit(cupFor(state, drinkId), unit));
  });
  host.querySelector('#sipSave')!.addEventListener('click', () => {
    const value = (sel: string): string => (host.querySelector(sel) as HTMLInputElement).value;
    const [y, m, d] = value('#sipDay').split('-').map(Number);
    const [hh, mm] = value('#sipTime').split(':').map(Number);
    const at = new Date(y, m - 1, d, hh, mm).getTime();
    const oz = fromUnit(Number(value('#sipAmount')) || 0, unit);
    const note = value('#sipNote').trim() || undefined;
    if (oz <= 0) return;
    if (sip) updateSip(sip.id, { drinkId, oz, at, note });
    else celebrate(logSip(drinkId, oz, at, note).earned);
    done();
  });
  host.querySelector('#sipDelete')?.addEventListener('click', () => {
    if (sip) deleteSip(sip.id);
    toast('Deleted');
    done();
  });
}

/** make or change a drink of your own (null makes a new one) */
function drinkSheet(id: string | null, done: () => void): void {
  const state = loadWater();
  const unit = state.settings.unit;
  const drink = id ? state.customs.find((d) => d.id === id) : undefined;
  let pick: GlyphId = drink?.glyph ?? 'bottle';
  const host = sheet(
    drink ? 'Edit drink' : 'A drink of your own',
    `<input class="dest" id="dName" placeholder="what is it? (kombucha, horchata…)" value="${drink?.name ?? ''}">
     <p class="tag">Glyph</p>
     <div class="wl-glyphs" id="dGlyph">${GLYPH_PICKS.map(
       (g) => `<button class="wl-glyph tap${g === pick ? ' on' : ''}" data-glyph="${g}" aria-label="${g}">${glyph(g, 22)}</button>`,
     ).join('')}</div>
     <label class="field row"><span>Hydration factor</span><input class="num" id="dFactor" inputmode="decimal" value="${drink?.factor ?? 1}"></label>
     <label class="field row"><span>Usual cup (${unit})</span><input class="num" id="dSize" inputmode="decimal" value="${toUnit(drink?.defaultOz ?? 12, unit)}"></label>
     <label class="field row"><span>Caffeine mg per 8 oz</span><input class="num" id="dCaf" inputmode="numeric" value="${drink?.caffeinePer8 ?? 0}"></label>
     <label class="field row"><span>Calories per 8 oz</span><input class="num" id="dKcal" inputmode="numeric" value="${drink?.kcalPer8 ?? 0}"></label>
     <p class="line sub">1.0 counts every drop as water; 0.5 counts half, as for wine.</p>
     <button class="big tap" id="dSave" data-done="1">SAVE</button>
     ${drink ? '<button class="link tap" id="dDelete" data-done="1">Delete this drink</button>' : ''}`,
  );
  host.querySelector('#dGlyph')!.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-glyph]');
    if (!b) return;
    pick = b.dataset.glyph as GlyphId;
    host.querySelectorAll('[data-glyph]').forEach((x) => x.classList.toggle('on', x === b));
  });
  host.querySelector('#dSave')!.addEventListener('click', () => {
    const value = (sel: string): string => (host.querySelector(sel) as HTMLInputElement).value;
    const name = value('#dName').trim();
    if (!name) return toast('A drink needs a name');
    saveCustom({
      id: drink?.id,
      name,
      glyph: pick,
      factor: Math.min(1.5, Math.max(0, Number(value('#dFactor')) || 1)),
      defaultOz: fromUnit(Number(value('#dSize')) || 12, unit),
      caffeinePer8: Number(value('#dCaf')) || undefined,
      kcalPer8: Number(value('#dKcal')) || undefined,
    });
    toast(`${name} added`);
    done();
  });
  host.querySelector('#dDelete')?.addEventListener('click', () => {
    if (drink) deleteCustom(drink.id);
    done();
  });
}

/* ---------- 100: stats ---------- */

function weekChart(state: WaterState): string {
  const bars = weekBars(state);
  const unit = state.settings.unit;
  const top = Math.max(...bars.map((b) => Math.max(b.effective, b.goal)), 1) * 1.12;
  const w = 300;
  const h = 130;
  const slot = w / 7;
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `<figure class="chart wl-week">
    <svg viewBox="0 0 ${w} ${h + 18}" width="100%" height="${h + 18}" aria-label="the last seven days against the goal">
      ${bars
        .map((b, i) => {
          const x = i * slot + slot * 0.2;
          const bw = slot * 0.6;
          const bh = (b.effective / top) * h;
          const gy = h - (b.goal / top) * h;
          const [y, m, d] = b.date.split('-').map(Number);
          const met = b.effective >= b.goal - 0.05;
          return `<rect class="wl-bar${met ? ' met' : ''}" x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2"/>
            <line class="wl-hair" x1="${(x - 3).toFixed(1)}" x2="${(x + bw + 3).toFixed(1)}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/>
            <text class="wl-day" x="${(x + bw / 2).toFixed(1)}" y="${h + 14}">${days[new Date(y, m - 1, d).getDay()]}</text>`;
        })
        .join('')}
    </svg>
    <figcaption class="line sub">Last seven days — each hairline is that day's goal. ${amount(
      bars.reduce((sum, b) => sum + b.effective, 0) / 7,
      unit,
    )} a day on average.</figcaption>
  </figure>`;
}

function monthHeat(state: WaterState, ym: string): string {
  const cells = monthGrid(state, ym);
  const [y, m] = ym.split('-').map(Number);
  const lead = new Date(y, m - 1, 1).getDay();
  const title = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `<div class="wl-month" aria-label="${title}">
    ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="wl-dow">${d}</span>`).join('')}
    ${'<span></span>'.repeat(lead)}
    ${cells
      .map((c) => {
        const day = Number(c.date.slice(8));
        const level = c.ratio === null ? 0 : c.ratio >= 1 ? 4 : c.ratio >= 0.75 ? 3 : c.ratio >= 0.4 ? 2 : 1;
        return `<span class="wl-cell l${level}${c.date === today() ? ' now' : ''}" title="${c.date}${
          c.ratio === null ? '' : ` · ${Math.round(c.ratio * 100)}%`
        }">${day}</span>`;
      })
      .join('')}
  </div>
  <p class="line sub wl-month-cap">The deeper the colour, the closer to the goal.</p>`;
}

/** the month on a card: totals, the best run, a favourite, and a name for it */
function recapCard(state: WaterState, ym: string): string {
  const r = recap(state, ym);
  const unit = state.settings.unit;
  return `<div class="wl-recap" id="recap">
    <p class="tag">Your ${new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'long' })}</p>
    <b class="wl-identity">${r.identity}</b>
    <p class="line sub">${r.why}</p>
    <div class="wl-nums">
      <div><b class="mono">${amount(r.counted, unit)}</b><span class="tag">counted</span></div>
      <div><b class="mono">${r.daysMet}/${r.daysLogged}</b><span class="tag">days on goal</span></div>
      <div><b class="mono">${r.bestStreak}</b><span class="tag">best streak</span></div>
      <div><b class="mono">${r.drinks}</b><span class="tag">drinks</span></div>
      <div><b class="mono">${r.favourite ?? '—'}</b><span class="tag">favourite</span></div>
      <div><b class="mono">${r.bestHour === null ? '—' : hourLabel(r.bestHour)}</b><span class="tag">best hour</span></div>
    </div>
  </div>`;
}

/** which month the stats calendar is showing */
let shownMonth: string | null = null;

const stepMonth = (ym: string, by: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}`;
};

export function waterStatsView(root: HTMLElement): void {
  const state = loadWater();
  const unit = state.settings.unit;
  const goal = goalToday(state);
  const sips = sipsOn(state);
  const s = summary(state);
  const hours = s.byHour.slice(5, 24);
  const ym = shownMonth ?? today().slice(0, 7);
  root.innerHTML = shell(
    'stats',
    `<div class="hero">
      <p class="tag section">Water · stats</p>
      <h1>${s.hitRate}%<span><i> · </i>of logged days on goal</span></h1>
      <p class="line sub">Streak ${streak(state)} · best ${bestStreak(state)} · this week ${weekConsistency(state)}% consistent</p>
    </div>
    <div class="wl-cols">
      <div class="panel">
        <p class="tag">Today<span>${sips.length} drinks</span></p>
        <div class="wl-nums">
          <div><b class="mono">${amount(effectiveOn(state), unit)}</b><span class="tag">counted</span></div>
          <div><b class="mono">${amount(rawOf(sips), unit)}</b><span class="tag">poured</span></div>
          <div><b class="mono">${amount(goal, unit)}</b><span class="tag">goal</span></div>
        </div>
      </div>
      <div class="panel">${weekChart(state)}</div>
      <div class="panel wl-cal">
        <p class="tag"><button class="link tap" id="prevMonth" aria-label="Previous month">‹</button>
          <span>${new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button class="link tap" id="nextMonth" aria-label="Next month"${ym >= today().slice(0, 7) ? ' disabled' : ''}>›</button></p>
        ${monthHeat(state, ym)}
        ${recapCard(state, ym)}
      </div>
      <div class="panel">
        <p class="tag">Last thirty days<span>${s.logged} days logged</span></p>
        <div class="wl-nums">
          <div><b class="mono">${amount(s.average, unit)}</b><span class="tag">daily average</span></div>
          <div><b class="mono">${s.hitRate}%</b><span class="tag">hit rate</span></div>
          <div><b class="mono">${s.bestHour === null ? '—' : hourLabel(s.bestHour)}</b><span class="tag">best hour</span></div>
        </div>
        <p class="line sub">Counted ${amount(s.effective, unit)} of ${amount(s.raw, unit)} poured — ${
          s.raw ? Math.round((s.effective / s.raw) * 100) : 100
        }% of what you drank was water by the hydration factors.</p>
      </div>
      <div class="panel">
        <p class="tag">By drink<span>counted, thirty days</span></p>
        ${barList(
          s.byDrink.map((d) => ({
            label: d.name,
            value: toUnit(d.effective, unit),
            note: d.raw - d.effective > 0.05 ? `(${amount(d.raw, unit)} poured)` : '',
          })),
          ` ${unit}`,
        )}
      </div>
      <div class="panel">
        <p class="tag">By hour of day<span>thirty days</span></p>
        ${columns(
          hours.map((v) => toUnit(v, unit)),
          hours.map((_, i) => ((i + 5) % 3 === 0 ? String((i + 5) % 12 || 12) : '')),
        )}
      </div>
    </div>`,
    'wl-page',
  );
  const move = (by: number): void => {
    shownMonth = stepMonth(ym, by);
    if (shownMonth >= today().slice(0, 7)) shownMonth = null;
    waterStatsView(root);
  };
  root.querySelector('#prevMonth')!.addEventListener('click', () => move(-1));
  root.querySelector('#nextMonth')!.addEventListener('click', () => move(1));
}

/* ---------- 99: challenges and achievements ---------- */

export function waterChallengesView(root: HTMLElement): void {
  const state = loadWater();
  const earned = ACHIEVEMENTS.filter((a) => state.earned[a.id]).length;
  root.innerHTML = shell(
    'challenges',
    `<div class="hero">
      <p class="tag section">Water · challenges</p>
      <h1>${streak(state)}<span><i> · </i>days in a row</span></h1>
      <p class="line sub">Best ${bestStreak(state)} · ${weekConsistency(state)}% of the last week on goal · ${earned} of ${ACHIEVEMENTS.length} badges</p>
    </div>
    <div class="wl-cols">
      ${CHALLENGES.map((c) => {
        const st = challengeStatus(state, c.id);
        return `<div class="panel wl-challenge ${st.state}" data-challenge="${c.id}">
          <div class="wl-ch-ring">${ring(st.progress / st.target, 64, 5)}<b class="mono">${st.progress}/${st.target}</b></div>
          <div>
            <b>${c.name}</b>
            <p class="line sub">${st.state === 'idle' ? c.blurb : st.note}</p>
            ${
              st.state === 'idle'
                ? `<button class="chip tap" data-start="${c.id}">Start</button>`
                : st.state === 'done'
                  ? '<span class="tag wl-won">badge earned</span>'
                  : st.state === 'broken'
                    ? `<button class="chip tap" data-start="${c.id}">Start again</button>`
                    : `<button class="link tap" data-drop="${c.id}">give up</button>`
            }
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="panel">
      <p class="tag">Badges<span>${earned} of ${ACHIEVEMENTS.length}</span></p>
      <div class="cards">${ACHIEVEMENTS.map((a) => {
        const on = !!state.earned[a.id];
        return `<div class="card badge${on ? ' on' : ' locked'}"><span class="glyph">${glyph(on ? 'star' : 'drop', 28)}</span>
          <b>${a.name}</b><span class="tag">${on ? state.earned[a.id] : a.how}</span></div>`;
      }).join('')}</div>
    </div>`,
    'wl-page',
  );
  root.firstElementChild!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const start = target.closest<HTMLElement>('[data-start]');
    if (start) {
      startChallenge(start.dataset.start as ChallengeId);
      toast('Challenge on — the rings fill as you go');
      return waterChallengesView(root);
    }
    const give = target.closest<HTMLElement>('[data-drop]');
    if (give) {
      dropChallenge(give.dataset.drop as ChallengeId);
      waterChallengesView(root);
    }
  });
}

/* ---------- 95: the companions ---------- */

export function waterPetsView(root: HTMLElement): void {
  const state = loadWater();
  const fraction = effectiveOn(state) / Math.max(1, goalToday(state));
  const have = COMPANIONS.filter((c) => unlocked(state, c.id)).length;
  root.innerHTML = shell(
    'pets',
    `<div class="hero">
      <p class="tag section">Water · pets</p>
      <h1>${have}<span><i> · </i>of ${COMPANIONS.length} companions</span></h1>
      <p class="line sub">Whoever you choose is the one who fills up as you drink. Streaks and milestones bring new friends.</p>
    </div>
    <div class="cards wl-pets" id="pets">
      ${COMPANIONS.map((c) => {
        const open = unlocked(state, c.id);
        const on = state.settings.character === c.id;
        return `<button class="card tap${open ? '' : ' locked'}${on ? ' on' : ''}" data-pet="${c.id}" ${open ? '' : 'aria-disabled="true"'}>
          <span class="wl-pet-card">${petSvg(c.id, open ? (on ? fraction : 0.62) : 0, 104, c.name)}</span>
          <b>${c.name}</b>
          <span class="tag">${on ? 'filling up' : open ? 'tap to choose' : c.how}</span>
        </button>`;
      }).join('')}
    </div>`,
    'wl-page',
  );
  root.querySelector('#pets')!.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-pet]');
    if (!card) return;
    const id = card.dataset.pet as CharacterId;
    const pet = COMPANIONS.find((c) => c.id === id)!;
    if (!unlocked(loadWater(), id)) return toast(pet.how);
    setWaterSettings({ character: id });
    toast(`${pet.name.split(' ')[0]} is filling up now`);
    waterPetsView(root);
  });
}

/* ---------- 96 + 97: settings, reminders ---------- */

export function waterSettingsView(root: HTMLElement): void {
  const state = loadWater();
  const s = state.settings;
  const unit = s.unit;
  const parts = goalParts(state);
  const nudges = schedule(state);
  const sizeSelect = (d: Drink): string =>
    `<select class="dest wl-size" data-size="${d.id}">${[...new Set([...CUPS_OZ, cupFor(state, d.id)])]
      .sort((a, b) => a - b)
      .map((oz) => `<option value="${oz}"${Math.abs(oz - cupFor(state, d.id)) < 0.01 ? ' selected' : ''}>${amount(oz, unit)}</option>`)
      .join('')}</select>`;
  root.innerHTML = shell(
    'settings',
    `<div class="hero">
      <p class="tag section">Water · settings</p>
      <h1>${amount(parts.total, unit)}<span><i> · </i>a day</span></h1>
    </div>
    <div class="wl-cols">
      <div class="panel">
        <p class="tag">Goal</p>
        <p class="line sub">Worked out: ${amount(parts.base, unit)} for ${Math.round(parts.weightLb)} lb (half an ounce a pound${
          parts.weighed ? ', from your trend weight' : ' — no weigh-in yet, so 160 lb is a guess'
        }), plus ${amount(16, unit)} on a day you run or lift, plus ${amount(12, unit)} when Chicago tops 85°F${
          state.heat?.date === today() ? ` (today ${Math.round(state.heat.maxF)}°F)` : ''
        }.</p>
        <label class="field row"><span>My own goal (${unit})</span>
          <input class="num" id="manual" inputmode="decimal" placeholder="auto" value="${s.manualOz ? toUnit(s.manualOz, unit) : ''}"></label>
        <button class="link tap" id="auto">Use the worked-out goal</button>
      </div>
      <div class="panel">
        <p class="tag">Units and sound</p>
        <div class="chips" id="unit">${(['oz', 'ml'] as const)
          .map((u) => `<button class="chip tap${unit === u ? ' on' : ''}" data-unit="${u}">${u}</button>`)
          .join('')}</div>
        <label class="sw tap"><input type="checkbox" id="sound" ${s.sound ? 'checked' : ''}><span>A sound when you log</span></label>
        ${(['chime', 'cheer'] as const)
          .map(
            (k) => `<label class="field row"><span>${k === 'chime' ? 'Each drink' : 'Goal met'}</span>
              <span class="wl-soundpick"><select class="dest wl-size" id="${k}">${CHIMES.map(
                (c) => `<option value="${c.id}"${s[k] === c.id ? ' selected' : ''}>${c.name}</option>`,
              ).join('')}</select><button class="link tap" data-hear="${k}" aria-label="Hear it">▶</button></span></label>`,
          )
          .join('')}
        <label class="field"><span class="tag">One tap from More pours</span>
          <select class="dest" id="quick">${allDrinks(state)
            .map((d) => `<option value="${d.id}"${d.id === s.quick ? ' selected' : ''}>${d.name}</option>`)
            .join('')}</select></label>
      </div>
      <div class="panel">
        <p class="tag">Reminders<span>${nudges.filter((n) => n.state !== 'skipped').length} today</span></p>
        <label class="field row"><span>Wake</span><input class="num" id="wake" type="time" value="${s.wake}"></label>
        <label class="field row"><span>Bed</span><input class="num" id="bed" type="time" value="${s.bed}"></label>
        <label class="field row"><span>How many</span><input class="num" id="count" inputmode="numeric" value="${s.reminders}"></label>
        <div class="wl-nudges">${nudges
          .map((n) => `<span class="wl-nudge ${n.state}"><b class="mono">${n.label}</b><i>${
            n.state === 'skipped' ? 'goal met' : n.state === 'done' ? 'drank' : n.state === 'due' ? 'missed' : 'later'
          }</i></span>`)
          .join('')}</div>
        <p class="line sub">Spread evenly between waking and bed, and dropped once the day's goal is met. A web app cannot send
          notifications when it is closed, so reminders show here and on Today, and the calendar file below puts them on your phone.</p>
        <button class="link tap" id="ics">Add these to my calendar (.ics)</button>
      </div>
      <div class="panel">
        <p class="tag">Today grid<span>${s.panel.length} pinned</span></p>
        <ol class="wl-pinned" id="pinned">${s.panel
          .map((id) => {
            const d = drinkById(state, id);
            return `<li data-pin-row="${id}">${glyph(d.glyph, 18)}<b>${d.name}</b>
              <button class="link tap" data-shift="-1" aria-label="Move ${d.name} up">↑</button>
              <button class="link tap" data-shift="1" aria-label="Move ${d.name} down">↓</button>
              <button class="link tap" data-unpin="${id}" aria-label="Unpin ${d.name}">✕</button></li>`;
          })
          .join('')}</ol>
        <p class="line sub">Pin any drink below with ☆; the grid follows this order.</p>
      </div>
      <div class="panel wl-table-panel">
        <p class="tag">All ${allDrinks(state).length} drinks<span>per usual cup</span></p>
        <div class="wl-table" id="drinkTable">
          ${allDrinks(state)
            .map((d) => {
              const cup = cupFor(state, d.id);
              const pinned = s.panel.includes(d.id);
              const hidden = s.hidden.includes(d.id);
              const caf = d.caffeinePer8 ? ` · ${Math.round((d.caffeinePer8 * cup) / 8)} mg caffeine` : '';
              const kcal = ` · ${d.kcalPer8 ? Math.round((d.kcalPer8 * cup) / 8) : 0} kcal`;
              return `<div class="wl-trow${hidden ? ' off' : ''}">
                <span class="wl-tname">${glyph(d.glyph, 18)}<span><b>${d.name}</b><small class="mono">×${d.factor}${caf}${kcal}</small></span></span>
                <span class="wl-tact">${sizeSelect(d)}<button class="link tap" data-pin="${d.id}" aria-pressed="${pinned}" aria-label="${pinned ? 'Unpin' : 'Pin'} ${d.name}">${pinned ? '★' : '☆'}</button><button class="link tap" data-hide="${d.id}" aria-pressed="${hidden}" aria-label="${hidden ? 'Show' : 'Hide'} ${d.name}">${hidden ? 'show' : 'hide'}</button></span>
              </div>`;
            })
            .join('')}
        </div>
        <p class="line sub">Factor is how much counts as water. Hidden drinks stay out of the full list.</p>
      </div>
      <div class="panel">
        <p class="tag">My drinks<span><button class="link tap" id="add">add</button></span></p>
        ${
          state.customs.length
            ? state.customs
                .map((d) => `<button class="food-row tap wl-custom" data-edit="${d.id}"><span>${glyph(d.glyph, 18)} ${d.name}</span>
                  <span class="mono">×${d.factor} · ${amount(d.defaultOz, unit)}</span></button>`)
                .join('')
            : '<p class="line sub">Kombucha, horchata, whatever you drink — give it a factor and a cup.</p>'
        }
      </div>
      <div class="panel">
        <p class="tag">What a web app cannot do</p>
        <p class="line sub">Push reminders while the app is closed, haptics, home-screen widgets, writing to Apple Health,
          and an Apple Watch app. The Mac app is simply this, on a wide screen.</p>
      </div>
    </div>`,
    'wl-page',
  );

  const again = (): void => waterSettingsView(root);
  const input = (sel: string): HTMLInputElement => root.querySelector(sel) as HTMLInputElement;
  input('#manual').addEventListener('change', () => {
    const v = Number(input('#manual').value);
    setWaterSettings({ manualOz: v > 0 ? fromUnit(v, unit) : null });
    again();
  });
  root.querySelector('#auto')!.addEventListener('click', () => {
    setWaterSettings({ manualOz: null });
    again();
  });
  root.querySelector('#unit')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-unit]');
    if (!chip) return;
    setWaterSettings({ unit: chip.dataset.unit as 'oz' | 'ml' });
    again();
  });
  input('#sound').addEventListener('change', () => setWaterSettings({ sound: input('#sound').checked }));
  for (const k of ['chime', 'cheer'] as const)
    root.querySelector(`#${k}`)!.addEventListener('change', (ev) => {
      const id = (ev.target as HTMLSelectElement).value;
      setWaterSettings({ [k]: id });
      chime(id);
    });
  root.querySelector('.wl-cols')!.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const hear = target.closest<HTMLElement>('[data-hear]');
    if (hear) return chime(loadWater().settings[hear.dataset.hear as 'chime' | 'cheer']);
    const pin = target.closest<HTMLElement>('[data-pin]');
    const settings = loadWater().settings;
    if (pin) {
      const id = pin.dataset.pin!;
      setWaterSettings({
        panel: settings.panel.includes(id) ? settings.panel.filter((x) => x !== id) : [...settings.panel, id],
        hidden: settings.hidden.filter((x) => x !== id),
      });
      return again();
    }
    const unpin = target.closest<HTMLElement>('[data-unpin]');
    if (unpin) {
      setWaterSettings({ panel: settings.panel.filter((x) => x !== unpin.dataset.unpin) });
      return again();
    }
    const hide = target.closest<HTMLElement>('[data-hide]');
    if (hide) {
      const id = hide.dataset.hide!;
      const hidden = settings.hidden.includes(id) ? settings.hidden.filter((x) => x !== id) : [...settings.hidden, id];
      setWaterSettings({ hidden, panel: settings.panel.filter((x) => !hidden.includes(x)) });
      return again();
    }
    const shift = target.closest<HTMLElement>('[data-shift]');
    if (shift) {
      const id = shift.closest<HTMLElement>('[data-pin-row]')!.dataset.pinRow!;
      const list = [...settings.panel];
      const at = list.indexOf(id);
      const to = at + Number(shift.dataset.shift);
      if (to < 0 || to >= list.length) return;
      list.splice(at, 1);
      list.splice(to, 0, id);
      setWaterSettings({ panel: list });
      again();
      root.querySelector<HTMLElement>(`[data-pin-row="${id}"] [data-shift="${shift.dataset.shift}"]`)?.focus();
    }
  });
  root.querySelector('#quick')!.addEventListener('change', (ev) =>
    setWaterSettings({ quick: (ev.target as HTMLSelectElement).value }),
  );
  for (const [sel, key] of [
    ['#wake', 'wake'],
    ['#bed', 'bed'],
  ] as const)
    input(sel).addEventListener('change', () => {
      setWaterSettings({ [key]: input(sel).value });
      again();
    });
  input('#count').addEventListener('change', () => {
    setWaterSettings({ reminders: Math.min(16, Math.max(1, Math.round(Number(input('#count').value) || 8))) });
    again();
  });
  root.querySelector('#ics')!.addEventListener('click', () => {
    downloadIcs('milo-water', remindersIcs(loadWater()));
    toast('Calendar file saved');
  });
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-size]'))
    select.addEventListener('change', () => {
      const next = loadWater().settings.sizes;
      setWaterSettings({ sizes: { ...next, [select.dataset.size!]: Number(select.value) } });
    });
  root.querySelector('#add')!.addEventListener('click', () => drinkSheet(null, again));
  root.firstElementChild!.addEventListener('click', (ev) => {
    const edit = (ev.target as HTMLElement).closest<HTMLElement>('[data-edit]');
    if (edit) drinkSheet(edit.dataset.edit!, again);
  });
}

