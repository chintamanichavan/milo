import { miloMark } from '../../badge';
import { exportFile, importFile } from '../store';
import { sheet } from '../../ui/sheet';
import { clock, longClock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { BAR_SLOTS, ICONS, LINKS, setTabOrder, tabOrder, type Tab } from '../../ui/nav';
import { PERSONAS, personaById } from '../coach';
import { distanceLabel, paceLabel, routeSvg } from '../gps';
import { buildIcs, downloadIcs, nextRunDay } from '../ics';
import { PROGRAMMES, programmeById } from '../plans';
import { applyTheme } from '../theme';
import {
  deleteRun,
  graduated,
  load,
  recordRun,
  save,
  setSettings,
  updateRun,
  type CompletedRun,
} from '../store';
import { COOL_DOWN_MOVES, WARM_UP_MOVES, WEEK_TIPS } from '../tips';

export function runSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/${id ? `run/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('history', 'History')}${link(
    'tips',
    'Tips',
  )}${link('plans', 'Plans')}${link('settings', 'Settings')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today detail">
    <header class="head">
      <span class="wordmark">${miloMark()}<b>MILO</b></span>
    </header>
    ${runSubNav(active)}
    ${body}
  </section>`;

/* ---------- history ---------- */

export function runHistoryView(root: HTMLElement): () => void {
  const state = load();
  const units = state.settings.units;
  const rows = state.completedRuns
    .map((r, i) => ({ r, i }))
    .reverse()
    .map(
      ({ r, i }) => `<tr data-run="${i}">
        <td>${new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td>${programmeById(r.prog ?? 'c25k').id === 'c25k' ? `W${r.week} R${r.run}` : `${r.prog} W${r.week}`}</td>
        <td class="mono">${clock(r.durationSec)}${
          r.distanceKm ? ` · ${distanceLabel(r.distanceKm, units)}` : ''
        }</td>
        <td>${r.feel ?? ''}</td></tr>`,
    )
    .join('');

  root.innerHTML = shell(
    'history',
    `<div class="hero">
      <p class="tag section">History</p>
      <h1>${state.completedRuns.length}<span><i> · </i>runs logged</span></h1>
      <p class="line sub">Tap a run to see it, fix it, or delete it.
        <button class="link tap" id="addRun">Add a run by hand</button></p>
    </div>
    ${
      rows
        ? `<table class="log"><thead><tr><th>date</th><th>run</th><th>time</th><th>feel</th></tr></thead>
           <tbody>${rows}</tbody></table>`
        : '<p class="line sub">No runs yet.</p>'
    }`,
  );

  root.querySelector('tbody')?.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-run]');
    if (!row) return;
    const i = Number(row.dataset.run);
    const r = load().completedRuns[i];
    const host = sheet(
      `${new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      `<p class="line">${programmeById(r.prog ?? 'c25k').name} · week ${r.week}, run ${r.run}</p>
       <p class="line sub">${longClock(r.durationSec)}${
         r.distanceKm ? ` · ${distanceLabel(r.distanceKm, units)} · ${paceLabel(r.runPace ?? 0, units)} running` : ''
       }</p>
       ${r.path?.length ? `<div class="route-wrap">${routeSvg(r.path)}</div>` : ''}
       <label class="field"><span class="tag">Minutes</span>
         <input class="num" id="hMin" inputmode="numeric" value="${Math.round(r.durationSec / 60)}"></label>
       <label class="field"><span class="tag">How it felt</span>
         <select class="dest" id="hFeel">
           ${['', 'easy', 'ok', 'hard']
             .map((f) => `<option value="${f}"${f === (r.feel ?? '') ? ' selected' : ''}>${f || '—'}</option>`)
             .join('')}
         </select></label>
       <label class="field"><span class="tag">Note</span>
         <input class="dest" id="hNote" value="${r.note ?? ''}"></label>
       <div class="row-actions">
         <button class="big tap" data-done="1" id="hSave">SAVE</button>
         <button class="link tap" data-done="1" id="hDelete">Delete this run</button>
       </div>`,
    );
    host.querySelector('#hSave')!.addEventListener('click', () => {
      updateRun(i, {
        durationSec: Number((host.querySelector('#hMin') as HTMLInputElement).value) * 60,
        feel: ((host.querySelector('#hFeel') as HTMLSelectElement).value || undefined) as CompletedRun['feel'],
        note: (host.querySelector('#hNote') as HTMLInputElement).value.trim(),
      });
      runHistoryView(root);
      toast('Run updated');
    });
    host.querySelector('#hDelete')!.addEventListener('click', () => {
      deleteRun(i);
      runHistoryView(root);
      toast('Run deleted');
    });
  });

  root.querySelector('#addRun')!.addEventListener('click', () => {
    const host = sheet(
      'Add a run',
      `<label class="field"><span class="tag">Week</span><input class="num" id="aWeek" value="1"></label>
       <label class="field"><span class="tag">Run</span><input class="num" id="aRun" value="1"></label>
       <label class="field"><span class="tag">Minutes</span><input class="num" id="aMin" value="30"></label>
       <button class="big tap" data-done="1" id="aSave">LOG IT</button>`,
    );
    host.querySelector('#aSave')!.addEventListener('click', () => {
      const num = (id: string): number => Number((host.querySelector(`#${id}`) as HTMLInputElement).value);
      recordRun(num('aWeek'), num('aRun'), num('aMin') * 60, { manual: true });
      runHistoryView(root);
      toast('Run logged');
    });
  });
  return () => {};
}

