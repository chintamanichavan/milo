import { miloMark } from '../../badge';
import { barList, columns, lineChart } from '../../ui/chart';
import { sheet } from '../../ui/sheet';
import { dayKey, longClock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { loadFoods, lookupBarcode, scanBarcode, searchFoods, type Food } from '../foods';
import {
  addEntry,
  addWater,
  addWeight,
  checkIn,
  copyDay,
  copyMeal,
  currentTdee,
  entriesOn,
  entryFromFood,
  loadFuel,
  loggedStreak,
  microsOn,
  parseHealthExport,
  quickAdd,
  removeEntry,
  saveFuel,
  setNote,
  setProfile,
  startFast,
  stopFast,
  sumOf,
  targets,
  toCsv,
  trendWeight,
  type Meal,
} from '../store';
import { RDA, trend, PACE_LB_PER_WEEK, type Pace } from '../tdee';

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function fuelSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/fuel${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('nutrients', 'Nutrients')}${link(
    'weight',
    'Weight',
  )}${link('trends', 'Trends')}${link('program', 'Program')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today fuel detail">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${fuelSubNav(active)}
    ${body}
  </section>`;

function ring(done: number, goal: number, label: string, value: string): string {
  const t = Math.min(1, goal > 0 ? done / goal : 0);
  const c = 2 * Math.PI * 26;
  return `<div class="goal">
    <svg viewBox="0 0 64 64" width="64" height="64" aria-label="${label}">
      <circle class="goal-bg" cx="32" cy="32" r="26" fill="none" stroke-width="5"/>
      <circle class="goal-fg" cx="32" cy="32" r="26" fill="none" stroke-width="5" stroke-linecap="round"
        style="stroke-dasharray:${c};stroke-dashoffset:${c * (1 - t)}"/>
    </svg>
    <div><b>${value}</b><span>${label}</span></div>
  </div>`;
}

/* ---------- 54 + 58. the day ---------- */

export function fuelTodayView(root: HTMLElement, date = dayKey()): () => void {
  const state = loadFuel();
  if (!state.onboarded) return programView(root, true);
  const today = entriesOn(state, date);
  const totals = sumOf(today);
  const { kcal, macros } = targets(state);
  const water = state.water[date] ?? 0;

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section">Fuel · ${loggedStreak(state)}-day logging streak</p>
      <h1>${Math.max(0, kcal - totals.kcal)}<span><i> · </i>kcal left</span></h1>
      <div class="goals">
        ${ring(totals.kcal, kcal, 'energy', `${totals.kcal}`)}
        ${ring(totals.protein, macros.protein, `protein ${macros.protein}g`, `${Math.round(totals.protein)}g`)}
        ${ring(totals.carbs, macros.carbs, `carbs ${macros.carbs}g`, `${Math.round(totals.carbs)}g`)}
        ${ring(totals.fat, macros.fat, `fat ${macros.fat}g`, `${Math.round(totals.fat)}g`)}
      </div>
      <div class="chips">
        <button class="chip tap" id="add">+ food</button>
        <button class="chip tap" id="scan">scan</button>
        <button class="chip tap" id="quick">quick add</button>
        <button class="chip tap" id="copy">copy yesterday</button>
        <button class="chip tap" id="water">+250 ml water</button>
      </div>
      <p class="line sub">Water ${water} of ${state.waterGoalMl} ml${
        state.fasting
          ? ` · fasting ${longClock((Date.now() - state.fasting.startedAt) / 1000)} of ${state.fasting.goalHours}h`
          : ''
      } · <button class="link tap" id="fast">${state.fasting ? 'end fast' : 'start a fast'}</button></p>
    </div>
    ${MEALS.map((meal) => {
      const rows = today.filter((e) => e.meal === meal);
      const mealTotals = sumOf(rows);
      return `<div class="panel meal" data-meal="${meal}">
        <p class="tag">${meal}<span>${mealTotals.kcal} kcal
          <button class="link tap" data-addmeal="${meal}">add</button>
          <button class="link tap" data-copymeal="${meal}">copy</button></span></p>
        ${
          rows.length
            ? rows
                .map(
                  (e) => `<div class="food-row" data-entry="${e.id}">
                    <span>${e.name}${e.grams ? ` · ${Math.round(e.grams)} g` : ''}</span>
                    <span class="mono">${e.kcal} kcal</span>
                    <button class="link tap" data-remove="${e.id}">×</button>
                  </div>`,
                )
                .join('')
            : '<p class="line sub">Nothing yet.</p>'
        }
      </div>`;
    }).join('')}
    <div class="panel">
      <p class="tag">Note for the day</p>
      <input class="dest" id="dayNote" value="${state.notes[date] ?? ''}" placeholder="how did eating go?">
    </div>`,
  );

  const openSearch = (meal: Meal): void => {
    const host = sheet(
      `Add to ${meal}`,
      `<input class="dest" id="fq" placeholder="search seven and a half thousand foods" aria-label="search">
       <p class="line sub" id="fhint">Loading the food table…</p>
       <div id="fresults"></div>`,
    );
    const results = host.querySelector('#fresults')!;
    const hint = host.querySelector('#fhint')!;
    const draw = async (q: string): Promise<void> => {
      const list = await searchFoods(q, loadFuel().customs, 30);
      hint.textContent = `${list.length} matches`;
      results.innerHTML = list
        .map(
          (f) => `<button class="food-hit tap" data-food="${f.i}">
            <b>${f.n}</b><span class="tag">${f.k} kcal · ${f.p}p ${f.c}c ${f.f}f per 100 g</span></button>`,
        )
        .join('');
    };
    void loadFoods().then(() => draw(''));
    host.querySelector('#fq')!.addEventListener('input', (ev) =>
      void draw((ev.target as HTMLInputElement).value),
    );
    results.addEventListener('click', async (ev) => {
      const hit = (ev.target as HTMLElement).closest<HTMLElement>('[data-food]');
      if (!hit) return;
      const all = await searchFoods('', loadFuel().customs, 0).catch(() => []);
      void all;
      const { foods } = await loadFoods();
      const food =
        loadFuel().customs.find((f) => String(f.i) === hit.dataset.food) ??
        foods.find((f) => String(f.i) === hit.dataset.food);
      if (!food) return;
      portionSheet(food, meal, () => {
        (host as HTMLElement & { close: () => void }).close();
        fuelTodayView(root, date);
      });
    });
  };

  const portionSheet = (food: Food, meal: Meal, done: () => void): void => {
    const host = sheet(
      food.n,
      `<p class="line sub">${food.k} kcal · ${food.p} g protein · ${food.c} g carbs · ${food.f} g fat per 100 g</p>
       <div class="chips" id="units">
         <button class="chip tap on" data-grams="100">100 g</button>
         <button class="chip tap" data-grams="28">1 oz</button>
         ${food.s.map(([label, grams]) => `<button class="chip tap" data-grams="${grams}">${label}</button>`).join('')}
       </div>
       <label class="field row"><span>Grams</span><input class="num" id="grams" value="100"></label>
       <button class="big tap" data-done="1" id="addIt">ADD</button>`,
    );
    host.querySelector('#units')!.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-grams]');
      if (!chip) return;
      (host.querySelector('#grams') as HTMLInputElement).value = chip.dataset.grams!;
    });
    host.querySelector('#addIt')!.addEventListener('click', () => {
      const grams = Number((host.querySelector('#grams') as HTMLInputElement).value) || 100;
      addEntry(entryFromFood(food, grams, meal, date));
      toast(`${food.n} logged`);
      done();
    });
  };

  root.querySelector('#add')!.addEventListener('click', () => openSearch('breakfast'));
  root.firstElementChild!.addEventListener('click', (ev) => {
    const add = (ev.target as HTMLElement).closest<HTMLElement>('[data-addmeal]');
    if (add) return openSearch(add.dataset.addmeal as Meal);
    const copy = (ev.target as HTMLElement).closest<HTMLElement>('[data-copymeal]');
    if (copy) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const n = copyMeal(dayKey(yesterday), copy.dataset.copymeal as Meal, date);
      fuelTodayView(root, date);
      return toast(n ? `${n} items copied` : 'Nothing to copy');
    }
    const remove = (ev.target as HTMLElement).closest<HTMLElement>('[data-remove]');
    if (remove) {
      removeEntry(remove.dataset.remove!);
      fuelTodayView(root, date);
    }
  });
  root.querySelector('#quick')!.addEventListener('click', () => {
    const host = sheet(
      'Quick add',
      `<label class="field row"><span>Calories</span><input class="num" id="qk" inputmode="numeric"></label>
       <label class="field row"><span>Protein g</span><input class="num" id="qp" inputmode="numeric"></label>
       <button class="big tap" data-done="1" id="qGo">ADD</button>`,
    );
    host.querySelector('#qGo')!.addEventListener('click', () => {
      const num = (sel: string): number => Number((host.querySelector(sel) as HTMLInputElement).value) || 0;
      quickAdd('snack', num('#qk'), num('#qp'));
      fuelTodayView(root, date);
    });
  });
  root.querySelector('#copy')!.addEventListener('click', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const n = copyDay(dayKey(yesterday), date);
    fuelTodayView(root, date);
    toast(n ? `${n} items copied` : 'Nothing logged yesterday');
  });
  root.querySelector('#water')!.addEventListener('click', () => {
    addWater(250, date);
    fuelTodayView(root, date);
  });
  root.querySelector('#fast')!.addEventListener('click', () => {
    if (loadFuel().fasting) stopFast();
    else startFast(16);
    fuelTodayView(root, date);
  });
  root.querySelector('#dayNote')!.addEventListener('change', (ev) =>
    setNote(date, (ev.target as HTMLInputElement).value),
  );
  root.querySelector('#scan')!.addEventListener('click', () => {
    const host = sheet(
      'Scan a barcode',
      `<video id="cam" class="cam" playsinline muted></video>
       <p class="line sub" id="scanNote">Point it at the barcode.</p>`,
    );
    const video = host.querySelector('#cam') as HTMLVideoElement;
    void (async () => {
      try {
        const code = await scanBarcode(video);
        if (!code) {
          host.querySelector('#scanNote')!.textContent = 'No barcode found.';
          return;
        }
        host.querySelector('#scanNote')!.textContent = `Looking up ${code}…`;
        const food = await lookupBarcode(code);
        if (!food) {
          host.querySelector('#scanNote')!.textContent =
            'Not in Open Food Facts — add it as a custom food.';
          return;
        }
        const next = loadFuel();
        if (!next.customs.some((f) => f.i === food.i)) {
          next.customs.push(food);
          saveFuel(next);
        }
        (host as HTMLElement & { close: () => void }).close();
        portionSheet(food, 'snack', () => fuelTodayView(root, date));
      } catch {
        host.querySelector('#scanNote')!.textContent = 'The camera said no.';
      }
    })();
  });
  return () => {};
}

