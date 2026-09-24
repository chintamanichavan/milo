import { miloMark } from '../../badge';
import { bindBodyPanels, bodyPanels } from '../../body/views';
import { barList, columns, lineChart } from '../../ui/chart';
import { sheet } from '../../ui/sheet';
import { dayKey, longClock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { loadFoods, lookupBarcode, scanBarcode, searchFoods, type Food } from '../foods';
import {
  addEntry,
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
  byMeal,
  MEAL_ORDER,
  microTarget,
  topSources,
  parseHealthExport,
  quickAdd,
  removeEntry,
  saveFuel,
  parseLabel,
  averages,
  baseKcal,
  cyclePhase,
  goalEta,
  habitStrip,
  togglePeriod,
  trendRate,
  weekPlan,
  weighStreak,
  setNote,
  setSteps,
  stepKcal,
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
import { bindQuickCard, quickCardHtml } from '../../water/quick';

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

const MIC = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="1.6" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`;

/** say a food out loud; where the browser cannot listen, it says so */
function listen(heard: (text: string) => void, note: (message: string) => void): void {
  const Recognition =
    (window as unknown as { SpeechRecognition?: new () => SpeechLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechLike }).webkitSpeechRecognition;
  if (!Recognition) {
    note('This browser cannot listen — Safari and Chrome on a phone can. Type it instead.');
    return;
  }
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const text = event.results[0]?.[0]?.transcript?.trim();
    if (text) heard(text.replace(/^(i (had|ate)|add|log)\s+/i, ''));
  };
  recognition.onerror = () => note('Did not catch that. Try again, or type it.');
  note('Listening…');
  recognition.start();
}

interface SpeechLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
  onerror: () => void;
  start(): void;
}

/** read a nutrition label off a photo, check it, and keep it as a food of your own */
function labelSheet(file: File, done: () => void): void {
  const host = sheet(
    'Reading the label',
    `<p class="line" id="lblState">Loading the reader…</p><progress id="lblBar" max="1" value="0"></progress>
     <p class="line sub">It is read on this phone. The first time, the reader downloads once.</p>`,
  );
  const body = host.querySelector<HTMLElement>('.sheet-body')!;
  void (async () => {
    try {
      const { readText } = await import('../../ui/ocr');
      const text = await readText(file, (fraction, status) => {
        const bar = body.querySelector<HTMLProgressElement>('#lblBar');
        if (bar) bar.value = fraction;
        const state = body.querySelector('#lblState');
        if (state) state.textContent = status.includes('recogniz') ? 'Reading…' : 'Loading the reader…';
      });
      const read = parseLabel(text);
      const field = (id: string, label: string, value: number | string, mode = 'decimal'): string =>
        `<label class="field row"><span>${label}</span><input class="num" id="${id}" inputmode="${mode}" value="${value}"></label>`;
      body.innerHTML = `<p class="line sub">Check each number against the label; the camera sometimes misreads.</p>
        <input class="dest" id="lName" placeholder="what is it?" value="${read.name}">
        ${field('lServing', 'Serving (g)', read.servingG)}
        ${field('lKcal', 'Calories', read.kcal, 'numeric')}
        ${field('lProtein', 'Protein (g)', read.protein)}
        ${field('lCarbs', 'Carbs (g)', read.carbs)}
        ${field('lFat', 'Fat (g)', read.fat)}
        ${field('lFibre', 'Fibre (g)', read.fibre)}
        ${field('lSugar', 'Sugar (g)', read.sugar)}
        ${field('lSodium', 'Sodium (mg)', read.sodiumMg, 'numeric')}
        <details class="watch"><summary><span class="tap">what the camera read</span></summary>
          <pre class="ocr-raw">${text.replace(/</g, '&lt;')}</pre></details>
        <button class="big tap" id="lSave" data-done="1">KEEP THIS FOOD</button>`;
      body.querySelector('#lSave')!.addEventListener('click', () => {
        const value = (id: string): number => Number((body.querySelector(`#${id}`) as HTMLInputElement).value) || 0;
        const serving = value('lServing') || 100;
        const per100 = (v: number): number => Math.round((v * 100 * 10) / serving) / 10;
        const name = (body.querySelector('#lName') as HTMLInputElement).value.trim() || 'Scanned food';
        const next = loadFuel();
        next.customs.push({
          i: `label-${Date.now()}`,
          n: name,
          g: 'scanned',
          k: Math.round((value('lKcal') * 100) / serving),
          p: per100(value('lProtein')),
          c: per100(value('lCarbs')),
          f: per100(value('lFat')),
          m: [],
          s: [['1 serving', serving]],
          custom: true,
        });
        saveFuel(next);
        toast(`${name} saved — search for it to log it`);
        done();
      });
    } catch {
      body.querySelector('#lblState')!.textContent = 'The reader could not load — it needs the internet the first time.';
    }
  })();
}

