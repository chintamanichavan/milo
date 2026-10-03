import { closeSheet, sheet } from '../../ui/sheet';
import { toast } from '../../ui/toast';
import { numbers, seq, wideW } from '../charts';
import { cancelImport, clearJob, currentJob, onJob, startImport, type Job } from '../ingest/client';
import { coverage, COVER, deleteAllHealth, setHealthSettings, type Cover } from '../store';
import type { View } from './pages';
import { int, monthLabel, shell } from './shell';

/** the names people know these by */
const COUNT_NAMES: Record<string, string> = {
  heartRate: 'heart rate',
  steps: 'steps',
  distKm: 'distance',
  active: 'move energy',
  basal: 'resting energy',
  exMin: 'exercise',
  stand: 'stand hours',
  flights: 'flights',
  hrv: 'HRV',
  rhr: 'resting HR',
  resp: 'breathing rate',
  spo2: 'blood oxygen',
  temp: 'wrist temp',
  vo2: 'VO2 max',
  walkHr: 'walking HR',
  walkSpeed: 'walking speed',
  sleep: 'sleep',
  cycle: 'cycling distance',
  rings: 'ring days',
  workouts: 'workouts',
};

const COVER_NAMES: Record<Cover, string> = {
  sleep: 'Sleep',
  hrv: 'HRV',
  rhr: 'Resting HR',
  resp: 'Breathing',
  spo2: 'Blood O₂',
  temp: 'Wrist temp',
  vo2: 'VO2 max',
  rings: 'Rings',
  steps: 'Steps',
  workouts: 'Workouts',
};

const mb = (bytes: number): string => (bytes / 1048576).toFixed(1);

function progressHtml(job: Job | null): string {
  if (!job) return '';
  const p = job.progress;
  if (job.state === 'reading') {
    const frac = p ? p.read / Math.max(1, p.total) : 0;
    const counts = p
      ? Object.entries(p.counts)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `<span class="hl-count"><b class="mono">${int(v)}</b> ${COUNT_NAMES[k] ?? k}</span>`)
          .join('')
      : '';
    return `<div class="hl-prog" role="status" aria-live="polite">
      <p class="tag">${p?.phase === 'sorting' ? 'Sorting into workouts' : 'Reading'}<span>${job.file.name}</span></p>
      <div class="hl-meter"><i style="width:${(frac * 100).toFixed(1)}%"></i></div>
      <p class="line mono hl-prog-nums">${p ? `${mb(p.read)} of ${mb(p.total)} MB read · ${mb(p.xml)} MB of XML · ${int(p.records)} records` : 'Starting…'}</p>
      <div class="hl-counts">${counts}</div>
      <button class="chip tap" id="cancelImport">Cancel</button>
    </div>`;
  }
  if (job.state === 'saving') return `<div class="hl-prog" role="status"><p class="tag">Saving</p><p class="line sub">Putting it away on this phone…</p></div>`;
  if (job.state === 'done' && job.log) {
    const l = job.log;
    return `<div class="hl-prog done" role="status">
      <p class="tag">Done<span>${((job.wall ?? l.ms) / 1000).toFixed(1)} s</span></p>
      <p class="line">${int(l.days)} days and ${int(l.workouts)} workouts read from ${int(l.records)} records${
        l.added ? `; ${int(l.added)} of those days are new here.` : '. Nothing new — everything was already here.'
      }</p>
      <div class="chips"><a class="chip tap on" href="#/health">See today</a><button class="chip tap" id="clearJob">Done</button></div>
    </div>`;
  }
  if (job.state === 'error')
    return `<div class="hl-prog" role="status"><p class="tag">That did not work</p><p class="line sub">${job.error ?? ''}</p>
      <button class="chip tap" id="clearJob">Try another file</button></div>`;
  return `<div class="hl-prog" role="status"><p class="tag">Stopped</p><p class="line sub">Nothing was saved.</p>
    <button class="chip tap" id="clearJob">OK</button></div>`;
}

