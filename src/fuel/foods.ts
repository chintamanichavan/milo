export interface Food {
  i: number | string;
  n: string;
  g: string;
  k: number;
  p: number;
  c: number;
  f: number;
  m: number[];
  s: [string, number][];
  /** set for foods you made up or scanned */
  custom?: boolean;
  brand?: string;
  barcode?: string;
}

interface Bundle {
  micros: string[];
  foods: Food[];
}

let bundle: Bundle | null = null;
let loading: Promise<Bundle> | null = null;

/** The USDA table is half a megabyte gzipped, so it loads once, on demand. */
export async function loadFoods(): Promise<Bundle> {
  if (bundle) return bundle;
  if (!loading)
    loading = (async () => {
      const response = await fetch('/foods.json.gz');
      const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(stream).text();
      bundle = JSON.parse(text) as Bundle;
      return bundle;
    })();
  return loading;
}

export const microNames = (): string[] => bundle?.micros ?? [];

const trigrams = (text: string): string[] => {
  const clean = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  const out: string[] = [];
  for (let i = 0; i < clean.length - 2; i++) out.push(clean.slice(i, i + 3));
  return out;
};

let index: Map<string, number[]> | null = null;

function buildIndex(foods: Food[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  foods.forEach((food, i) => {
    for (const gram of new Set(trigrams(food.n))) {
      const list = map.get(gram);
      if (list) list.push(i);
      else map.set(gram, [i]);
    }
  });
  return map;
}

/** Trigram search: forgiving about spelling, fast enough on a phone. */
export async function searchFoods(query: string, extra: Food[] = [], limit = 40): Promise<Food[]> {
  const { foods } = await loadFoods();
  const all = [...extra, ...foods];
  if (!query.trim()) return all.slice(0, limit);
  index = index ?? buildIndex(foods);
  const scores = new Map<number, number>();
  const grams = new Set(trigrams(query));
  for (const gram of grams)
    for (const i of index.get(gram) ?? []) scores.set(i, (scores.get(i) ?? 0) + 1);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const customHits = extra.filter((food) =>
    words.every((w) => food.n.toLowerCase().includes(w)),
  );
  const ranked = [...scores.entries()]
    .map(([i, score]) => {
      const food = foods[i];
      const name = food.n.toLowerCase();
      const exact = words.every((w) => name.includes(w)) ? 40 : 0;
      const head = name.startsWith(words[0] ?? '') ? 15 : 0;
      return { food, score: score / grams.size + exact + head - food.n.length / 200 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.food);
  return [...customHits, ...ranked].slice(0, limit);
}

export const foodById = async (id: number | string, extra: Food[] = []): Promise<Food | undefined> => {
  const custom = extra.find((f) => String(f.i) === String(id));
  if (custom) return custom;
  const { foods } = await loadFoods();
  return foods.find((f) => String(f.i) === String(id));
};

/* ---------- barcodes ---------- */

export interface Scanned {
  code: string;
}

/** BarcodeDetector where the browser has it, ZXing everywhere else. */
export async function scanBarcode(video: HTMLVideoElement): Promise<string | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  video.srcObject = stream;
  await video.play();
  const stop = (): void => stream.getTracks().forEach((t) => t.stop());
  const Detector = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (s: unknown) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (Detector) {
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    for (let i = 0; i < 200; i++) {
      const found = await detector.detect(video).catch(() => []);
      if (found.length) {
        stop();
        return found[0].rawValue;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    stop();
    return null;
  }
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
  const result = await reader.decodeOnceFromVideoElement(video).catch(() => null);
  stop();
  return result?.getText() ?? null;
}

interface OffProduct {
  product?: {
    product_name?: string;
    brands?: string;
    nutriments?: Record<string, number>;
    serving_quantity?: number;
  };
  status?: number;
}

/** Open Food Facts covers branded items; results are cached locally. */
export async function lookupBarcode(code: string): Promise<Food | null> {
  const cacheKey = `c25k.off.${code}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached) as Food;
  if (!navigator.onLine) return null;
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const data = (await response.json()) as OffProduct;
    if (!data.product?.product_name) return null;
    const n = data.product.nutriments ?? {};
    const food: Food = {
      i: `off-${code}`,
      n: data.product.product_name,
      g: 'branded',
      brand: data.product.brands,
      barcode: code,
      k: Math.round(n['energy-kcal_100g'] ?? 0),
      p: n.proteins_100g ?? 0,
      c: n.carbohydrates_100g ?? 0,
      f: n.fat_100g ?? 0,
      m: [],
      s: data.product.serving_quantity ? [['serving', data.product.serving_quantity]] : [],
      custom: true,
    };
    localStorage.setItem(cacheKey, JSON.stringify(food));
    return food;
  } catch {
    return null;
  }
}