/* ---------- 54 + 58. the day ---------- */

export function fuelTodayView(root: HTMLElement, date = dayKey()): () => void {
  const state = loadFuel();
  if (!state.onboarded) return programView(root, true);
  const today = entriesOn(state, date);
  const totals = sumOf(today);
  const { kcal, macros } = targets(state, date);

  root.innerHTML = shell(
    '',
    `${date === dayKey() ? quickCardHtml() : ''}
    <div class="hero">
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
        <label class="chip tap">scan a label<input type="file" id="label" accept="image/*" capture="environment" hidden></label>
        <button class="chip tap" id="quick">quick add</button>
        <button class="chip tap" id="copy">copy yesterday</button>
      </div>
      <p class="line sub">${
        state.fasting
          ? `Fasting ${longClock((Date.now() - state.fasting.startedAt) / 1000)} of ${state.fasting.goalHours}h · `
          : ''
      }<button class="link tap" id="fast">${state.fasting ? 'end fast' : 'start a fast'}</button> ·
        <button class="link tap" id="steps">${
          state.steps[date]
            ? `${state.steps[date].toLocaleString('en-US')} steps · about ${stepKcal(state.steps[date], trendWeight(state))} kcal walked`
            : '+ steps'
        }</button>${
          state.profile.weekly?.fasting[new Date(`${date}T12:00:00`).getDay()] ? ' · <b>a fasting day</b>' : ''
        }</p>
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
      `<div class="search-row"><input class="dest" id="fq" placeholder="search seven and a half thousand foods" aria-label="search">
         <button class="chip tap mic" id="mic" aria-label="say it">${MIC}</button></div>
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
    host.querySelector('#mic')!.addEventListener('click', () => {
      const field = host.querySelector<HTMLInputElement>('#fq')!;
      listen(
        (heard) => {
          field.value = heard;
          hint.textContent = `Heard “${heard}”`;
          void draw(heard);
        },
        (message) => (hint.textContent = message),
      );
    });
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
  bindQuickCard(root, () => fuelTodayView(root, date));
  root.querySelector('#steps')!.addEventListener('click', () => {
    const host = sheet(
      'Steps',
      `<label class="field row"><span>Steps today</span>
         <input class="num" id="stepsN" inputmode="numeric" value="${loadFuel().steps[date] ?? ''}"></label>
       <p class="line sub">Or import them with your weigh-ins from an Apple Health export, on the Weight page.</p>
       <button class="big tap" data-done="1" id="stepsGo">SAVE</button>`,
    );
    host.querySelector('#stepsGo')!.addEventListener('click', () => {
      setSteps(date, Number((host.querySelector('#stepsN') as HTMLInputElement).value) || 0);
      fuelTodayView(root, date);
    });
  });
  root.querySelector('#label')!.addEventListener('change', (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) labelSheet(file, () => fuelTodayView(root, date));
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

/* ---------- 55 + 135–137. nutrients ---------- */

/** the unit each nutrient is counted in */
const MICRO_UNIT: Record<string, string> = {
  selenium: 'µg', 'vitamin A': 'µg', 'vitamin D': 'µg', folate: 'µg', 'vitamin B12': 'µg', 'vitamin K': 'µg', fibre: 'g',
};
const unitOf = (name: string): string => MICRO_UNIT[name] ?? 'mg';

const MEAL_COLOURS: Record<Meal, string> = {
  breakfast: 'var(--run)',
  lunch: 'var(--walk)',
  dinner: 'var(--violet)',
  snack: '#f2b441',
};

/** a stacked bar: how each meal shares out one total */
function stacked(label: string, parts: Record<Meal, number>, unit: string): string {
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return `<div class="stack-row"><span>${label}</span>
    <i class="stack">${MEAL_ORDER.map((m) =>
      parts[m] > 0
        ? `<b style="width:${((parts[m] / (total || 1)) * 100).toFixed(1)}%;background:${MEAL_COLOURS[m]}" title="${m} ${Math.round(parts[m])}${unit}"></b>`
        : '',
    ).join('')}</i>
    <span class="mono">${Math.round(total)}${unit}</span></div>`;
}

export function nutrientsView(root: HTMLElement, range = 1, focus?: string): () => void {
  const state = loadFuel();
  const ranges: [number, string][] = [
    [1, 'today'],
    [7, '7 days'],
    [30, '30 days'],
  ];
  const meals = byMeal(state, range);
  root.innerHTML = shell(
    'nutrients',
    `<div class="hero">
      <p class="tag section">Nutrients</p>
      <h1>${range === 1 ? 'Today' : `Last ${range} days`}<span><i> · </i>against your targets</span></h1>
      <p class="line sub">Reference intakes for a man aged 19 to 30 unless you set your own. Over a hundred per cent is not a problem for most of these.</p>
      <div class="chips" id="range">${ranges
        .map(([d, label]) => `<button class="chip tap${d === range ? ' on' : ''}" data-range="${d}">${label}</button>`)
        .join('')}<button class="chip tap" id="targetsBtn">my targets</button></div>
    </div>
    <div class="panel"><p class="tag">When you ate it<span>by meal${range > 1 ? `, ${range} days` : ''}</span></p>
      ${stacked('energy', { breakfast: meals.breakfast.kcal, lunch: meals.lunch.kcal, dinner: meals.dinner.kcal, snack: meals.snack.kcal }, ' kcal')}
      ${stacked('protein', { breakfast: meals.breakfast.protein, lunch: meals.lunch.protein, dinner: meals.dinner.protein, snack: meals.snack.protein }, ' g')}
      ${stacked('carbs', { breakfast: meals.breakfast.carbs, lunch: meals.lunch.carbs, dinner: meals.dinner.carbs, snack: meals.snack.carbs }, ' g')}
      ${stacked('fat', { breakfast: meals.breakfast.fat, lunch: meals.lunch.fat, dinner: meals.dinner.fat, snack: meals.snack.fat }, ' g')}
      <p class="stack-key">${MEAL_ORDER.map((m) => `<span><i style="background:${MEAL_COLOURS[m]}"></i>${m}</span>`).join('')}</p>
    </div>
    <div class="panel"><p class="tag">Micronutrients<span>tap one for where it came from</span></p><div id="microList">Loading…</div></div>
    <div class="panel" id="sources" ${focus ? '' : 'hidden'}></div>`,
  );

  void loadFoods().then(({ micros: names }) => {
    // the daily average over the range, against the target
    const totals: number[] = [];
    for (let i = 0; i < range; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      microsOn(state, dayKey(d)).forEach((v, k) => (totals[k] = (totals[k] ?? 0) + v));
    }
    const rows = names
      .map((name, i) => ({ name, i, value: (totals[i] ?? 0) / range }))
      .filter((row) => RDA[row.name]);
    root.querySelector('#microList')!.innerHTML = `<div class="barlist">${rows
      .map((row) => {
        const target = microTarget(state, row.name, RDA[row.name]);
        const pct = Math.round((row.value / target) * 100);
        return `<button class="barrow tap micro-row${row.name === focus ? ' on' : ''}" data-micro="${row.name}">
          <span>${row.name}${state.profile.microTargets?.[row.name] ? ' *' : ''}</span>
          <i><b style="width:${Math.min(100, pct)}%"></b></i><span class="mono">${pct}%</span></button>`;
      })
      .join('')}</div>`;
    if (focus) {
      const index = names.indexOf(focus);
      const top = topSources(state, index, range);
      const panel = root.querySelector<HTMLElement>('#sources')!;
      panel.innerHTML = `<p class="tag">Top sources of ${focus}<span>${range === 1 ? 'today' : `${range} days`}</span></p>${
        top.length
          ? barList(top.map((t) => ({ label: t.name, value: Math.round(t.amount * 10) / 10 })), ` ${unitOf(focus)}`)
          : '<p class="line sub">Nothing logged with this nutrient in it.</p>'
      }`;
    }
  });

  root.querySelector('#range')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-range]');
    if (chip) nutrientsView(root, Number(chip.dataset.range), focus);
  });
  root.querySelector('#microList')!.addEventListener('click', (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('[data-micro]');
    if (row) nutrientsView(root, range, row.dataset.micro === focus ? undefined : row.dataset.micro);
  });
  root.querySelector('#targetsBtn')!.addEventListener('click', () => {
    const mine = loadFuel().profile.microTargets ?? {};
    const host = sheet(
      'My targets',
      `<p class="line sub">Leave a box empty to use the reference intake.</p>
       ${Object.entries(RDA)
         .map(
           ([name, ref]) => `<label class="field row"><span>${name} (${unitOf(name)})</span>
             <input class="num" data-target="${name}" inputmode="decimal" placeholder="${ref}" value="${mine[name] ?? ''}"></label>`,
         )
         .join('')}
       <button class="big tap" data-done="1" id="tSave">SAVE</button>`,
    );
    host.querySelector('#tSave')!.addEventListener('click', () => {
      const next: Record<string, number> = {};
      for (const input of host.querySelectorAll<HTMLInputElement>('[data-target]'))
        if (Number(input.value) > 0) next[input.dataset.target!] = Number(input.value);
      setProfile({ microTargets: next });
      toast('Targets saved');
      nutrientsView(root, range, focus);
    });
  });
  return () => {};
}