/* ---------- tips, warm-up and cool-down ---------- */

export function tipsView(root: HTMLElement): () => void {
  const moves = (list: typeof WARM_UP_MOVES): string =>
    list.map((m) => `<li><b>${m.name}</b><span>${m.how}</span></li>`).join('');
  root.innerHTML = shell(
    'tips',
    `<div class="hero">
      <p class="tag section">Tips</p>
      <h1>Nine weeks<span><i> · </i>nine things worth knowing</span></h1>
    </div>
    ${Object.entries(WEEK_TIPS)
      .map(
        ([week, tip]) => `<details class="day tip"><summary>
          <span>Week ${week} · ${tip.title}</span><span class="sub">read</span></summary>
          ${tip.body.map((p) => `<p class="line">${p}</p>`).join('')}</details>`,
      )
      .join('')}
    <div class="panel" id="warmup">
      <p class="tag">Warm-up · five minutes before you run</p>
      <ul class="moves">${moves(WARM_UP_MOVES)}</ul>
    </div>
    <div class="panel" id="cooldown">
      <p class="tag">Cool-down · after the last walk</p>
      <ul class="moves">${moves(COOL_DOWN_MOVES)}</ul>
    </div>`,
  );
  return () => {};
}

/* ---------- 5K+ plans ---------- */

export function plansView(root: HTMLElement): () => void {
  const state = load();
  const open = graduated(state);
  const cards = PROGRAMMES.filter((p) => p.id !== 'c25k')
    .map(
      (p) => `<div class="card plan${state.settings.programme === p.id ? ' on' : ''}">
        <b>${p.name}</b>
        <span class="tag">${p.weeks} weeks · ${p.runsPerWeek} a week</span>
        <p class="line sub">${p.blurb}</p>
        <button class="link tap" data-plan="${p.id}" ${open ? '' : 'disabled'}>
          ${state.settings.programme === p.id ? 'current plan' : 'choose this'}</button>
      </div>`,
    )
    .join('');
  root.innerHTML = shell(
    'plans',
    `<div class="hero">
      <p class="tag section">After week nine</p>
      <h1>5K+<span><i> · </i>where this goes next</span></h1>
      <p class="line sub">${
        open
          ? 'You have graduated, so these are yours. Switch whenever you like.'
          : 'These open when you finish week nine. You can switch early if you already run 30 minutes.'
      }</p>
      ${
        open
          ? `<button class="link tap" id="backToC25K">Back to Couch to 5K</button>`
          : `<button class="link tap" id="already">I already run 30 minutes — open them</button>`
      }
    </div>
    <div class="cards">${cards}</div>`,
  );

  root.querySelector('#already')?.addEventListener('click', () => {
    const next = load();
    next.flags.graduated = true;
    save(next);
    plansView(root);
  });
  root.querySelector('#backToC25K')?.addEventListener('click', () => {
    setSettings({ programme: 'c25k' });
    plansView(root);
    toast('Back on Couch to 5K');
  });
  root.querySelector('.cards')!.addEventListener('click', (ev) => {
    const button = (ev.target as HTMLElement).closest<HTMLElement>('[data-plan]');
    if (!button || button.hasAttribute('disabled')) return;
    setSettings({ programme: button.dataset.plan! });
    plansView(root);
    toast('Plan changed');
  });
  return () => {};
}