/* ---------- 55. nutrients ---------- */

export function nutrientsView(root: HTMLElement): () => void {
  const state = loadFuel();
  const micros = microsOn(state);
  void loadFoods().then(({ micros: names }) => {
    root.querySelector('#microList')!.innerHTML = barList(
      names
        .map((name, i) => ({ name, value: micros[i] ?? 0 }))
        .filter((row) => RDA[row.name])
        .map((row) => ({
          label: row.name,
          value: Math.round((row.value / RDA[row.name]) * 100),
          note: '%',
        })),
      '',
    );
  });
  root.innerHTML = shell(
    'nutrients',
    `<div class="hero">
      <p class="tag section">Nutrients</p>
      <h1>Today<span><i> · </i>against the daily reference</span></h1>
      <p class="line sub">Reference intakes for a man aged 19 to 30. Over a hundred per cent is not a problem for most of these.</p>
    </div>
    <div class="panel"><p class="tag">Micronutrients</p><div id="microList">Loading…</div></div>`,
  );
  return () => {};
}

/* ---------- 57. weight ---------- */

export function weightView(root: HTMLElement): () => void {
  const state = loadFuel();
  const line = trend(state.weights);
  const current = trendWeight(state);
  const first = line[0]?.lb ?? current;
  const rate = line.length > 1 ? ((current - first) / Math.max(1, line.length)) * 7 : 0;

  root.innerHTML = shell(
    'weight',
    `<div class="hero">
      <p class="tag section">Weight</p>
      <h1>${current ? current.toFixed(1) : '—'}<span><i> · </i>lb trend</span></h1>
      <p class="line sub">${
        line.length > 1
          ? `${rate >= 0 ? 'Up' : 'Down'} about ${Math.abs(rate).toFixed(2)} lb a week over ${line.length} weigh-ins.`
          : 'Weigh in a few times and a trend appears.'
      }</p>
      <div class="chips">
        <button class="chip tap" id="addW">+ weigh-in</button>
        <label class="chip tap">import Apple Health<input type="file" id="health" accept=".zip,.xml" hidden></label>
      </div>
    </div>
    <div class="panel"><p class="tag">Trend</p>${lineChart(line.map((p) => p.lb), 'lb')}</div>`,
  );

  root.querySelector('#addW')!.addEventListener('click', () => {
    const host = sheet(
      'Weigh-in',
      `<label class="field row"><span>Pounds</span><input class="num" id="w" inputmode="decimal"></label>
       <button class="big tap" data-done="1" id="wGo">SAVE</button>`,
    );
    host.querySelector('#wGo')!.addEventListener('click', () => {
      const lb = Number((host.querySelector('#w') as HTMLInputElement).value);
      if (lb > 0) addWeight(lb);
      weightView(root);
    });
  });
  root.querySelector('#health')!.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    toast('Reading the export…');
    const added = await parseHealthExport(file);
    weightView(root);
    toast(`${added} weigh-ins imported`);
  });
  return () => {};
}

