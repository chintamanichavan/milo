import { miloMark } from '../../badge';
import { buildIcs, downloadIcs } from '../../run/ics';
import { barList } from '../../ui/chart';
import { sheet } from '../../ui/sheet';
import { dayKey } from '../../ui/time';
import { toast } from '../../ui/toast';
import { lessonForToday, LESSONS } from '../lessons';
import {
  INVERSIONS,
  LAWS,
  TEMPLATES,
  type Habit,
  type Mark,
  type TimeOfDay,
} from '../model';
import { atomSvg } from '../atom';
import {
  awaitFocus,
  bestStreak,
  bump,
  coachTips,
  cleanDays,
  consistency,
  deleteHabit,
  dotGrid,
  entryFor,
  identities,
  loadHabits,
  mark,
  missState,
  monthSummary,
  moveHabit,
  readLesson,
  saveHabit,
  saveReflection,
  streak,
  targetOf,
  todaysHabits,
  unmark,
  votes,
  votesForIdentity,
  weekdayPattern,
} from '../store';

const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];

export function habitsSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/habits${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('new', 'Add')}${link(
    'lessons',
    'Lessons',
  )}${link('reflect', 'Reflect')}${link('manage', 'Manage')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today habits detail">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${habitsSubNav(active)}
    ${body}
  </section>`;

/** the count ring on a numeric habit */
function countRing(count: number, target: number): string {
  const c = 2 * Math.PI * 22;
  const t = Math.min(1, count / target);
  return `<svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true">
    <circle class="goal-bg" cx="26" cy="26" r="22" fill="none" stroke-width="4"/>
    <circle class="goal-fg" cx="26" cy="26" r="22" fill="none" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - t)).toFixed(1)}"/>
  </svg>`;
}

const intention = (h: Habit): string =>
  h.anchor
    ? `After I ${h.anchor}, I will ${h.behaviour}.`
    : `I will ${h.behaviour} at ${h.time} in ${h.place}.`;

/* ---------- 61 + 68. the day ---------- */

export function habitsTodayView(root: HTMLElement): () => void {
  const state = loadHabits();
  const today = todaysHabits(state);
  const lesson = lessonForToday(state.readLessons.length);
  const isSunday = new Date().getDay() === 0;

  const row = (h: Habit): string => {
    const entry = entryFor(state, h.id);
    const missed = missState(state, h);
    const target = targetOf(h);
    const count = entry?.count ?? (entry?.mark === 'done' ? target : 0);
    const marked = entry && entry.mark !== 'partial';
    return `<div class="habit-row${marked ? ` marked ${entry.mark}` : entry ? ' partial' : ''}" data-habit="${h.id}">
      <button class="habit-main tap" data-do="${h.id}">
        <b>${h.avoid ? `Not ${h.behaviour}` : h.behaviour}</b>
        <span class="tag">${h.avoid ? `${cleanDays(state, h)} clean days` : `a vote for ${h.identity}`}${
          streak(state, h) ? ` · ${streak(state, h)}-day streak` : ''
        }</span>
        ${entry && entry.mark !== 'partial' ? `<span class="tag done-tag">${entry.mark === 'tiny' ? 'tiny version' : entry.mark}</span>` : ''}
      </button>
      <div class="habit-side">
        ${
          target > 1 && !h.avoid
            ? `<button class="habit-count tap" data-bump="${h.id}" aria-label="${count} of ${target} ${h.unit ?? ''}, add one">${countRing(count, target)}<b>${count}/${target}</b></button>
               <button class="link tap" data-less="${h.id}" aria-label="one fewer"${count ? '' : ' disabled'}>−</button>`
            : ''
        }
        ${h.focusMin && !h.avoid ? `<button class="link tap" data-focus="${h.id}">focus ${h.focusMin}′</button>` : ''}
        ${
          h.avoid
            ? `<button class="link tap" data-slip="${h.id}">slipped</button>`
            : `<button class="link tap" data-tiny="${h.id}">tiny</button>
               <button class="link tap" data-skip="${h.id}">skip</button>`
        }
      </div>
      ${
        missed === 1
          ? '<p class="line sub amber">Missed yesterday — back on track today?</p>'
          : missed === 2
            ? `<p class="line sub amber">Two missed. You are still ${h.identity}; today is the vote that says so.</p>`
            : ''
      }
    </div>`;
  };

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section">Habits · ${today.length} today</p>
      <h1>${state.habits.length ? 'Who are you' : 'Start with who'}<span><i> · </i>${
        state.habits.length ? 'today?' : 'you want to be'
      }</span></h1>
      ${
        identities(state).length
          ? `<div class="atoms">${identities(state)
              .map((id) => {
                const mine = state.habits.filter((h) => h.identity === id && !h.archived);
                const steady = mine.length
                  ? mine.reduce((sum, h) => sum + consistency(state, h, 30), 0) / mine.length
                  : 0;
                const n = votesForIdentity(state, id, 3650);
                return `<div class="atom-id">${atomSvg(n, steady, 72, `${id}: ${n} votes`)}<b>${n} votes</b><span>${id}</span></div>`;
              })
              .join('')}</div>`
          : '<p class="line">A habit is a vote for the person you want to be. Add one and start voting.</p>'
      }
      ${state.habits.length ? '' : '<a class="big tap" href="#/habits/new">ADD A HABIT</a>'}
    </div>
    ${TIMES.map((slot) => {
      const rows = today.filter((h) => h.timeOfDay === slot);
      return rows.length
        ? `<div class="panel"><p class="tag">${slot}</p>${rows.map(row).join('')}</div>`
        : '';
    }).join('')}
    ${(() => {
      const tips = coachTips(state, 2);
      return tips.length
        ? `<div class="panel coach"><p class="tag">Coach<span>from the last two weeks</span></p>${tips
            .map((t) => `<a class="coach-tip tap" href="#/habits/habit/${t.habitId}"><b>${t.title}</b><span class="line sub">${t.why}</span></a>`)
            .join('')}</div>`
        : '';
    })()}
    <a class="panel lesson tap" href="#/habits/lessons">
      <p class="tag">Today's lesson${state.readLessons.includes(lesson.id) ? ' · read' : ''}</p>
      <b>${lesson.title}</b>
      <span class="line sub">${lesson.body.slice(0, 120)}…</span>
    </a>
    ${
      isSunday
        ? `<a class="panel tap" href="#/habits/reflect"><p class="tag">Sunday</p>
           <b>Five minutes of looking back</b>
           <span class="line sub">What went well, what got in the way, what to shrink.</span></a>`
        : ''
    }
    <p class="line sub">${monthSummary(state)}</p>`,
  );

  root.firstElementChild!.addEventListener('click', (ev) => {
    const el = ev.target as HTMLElement;
    const pick = (key: string): string | null =>
      el.closest<HTMLElement>(`[data-${key}]`)?.dataset[key] ?? null;
    const done = pick('do');
    const more = pick('bump');
    const less = pick('less');
    const focus = pick('focus');
    const tiny = pick('tiny');
    const skip = pick('skip');
    const slip = pick('slip');
    const numeric = done && targetOf(state.habits.find((h) => h.id === done)!) > 1 ? done : null;
    if (more || numeric) {
      const id = (more ?? numeric)!;
      const habit = state.habits.find((h) => h.id === id)!;
      const { count, target } = bump(id);
      if (count === target) toast(`A vote for ${habit.identity}`, true);
      else toast(`${count} of ${target}${habit.unit ? ` ${habit.unit}` : ''}`);
      return habitsTodayView(root);
    }
    if (less) {
      bump(less, -1);
      return habitsTodayView(root);
    }
    if (focus) {
      const habit = state.habits.find((h) => h.id === focus)!;
      awaitFocus(habit.id);
      location.hash = `#/focus/flight/${habit.focusMin}/${encodeURIComponent(habit.behaviour)}`;
      return;
    }
    if (done) {
      const existing = entryFor(loadHabits(), done);
      if (existing) unmark(done);
      else {
        mark(done, 'done');
        const habit = state.habits.find((h) => h.id === done)!;
        toast(`A vote for ${habit.identity}`, true);
      }
      return habitsTodayView(root);
    }
    if (tiny) {
      mark(tiny, 'tiny');
      toast('Counts. Tiny counts.');
      return habitsTodayView(root);
    }
    if (slip) {
      mark(slip, 'slip');
      toast('Logged, no drama');
      return habitsTodayView(root);
    }
    if (skip) {
      const host = sheet(
        'Skip today',
        `<div class="chips" id="reasons">
          ${['sick', 'travelling', 'rest day', 'other']
            .map((r) => `<button class="chip tap" data-done="1" data-reason="${r}">${r}</button>`)
            .join('')}
         </div>
         <p class="line sub">A skip with a reason does not break the streak.</p>`,
      );
      host.querySelector('#reasons')!.addEventListener('click', (e2) => {
        const chip = (e2.target as HTMLElement).closest<HTMLElement>('[data-reason]');
        if (!chip) return;
        mark(skip, 'skip', dayKey(), { reason: chip.dataset.reason });
        habitsTodayView(root);
      });
    }
  });
  return () => {};
}

