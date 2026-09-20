import { miloMark } from '../../badge';
import { sheet } from '../../ui/sheet';
import { clock } from '../../ui/time';
import { toast } from '../../ui/toast';
import { fromMela, fromPaprikaFile, importFromText, importFromUrl, toMela } from '../import';
import {
  aisleFor,
  convert,
  ingredientLine,
  parseIngredient,
  parseStep,
  prettyQty,
  scaleIngredient,
  type Recipe,
  type Slot,
} from '../model';
import { getPhoto, savePhoto } from '../photos';
import {
  addManualItem,
  addToList,
  clearChecked,
  clearPlan,
  emptyRecipe,
  deleteRecipe,
  loadCook,
  markCooked,
  planToList,
  recipeById,
  recipeToItems,
  saveCook,
  saveRecipe,
  setPlan,
  toggleItem,
  weekDates,
  listAsText,
} from '../store';

export function cookSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/cook${id ? `/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Recipes')}${link('plan', 'Plan')}${link(
    'list',
    'Shopping',
  )}${link('new', 'Add')}</nav>`;
}

const shell = (active: string, body: string): string => `
  <section class="today cook detail">
    <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
    ${cookSubNav(active)}
    ${body}
  </section>`;

const totalMin = (r: Recipe): number => (r.prepMin ?? 0) + (r.cookMin ?? 0);

const card = (r: Recipe): string => `
  <a class="recipe-card tap" href="#/cook/recipe/${r.id}">
    <span class="thumb" data-photo="${r.photoId ?? ''}"></span>
    <b>${r.title}</b>
    <span class="tag">${totalMin(r) ? `${totalMin(r)} min · ` : ''}${r.servings} servings${
      r.cooked ? ` · cooked ${r.cooked}×` : ''
    }</span>
  </a>`;

async function paintThumbs(root: HTMLElement): Promise<void> {
  const wanted = [...root.querySelectorAll<HTMLElement>('[data-photo]')].filter((el) => el.dataset.photo);
  for (const el of wanted) {
    const url = await getPhoto(el.dataset.photo!);
    if (!url) continue;
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode().catch(() => {});
    el.style.backgroundImage = `url(${url})`;
  }
}

/* ---------- 46. browse ---------- */

