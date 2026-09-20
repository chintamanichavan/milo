export type Tier = 'high' | 'medium' | 'low';

export interface Budget {
  /** device pixel ratio cap for the globe canvas */
  dpr: number;
  sphereSegments: [number, number];
  clouds: boolean;
  topo: boolean;
  water: boolean;
  stars: number;
  atmosphere: boolean;
}

export const BUDGETS: Record<Tier, Budget> = {
  high: { dpr: 2, sphereSegments: [128, 80], clouds: true, topo: true, water: true, stars: 2400, atmosphere: true },
  medium: { dpr: 1.5, sphereSegments: [96, 64], clouds: true, topo: false, water: true, stars: 1200, atmosphere: true },
  low: { dpr: 1, sphereSegments: [64, 48], clouds: false, topo: false, water: false, stars: 600, atmosphere: true },
};

const KEY = 'c25k.tier';

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

/**
 * Watches frame times and steps the renderer down a notch when it cannot keep up.
 * Dynamic resolution first, then the tier itself.
 */
export class Governor {
  private times: number[] = [];
  private last = 0;
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
    if (mean > this.target && this.scale > 0.6) {
      this.scale = Math.max(0.6, this.scale - 0.15);
      this.onScale(this.scale);
    } else if (mean < this.target * 0.6 && this.scale < 1) {
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
