import { miloMark } from '../../badge';
import { now } from '../../clock';
import { dayKey } from '../../ui/time';
import { toast } from '../../ui/toast';
import { COOK, DAYS, KINDS, MAX, SYSTEMS, cleanTask, due, mondayOf, weekDates, weekday, type System } from '../model';
import { canTick, isTicked, loadWeek, logged, planFor, saveWeek, setPlan, toggle, weekScore } from '../store';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function subNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/week${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'This week')}${link('plan', 'Plan')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today week detail">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${subNav(active)}
    ${body}
  </section>`;

const box = (on: boolean): string => `<i class="wk-box${on ? ' on' : ''}" aria-hidden="true"></i>`;

/** what each system asks of today, in a line */
function taskLine(system: System, d: Date, workout: string, study: string): string {
  if (system === 'clean') return cleanTask(d) ?? 'Off today';
  if (system === 'cook') return COOK[weekday(d)] ?? 'No cooking today';
  return system === 'workout' ? workout : `Deep work, ${study}`;
}

export function weekView(root: HTMLElement): () => void {
  const paint = (): void => {
    const state = loadWeek();
    const logs = logged();
    const today = new Date(now());
    const key = dayKey(today);
    const day = weekday(today);
    const dates = weekDates(today);
    const keys = dates.map((d) => dayKey(d));
    const kind = KINDS.find((k) => k.id === planFor(state, today))!;
    const done = logs.get(key);
    const workout = done ? `${kind.line} · logged in ${done === 'run' ? 'Run' : 'Lift'}` : `${kind.line} · ${state.settings.workoutAt}`;
    const study = day < 5 ? state.settings.studyWeekday : state.settings.studyWeekend;
    const lastMonday = new Date(mondayOf(today).getTime() - 7 * 86_400_000);
    const lastFix = state.reviews[dayKey(lastMonday)]?.fix;
    const review = state.reviews[keys[0]] ?? { slipped: '', fix: '' };
    const got = weekScore(state, logs, today);

    const rows = SYSTEMS.filter((s) => due(s.id, day))
      .map((s) => {
        const on = isTicked(state, logs, key, s.id);
        const auto = s.id === 'workout' && !!done;
        const go =
          s.id === 'workout' && !done && (kind.id === 'run' || kind.id === 'lift')
            ? `<a class="link tap" href="${kind.id === 'run' ? '#/' : '#/lift'}">Open ${kind.label}</a>`
            : '';
        const topic =
          s.id === 'study'
            ? `<input class="num wk-topic" id="topic" type="text" placeholder="Topic" maxlength="60" value="${esc(state.topics[key] ?? '')}">`
            : '';
        return `<li class="wk-row">
          <button class="wk-tick tap" data-sys="${s.id}"${auto ? ' disabled' : ''} aria-pressed="${on}"
            aria-label="${s.label}">${box(on)}</button>
          <div><b>${s.label}</b><p class="sub">${esc(taskLine(s.id, today, workout, study))}</p>${topic}</div>
          ${go}
        </li>`;
      })
      .join('');

    const grid = SYSTEMS.map(
      (s) => `<span class="wk-name">${s.label}</span>${dates
        .map((d, i) => {
          if (!due(s.id, i)) return `<span class="wk-cell off">–</span>`;
          const on = isTicked(state, logs, keys[i], s.id);
          const open = canTick(d, today) && !(s.id === 'workout' && logs.has(keys[i]));
          return `<button class="wk-cell tap${i === day ? ' now' : ''}" data-sys="${s.id}" data-day="${keys[i]}"
            ${open ? '' : 'disabled'} aria-label="${s.label} ${DAYS[i]}">${box(on)}</button>`;
        })
        .join('')}`,
    ).join('');

    root.innerHTML = shell(
      '',
      `<div class="hero">
        <p class="tag section">Week of ${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${got} of ${MAX}</p>
        <h1>${today.toLocaleDateString('en-US', { weekday: 'long' })}</h1>
        ${lastFix ? `<p class="line sub">Last week's fix: ${esc(lastFix)}</p>` : ''}
        <ul class="wk-today">${rows}</ul>
      </div>
      <div class="panel">
        <p class="tag">The page</p>
        <div class="wk-grid" id="grid">
          <span></span>${DAYS.map((d, i) => `<span class="wk-day${i === day ? ' now' : ''}">${d}</span>`).join('')}
          ${grid}
        </div>
        <p class="line sub">Missed a day? Skip it. It comes round next week. Never double up.</p>
      </div>
      <div class="panel">
        <p class="tag">Sunday review · ${got}/${MAX}</p>
        <label class="field"><span class="sub">What slipped</span>
          <input class="num wk-topic" id="slipped" type="text" maxlength="80" value="${esc(review.slipped)}"></label>
        <label class="field"><span class="sub">One fix for next week</span>
          <input class="num wk-topic" id="fix" type="text" maxlength="80" value="${esc(review.fix)}"></label>
      </div>`,
    );

    const tick = (ev: Event): void => {
      const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-sys]');
      if (!el || el.disabled) return;
      toggle(loadWeek(), el.dataset.day ?? key, el.dataset.sys as System);
      paint();
    };
    root.querySelector('.wk-today')!.addEventListener('click', tick);
    root.querySelector('#grid')!.addEventListener('click', tick);
    root.querySelector('#topic')?.addEventListener('change', (ev) => {
      const s = loadWeek();
      const v = (ev.target as HTMLInputElement).value.trim();
      if (v) s.topics[key] = v;
      else delete s.topics[key];
      saveWeek(s);
    });
    for (const id of ['slipped', 'fix'] as const)
      root.querySelector(`#${id}`)!.addEventListener('change', (ev) => {
        const s = loadWeek();
        s.reviews[keys[0]] = { ...(s.reviews[keys[0]] ?? { slipped: '', fix: '' }), [id]: (ev.target as HTMLInputElement).value.trim() };
        saveWeek(s);
      });
  };
  paint();
  return () => {};
}