export function cookHomeView(root: HTMLElement): () => void {
  const state = loadCook();
  let query = '';
  let category = '';

  let shown = 48;
  const draw = (): void => {
    const all = state.recipes.filter((r) => {
      if (category === 'favourites' && !r.favourite) return false;
      if (category === 'want' && !r.wantToCook) return false;
      if (category && !['favourites', 'want'].includes(category) && !r.categories.includes(category))
        return false;
      if (!query) return true;
      const hay = `${r.title} ${r.tags.join(' ')} ${r.ingredients.map((i) => i.item).join(' ')}`.toLowerCase();
      return query.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
    });
    const list = all.slice(0, shown);
    root.querySelector('#recipeList')!.innerHTML = all.length
      ? `<div class="recipe-grid">${list.map(card).join('')}</div>` +
        (all.length > list.length
          ? `<button class="chip tap" id="moreRecipes">show ${all.length - list.length} more</button>`
          : '')
      : '<p class="line sub">Nothing here yet. Add one, paste one, or import a file.</p>';
    root.querySelector('#moreRecipes')?.addEventListener('click', () => {
      shown += 48;
      draw();
    });
    void paintThumbs(root);
  };

  const categories = [...new Set(state.recipes.flatMap((r) => r.categories))];
  const recent = [...state.recipes].slice(0, 6);
  const cooked = [...state.recipes]
    .filter((r) => r.lastCooked)
    .sort((a, b) => (b.lastCooked ?? '').localeCompare(a.lastCooked ?? ''))
    .slice(0, 6);

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section">Cook · ${state.recipes.length} recipes</p>
      <h1>What are we<span><i> · </i>making?</span></h1>
      <input class="dest" id="q" placeholder="search titles, ingredients, tags" aria-label="search">
      <div class="chips" id="cats">
        <button class="chip tap on" data-cat="">all</button>
        <button class="chip tap" data-cat="favourites">★ favourites</button>
        <button class="chip tap" data-cat="want">want to cook</button>
        ${categories.map((c) => `<button class="chip tap" data-cat="${c}">${c}</button>`).join('')}
      </div>
    </div>
    ${
      recent.length
        ? `<div class="panel"><p class="tag">Recently added</p>
           <div class="recipe-row">${recent.map(card).join('')}</div></div>`
        : ''
    }
    ${
      cooked.length
        ? `<div class="panel"><p class="tag">Cooked lately</p>
           <div class="recipe-row">${cooked.map(card).join('')}</div></div>`
        : ''
    }
    <div id="recipeList"></div>`,
  );
  draw();

  root.querySelector('#q')!.addEventListener('input', (ev) => {
    query = (ev.target as HTMLInputElement).value;
    draw();
  });
  root.querySelector('#cats')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-cat]');
    if (!chip) return;
    for (const el of root.querySelectorAll('[data-cat]')) el.classList.remove('on');
    chip.classList.add('on');
    category = chip.dataset.cat ?? '';
    draw();
  });
  return () => {};
}

/* ---------- 44 + 47. one recipe ---------- */

export function recipeView(root: HTMLElement, id: string): () => void {
  const state = loadCook();
  const recipe = recipeById(state, id);
  if (!recipe) {
    location.hash = '#/cook';
    return () => {};
  }
  let servings = recipe.servings;
  let units: 'metric' | 'imperial' = recipe.units ?? 'metric';

  const draw = (): void => {
    const factor = servings / (recipe.servings || 1);
    root.querySelector('#ings')!.innerHTML = recipe.ingredients
      .map((raw) => {
        const scaled = scaleIngredient(raw, factor);
        return `<li>${ingredientLine(units === 'metric' ? convert(scaled, 'metric') : convert(scaled, 'imperial'))}</li>`;
      })
      .join('');
    root.querySelector('#servings')!.textContent = String(servings);
  };

  root.innerHTML = shell(
    '',
    `<div class="hero">
      <p class="tag section"><a class="tap" href="#/cook">← Recipes</a></p>
      <div class="hero-photo" data-photo="${recipe.photoId ?? ''}"></div>
      <h1>${recipe.title}</h1>
      ${recipe.description ? `<p class="line">${recipe.description}</p>` : ''}
      <p class="line sub">${[
        recipe.prepMin ? `${recipe.prepMin} min prep` : '',
        recipe.cookMin ? `${recipe.cookMin} min cooking` : '',
        `${recipe.servings} servings`,
        recipe.cooked ? `cooked ${recipe.cooked}×` : 'never cooked',
      ]
        .filter(Boolean)
        .join(' · ')}</p>
      <div class="chips">
        <button class="chip tap" id="fav">${recipe.favourite ? '★ favourite' : '☆ favourite'}</button>
        <button class="chip tap" id="want">${recipe.wantToCook ? 'in the queue' : '+ want to cook'}</button>
        <a class="chip tap" href="#/cook/edit/${recipe.id}">edit</a>
        <button class="chip tap" id="share">share</button>
        <button class="chip tap" id="print">print</button>
        ${recipe.source ? `<a class="chip tap" href="${recipe.source}" target="_blank" rel="noreferrer">source</a>` : ''}
      </div>
    </div>
    <div class="panel">
      <p class="tag">Ingredients
        <span><button class="link tap" id="minus">−</button>
        <b id="servings">${servings}</b> servings
        <button class="link tap" id="plus">+</button></span></p>
      <div class="chips">
        <button class="chip tap${units === 'metric' ? ' on' : ''}" data-units="metric">metric</button>
        <button class="chip tap${units === 'imperial' ? ' on' : ''}" data-units="imperial">imperial</button>
        <button class="chip tap" id="toList">add to shopping</button>
      </div>
      <ul class="ings" id="ings"></ul>
    </div>
    <div class="panel">
      <p class="tag">Method</p>
      <ol class="steps">${recipe.steps
        .map(
          (s) =>
            `<li>${s.text}${s.timerSec ? ` <span class="tag">${clock(s.timerSec)} timer</span>` : ''}</li>`,
        )
        .join('')}</ol>
      <a class="big tap" href="#/cook/mode/${recipe.id}">COOK IT</a>
    </div>
    ${recipe.notes ? `<div class="panel"><p class="tag">Notes</p><p class="line">${recipe.notes}</p></div>` : ''}
    ${
      recipe.nutrition
        ? `<div class="panel"><p class="tag">Per serving</p>
           <p class="line sub">${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein} g protein ·
           ${recipe.nutrition.carbs} g carbs · ${recipe.nutrition.fat} g fat</p></div>`
        : ''
    }`,
  );
  draw();
  void paintThumbs(root);

  root.querySelector('#plus')!.addEventListener('click', () => {
    servings += 1;
    draw();
  });
  root.querySelector('#minus')!.addEventListener('click', () => {
    servings = Math.max(1, servings - 1);
    draw();
  });
  root.querySelector('.panel')!.addEventListener('click', (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>('[data-units]');
    if (!chip) return;
    units = chip.dataset.units as 'metric' | 'imperial';
    for (const el of root.querySelectorAll('[data-units]')) el.classList.remove('on');
    chip.classList.add('on');
    const next = loadCook();
    const mine = recipeById(next, id);
    if (mine) {
      mine.units = units;
      saveCook(next);
    }
    draw();
  });
  root.querySelector('#toList')!.addEventListener('click', () => {
    addToList('main', recipeToItems(recipe, servings, state.aisles));
    toast(`${recipe.title} added to the list`);
  });
  root.querySelector('#fav')!.addEventListener('click', () => {
    const next = loadCook();
    const mine = recipeById(next, id)!;
    mine.favourite = !mine.favourite;
    saveCook(next);
    recipeView(root, id);
  });
  root.querySelector('#want')!.addEventListener('click', () => {
    const next = loadCook();
    const mine = recipeById(next, id)!;
    mine.wantToCook = !mine.wantToCook;
    saveCook(next);
    recipeView(root, id);
  });
  root.querySelector('#print')!.addEventListener('click', () => window.print());
  root.querySelector('#share')!.addEventListener('click', async () => {
    const text = toMela(recipe);
    const file = new File([text], `${recipe.title}.melarecipe`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: recipe.title });
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    toast('Recipe file saved');
  });
  return () => {};
}

/* ---------- 44 + 45. add and edit ---------- */

export function recipeEditView(root: HTMLElement, id?: string): () => void {
  const state = loadCook();
  const recipe = id ? recipeById(state, id) : undefined;
  const draft: Recipe = recipe ? { ...recipe } : emptyRecipe();

  root.innerHTML = shell(
    id ? '' : 'new',
    `<div class="hero">
      <p class="tag section">${id ? 'Edit' : 'Add a recipe'}</p>
      <input class="dest big-input" id="title" value="${draft.title}" aria-label="title">
      ${
        id
          ? ''
          : `<div class="chips">
              <button class="chip tap" id="fromUrl">from a link</button>
              <label class="chip tap">from a file<input type="file" id="fromFile" hidden
                accept=".melarecipe,.melarecipes,.paprikarecipes,application/json"></label>
              <button class="chip tap" id="fromText">paste text</button>
            </div>`
      }
      <label class="field"><span class="tag">Photo</span>
        <input type="file" id="photo" accept="image/*" capture="environment"></label>
      <label class="field"><span class="tag">Description</span>
        <input class="dest" id="desc" value="${draft.description ?? ''}"></label>
      <div class="field row"><span>Servings</span><input class="num" id="servings" value="${draft.servings}"></div>
      <div class="field row"><span>Prep minutes</span><input class="num" id="prep" value="${draft.prepMin ?? ''}"></div>
      <div class="field row"><span>Cook minutes</span><input class="num" id="cook" value="${draft.cookMin ?? ''}"></div>
      <label class="field"><span class="tag">Ingredients — one per line</span>
        <textarea class="dest area" id="ings" rows="8">${draft.ingredients
          .map((i) => i.raw || ingredientLine(i))
          .join('\n')}</textarea></label>
      <label class="field"><span class="tag">Method — one step per line</span>
        <textarea class="dest area" id="steps" rows="8">${draft.steps.map((s) => s.text).join('\n')}</textarea></label>
      <label class="field"><span class="tag">Categories, comma separated</span>
        <input class="dest" id="cats" value="${draft.categories.join(', ')}"></label>
      <label class="field"><span class="tag">Tags</span>
        <input class="dest" id="tags" value="${draft.tags.join(', ')}"></label>
      <label class="field"><span class="tag">Notes</span>
        <input class="dest" id="notes" value="${draft.notes ?? ''}"></label>
      <div class="row-actions">
        <button class="big tap" id="save">SAVE</button>
        ${id ? '<button class="link tap" id="delete">Delete this recipe</button>' : ''}
      </div>
    </div>`,
  );

  const value = (sel: string): string => (root.querySelector(sel) as HTMLInputElement).value;
  const collect = (): Recipe => ({
    ...draft,
    title: value('#title').trim() || 'Untitled',
    description: value('#desc').trim() || undefined,
    servings: Number(value('#servings')) || 2,
    prepMin: Number(value('#prep')) || undefined,
    cookMin: Number(value('#cook')) || undefined,
    ingredients: value('#ings').split('\n').filter(Boolean).map(parseIngredient),
    steps: value('#steps').split('\n').filter(Boolean).map(parseStep),
    categories: value('#cats').split(',').map((c) => c.trim()).filter(Boolean),
    tags: value('#tags').split(',').map((c) => c.trim()).filter(Boolean),
    notes: value('#notes').trim() || undefined,
  });

  root.querySelector('#save')!.addEventListener('click', () => {
    const next = collect();
    saveRecipe(next);
    location.hash = `#/cook/recipe/${next.id}`;
    toast('Recipe saved');
  });
  root.querySelector('#delete')?.addEventListener('click', () => {
    deleteRecipe(draft.id);
    location.hash = '#/cook';
  });
  root.querySelector('#photo')!.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    draft.photoId = await savePhoto(file);
    toast('Photo added');
  });
  root.querySelector('#fromUrl')?.addEventListener('click', () => {
    const host = sheet(
      'Import from a link',
      `<label class="field"><span class="tag">Recipe address</span>
         <input class="dest" id="url" placeholder="https://…"></label>
       <button class="big tap" id="go">FETCH IT</button>
       <p class="line sub" id="urlNote">Some sites block this. If it fails, copy the page text and paste it instead.</p>`,
    );
    host.querySelector('#go')!.addEventListener('click', async () => {
      const url = (host.querySelector('#url') as HTMLInputElement).value.trim();
      host.querySelector('#urlNote')!.textContent = 'Fetching…';
      const { recipe: found, error } = await importFromUrl(url);
      if (found) {
        saveRecipe(found);
        location.hash = `#/cook/recipe/${found.id}`;
        toast('Imported');
      } else host.querySelector('#urlNote')!.textContent = error ?? 'No luck.';
    });
  });
  root.querySelector('#fromText')?.addEventListener('click', () => {
    const host = sheet(
      'Paste a recipe',
      `<label class="field"><span class="tag">Title, then ingredients, then Method</span>
         <textarea class="dest area" id="blob" rows="12"></textarea></label>
       <button class="big tap" data-done="1" id="parse">READ IT</button>`,
    );
    host.querySelector('#parse')!.addEventListener('click', () => {
      const parsed = importFromText((host.querySelector('#blob') as HTMLTextAreaElement).value);
      saveRecipe(parsed);
      location.hash = `#/cook/recipe/${parsed.id}`;
      toast('Imported');
    });
  });
  root.querySelector('#fromFile')?.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.name.endsWith('.paprikarecipes')) {
        const list = await fromPaprikaFile(file);
        for (const r of list) saveRecipe(r);
        toast(`${list.length} recipes imported`);
      } else {
        const data = JSON.parse(await file.text()) as unknown;
        const list = Array.isArray(data) ? data : [data];
        for (const r of list) saveRecipe(fromMela(r as never));
        toast(`${list.length} imported`);
      }
      location.hash = '#/cook';
    } catch {
      toast('That file did not read');
    }
  });
  return () => {};
}