function coverageStrip(byMonth: Record<string, Partial<Record<Cover, number>>>): string {
  const months = Object.keys(byMonth).sort().slice(-36);
  if (!months.length) return '<p class="line sub">Coverage shows once something is imported.</p>';
  const W = wideW();
  const left = 66;
  const rowH = 14;
  const top = 4;
  const h = top + COVER.length * rowH + 18;
  const cw = (W - left - 4) / months.length;
  const daysIn = (ym: string): number => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const step = (frac: number): number => (frac >= 0.95 ? 4 : frac >= 0.7 ? 3 : frac >= 0.4 ? 2 : frac >= 0.15 ? 1 : 0);
  const cells = months
    .map((ym, i) =>
      COVER.map((c, r) => {
        const n = byMonth[ym][c] ?? 0;
        if (!n) return '';
        return `<rect x="${(left + i * cw + 1).toFixed(1)}" y="${top + r * rowH + 1}" width="${Math.max(1, cw - 2).toFixed(1)}" height="${rowH - 2}" rx="1" fill="${seq(step(n / daysIn(ym)))}"/>`;
      }).join(''),
    )
    .join('');
  const names = COVER.map(
    (c, r) => `<text class="hc-t" x="${left - 6}" y="${top + r * rowH + rowH / 2 + 3.5}" text-anchor="end">${COVER_NAMES[c]}</text>`,
  ).join('');
  const every = Math.ceil(months.length / 4);
  const ticks = months
    .map((ym, i) =>
      i % every === 0 || i === months.length - 1
        ? `<text class="hc-t" x="${(left + i * cw + cw / 2).toFixed(1)}" y="${h - 4}" text-anchor="middle">${monthLabel(ym)}</text>`
        : '',
    )
    .join('');
  const tips = months.map(
    (ym) => `${monthLabel(ym, true)}\n${COVER.map((c) => `${COVER_NAMES[c]} ${byMonth[ym][c] ?? 0}`).join(' · ')}`,
  );
  return `<figure class="hc" data-x0="${(left + cw / 2).toFixed(2)}" data-step="${cw.toFixed(3)}" data-n="${months.length}"
      data-tips="${JSON.stringify(tips).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
    <svg class="hc-svg" viewBox="0 0 ${W} ${h}" role="img" aria-label="Which months have which kinds of data">
      ${names}${cells}${ticks}
      <line class="hc-x" x1="0" x2="0" y1="${top}" y2="${top + COVER.length * rowH}"/>
    </svg>
    <div class="hc-tip" aria-hidden="true"></div>
    <figcaption class="hc-cap">Days with each kind of data, by month. Deeper is fuller.</figcaption>
    ${numbers(['month', ...COVER.map((c) => COVER_NAMES[c])], months.map((ym) => [monthLabel(ym), ...COVER.map((c) => byMonth[ym][c] ?? 0)]))}
  </figure>`;
}