export function weekPlanView(root: HTMLElement): void {
  const state = loadWeek();
  const s = state.settings;
  root.innerHTML = shell(
    'plan',
    `<div class="panel">
      <p class="tag">Workout, day by day</p>
      <div class="wk-plan" id="plan">${DAYS.map(
        (d, i) => `<span class="wk-name">${d}</span><div class="chips">${KINDS.map(
          (k) => `<button class="chip tap${state.plan[i] === k.id ? ' on' : ''}" data-day="${i}" data-kind="${k.id}">${k.label}</button>`,
        ).join('')}</div>`,
      ).join('')}</div>
      <p class="line sub">Run days here set Run's reminder days too. A run or lift logged in Milo ticks Workout on its own; a 15-minute walk still earns the tick by hand.</p>
    </div>
    <div class="panel">
      <p class="tag">Times</p>
      <label class="field row"><span>Workout</span><input class="num wk-span" id="workoutAt" type="time" value="${s.workoutAt}"></label>
      <label class="field row"><span>Study, weekdays</span><input class="num wk-span" id="studyWeekday" type="text" value="${esc(s.studyWeekday)}"></label>
      <label class="field row"><span>Study, weekends</span><input class="num wk-span" id="studyWeekend" type="text" value="${esc(s.studyWeekend)}"></label>
    </div>`,
  );
  root.querySelector('#plan')!.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-kind]');
    if (!el) return;
    const next = loadWeek();
    setPlan(next, Number(el.dataset.day), el.dataset.kind as (typeof KINDS)[number]['id']);
    if (!next.plan.includes('run')) toast('No run days: Run keeps its old reminder days.');
    weekPlanView(root);
  });
  for (const id of ['workoutAt', 'studyWeekday', 'studyWeekend'] as const)
    root.querySelector(`#${id}`)!.addEventListener('change', (ev) => {
      const next = loadWeek();
      next.settings[id] = (ev.target as HTMLInputElement).value.trim();
      saveWeek(next);
    });
}