/* ---------- 48. cook mode ---------- */

export function cookModeView(root: HTMLElement, id: string): () => void {
  const state = loadCook();
  const recipe = recipeById(state, id);
  if (!recipe) {
    location.hash = '#/cook';
    return () => {};
  }
  let step = 0;
  const timers: { name: string; endsAt: number }[] = [];
  let lock: WakeLockSentinel | null = null;
  void (async () => {
    try {
      lock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      lock = null;
    }
  })();

  const draw = (): void => {
    const current = recipe.steps[step];
    root.innerHTML = `
      <section class="cookmode" id="stage">
        <header class="run-head">
          <span class="tag"><a class="tap" href="#/cook/recipe/${recipe.id}">${recipe.title}</a></span>
          <button class="link tap" id="ings">Ingredients</button>
        </header>
        <div class="stage-mid">
          <p class="tag">Step ${step + 1} of ${recipe.steps.length}</p>
          <p class="stepbig">${current?.text ?? 'Done. Eat.'}</p>
          ${current?.timerSec ? `<button class="chip tap" id="startTimer">start ${clock(current.timerSec)} timer</button>` : ''}
        </div>
        <div class="timers" id="timers"></div>
        <footer class="run-foot">
          <div class="dots">${recipe.steps
            .map((_, i) => `<i class="dot-step${i === step ? ' on' : ''}"></i>`)
            .join('')}</div>
          <div class="cook-nav">
            <button class="chip tap" id="prev">back</button>
            ${
              step < recipe.steps.length - 1
                ? '<button class="big tap" id="next">NEXT</button>'
                : '<button class="big tap" id="done">COOKED IT</button>'
            }
          </div>
        </footer>
      </section>`;
    paintTimers();
    wire();
  };

  const paintTimers = (): void => {
    const host = root.querySelector('#timers');
    if (!host) return;
    host.innerHTML = timers
      .map((t, i) => {
        const left = Math.max(0, (t.endsAt - Date.now()) / 1000);
        return `<div class="timer-chip${left <= 0 ? ' rung' : ''}"><b>${clock(left)}</b>
          <span>${t.name}</span><button class="link tap" data-stop="${i}">stop</button></div>`;
      })
      .join('');
  };

  const wire = (): void => {
    root.querySelector('#next')?.addEventListener('click', () => {
      step = Math.min(recipe.steps.length - 1, step + 1);
      draw();
    });
    root.querySelector('#prev')?.addEventListener('click', () => {
      step = Math.max(0, step - 1);
      draw();
    });
    root.querySelector('#done')?.addEventListener('click', () => {
      markCooked(recipe.id);
      toast('Nice one');
      location.hash = `#/cook/recipe/${recipe.id}`;
    });
    root.querySelector('#startTimer')?.addEventListener('click', () => {
      const seconds = recipe.steps[step].timerSec ?? 60;
      timers.push({ name: `step ${step + 1}`, endsAt: Date.now() + seconds * 1000 });
      paintTimers();
      toast('Timer running');
    });
    root.querySelector('#ings')?.addEventListener('click', () => {
      sheet(
        'Ingredients',
        `<ul class="ings">${recipe.ingredients.map((i) => `<li>${ingredientLine(i)}</li>`).join('')}</ul>`,
      );
    });
    root.querySelector('#timers')?.addEventListener('click', (ev) => {
      const stop = (ev.target as HTMLElement).closest<HTMLElement>('[data-stop]');
      if (!stop) return;
      timers.splice(Number(stop.dataset.stop), 1);
      paintTimers();
    });
    root.querySelector('#stage')?.addEventListener('keydown', (ev) => {
      if ((ev as KeyboardEvent).key === 'ArrowRight') root.querySelector<HTMLElement>('#next')?.click();
      if ((ev as KeyboardEvent).key === 'ArrowLeft') root.querySelector<HTMLElement>('#prev')?.click();
    });
  };

  draw();
  const ticker = window.setInterval(() => {
    const rung = timers.filter((t) => t.endsAt <= Date.now());
    paintTimers();
    if (rung.length) {
      void import('../../audio').then(({ beep }) => beep('done'));
      for (const t of rung) timers.splice(timers.indexOf(t), 1);
      toast('Timer');
    }
  }, 500);

  return () => {
    clearInterval(ticker);
    void lock?.release();
  };
}

