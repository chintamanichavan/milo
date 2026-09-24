import { parseIngredient, parseStep, parseText, type Recipe } from './model';
import { emptyRecipe } from './store';

interface JsonLdRecipe {
  name?: string;
  description?: string;
  recipeYield?: string | number;
  recipeIngredient?: string[];
  recipeInstructions?: unknown;
  totalTime?: string;
  prepTime?: string;
  cookTime?: string;
  keywords?: string;
  recipeCategory?: string | string[];
}

const minutes = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const h = /(\d+)H/.exec(iso)?.[1];
  const m = /(\d+)M/.exec(iso)?.[1];
  return (Number(h ?? 0) * 60 + Number(m ?? 0)) || undefined;
};

const instructions = (value: unknown): string[] => {
  if (typeof value === 'string') return value.split(/\r?\n/).filter(Boolean);
  if (Array.isArray(value))
    return value.flatMap((v) =>
      typeof v === 'string'
        ? [v]
        : typeof v === 'object' && v && 'text' in v
          ? [String((v as { text: string }).text)]
          : 'itemListElement' in (v as object)
            ? instructions((v as { itemListElement: unknown }).itemListElement)
            : [],
    );
  return [];
};

export function fromJsonLd(node: JsonLdRecipe): Recipe {
  const recipe = emptyRecipe();
  recipe.title = node.name ?? recipe.title;
  recipe.description = node.description;
  recipe.servings = Number(String(node.recipeYield ?? '2').replace(/\D/g, '')) || 2;
  recipe.ingredients = (node.recipeIngredient ?? []).map(parseIngredient);
  recipe.steps = instructions(node.recipeInstructions).map(parseStep);
  recipe.prepMin = minutes(node.prepTime);
  recipe.cookMin = minutes(node.cookTime) ?? minutes(node.totalTime);
  recipe.tags = node.keywords ? node.keywords.split(',').map((k) => k.trim()) : [];
  recipe.categories = Array.isArray(node.recipeCategory)
    ? node.recipeCategory
    : node.recipeCategory
      ? [node.recipeCategory]
      : [];
  return recipe;
}

/** Pull schema.org Recipe out of a page's HTML. */
export function fromHtml(html: string, url?: string): Recipe | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent ?? 'null') as unknown;
      const nodes = Array.isArray(data) ? data : [data, ...(((data as { '@graph'?: unknown[] })['@graph']) ?? [])];
      for (const node of nodes) {
        const type = (node as { '@type'?: string | string[] })?.['@type'];
        const isRecipe = Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe';
        if (isRecipe) {
          const recipe = fromJsonLd(node as JsonLdRecipe);
          recipe.source = url;
          return recipe;
        }
      }
    } catch {
      /* next script */
    }
  }
  // microdata fallback
  const scope = doc.querySelector('[itemtype*="Recipe"]');
  if (scope) {
    const recipe = emptyRecipe();
    recipe.title = scope.querySelector('[itemprop="name"]')?.textContent?.trim() ?? recipe.title;
    recipe.ingredients = [...scope.querySelectorAll('[itemprop="recipeIngredient"]')].map((el) =>
      parseIngredient(el.textContent?.trim() ?? ''),
    );
    recipe.steps = [...scope.querySelectorAll('[itemprop="recipeInstructions"]')].map((el) =>
      parseStep(el.textContent?.trim() ?? ''),
    );
    recipe.source = url;
    if (recipe.ingredients.length) return recipe;
  }
  return null;
}

/** Many sites block cross-origin reads; when that happens we say so plainly. */
export async function importFromUrl(url: string): Promise<{ recipe?: Recipe; error?: string }> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return { error: `That site answered ${response.status}.` };
    const recipe = fromHtml(await response.text(), url);
    return recipe ? { recipe } : { error: 'No recipe markup on that page — paste the text instead.' };
  } catch {
    return { error: 'This site blocks direct import — paste the text instead.' };
  }
}

export const importFromText = (text: string): Recipe => {
  const parsed = parseText(text);
  return { ...emptyRecipe(), ...parsed } as Recipe;
};

/* ---------- other apps' files ---------- */