export const dataView: View = (root, ctx, _arg, again) => {
  const { data, meta } = ctx;
  const cov = coverage(data.days, data.workouts);
  const job = currentJob();
  const set = meta.settings;
  const exportYear = meta.me.birth?.slice(0, 4);

  root.innerHTML = shell(
    'data',
    `<div class="hero">
      <p class="tag section">Health · data</p>
      <h1>${data.days.length ? `${int(data.days.length)} days<span><i> · </i>${int(data.workouts.length)} workouts</span>` : 'Bring it in'}</h1>
      <p class="line sub">${
        meta.lastImport
          ? `Last import ${new Date(meta.lastImport).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}. A newer export only tops up what is here.`
          : 'Your Apple Health export, read on this phone. Nothing leaves it.'
      }</p>
    </div>
    <div class="hl-cols">
      <div class="panel hl-upload">
        <p class="tag">Import</p>
        <label class="hl-drop tap" id="drop">
          <input type="file" id="file" accept=".zip,.xml,application/zip,text/xml,application/xml" hidden>
          <b>Choose export.zip or export.xml</b>
          <span class="sub">or drop it here</span>
        </label>
        <div id="prog">${progressHtml(job)}</div>
        <p class="line sub">On your iPhone: Health → your picture → Export All Health Data → Save to Files. A big export can take a
          minute or two; it is read in pieces, so even a 300 MB file is fine.</p>
      </div>
      <div class="panel">
        <p class="tag">Import history<span>${meta.history.length}</span></p>
        ${
          meta.history.length
            ? `<div class="hl-rows">${meta.history
                .map(
                  (l) => `<div class="hl-row"><span>${new Date(l.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <small class="sub">${l.file} · ${l.mb} MB · ${(l.ms / 1000).toFixed(1)} s</small></span>
                    <span class="mono">${int(l.days)} d · ${int(l.workouts)} w${l.added ? ` · +${int(l.added)}` : ''}</span></div>`,
                )
                .join('')}</div>`
            : '<p class="line sub">No imports yet.</p>'
        }
      </div>
      <div class="panel hl-wide">
        <p class="tag">Coverage<span>${Object.keys(cov.coverage).length} months</span></p>
        ${coverageStrip(cov.coverage)}
      </div>
      <div class="panel">
        <p class="tag">What is stored</p>
        <div class="hl-rows">${COVER.map(
          (c) => `<div class="hl-row"><span>${COVER_NAMES[c]}</span><span class="mono">${int(cov.totals[c] ?? 0)} ${c === 'workouts' ? 'workouts' : 'days'}</span></div>`,
        ).join('')}</div>
        ${
          meta.history[0]
            ? `<p class="line sub">The last file held ${int(meta.history[0].records)} records; HEALTH keeps one row a day and one per workout.</p>`
            : ''
        }
      </div>
      <div class="panel">
        <p class="tag">You</p>
        <label class="field row"><span>Birth year</span><input class="num" id="birthYear" inputmode="numeric" placeholder="${exportYear ?? 'year'}" value="${set.birthYear ?? ''}"></label>
        <div class="field row"><span>Sex, for fitness norms</span><span class="chips hl-inline" id="sex">${(['male', 'female'] as const)
          .map((x) => `<button class="chip tap${ctx.s.sex === x ? ' on' : ''}" data-sex="${x}">${x}</button>`)
          .join('')}</span></div>
        <label class="field row"><span>Max heart rate</span><input class="num" id="maxHr" inputmode="numeric" placeholder="${220 - ctx.s.age}" value="${set.maxHr ?? ''}"></label>
        <label class="field row"><span>Sleep need, hours</span><input class="num" id="needH" inputmode="decimal" value="${set.needH}"></label>
        <p class="line sub">${
          ctx.ageKnown ? `Age ${ctx.s.age}${set.birthYear ? '' : ', from your export'}.` : 'No age yet, so 30 is a stand-in.'
        } Heart-rate zones use ${ctx.s.maxHr} bpm as the top${set.maxHr ? '' : ' (220 − age)'}.</p>
      </div>
      <div class="panel">
        <p class="tag">Backups</p>
        <p class="line sub">Milo's Export everything (Run → Settings) carries these settings and the import history, not the health
          data itself — that could be hundreds of megabytes. On a new phone, import the Apple Health zip again.</p>
      </div>
      <div class="panel">
        <p class="tag">Delete</p>
        <p class="line sub">Removes every day and workout HEALTH has stored on this phone. Your settings stay. Apple Health itself is not touched.</p>
        <button class="chip tap" id="deleteAll"${data.days.length || data.workouts.length ? '' : ' disabled'}>Delete all health data</button>
      </div>
      <div class="panel hl-wide">
        <p class="tag">What's not here</p>
        <p class="line sub">A web page cannot hear a watch live, so there is no live stress monitor, live strain or live heart rate —
          the scores here are worked out for each day after the fact. WHOOP's blood-pressure insights need its cuff and are not in
          an Apple export. Fitness+ workout videos, and the sharing, social feeds and competitions of both apps, run on their
          companies' servers.</p>
      </div>
    </div>`,
    'hl-page hl-data',
  );

  const prog = root.querySelector<HTMLElement>('#prog')!;
  let wasBusy = job?.state === 'reading' || job?.state === 'saving';
  const off = onJob(() => {
    const j = currentJob();
    const busy = j?.state === 'reading' || j?.state === 'saving';
    // a finished import changes everything on the page
    if (wasBusy && !busy && j?.state === 'done') {
      wasBusy = false;
      return again();
    }
    wasBusy = busy;
    prog.innerHTML = progressHtml(j);
  });

  const take = (file: File | undefined): void => {
    if (!file) return;
    if (!/\.(zip|xml)$/i.test(file.name)) return toast('That needs to be export.zip or export.xml');
    startImport(file);
  };
  const input = root.querySelector<HTMLInputElement>('#file')!;
  input.addEventListener('change', () => take(input.files?.[0]));
  const drop = root.querySelector<HTMLElement>('#drop')!;
  const section = root.firstElementChild as HTMLElement;
  const over = (ev: DragEvent): void => {
    ev.preventDefault();
    drop.classList.add('over');
  };
  const leave = (): void => drop.classList.remove('over');
  const dropped = (ev: DragEvent): void => {
    ev.preventDefault();
    leave();
    take(ev.dataTransfer?.files?.[0]);
  };
  section.addEventListener('dragover', over);
  section.addEventListener('dragleave', leave);
  section.addEventListener('drop', dropped);

  root.addEventListener('click', onClick);
  function onClick(ev: Event): void {
    const t = ev.target as HTMLElement;
    if (t.closest('#cancelImport')) return cancelImport();
    if (t.closest('#clearJob')) return clearJob();
    const sex = t.closest<HTMLElement>('[data-sex]');
    if (sex) {
      setHealthSettings({ sex: sex.dataset.sex as 'male' | 'female' });
      return again();
    }
    if (t.closest('#deleteAll')) confirmDelete(again);
  }

  const num = (id: string, key: 'birthYear' | 'maxHr' | 'needH', lo: number, hi: number): void => {
    const el = root.querySelector<HTMLInputElement>(`#${id}`)!;
    el.addEventListener('change', () => {
      const v = Number(el.value);
      setHealthSettings({ [key]: el.value.trim() && v >= lo && v <= hi ? v : key === 'needH' ? 8 : undefined });
      again();
    });
  };
  num('birthYear', 'birthYear', 1900, new Date().getFullYear());
  num('maxHr', 'maxHr', 120, 230);
  num('needH', 'needH', 5, 11);

  return () => {
    off();
    root.removeEventListener('click', onClick);
  };
};

function confirmDelete(done: () => void): void {
  const host = sheet(
    'Delete all health data',
    `<p class="line">Every day and workout HEALTH has stored goes, along with the import history. Apple Health is not touched, and the
      export zip brings it all back.</p>
     <button class="big tap hl-danger" id="yesDelete">DELETE ALL</button>
     <button class="link tap" data-close-sheet="1">Keep it</button>`,
  );
  host.querySelector('[data-close-sheet]')!.addEventListener('click', () => closeSheet(host));
  host.querySelector('#yesDelete')!.addEventListener('click', async () => {
    await deleteAllHealth();
    closeSheet(host);
    toast('Health data deleted');
    done();
  });
}