/* ---------- 49. shopping ---------- */

export function shoppingView(root: HTMLElement): () => void {
  const state = loadCook();
  const list = state.lists[0];
  const byAisle = new Map<string, { item: (typeof list.items)[number]; index: number }[]>();
  list.items.forEach((item, index) => {
    const aisle = item.aisle || aisleFor(item.item, state.aisles);
    byAisle.set(aisle, [...(byAisle.get(aisle) ?? []), { item, index }]);
  });

  root.innerHTML = shell(
    'list',
    `<div class="hero">
      <p class="tag section">Shopping</p>
      <h1>${list.items.filter((i) => !i.checked).length}<span><i> · </i>to buy</span></h1>
      <input class="dest" id="manual" placeholder="add an item and press enter" aria-label="add item">
      <div class="chips">
        <button class="chip tap" id="fromPlan">add this week's plan</button>
        <button class="chip tap" id="clear">clear ticked</button>
        <button class="chip tap" id="shareList">share</button>
      </div>
    </div>
    ${
      list.items.length
        ? [...byAisle.entries()]
            .map(
              ([aisle, entries]) => `<div class="panel">
                <p class="tag">${aisle}</p>
                ${entries
                  .map(
                    ({ item, index }) => `<label class="sw tap shop-row${item.checked ? ' got' : ''}">
                      <input type="checkbox" data-item="${index}" ${item.checked ? 'checked' : ''}>
                      <span>${[item.qty ? prettyQty(item.qty) : '', item.unit ?? '', item.item]
                        .filter(Boolean)
                        .join(' ')}</span></label>`,
                  )
                  .join('')}
              </div>`,
            )
            .join('')
        : '<p class="line sub">Nothing on the list.</p>'
    }`,
  );

  root.querySelector('#manual')!.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key !== 'Enter') return;
    const input = ev.target as HTMLInputElement;
    if (!input.value.trim()) return;
    addManualItem(list.id, input.value.trim());
    shoppingView(root);
  });
  root.firstElementChild!.addEventListener('change', (ev) => {
    const box = (ev.target as HTMLElement).closest<HTMLInputElement>('[data-item]');
    if (!box) return;
    toggleItem(list.id, Number(box.dataset.item));
    shoppingView(root);
  });
  root.querySelector('#clear')!.addEventListener('click', () => {
    clearChecked(list.id);
    shoppingView(root);
    toast('Cleared');
  });
  root.querySelector('#fromPlan')!.addEventListener('click', () => {
    addToList(list.id, planToList(loadCook(), weekDates()));
    shoppingView(root);
    toast("This week's plan added");
  });
  root.querySelector('#shareList')!.addEventListener('click', async () => {
    const text = listAsText(loadCook().lists[0]);
    if (navigator.share) await navigator.share({ text, title: 'Shopping' });
    else {
      await navigator.clipboard?.writeText(text);
      toast('List copied');
    }
  });
  return () => {};
}

