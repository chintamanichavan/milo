export type Tier = 'high' | 'medium' | 'low';

export interface Budget {
  /** device pixel ratio cap for the globe canvas */
  dpr: number;
  sphereSegments: [number, number];
  clouds: boolean;
  /** terrain normal map: real hillshading on the mountains */
  normals: boolean;
  water: boolean;
  stars: number;
  atmosphere: boolean;
  /** how hard the city lights glow; the top tier gets a little bloom for free */
  nightGain: number;
  /** finest satellite tile zoom this tier will stream */
  tileZoom: number;
}

export const BUDGETS: Record<Tier, Budget> = {
  high: { dpr: 2, sphereSegments: [128, 80], clouds: true, normals: true, water: true, stars: 2400, atmosphere: true, nightGain: 2.1, tileZoom: 9 },
  medium: { dpr: 1.5, sphereSegments: [96, 64], clouds: true, normals: true, water: true, stars: 1200, atmosphere: true, nightGain: 1.7, tileZoom: 7 },
  low: { dpr: 1, sphereSegments: [64, 48], clouds: false, normals: false, water: false, stars: 600, atmosphere: true, nightGain: 1.4, tileZoom: 6 },
};

const KEY = 'c25k.tier';
const FX_KEY = 'c25k.effects';
const BENCH_KEY = 'c25k.effects.bench';

const guess = (): Tier => {
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const phone = Math.min(window.innerWidth, window.innerHeight) < 700;
  if (memory >= 6 && cores >= 6 && !phone) return 'high';
  if (memory >= 4 && cores >= 4) return 'medium';
  return 'low';
};

export function tier(): Tier {
  const saved = localStorage.getItem(KEY) as Tier | null;
  if (saved === 'high' || saved === 'medium' || saved === 'low') return saved;
  const picked = guess();
  localStorage.setItem(KEY, picked);
  return picked;
}

export const setTier = (next: Tier): void => localStorage.setItem(KEY, next);

export const budget = (): Budget => BUDGETS[tier()];

/** the extras: lovely, costly, and only on the top tier */
export interface Effects {
  /** ripples that break up the sun's glint on the sea */
  waves: boolean;
  /** the bright side of the terminator bleeds a little light, through a post chain */
  bloom: boolean;
  /** subpixel edge smoothing, since the post chain loses the hardware kind */
  smaa: boolean;
  /** the sun throws ghosts across the lens */
  flare: boolean;
}

const phone = (): boolean => Math.min(window.innerWidth, window.innerHeight) < 700;

/** a phone earns the extras by holding a full frame rate at full resolution once */
export const benchmarked = (): boolean => localStorage.getItem(BENCH_KEY) === 'pass';

export function markBenchmark(fps: number, scale: number): void {
  if (localStorage.getItem(BENCH_KEY)) return;
  localStorage.setItem(BENCH_KEY, fps >= 55 && scale >= 1 ? 'pass' : 'fail');
}

export function effects(): Effects {
  const on = tier() === 'high' && (!phone() || benchmarked());
  // waves and the flare are free; the post chain is not, so it waits to be asked
  const base: Effects = { waves: on, bloom: false, smaa: false, flare: on };
  try {
    return { ...base, ...(JSON.parse(localStorage.getItem(FX_KEY) ?? '{}') as Partial<Effects>) };
  } catch {
    return base;
  }
}

export function setEffect(name: keyof Effects, on: boolean): void {
  const saved = JSON.parse(localStorage.getItem(FX_KEY) ?? '{}') as Partial<Effects>;
  localStorage.setItem(FX_KEY, JSON.stringify({ ...saved, [name]: on }));
}

/**
 * Watches frame times and steps the renderer down a notch when it cannot keep up.
 * Dynamic resolution first, then the tier itself.
 */
export class Governor {
  private times: number[] = [];
  private last = 0;
  private good = 0;
  private patience = 8;
  scale = 1;

  constructor(
    private readonly onScale: (scale: number) => void,
    private readonly target = 18,
  ) {}

  frame(now: number): void {
    if (this.last) {
      const dt = now - this.last;
      if (dt > 0 && dt < 500) this.times.push(dt);
    }
    this.last = now;
    if (this.times.length < 45) return;
    const mean = this.times.reduce((s, x) => s + x, 0) / this.times.length;
    this.times.length = 0;
    if (mean > this.target) {
      this.good = 0;
      if (this.scale > 0.6) {
        this.scale = Math.max(0.6, this.scale - 0.15);
        this.onScale(this.scale);
        // it failed at that size, so wait longer before trying again
        this.patience = Math.min(64, this.patience * 2);
      }
      return;
    }
    // a screen caps us at its own refresh, so keeping up with the cadence is as
    // fast as it gets: wait for a stretch of it, then take some sharpness back
    this.good += mean < this.target - 1 ? 1 : 0;
    if (this.scale < 1 && this.good >= this.patience) {
      this.good = 0;
      this.scale = Math.min(1, this.scale + 0.1);
      this.onScale(this.scale);
    }
  }

  fps(): number {
    if (this.times.length === 0) return 0;
    const mean = this.times.reduce((s, x) => s + x, 0) / this.times.length;
    return Math.round(1000 / mean);
  }
}