/* ---------- 60. the identity-first flow ---------- */

export function habitNewView(root: HTMLElement, editId?: string): () => void {
  const state = loadHabits();
  const existing = editId ? state.habits.find((h) => h.id === editId) : undefined;
  const draft: Habit = existing ?? {
    id: `h-${Date.now()}`,
    identity: '',
    behaviour: '',
    time: '08:00',
    place: '',
    tiny: '',
    schedule: { kind: 'daily' },
    timeOfDay: 'morning',
    order: state.habits.length,
  };
  let step = existing ? 6 : 1;

  const draw = (): void => {
    const steps: Record<number, string> = {
      1: `<p class="tag section">Step one</p>
          <h1>Who do you<span><i> · </i>want to become?</span></h1>
          <p class="line">Not what you want to achieve — who you want to be. "A runner." "A calm, focused scientist."</p>
          <input class="dest big-input" id="identity" value="${draft.identity}" placeholder="a runner">
          <p class="line sub">Every time you do this, you will be casting a vote for that person.</p>`,
      2: `<p class="tag section">Step two</p>
          <h1>I will…<span><i> · </i>what, when, where</span></h1>
          <input class="dest" id="behaviour" value="${draft.behaviour}" placeholder="run for twenty minutes">
          <div class="field row"><span>at</span><input class="num" id="time" type="time" value="${draft.time}"></div>
          <input class="dest" id="place" value="${draft.place}" placeholder="in the park">
          <p class="line sub">Naming the time and the place is most of the battle.</p>`,
      3: `<p class="tag section">Step three</p>
          <h1>Stack it<span><i> · </i>on something solid</span></h1>
          <p class="line">A habit you already have is the most reliable reminder there is.</p>
          <input class="dest" id="anchor" value="${draft.anchor ?? ''}" placeholder="make the morning coffee">
          <p class="line sub">After I [that], I will ${draft.behaviour || '[this]'}. Leave it empty if you would rather use the clock.</p>
          ${
            state.habits.length
              ? `<div class="chips">${state.habits
                  .slice(0, 6)
                  .map((h) => `<button class="chip tap" data-anchor="${h.behaviour}">${h.behaviour}</button>`)
                  .join('')}</div>`
              : ''
          }`,
      4: `<p class="tag section">Step four</p>
          <h1>The two-minute<span><i> · </i>version</span></h1>
          <p class="line">What is the smallest version that still counts on a terrible day?</p>
          <input class="dest" id="tiny" value="${draft.tiny}" placeholder="put my running shoes on">
          <p class="line sub">This is not a cop-out. It is the habit, kept alive.</p>`,
      5: `<p class="tag section">Step five</p>
          <h1>How often<span><i> · </i>and when in the day</span></h1>
          <div class="chips" id="sched">
            <button class="chip tap${draft.schedule.kind === 'daily' ? ' on' : ''}" data-sched="daily">daily</button>
            <button class="chip tap${draft.schedule.kind === 'days' ? ' on' : ''}" data-sched="days">certain days</button>
            <button class="chip tap${draft.schedule.kind === 'times' ? ' on' : ''}" data-sched="times">n times a week</button>
          </div>
          ${
            draft.schedule.kind === 'days'
              ? `<div class="chips" id="days">${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                  .map(
                    (d, i) =>
                      `<button class="chip tap${
                        (draft.schedule as { days: number[] }).days?.includes(i) ? ' on' : ''
                      }" data-day="${i}">${d}</button>`,
                  )
                  .join('')}</div>`
              : ''
          }
          ${
            draft.schedule.kind === 'times'
              ? `<label class="field row"><span>Times a week</span>
                  <input class="num" id="perWeek" value="${(draft.schedule as { perWeek: number }).perWeek ?? 3}"></label>`
              : ''
          }
          <label class="field row"><span>Times a day</span>
            <input class="num" id="target" inputmode="numeric" value="${draft.target ?? 1}"></label>
          <input class="dest" id="unit" value="${draft.unit ?? ''}" placeholder="what you count — glasses, pages, sets (optional)">
          <div class="chips" id="tod">
            ${TIMES.map(
              (t) => `<button class="chip tap${draft.timeOfDay === t ? ' on' : ''}" data-tod="${t}">${t}</button>`,
            ).join('')}
          </div>`,
      6: `<p class="tag section">${existing ? 'Edit' : 'Last bit'}</p>
          <h1>${draft.behaviour || 'Your habit'}</h1>
          <p class="line">${intention(draft)}</p>
          <p class="line sub">Tiny version: ${draft.tiny || '—'}</p>
          <details class="watch"><summary><span class="tap">the four laws, optional</span></summary>
            <div>
              ${LAWS.map(
                (law) => `<label class="field"><span class="tag">${law.name} — ${law.line}</span>
                  <input class="dest" data-law="${law.key}" value="${draft.laws?.[law.key] ?? ''}"></label>`,
              ).join('')}
            </div>
          </details>
          <label class="sw tap"><input type="checkbox" id="avoid" ${draft.avoid ? 'checked' : ''}>
            <span>This is a habit I am quitting</span></label>
          ${
            draft.avoid
              ? `<label class="field"><span class="tag">Make it harder</span>
                  <select class="dest" id="inv">${INVERSIONS.map(
                    (i) => `<option${draft.inversion === i ? ' selected' : ''}>${i}</option>`,
                  ).join('')}</select></label>`
              : ''
          }
          <label class="field row"><span>Focus timer (minutes)</span>
            <input class="num" id="focusMin" inputmode="numeric" placeholder="none" value="${draft.focusMin ?? ''}"></label>
          <p class="line sub">With a timer, “focus” on the day's list takes off a Focus flight, and landing it counts as doing the habit.</p>
          <label class="field"><span class="tag">Remind me at</span>
            <input class="num" id="reminder" type="time" value="${draft.reminder ?? draft.time}"></label>
          <button class="big tap" id="save">${existing ? 'SAVE' : 'START VOTING'}</button>`,
    };
    root.innerHTML = shell(
      'new',
      `<div class="hero">${steps[step]}
        <div class="cook-nav wizard">
          ${step > 1 && !existing ? '<button class="chip tap" id="back">back</button>' : '<span></span>'}
          ${step < 6 ? '<button class="big tap" id="next">NEXT</button>' : ''}
        </div>
        ${
          existing
            ? ''
            : `<div class="dots">${[1, 2, 3, 4, 5, 6]
                .map((i) => `<i class="dot-step${i === step ? ' on' : ''}"></i>`)
                .join('')}</div>`
        }
      </div>
      ${
        step === 1
          ? `<div class="panel"><p class="tag">Or adopt one of these</p>
             <div class="cards">${TEMPLATES.slice(0, 12)
               .map(
                 (t, i) => `<button class="card tap" data-template="${i}">
                   <b>${t.behaviour}</b><span class="tag">${t.identity}</span></button>`,
               )
               .join('')}</div>
             <a class="link tap" href="#/habits/templates">see all thirty</a></div>`
          : ''
      }`,
    );
    wire();
  };

  const collect = (): void => {
    const value = (sel: string): string =>
      (root.querySelector(sel) as HTMLInputElement | null)?.value ?? '';
    if (step === 1) draft.identity = value('#identity').trim();
    if (step === 2) {
      draft.behaviour = value('#behaviour').trim();
      draft.time = value('#time') || draft.time;
      draft.place = value('#place').trim();
    }
    if (step === 3) draft.anchor = value('#anchor').trim() || undefined;
    if (step === 4) draft.tiny = value('#tiny').trim();
    if (step === 5 && draft.schedule.kind === 'times')
      draft.schedule = { kind: 'times', perWeek: Number(value('#perWeek')) || 3 };
    if (step === 5) {
      const target = Math.round(Number(value('#target')) || 1);
      draft.target = target > 1 ? Math.min(99, target) : undefined;
      draft.unit = value('#unit').trim() || undefined;
    }
    if (step === 6) {
      draft.reminder = value('#reminder') || undefined;
      const focusMin = Math.round(Number(value('#focusMin')) || 0);
      draft.focusMin = focusMin >= 5 ? Math.min(180, focusMin) : undefined;
      draft.laws = Object.fromEntries(
        [...root.querySelectorAll<HTMLInputElement>('[data-law]')].map((el) => [el.dataset.law, el.value.trim()]),
      );
      const inv = root.querySelector<HTMLSelectElement>('#inv');
      if (inv) draft.inversion = inv.value;
    }
  };

  const wire = (): void => {
    root.querySelector('#next')?.addEventListener('click', () => {
      collect();
      if (step === 1 && !draft.identity) return toast('Name who you are becoming');
      if (step === 2 && !draft.behaviour) return toast('What will you do?');
      step += 1;
      draw();
    });
    root.querySelector('#back')?.addEventListener('click', () => {
      collect();
      step -= 1;
      draw();
    });
    root.querySelector('#save')?.addEventListener('click', () => {
      collect();
      if (!draft.tiny) draft.tiny = draft.behaviour;
      saveHabit(draft);
      location.hash = '#/habits';
      toast('Habit added');
    });
    root.querySelector('#avoid')?.addEventListener('change', (ev) => {
      draft.avoid = (ev.target as HTMLInputElement).checked;
      draw();
    });
    root.querySelector('#sched')?.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-sched]');
      if (!chip) return;
      const kind = chip.dataset.sched;
      draft.schedule =
        kind === 'daily'
          ? { kind: 'daily' }
          : kind === 'days'
            ? { kind: 'days', days: [1, 3, 5] }
            : { kind: 'times', perWeek: 3 };
      draw();
    });
    root.querySelector('#days')?.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-day]');
      if (!chip || draft.schedule.kind !== 'days') return;
      const day = Number(chip.dataset.day);
      const days = draft.schedule.days.includes(day)
        ? draft.schedule.days.filter((d) => d !== day)
        : [...draft.schedule.days, day];
      draft.schedule = { kind: 'days', days };
      draw();
    });
    root.querySelector('#tod')?.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-tod]');
      if (!chip) return;
      draft.timeOfDay = chip.dataset.tod as TimeOfDay;
      draw();
    });
    root.querySelector('.hero')?.addEventListener('click', (ev) => {
      const anchor = (ev.target as HTMLElement).closest<HTMLElement>('[data-anchor]');
      if (!anchor) return;
      (root.querySelector('#anchor') as HTMLInputElement).value = anchor.dataset.anchor ?? '';
    });
    root.querySelector('.cards')?.addEventListener('click', (ev) => {
      const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-template]');
      if (!card) return;
      const t = TEMPLATES[Number(card.dataset.template)];
      Object.assign(draft, {
        identity: t.identity,
        behaviour: t.behaviour,
        time: t.time,
        place: t.place,
        tiny: t.tiny,
        timeOfDay: t.timeOfDay,
      });
      step = 6;
      draw();
    });
  };

  draw();
  return () => {};
}