/* ---------- 50. the planner ---------- */

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function plannerView(root: HTMLElement): () => void {
  const state = loadCook();
  const dates = weekDates();
  const entryFor = (date: string, slot: Slot) =>
    state.plan.find((p) => p.date === date && p.slot === slot);

  root.innerHTML = shell(
    'plan',
    `<div class="hero">
      <p class="tag section">This week</p>
      <h1>Meal plan<span><i> · </i>${state.plan.filter((p) => dates.includes(p.date)).length} planned</span></h1>
      <div class="chips">
        <button class="chip tap" id="toShop">plan → shopping list</button>
      </div>
    </div>
    <div class="planner">
      ${dates
        .map((date) => {
          const d = new Date(`${date}T12:00:00`);
          return `<div class="planday">
            <p class="tag">${d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</p>
            ${SLOTS.map((slot) => {
              const entry = entryFor(date, slot);
              const recipe = entry ? recipeById(state, entry.recipeId) : undefined;
              return `<button class="slot tap${recipe ? ' filled' : ''}" data-date="${date}" data-slot="${slot}">
                <span class="tag">${slot}</span>
                <b>${recipe ? recipe.title : '+'}</b>
                ${recipe ? `<span class="link" data-cooked="${recipe.id}">cooked it</span>` : ''}
              </button>`;
            }).join('')}
          </div>`;
        })
        .join('')}
    </div>`,
  );

  root.querySelector('.planner')!.addEventListener('click', (ev) => {
    const cooked = (ev.target as HTMLElement).closest<HTMLElement>('[data-cooked]');
    if (cooked) {
      ev.stopPropagation();
      markCooked(cooked.dataset.cooked!);
      void import('../../fuel/store').then(({ logRecipe }) => logRecipe(cooked.dataset.cooked!));
      toast('Logged to Fuel');
      return;
    }
    const slot = (ev.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!slot) return;
    const date = slot.dataset.date!;
    const which = slot.dataset.slot as Slot;
    const host = sheet(
      `${which} · ${new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}`,
      `<input class="dest" id="pq" placeholder="search recipes" aria-label="search">
       <div class="cards" id="pickList"></div>
       <button class="link tap" data-done="1" id="clearSlot">clear this slot</button>`,
    );
    const drawPick = (q = ''): void => {
      host.querySelector('#pickList')!.innerHTML = loadCook()
        .recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 20)
        .map(
          (r) => `<button class="card tap" data-done="1" data-pick="${r.id}"><b>${r.title}</b>
            <span class="tag">${r.servings} servings</span></button>`,
        )
        .join('');
    };
    drawPick();
    host.querySelector('#pq')!.addEventListener('input', (e2) =>
      drawPick((e2.target as HTMLInputElement).value),
    );
    host.querySelector('#pickList')!.addEventListener('click', (e2) => {
      const pick = (e2.target as HTMLElement).closest<HTMLElement>('[data-pick]');
      if (!pick) return;
      setPlan({ date, slot: which, recipeId: pick.dataset.pick! });
      plannerView(root);
      toast('Planned');
    });
    host.querySelector('#clearSlot')!.addEventListener('click', () => {
      clearPlan(date, which);
      plannerView(root);
    });
  });

  root.querySelector('#toShop')!.addEventListener('click', () => {
    addToList('main', planToList(loadCook(), dates));
    location.hash = '#/cook/list';
    toast('Shopping list built');
  });
  return () => {};
}
