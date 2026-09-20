import {
  aisleFor,
  parseIngredient,
  scaleIngredient,
  type CookState,
  type PlanEntry,
  type Recipe,
  type ShoppingItem,
  type ShoppingList,
  type Slot,
} from './model';

export const COOK_KEY = 'c25k.cook.v1';

const blank = (): CookState => ({
  recipes: [],
  lists: [{ id: 'main', name: 'Shopping', items: [] }],
  plan: [],
  aisles: {},
});

export function loadCook(): CookState {
  try {
    const raw = localStorage.getItem(COOK_KEY);
    if (!raw) return blank();
    return { ...blank(), ...(JSON.parse(raw) as Partial<CookState>) };
  } catch {
    return blank();
  }
}

export function saveCook(state: CookState): void {
  localStorage.setItem(COOK_KEY, JSON.stringify(state));
}

export const recipeById = (state: CookState, id: string): Recipe | undefined =>
  state.recipes.find((r) => r.id === id);

export function saveRecipe(recipe: Recipe): void {
  const state = loadCook();
  const at = state.recipes.findIndex((r) => r.id === recipe.id);
  if (at >= 0) state.recipes[at] = recipe;
  else state.recipes.unshift(recipe);
  saveCook(state);
}

export function deleteRecipe(id: string): void {
  const state = loadCook();
  state.recipes = state.recipes.filter((r) => r.id !== id);
  state.plan = state.plan.filter((p) => p.recipeId !== id);
  saveCook(state);
}

export const emptyRecipe = (): Recipe => ({
  id: `r-${Date.now()}`,
  title: 'New recipe',
  servings: 2,
  ingredients: [],
  steps: [],
  categories: [],
  tags: [],
  cooked: 0,
});

export function markCooked(id: string): void {
  const state = loadCook();
  const recipe = recipeById(state, id);
  if (!recipe) return;
  recipe.cooked += 1;
  recipe.lastCooked = new Date().toISOString();
  saveCook(state);
}

/* ---------- shopping ---------- */

export function addToList(listId: string, items: ShoppingItem[]): void {
  const state = loadCook();
  const list = state.lists.find((l) => l.id === listId) ?? state.lists[0];
  for (const incoming of items) {
    const match = list.items.find(
      (x) => x.item.toLowerCase() === incoming.item.toLowerCase() && x.unit === incoming.unit,
    );
    if (match && match.qty && incoming.qty) match.qty += incoming.qty;
    else if (!match) list.items.push(incoming);
  }
  saveCook(state);
}

export function recipeToItems(recipe: Recipe, servings: number, aisles: Record<string, string>): ShoppingItem[] {
  const factor = servings / (recipe.servings || 1);
  return recipe.ingredients
    .map((raw) => scaleIngredient(raw, factor))
    .filter((ing) => ing.item)
    .map((ing) => ({
      item: ing.item,
      qty: ing.qty,
      unit: ing.unit,
      aisle: aisleFor(ing.item, aisles),
      fromRecipe: recipe.title,
    }));
}

export function toggleItem(listId: string, index: number): void {
  const state = loadCook();
  const list = state.lists.find((l) => l.id === listId);
  if (!list?.items[index]) return;
  list.items[index].checked = !list.items[index].checked;
  saveCook(state);
}

export function clearChecked(listId: string): void {
  const state = loadCook();
  const list = state.lists.find((l) => l.id === listId);
  if (!list) return;
  list.items = list.items.filter((i) => !i.checked);
  saveCook(state);
}

export function addManualItem(listId: string, text: string): void {
  const parsed = parseIngredient(text);
  addToList(listId, [
    { item: parsed.item, qty: parsed.qty, unit: parsed.unit, aisle: aisleFor(parsed.item) },
  ]);
}

export const listAsText = (list: ShoppingList): string =>
  list.items
    .filter((i) => !i.checked)
    .map((i) => `- ${[i.qty, i.unit, i.item].filter(Boolean).join(' ')}`)
    .join('\n');

/* ---------- the planner ---------- */

export function setPlan(entry: PlanEntry): void {
  const state = loadCook();
  state.plan = state.plan.filter((p) => !(p.date === entry.date && p.slot === entry.slot));
  state.plan.push(entry);
  saveCook(state);
}

export function clearPlan(date: string, slot: Slot): void {
  const state = loadCook();
  state.plan = state.plan.filter((p) => !(p.date === date && p.slot === slot));
  saveCook(state);
}

export function weekDates(offset = 0): string[] {
  const monday = new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString('en-CA');
  });
}

/** everything planned this week, merged into one shop */
export function planToList(state: CookState, dates: string[]): ShoppingItem[] {
  const items: ShoppingItem[] = [];
  for (const entry of state.plan.filter((p) => dates.includes(p.date))) {
    const recipe = recipeById(state, entry.recipeId);
    if (recipe) items.push(...recipeToItems(recipe, entry.servings ?? recipe.servings, state.aisles));
  }
  return items;
}