/* ---------- templates ---------- */

export function templatesView(root: HTMLElement): () => void {
  const groups = new Map<string, typeof TEMPLATES>();
  for (const t of TEMPLATES) groups.set(t.category, [...(groups.get(t.category) ?? []), t]);
  root.innerHTML = shell(
    'new',
    `<div class="hero">
      <p class="tag section">Templates</p>
      <h1>${TEMPLATES.length}<span><i> · </i>ready to adopt</span></h1>
      <p class="line sub">Each one comes with an identity, a time, a place and a two-minute version.</p>
    </div>
    ${[...groups.entries()]
      .map(
        ([name, list]) => `<div class="panel"><p class="tag">${name}</p>
          <div class="cards">${list
            .map(
              (t) => `<button class="card tap" data-adopt="${TEMPLATES.indexOf(t)}">
                <b>${t.behaviour}</b><span class="tag">${t.identity}</span>
                <span class="tag">tiny: ${t.tiny}</span></button>`,
            )
            .join('')}</div></div>`,
      )
      .join('')}`,
  );
  root.firstElementChild!.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>('[data-adopt]');
    if (!card) return;
    const t = TEMPLATES[Number(card.dataset.adopt)];
    const state = loadHabits();
    saveHabit({
      id: `h-${Date.now()}`,
      identity: t.identity,
      behaviour: t.behaviour,
      time: t.time,
      place: t.place,
      tiny: t.tiny,
      schedule: { kind: 'daily' },
      timeOfDay: t.timeOfDay,
      order: state.habits.length,
    });
    location.hash = '#/habits';
    toast(`Adopted — a vote for ${t.identity}`);
  });
  return () => {};
}