/* ---------- 57. weight ---------- */

export function weightView(root: HTMLElement): () => void {
  const state = loadFuel();
  const line = trend(state.weights);
  const current = trendWeight(state);
  const rate = trendRate(state);
  const eta = goalEta(state);
  const today = dayKey();
  const phase = state.profile.cycle ? cyclePhase(state, today) : null;
  const niceDay = (d: string): string =>
    new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  root.innerHTML = shell(
    'weight',
    `<div class="hero">
      <p class="tag section">Weight${weighStreak(state) > 1 ? ` · weighed in ${weighStreak(state)} days running` : ''}</p>
      <h1>${current ? current.toFixed(1) : '—'}<span><i> · </i>lb trend</span></h1>
      <p class="line sub">${
        line.length > 1
          ? `${rate >= 0 ? 'Up' : 'Down'} about ${Math.abs(rate).toFixed(2)} lb a week over the last four weeks.`
          : 'Weigh in a few times and a trend appears.'
      }</p>
      <div class="chips">
        <button class="chip tap" id="addW">+ weigh-in</button>
        <label class="chip tap">import Apple Health<input type="file" id="health" accept=".zip,.xml" hidden></label>
      </div>
    </div>
    <div class="panel goal-weight">
      <p class="tag">Goal weight</p>
      <label class="field row"><span>Goal (lb)</span>
        <input class="num" id="goalLb" inputmode="decimal" placeholder="none" value="${state.profile.goalLb ?? ''}"></label>
      <p class="line" id="eta">${
        !eta
          ? 'Set a goal and a date appears, from your trend.'
          : eta.source === 'there'
            ? 'You are there. Hold it.'
            : eta.date
              ? `${Math.abs(eta.lbToGo).toFixed(1)} lb to ${eta.lbToGo < 0 ? 'lose' : 'gain'} — around <b>${niceDay(eta.date)}</b> at ${Math.abs(eta.weekly).toFixed(2)} lb a week, from ${eta.source}.`
              : `${Math.abs(eta.lbToGo).toFixed(1)} lb to go; the trend is ${eta.source}. Your pace in Program sets the direction.`
      }</p>
    </div>
    <div class="panel"><p class="tag">Trend</p>${lineChart(line.map((p) => p.lb), 'lb')}
      ${
        state.profile.cycle && line.length > 1
          ? `<div class="cycle-strip" aria-label="cycle phases under the trend">${line
              .map((p) => `<i class="cy-${cyclePhase(state, p.date)?.phase ?? 'none'}" title="${p.date}"></i>`)
              .join('')}</div>
            <p class="stack-key"><span><i class="cy-period"></i>period</span><span><i class="cy-luteal"></i>luteal — water retention likely</span></p>`
          : ''
      }
    </div>
    ${
      state.profile.cycle
        ? `<div class="panel cycle">
            <p class="tag">Cycle<span>${phase ? `day ${phase.day} of about ${phase.length}` : 'no period logged yet'}</span></p>
            ${
              phase?.phase === 'luteal'
                ? '<p class="line">Late in the cycle, water retention can add one to three pounds on the scale. The trend rides through it; nothing to change.</p>'
                : phase?.phase === 'period'
                  ? '<p class="line">The scale often drops back over these days as retained water goes.</p>'
                  : ''
            }
            <div class="chips"><button class="chip tap" id="periodToday">${
              state.periods.includes(today) ? 'period started today ✓' : 'period started today'
            }</button></div>
            ${state.periods.length ? `<p class="line sub">Logged starts: ${state.periods.slice(-6).map(niceDay).join(' · ')}</p>` : ''}
          </div>`
        : ''
    }
    ${bodyPanels()}`,
  );
  bindBodyPanels(root, () => weightView(root));

  root.querySelector('#goalLb')!.addEventListener('change', (ev) => {
    const lb = Number((ev.target as HTMLInputElement).value);
    setProfile({ goalLb: lb > 0 ? lb : undefined });
    weightView(root);
  });
  root.querySelector('#periodToday')?.addEventListener('click', () => {
    togglePeriod(today);
    weightView(root);
  });
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
    try {
      const added = await parseHealthExport(file);
      weightView(root);
      toast(`${added.weights} weigh-ins and ${added.steps} days of steps imported`);
    } catch {
      toast('That file did not read — use export.zip or export.xml');
    }
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
    <div class="panel"><p class="tag">Averages<span>per logged day</span></p>
      <table class="avg-table">
        <thead><tr><th></th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>lb</th></tr></thead>
        <tbody>${averages(state)
          .map(
            (r) => `<tr><th>${r.label}<small>${r.logged} logged</small></th><td>${r.kcal || '—'}</td><td>${r.protein || '—'}</td>
              <td>${r.carbs || '—'}</td><td>${r.fat || '—'}</td>
              <td>${r.weightChange === null ? '—' : `${r.weightChange > 0 ? '+' : ''}${r.weightChange}`}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
    </div>
    <div class="panel"><p class="tag">Habits<span>last 30 days</span></p>
      ${(() => {
        const strip = habitStrip(state);
        return `<div class="habit-line"><span>Food logged <b>${loggedStreak(state)}</b> days running</span>
            <div class="dots30">${strip.map((d) => `<i class="${d.logged ? 'on' : ''}" title="${d.date}"></i>`).join('')}</div></div>
          <div class="habit-line"><span>Weighed in <b>${weighStreak(state)}</b> days running</span>
            <div class="dots30">${strip.map((d) => `<i class="${d.weighed ? 'on' : ''}" title="${d.date}"></i>`).join('')}</div></div>
          <p class="line sub">${logged.length} of 28 days logged · ${Math.round((logged.length / 28) * 100)}% adherence</p>`;
      })()}
    </div>
    ${(() => {
      const stepDays = days.slice(-14).map((d) => state.steps[d.date] ?? 0);
      const counted = stepDays.filter((n) => n > 0);
      if (!counted.length)
        return '<div class="panel"><p class="tag">Steps</p><p class="line sub">Import an Apple Health export on the Weight page, or add today’s on Today, and your steps show here.</p></div>';
      const avg = Math.round(counted.reduce((a, b) => a + b, 0) / counted.length);
      return `<div class="panel"><p class="tag">Steps<span>${avg.toLocaleString('en-US')} a day, two weeks</span></p>
        ${columns(stepDays, days.slice(-14).map((d, i) => (i % 2 ? '' : d.date.slice(8))))}
        <p class="line sub">About ${stepKcal(avg, trendWeight(state))} kcal a day from walking. The expenditure estimate already sees it
          in your weight; this is a hint for the days you move more or less than usual.</p></div>`;
    })()}
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
    ${(() => {
      const plan = weekPlan(state);
      const base = baseKcal(state);
      const week = p.weekly ?? { shift: [0, 0, 0, 0, 0, 0, 0], fasting: [false, false, false, false, false, false, false], fastingKcal: 600 };
      const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `<div class="panel week-plan">
        <p class="tag">Days of the week<span>average ${plan.average} kcal</span></p>
        ${names
          .map(
            (n, d) => `<div class="week-row"><span>${n}</span>
              <input class="num" data-day-kcal="${d}" inputmode="numeric" value="${plan.days[d]}" ${week.fasting[d] ? 'disabled' : ''}
                aria-label="${n} calories">
              <label class="sw tap"><input type="checkbox" data-fast="${d}" ${week.fasting[d] ? 'checked' : ''}><span>fast</span></label></div>`,
          )
          .join('')}
        <label class="field row"><span>A fasting day is</span>
          <input class="num" id="fastKcal" inputmode="numeric" value="${week.fastingKcal}"></label>
        <p class="line sub">${
          plan.average === base
            ? `The week averages your ${base} kcal target.`
            : `The week averages ${plan.average} kcal, ${Math.abs(plan.average - base)} ${plan.average > base ? 'over' : 'under'} your ${base} kcal target.`
        } Macros follow each day's calories.</p>
        <div class="chips"><button class="chip tap" id="balance">keep the average</button><button class="chip tap" id="evenWeek">every day the same</button></div>
      </div>`;
    })()}
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
    </div>
    <div class="panel">
      <p class="tag">Cycle</p>
      <label class="sw tap"><input type="checkbox" id="cycle" ${p.cycle ? 'checked' : ''}>
        <span>Track my cycle — the weight trend shows the phases, and notes when water retention is likely</span></label>
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
  const saveWeek = (shift: number[], fasting: boolean[], fastingKcal: number): void => {
    setProfile({ weekly: { shift, fasting, fastingKcal } });
    programView(root, onboarding);
  };
  const currentWeek = (): { shift: number[]; fasting: boolean[]; fastingKcal: number } =>
    loadFuel().profile.weekly ?? { shift: [0, 0, 0, 0, 0, 0, 0], fasting: [false, false, false, false, false, false, false], fastingKcal: 600 };
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-day-kcal]'))
    input.addEventListener('change', () => {
      const week = currentWeek();
      const d = Number(input.dataset.dayKcal);
      week.shift[d] = (Number(input.value) || 0) - baseKcal(loadFuel());
      saveWeek(week.shift, week.fasting, week.fastingKcal);
    });
  for (const box of root.querySelectorAll<HTMLInputElement>('[data-fast]'))
    box.addEventListener('change', () => {
      const week = currentWeek();
      week.fasting[Number(box.dataset.fast)] = box.checked;
      saveWeek(week.shift, week.fasting, week.fastingKcal);
    });
  root.querySelector('#fastKcal')?.addEventListener('change', (ev) => {
    const week = currentWeek();
    saveWeek(week.shift, week.fasting, Math.max(0, Number((ev.target as HTMLInputElement).value) || 600));
  });
  // spread the difference over the days that are not fasting, so the week averages the target
  root.querySelector('#balance')?.addEventListener('click', () => {
    const fuel = loadFuel();
    const week = currentWeek();
    const base = baseKcal(fuel);
    const { days } = weekPlan(fuel);
    const open = [0, 1, 2, 3, 4, 5, 6].filter((d) => !week.fasting[d]);
    if (!open.length) return;
    const gap = base * 7 - days.reduce((a, b) => a + b, 0);
    const each = Math.round(gap / open.length);
    for (const d of open) week.shift[d] += each;
    saveWeek(week.shift, week.fasting, week.fastingKcal);
    toast('Evened out to the weekly target');
  });
  root.querySelector('#evenWeek')?.addEventListener('click', () => {
    setProfile({ weekly: undefined });
    programView(root, onboarding);
  });
  root.querySelector('#cycle')?.addEventListener('change', (ev) => {
    setProfile({ cycle: (ev.target as HTMLInputElement).checked });
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