/* ---------- certificate ---------- */

export function certificateView(root: HTMLElement): () => void {
  const state = load();
  const name = state.settings.graduateName ?? '';
  const when = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const svg = (who: string): string => `
    <svg id="certSvg" viewBox="0 0 600 420" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="420" fill="#0b0d0f"/>
      <rect x="16" y="16" width="568" height="388" fill="none" stroke="#c5f74f" stroke-width="2"/>
      <text x="300" y="96" text-anchor="middle" fill="#7d888f" font-family="ui-monospace,monospace"
        font-size="16" letter-spacing="6">MILO · COUCH TO 5K</text>
      <text x="300" y="190" text-anchor="middle" fill="#e9eef1" font-family="system-ui,sans-serif"
        font-size="40" font-weight="600">${who || 'This runner'}</text>
      <text x="300" y="240" text-anchor="middle" fill="#e9eef1" font-family="system-ui,sans-serif"
        font-size="20">ran for thirty minutes without stopping</text>
      <text x="300" y="286" text-anchor="middle" fill="#7d888f" font-family="ui-monospace,monospace"
        font-size="14" letter-spacing="3">${when.toUpperCase()}</text>
      <image href="/icon-v7.svg" x="270" y="316" width="61" height="61"/>
    </svg>`;

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section">Graduation</p>
      <h1>Thirty minutes<span><i> · </i>no walking</span></h1>
      <div class="certificate" id="cert">${svg(name)}</div>
      <label class="field"><span class="tag">Name on the certificate</span>
        <input class="dest" id="certName" value="${name}" placeholder="your name"></label>
      <div class="row-actions">
        <button class="big tap" data-done="1" id="share">SHARE IT</button>
        <a class="link tap" href="#/run/plans">What comes next →</a>
      </div>
    </div>`,
  );

  const redraw = (who: string): void => {
    root.querySelector('#cert')!.innerHTML = svg(who);
  };
  root.querySelector('#certName')!.addEventListener('input', (ev) => {
    const who = (ev.target as HTMLInputElement).value;
    setSettings({ graduateName: who });
    redraw(who);
  });

  root.querySelector('#share')!.addEventListener('click', async () => {
    const source = root.querySelector('#certSvg')!.outerHTML;
    const blob = new Blob([source], { type: 'image/svg+xml' });
    const png = await svgToPng(source).catch(() => null);
    const file = new File([png ?? blob], 'milo-certificate.png', {
      type: png ? 'image/png' : 'image/svg+xml',
    });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Couch to 5K' });
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    toast('Certificate saved');
  });
  return () => {};
}

async function svgToPng(source: string): Promise<Blob> {
  const image = new Image();
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 840;
  canvas.getContext('2d')!.drawImage(image, 0, 0, 1200, 840);
  URL.revokeObjectURL(url);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

/* ---------- settings ---------- */

export function runSettingsView(root: HTMLElement): () => void {
  const state = load();
  const s = state.settings;
  const voices = 'speechSynthesis' in window ? speechSynthesis.getVoices() : [];
  const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  root.innerHTML = shell(
    'settings',
    `<div class="hero">
      <p class="tag section">Settings</p>
      <h1>Run<span><i> · </i>how it sounds and counts</span></h1>
    </div>
    <div class="panel">
      <p class="tag">Coach</p>
      <div class="cards" id="coaches">
        ${PERSONAS.map(
          (p) => `<button class="card tap${s.coach === p.id ? ' on' : ''}" data-coach="${p.id}">
            <b>${p.name}</b><span class="tag">${p.blurb}</span></button>`,
        ).join('')}
      </div>
      <label class="field"><span class="tag">Voice for ${personaById(s.coach).name}</span>
        <select class="dest" id="voice">
          <option value="">system default</option>
          ${voices
            .map(
              (v) =>
                `<option value="${v.voiceURI}"${s.voices[s.coach] === v.voiceURI ? ' selected' : ''}>${v.name}</option>`,
            )
            .join('')}
        </select></label>
    </div>
    <div class="panel">
      <p class="tag">Sound</p>
      <label class="sw tap"><input type="checkbox" id="setVoice" ${s.voice ? 'checked' : ''}><span>Spoken cues</span></label>
      <label class="sw tap"><input type="checkbox" id="setBeep" ${s.beep ? 'checked' : ''}><span>Beeps</span></label>
      <label class="sw tap"><input type="checkbox" id="setBeepsOnly" ${s.beepsOnly ? 'checked' : ''}><span>Beeps only — silence the voice, for running without headphones</span></label>
      <label class="sw tap"><input type="checkbox" id="setMetro" ${s.metronome ? 'checked' : ''}><span>Cadence clicks on rhythm runs</span></label>
    </div>
    <div class="panel">
      <p class="tag">Distance</p>
      <label class="sw tap"><input type="checkbox" id="setGps" ${s.gps ? 'checked' : ''}><span>Track my route — the phone asks for location the first time; nothing leaves the device</span></label>
      <label class="sw tap"><input type="checkbox" id="setTread" ${s.treadmill ? 'checked' : ''}><span>Treadmill mode — skip GPS, ask for distance at the end</span></label>
      <div class="chips" id="units">
        ${(['mi', 'km'] as const)
          .map((u) => `<button class="chip tap${s.units === u ? ' on' : ''}" data-unit="${u}">${u}</button>`)
          .join('')}
      </div>
    </div>
    <div class="panel">
      <p class="tag">Run days</p>
      <div class="chips" id="days">
        ${DAY_NAMES.map(
          (d, i) => `<button class="chip tap${s.reminder.days.includes(i) ? ' on' : ''}" data-day="${i}">${d}</button>`,
        ).join('')}
      </div>
      <label class="field row"><span>Time</span>
        <input class="num" id="time" type="time" value="${s.reminder.time}"></label>
      <p class="line sub">Next run: ${nextRunDay(s.reminder).toLocaleString('en-US', {
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
      })}</p>
      <button class="link tap" id="ics">Add these to my calendar (.ics)</button>
    </div>
    <div class="panel">
      <p class="tag">Look</p>
      <div class="chips" id="theme">
        ${(['auto', 'dark', 'light'] as const)
          .map((t) => `<button class="chip tap${s.theme === t ? ' on' : ''}" data-theme="${t}">${t}</button>`)
          .join('')}
      </div>
    </div>
    <div class="panel">
      <p class="tag">Tab bar order</p>
      <ol class="taborder" id="taborder">
        ${tabOrder()
          .map((t) => {
            const l = LINKS.find((x) => x.id === t)!;
            return `<li class="taborder-row" data-t="${t}">
              <span class="grip" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg></span>
              ${ICONS[t]}<b>${l.label}</b>
              <button class="link tap" data-move="-1" aria-label="Move ${l.label} up">↑</button>
              <button class="link tap" data-move="1" aria-label="Move ${l.label} down">↓</button>
            </li>`;
          })
          .join('')}
      </ol>
      <p class="line sub">Drag to reorder. The first ${BAR_SLOTS} sit in the bar with More as the fifth slot;
        the rest live behind More, Water always first.</p>
    </div>
    <div class="panel">
      <p class="tag">Data</p>
      <div class="chips">
        <button class="chip tap" id="export">Export everything</button>
        <label class="chip tap">Import<input type="file" id="import" accept="application/json" hidden></label>
        <button class="chip tap" id="reset">Reset the programme</button>
      </div>
      <p class="line sub">Credits: Earth imagery from NASA Visible Earth (Blue Marble and Black Marble,
        public domain). Satellite map tiles © Esri and its contributors. Nutrition data from USDA
        FoodData Central. Everything else is ours.</p>
    </div>`,
  );

  const toggle = (id: string, key: keyof typeof s): void => {
    root.querySelector(`#${id}`)!.addEventListener('change', (ev) => {
      setSettings({ [key]: (ev.target as HTMLInputElement).checked } as never);
    });
  };
  toggle('setVoice', 'voice');
  toggle('setBeep', 'beep');
  toggle('setBeepsOnly', 'beepsOnly');
  toggle('setMetro', 'metronome');
  toggle('setGps', 'gps');
  toggle('setTread', 'treadmill');

  root.querySelector('#coaches')!.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-coach]');
    if (!card) return;
    setSettings({ coach: card.dataset.coach! });
    runSettingsView(root);
    toast(`${personaById(card.dataset.coach!).name} is your coach`);
  });
  root.querySelector('#voice')!.addEventListener('change', (ev) => {
    const next = load();
    next.settings.voices[next.settings.coach] = (ev.target as HTMLSelectElement).value;
    save(next);
  });
  root.querySelector('#units')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-unit]');
    if (!chip) return;
    setSettings({ units: chip.dataset.unit as 'mi' | 'km' });
    runSettingsView(root);
  });
  root.querySelector('#theme')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-theme]');
    if (!chip) return;
    setSettings({ theme: chip.dataset.theme as 'auto' | 'dark' | 'light' });
    applyTheme();
    runSettingsView(root);
  });
  root.querySelector('#days')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-day]');
    if (!chip) return;
    const day = Number(chip.dataset.day);
    const next = load();
    const days = next.settings.reminder.days.includes(day)
      ? next.settings.reminder.days.filter((d) => d !== day)
      : [...next.settings.reminder.days, day].sort();
    next.settings.reminder.days = days;
    save(next);
    runSettingsView(root);
  });
  root.querySelector('#time')!.addEventListener('change', (ev) => {
    const next = load();
    next.settings.reminder.time = (ev.target as HTMLInputElement).value;
    save(next);
    runSettingsView(root);
  });
  root.querySelector('#ics')!.addEventListener('click', () => {
    downloadIcs('milo-runs', buildIcs('Milo run', load().settings.reminder));
    toast('Calendar file saved');
  });
  bindTabOrder(root);
  root.querySelector('#export')!.addEventListener('click', exportFile);
  root.querySelector('#import')!.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file && (await importFile(file))) {
      runSettingsView(root);
      toast('Imported');
    }
  });
  root.querySelector('#reset')!.addEventListener('click', () => {
    const host = sheet(
      'Reset the programme',
      `<p class="line">This clears your runs and starts week one again. Lifting, focus and the rest stay as they are.</p>
       <div class="row-actions"><button class="big tap" data-done="1" id="really">YES, RESET</button></div>`,
    );
    host.querySelector('#really')!.addEventListener('click', () => {
      const next = load();
      next.completedRuns = [];
      next.flags = {};
      save(next);
      location.hash = '#/';
      toast('Programme reset');
    });
  });
  return () => {};
}