/* ---------- 63. one habit ---------- */

export function habitDetailView(root: HTMLElement, id: string): () => void {
  const state = loadHabits();
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) {
    location.hash = '#/habits';
    return () => {};
  }
  const grid = dotGrid(state, habit);
  const pattern = weekdayPattern(state, habit);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/habits">← Habits</a></p>
      <div class="atom-detail">${atomSvg(votes(state, habit.id), consistency(state, habit, 30), 132)}</div>
      <h1>${habit.behaviour}</h1>
      <p class="line">I am becoming ${habit.identity}.</p>
      ${habit.target && habit.target > 1 ? `<p class="line sub">${habit.target} ${habit.unit ?? 'times'} a day.</p>` : ''}
      <p class="line sub">${intention(habit)}</p>
      <div class="records">
        <div><b>${votes(state, habit.id)}</b><span>votes</span></div>
        <div><b>${streak(state, habit)}</b><span>streak</span></div>
        <div><b>${bestStreak(state, habit)}</b><span>best</span></div>
        <div><b>${consistency(state, habit, 30)}%</b><span>30 days</span></div>
      </div>
      <div class="chips">
        <a class="chip tap" href="#/habits/edit/${habit.id}">edit</a>
        <button class="chip tap" id="ics">calendar reminder</button>
      </div>
    </div>
    <div class="panel"><p class="tag">Last ninety days</p>
      <div class="dotgrid">${grid.map((mark) => `<i class="dot-day ${mark}"></i>`).join('')}</div>
    </div>
    <div class="panel"><p class="tag">Which days you keep it</p>
      ${barList(days.map((d, i) => ({ label: d, value: pattern[i] })), '%')}
    </div>
    <div class="panel"><p class="tag">Consistency</p>
      <p class="line sub">${consistency(state, habit, 30)}% over thirty days ·
        ${consistency(state, habit, 90)}% over ninety.</p>
    </div>`,
  );

  root.querySelector('#ics')!.addEventListener('click', () => {
    const [hh, mm] = (habit.reminder ?? habit.time).split(':');
    downloadIcs(
      habit.behaviour.replace(/\s+/g, '-'),
      buildIcs(intention(habit), {
        days: habit.schedule.kind === 'days' ? habit.schedule.days : [0, 1, 2, 3, 4, 5, 6],
        time: `${hh}:${mm}`,
      }, 26),
    );
    toast('Calendar file saved');
  });
  return () => {};
}

/* ---------- 64. lessons ---------- */

export function lessonsView(root: HTMLElement): () => void {
  const state = loadHabits();
  const lesson = lessonForToday(state.readLessons.length);
  root.innerHTML = shell(
    'lessons',
    `<div class="hero">
      <p class="tag section">Lesson ${state.readLessons.length + 1} of ${LESSONS.length}</p>
      <h1>${lesson.title}</h1>
      <p class="line">${lesson.body}</p>
      <p class="line sub"><b>${lesson.prompt}</b></p>
      <button class="big tap" id="read">${
        state.readLessons.includes(lesson.id) ? 'READ AGAIN TOMORROW' : 'MARK AS READ'
      }</button>
    </div>
    <div class="panel"><p class="tag">Archive</p>
      ${LESSONS.map(
        (l) => `<details class="day tip"><summary>
          <span>${l.title}</span><span class="sub">${state.readLessons.includes(l.id) ? 'read' : ''}</span></summary>
          <p class="line">${l.body}</p><p class="line sub">${l.prompt}</p></details>`,
      ).join('')}
    </div>`,
  );
  root.querySelector('#read')!.addEventListener('click', () => {
    readLesson(lesson.id);
    lessonsView(root);
    toast('Marked as read');
  });
  return () => {};
}

/* ---------- 65. reflection ---------- */

export function reflectView(root: HTMLElement): () => void {
  const state = loadHabits();
  const today = dayKey();
  const existing = state.reflections.find((r) => r.date === today);
  root.innerHTML = shell(
    'reflect',
    `<div class="hero">
      <p class="tag section">Weekly reflection</p>
      <h1>Five minutes<span><i> · </i>looking back</span></h1>
      <label class="field"><span class="tag">What went well?</span>
        <textarea class="dest area" id="went" rows="3">${existing?.went ?? ''}</textarea></label>
      <label class="field"><span class="tag">What got in the way?</span>
        <textarea class="dest area" id="blocked" rows="3">${existing?.blocked ?? ''}</textarea></label>
      <label class="field"><span class="tag">Which habit should shrink or grow?</span>
        <textarea class="dest area" id="change" rows="2">${existing?.change ?? ''}</textarea></label>
      <label class="field"><span class="tag">One vote you are proud of</span>
        <textarea class="dest area" id="proud" rows="2">${existing?.proud ?? ''}</textarea></label>
      <button class="big tap" id="saveR">SAVE</button>
    </div>
    <div class="panel"><p class="tag">This month</p><p class="line">${monthSummary(state)}</p></div>
    ${
      state.reflections.length
        ? `<div class="panel"><p class="tag">Earlier</p>${[...state.reflections]
            .reverse()
            .slice(0, 12)
            .map(
              (r) => `<details class="day"><summary><span>${new Date(r.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}</span><span class="sub">reflection</span></summary>
              <p class="line sub">Went well: ${r.went || '—'}</p>
              <p class="line sub">In the way: ${r.blocked || '—'}</p>
              <p class="line sub">Change: ${r.change || '—'}</p>
              <p class="line sub">Proud of: ${r.proud || '—'}</p></details>`,
            )
            .join('')}</div>`
        : ''
    }`,
  );
  root.querySelector('#saveR')!.addEventListener('click', () => {
    const value = (sel: string): string => (root.querySelector(sel) as HTMLTextAreaElement).value.trim();
    saveReflection({
      date: today,
      went: value('#went'),
      blocked: value('#blocked'),
      change: value('#change'),
      proud: value('#proud'),
    });
    reflectView(root);
    toast('Saved');
  });
  return () => {};
}

/* ---------- 66 + 67. manage ---------- */

export function manageView(root: HTMLElement): () => void {
  const state = loadHabits();
  const rows = (list: Habit[]): string =>
    list
      .sort((a, b) => a.order - b.order)
      .map(
        (h) => `<div class="routine-item">
          <div class="routine-head">
            <a class="ex-name" href="#/habits/habit/${h.id}">${h.behaviour}</a>
            <span class="tag">${h.identity}${h.paused ? ' · paused' : ''}</span>
          </div>
          <div class="ex-foot">
            <button class="link tap" data-up="${h.id}">↑</button>
            <button class="link tap" data-down="${h.id}">↓</button>
            <a class="link tap" href="#/habits/edit/${h.id}">edit</a>
            <button class="link tap" data-pause="${h.id}">${h.paused ? 'resume' : 'pause a week'}</button>
            <button class="link tap" data-archive="${h.id}">${h.archived ? 'unarchive' : 'archive'}</button>
            <button class="link tap" data-del="${h.id}">delete</button>
            <button class="link tap" data-back="${h.id}">mark past days</button>
          </div>
        </div>`,
      )
      .join('');

  root.innerHTML = shell(
    'manage',
    `<div class="hero">
      <p class="tag section">Manage</p>
      <h1>${state.habits.filter((h) => !h.archived).length}<span><i> · </i>active habits</span></h1>
      <div class="chips">
        <a class="chip tap" href="#/habits/new">+ habit</a>
        <button class="chip tap" id="allIcs">all reminders → calendar</button>
      </div>
    </div>
    <div class="panel"><p class="tag">Active</p>${rows(state.habits.filter((h) => !h.archived))}</div>
    ${
      state.habits.some((h) => h.archived)
        ? `<div class="panel"><p class="tag">Archived</p>${rows(state.habits.filter((h) => h.archived))}</div>`
        : ''
    }
    <div class="panel"><p class="tag">Reminders</p>
      ${
        state.habits.filter((h) => h.reminder && !h.archived).length
          ? state.habits
              .filter((h) => h.reminder && !h.archived)
              .sort((a, b) => (a.reminder ?? '').localeCompare(b.reminder ?? ''))
              .map((h) => `<p class="line sub">${h.reminder} · ${h.behaviour}</p>`)
              .join('')
          : '<p class="line sub">No reminders set. A phone cannot nudge you from a web app, so these live here and in your calendar.</p>'
      }
    </div>`,
  );

  root.firstElementChild!.addEventListener('click', (ev) => {
    const el = ev.target as HTMLElement;
    const get = (key: string): string | null => el.closest<HTMLElement>(`[data-${key}]`)?.dataset[key] ?? null;
    const up = get('up');
    const down = get('down');
    const archive = get('archive');
    const del = get('del');
    const pause = get('pause');
    const back = get('back');
    if (up) {
      moveHabit(up, -1);
      return manageView(root);
    }
    if (down) {
      moveHabit(down, 1);
      return manageView(root);
    }
    if (archive) {
      const next = loadHabits();
      const habit = next.habits.find((h) => h.id === archive)!;
      habit.archived = !habit.archived;
      saveHabit(habit);
      return manageView(root);
    }
    if (pause) {
      const next = loadHabits();
      const habit = next.habits.find((h) => h.id === pause)!;
      if (habit.paused) habit.paused = undefined;
      else {
        const to = new Date();
        to.setDate(to.getDate() + 7);
        habit.paused = { from: dayKey(), to: dayKey(to) };
      }
      saveHabit(habit);
      return manageView(root);
    }
    if (del) {
      const host = sheet(
        'Delete this habit',
        `<p class="line">Its history goes too. There is no undo.</p>
         <button class="big tap" data-done="1" id="reallyDel">DELETE</button>`,
      );
      host.querySelector('#reallyDel')!.addEventListener('click', () => {
        deleteHabit(del);
        manageView(root);
        toast('Deleted');
      });
    }
    if (back) {
      const habit = state.habits.find((h) => h.id === back)!;
      const host = sheet(
        'Mark past days',
        `<div class="dotgrid big-grid" id="pastGrid">${Array.from({ length: 28 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (27 - i));
          const key = dayKey(d);
          const entry = entryFor(state, habit.id, key);
          return `<button class="dot-day tap ${entry?.mark ?? 'none'}" data-day="${key}"
            aria-label="${key}"></button>`;
        }).join('')}</div>
         <p class="line sub">Tap a day to tick it, tap again to clear it.</p>`,
      );
      host.querySelector('#pastGrid')!.addEventListener('click', (e2) => {
        const cell = (e2.target as HTMLElement).closest<HTMLElement>('[data-day]');
        if (!cell) return;
        const key = cell.dataset.day!;
        const entry = entryFor(loadHabits(), habit.id, key);
        if (entry) {
          unmark(habit.id, key);
          cell.className = 'dot-day tap none';
        } else {
          mark(habit.id, 'done' as Mark, key);
          cell.className = 'dot-day tap done';
        }
      });
    }
  });

  root.querySelector('#allIcs')!.addEventListener('click', () => {
    const habits = loadHabits().habits.filter((h) => !h.archived);
    for (const habit of habits)
      downloadIcs(
        habit.behaviour.replace(/\s+/g, '-'),
        buildIcs(intention(habit), {
          days: habit.schedule.kind === 'days' ? habit.schedule.days : [0, 1, 2, 3, 4, 5, 6],
          time: habit.reminder ?? habit.time,
        }, 26),
      );
    toast(`${habits.length} calendar files saved`);
  });
  return () => {};
}