interface MelaFile {
  title?: string;
  text?: string;
  yield?: string;
  ingredients?: string;
  instructions?: string;
  notes?: string;
  link?: string;
  categories?: string[];
  favorite?: boolean;
  prepTime?: string;
  cookTime?: string;
  /** base64 JPEGs, as Mela writes them */
  images?: string[];
}

export function fromMela(json: MelaFile): Recipe {
  const recipe = emptyRecipe();
  recipe.title = json.title ?? recipe.title;
  recipe.description = json.text;
  recipe.servings = Number(String(json.yield ?? '2').replace(/\D/g, '')) || 2;
  recipe.ingredients = (json.ingredients ?? '').split(/\r?\n/).filter(Boolean).map(parseIngredient);
  recipe.steps = (json.instructions ?? '').split(/\r?\n/).filter(Boolean).map(parseStep);
  recipe.notes = json.notes;
  recipe.source = json.link;
  recipe.categories = json.categories ?? [];
  recipe.favourite = json.favorite;
  return recipe;
}

const toBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

/** a .melarecipe with its photos in it, the way Mela itself shares one */
export async function toMelaWithPhotos(
  recipe: Recipe,
  getBlob: (id: string) => Promise<Blob | null>,
): Promise<string> {
  const ids = recipe.photoIds?.length ? recipe.photoIds : recipe.photoId ? [recipe.photoId] : [];
  const images: string[] = [];
  for (const id of ids) {
    const blob = await getBlob(id);
    if (blob) images.push(await toBase64(blob));
  }
  return JSON.stringify({ ...JSON.parse(toMela(recipe)), images }, null, 2);
}

/** read one back, photos and all */
export async function fromMelaWithPhotos(json: MelaFile, put: (blob: Blob) => Promise<string>): Promise<Recipe> {
  const recipe = fromMela(json);
  const ids: string[] = [];
  for (const b64 of json.images ?? []) {
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      ids.push(await put(new Blob([bytes], { type: 'image/jpeg' })));
    } catch {
      /* a broken image is skipped, not fatal */
    }
  }
  if (ids.length) {
    recipe.photoIds = ids;
    recipe.photoId = ids[0];
  }
  return recipe;
}

export const toMela = (recipe: Recipe): string =>
  JSON.stringify(
    {
      id: recipe.id,
      title: recipe.title,
      text: recipe.description ?? '',
      yield: String(recipe.servings),
      ingredients: recipe.ingredients.map((i) => (i.header ? `# ${i.item}` : i.raw || i.item)).join('\n'),
      instructions: recipe.steps.map((s) => (s.header ? `# ${s.text}` : s.text)).join('\n'),
      notes: recipe.notes ?? '',
      link: recipe.source ?? '',
      categories: recipe.categories,
      favorite: !!recipe.favourite,
    },
    null,
    2,
  );

interface PaprikaFile {
  name?: string;
  servings?: string;
  ingredients?: string;
  directions?: string;
  notes?: string;
  source_url?: string;
  categories?: string[];
  prep_time?: string;
  cook_time?: string;
}

export function fromPaprika(json: PaprikaFile): Recipe {
  const recipe = emptyRecipe();
  recipe.title = json.name ?? recipe.title;
  recipe.servings = Number(String(json.servings ?? '2').replace(/\D/g, '')) || 2;
  recipe.ingredients = (json.ingredients ?? '').split(/\r?\n/).filter(Boolean).map(parseIngredient);
  recipe.steps = (json.directions ?? '').split(/\r?\n/).filter(Boolean).map(parseStep);
  recipe.notes = json.notes;
  recipe.source = json.source_url;
  recipe.categories = json.categories ?? [];
  return recipe;
}

/** .paprikarecipes files are gzipped JSON; the browser can unzip them itself. */
export async function fromPaprikaFile(file: File): Promise<Recipe[]> {
  const buffer = await file.arrayBuffer();
  try {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    const data = JSON.parse(text) as PaprikaFile | PaprikaFile[];
    return (Array.isArray(data) ? data : [data]).map(fromPaprika);
  } catch {
    const text = new TextDecoder().decode(buffer);
    const data = JSON.parse(text) as PaprikaFile | PaprikaFile[];
    return (Array.isArray(data) ? data : [data]).map(fromPaprika);
  }
}