/* ---------- 56 + 58. trends and the check-in ---------- */

export function trendsView(root: HTMLElement): () => void {
  const state = loadFuel();
  const days: { date: string; kcal: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({ date: key, kcal: sumOf(entriesOn(state, key)).kcal });
  }
  const logged = days.filter((d) => d.kcal > 0);
  const average = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
  const macroSplit = sumOf(state.entries.filter((e) => days.some((d) => d.date === e.date)));
  const last = state.checkIns[state.checkIns.length - 1];

  root.innerHTML = shell(
    'trends',
    `<div class="hero">
      <p class="tag section">Trends</p>
      <h1>${currentTdee(state)}<span><i> · </i>kcal burned a day</span></h1>
      <p class="line sub">${
        last ? last.note : 'Log a fortnight and the estimate starts to mean something.'
      }</p>
      <button class="chip tap" id="runCheck">run a check-in</button>
    </div>
    <div class="panel"><p class="tag">Intake, last four weeks<span>${average} kcal average</span></p>
      ${columns(days.map((d) => d.kcal), days.map((d, i) => (i % 7 === 0 ? d.date.slice(8) : '')))}</div>
    <div class="panel"><p class="tag">Adherence</p>
      <p class="line sub">${logged.length} of 28 days logged · ${Math.round((logged.length / 28) * 100)}%</p></div>
    <div class="panel"><p class="tag">Where the calories came from</p>
      ${barList(
        [
          { label: 'protein', value: Math.round(macroSplit.protein * 4) },
          { label: 'carbs', value: Math.round(macroSplit.carbs * 4) },
          { label: 'fat', value: Math.round(macroSplit.fat * 9) },
        ],
        ' kcal',
      )}</div>
    ${
      state.checkIns.length
        ? `<div class="panel"><p class="tag">Expenditure over time</p>
           ${lineChart(state.checkIns.map((c) => c.tdee), 'kcal')}</div>`
        : ''
    }
    <div class="panel"><p class="tag">Export</p>
      <button class="chip tap" id="csv">download CSV</button></div>`,
  );

  root.querySelector('#runCheck')!.addEventListener('click', () => {
    const result = checkIn();
    if (!result) return toast('Not enough logged days yet');
    trendsView(root);
    toast('Targets updated');
  });
  root.querySelector('#csv')!.addEventListener('click', () => {
    const blob = new Blob([toCsv(loadFuel())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'milo-food-log.csv';
    a.click();
    toast('CSV saved');
  });
  return () => {};
}

/* ---------- 55. the programme ---------- */

export function programView(root: HTMLElement, onboarding = false): () => void {
  const state = loadFuel();
  const p = state.profile;
  const { kcal, macros } = targets(state);

  root.innerHTML = shell(
    'program',
    `<div class="hero">
      <p class="tag section">${onboarding ? 'Set up' : 'Program'}</p>
      <h1>${kcal}<span><i> · </i>kcal a day</span></h1>
      <p class="line sub">${macros.protein} g protein · ${macros.carbs} g carbs · ${macros.fat} g fat</p>
    </div>
    <div class="panel">
      <p class="tag">You</p>
      <div class="chips" id="sex">
        ${(['male', 'female'] as const)
          .map((s) => `<button class="chip tap${p.sex === s ? ' on' : ''}" data-sex="${s}">${s}</button>`)
          .join('')}
      </div>
      <label class="field row"><span>Age</span><input class="num" id="age" value="${p.age}"></label>
      <label class="field row"><span>Height (in)</span><input class="num" id="height" value="${p.heightIn}"></label>
      <label class="field row"><span>Weight (lb)</span><input class="num" id="weight" value="${
        trendWeight(state) || ''
      }"></label>
      <label class="field row"><span>Activity</span>
        <select class="dest" id="activity">
          ${[
            [1.2, 'desk job, little exercise'],
            [1.375, 'light, a few walks'],
            [1.5, 'moderate, training most days'],
            [1.725, 'hard training or on your feet'],
          ]
            .map(([v, label]) => `<option value="${v}"${p.activity === v ? ' selected' : ''}>${label}</option>`)
            .join('')}
        </select></label>
    </div>
    <div class="panel">
      <p class="tag">Goal</p>
      <div class="chips" id="pace">
        ${(Object.keys(PACE_LB_PER_WEEK) as Pace[])
          .map(
            (pace) =>
              `<button class="chip tap${p.pace === pace ? ' on' : ''}" data-pace="${pace}">${
                PACE_LB_PER_WEEK[pace] === 0
                  ? 'maintain'
                  : `${PACE_LB_PER_WEEK[pace] > 0 ? '+' : ''}${PACE_LB_PER_WEEK[pace]} lb/wk`
              }</button>`,
          )
          .join('')}
      </div>
    </div>
    <div class="panel">
      <p class="tag">Macros</p>
      <div class="chips" id="program">
        ${(['balanced', 'lowcarb', 'highprotein', 'keto', 'custom'] as const)
          .map((m) => `<button class="chip tap${p.program === m ? ' on' : ''}" data-program="${m}">${m}</button>`)
          .join('')}
      </div>
      ${
        p.program === 'custom'
          ? `<label class="field row"><span>Protein g per lb</span>
               <input class="num" id="ppl" value="${p.proteinPerLb}"></label>
             <label class="field row"><span>Fat % of calories</span>
               <input class="num" id="fatp" value="${p.fatPercent}"></label>`
          : ''
      }
    </div>
    <div class="panel">
      <p class="tag">Coaching</p>
      <div class="chips" id="mode">
        ${(['coached', 'collaborative', 'manual'] as const)
          .map((m) => `<button class="chip tap${p.mode === m ? ' on' : ''}" data-mode="${m}">${m}</button>`)
          .join('')}
      </div>
      <p class="line sub">Coached moves your targets after each check-in. Collaborative asks first.
        Manual leaves them alone.</p>
      ${
        p.mode === 'manual'
          ? `<label class="field row"><span>Calorie target</span>
               <input class="num" id="manual" value="${p.manualKcal ?? kcal}"></label>`
          : ''
      }
      ${onboarding ? '<button class="big tap" id="done">START LOGGING</button>' : ''}
    </div>`,
  );

  const chips = (id: string, key: keyof typeof p): void => {
    root.querySelector(`#${id}`)?.addEventListener('click', (ev) => {
      const chip = (ev.target as HTMLElement).closest<HTMLElement>(`[data-${id}]`);
      if (!chip) return;
      setProfile({ [key]: chip.dataset[id] } as never);
      programView(root, onboarding);
    });
  };
  chips('sex', 'sex');
  chips('pace', 'pace');
  chips('program', 'program');
  chips('mode', 'mode');

  const number = (id: string, key: keyof typeof p): void => {
    root.querySelector(`#${id}`)?.addEventListener('change', (ev) => {
      setProfile({ [key]: Number((ev.target as HTMLInputElement).value) } as never);
      programView(root, onboarding);
    });
  };
  number('age', 'age');
  number('height', 'heightIn');
  number('ppl', 'proteinPerLb');
  number('fatp', 'fatPercent');
  number('manual', 'manualKcal');
  root.querySelector('#activity')?.addEventListener('change', (ev) => {
    setProfile({ activity: Number((ev.target as HTMLSelectElement).value) });
    programView(root, onboarding);
  });
  root.querySelector('#weight')?.addEventListener('change', (ev) => {
    const lb = Number((ev.target as HTMLInputElement).value);
    if (lb > 0) addWeight(lb);
    programView(root, onboarding);
  });
  root.querySelector('#done')?.addEventListener('click', () => {
    const next = loadFuel();
    next.onboarded = true;
    saveFuel(next);
    if (location.hash.startsWith('#/fuel')) fuelTodayView(root);
    else location.hash = '#/fuel';
    toast('Targets set');
  });
  return () => {};
}