/** drag a row by its grip, or nudge it with the arrows; the bar follows at once */
function bindTabOrder(root: HTMLElement): void {
  const list = root.querySelector<HTMLOListElement>('#taborder');
  if (!list) return;
  const commit = (): void => {
    setTabOrder([...list.querySelectorAll<HTMLElement>('[data-t]')].map((row) => row.dataset.t as Tab));
  };
  list.addEventListener('click', (ev) => {
    const button = (ev.target as HTMLElement).closest<HTMLElement>('[data-move]');
    if (!button) return;
    const row = button.closest<HTMLElement>('[data-t]')!;
    if (button.dataset.move === '-1' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
    if (button.dataset.move === '1' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    commit();
    (row.querySelector(`[data-move="${button.dataset.move}"]`) as HTMLElement | null)?.focus();
  });
  let dragging: HTMLElement | null = null;
  list.addEventListener('pointerdown', (ev) => {
    const grip = (ev.target as HTMLElement).closest('.grip');
    if (!grip) return;
    dragging = grip.closest<HTMLElement>('[data-t]');
    dragging?.classList.add('dragging');
    list.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  list.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    for (const row of list.querySelectorAll<HTMLElement>('[data-t]')) {
      if (row === dragging) continue;
      const box = row.getBoundingClientRect();
      if (ev.clientY > box.top && ev.clientY < box.bottom) {
        const after = ev.clientY > box.top + box.height / 2;
        list.insertBefore(dragging, after ? row.nextElementSibling : row);
        break;
      }
    }
  });
  const drop = (): void => {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    dragging = null;
    commit();
  };
  list.addEventListener('pointerup', drop);
  list.addEventListener('pointercancel', drop);
}
