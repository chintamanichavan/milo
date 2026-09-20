export interface Fix {
  lat: number;
  lon: number;
  t: number;
}

export interface TrackSummary {
  distanceKm: number;
  path: [number, number, number][];
  /** seconds per km, by segment kind */
  runPace: number;
  walkPace: number;
}

const R = 6371;

export function haversineKm(a: Fix, b: Fix): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Follows the run, and keeps distance per segment kind so splits are honest. */
export class Tracker {
  private watch = 0;
  private fixes: Fix[] = [];
  private kindAt: ('run' | 'walk')[] = [];
  private kind: 'run' | 'walk' = 'walk';
  distanceKm = 0;
  runKm = 0;
  walkKm = 0;
  runSec = 0;
  walkSec = 0;
  lastSpeedKmh = 0;

  start(onFix?: () => void): boolean {
    if (!navigator.geolocation) return false;
    this.watch = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
        const last = this.fixes[this.fixes.length - 1];
        if (last) {
          const step = haversineKm(last, fix);
          const hours = (fix.t - last.t) / 3_600_000;
          // a runner never jumps 150 m between fixes; anything bigger is the GPS lying
          if (step < 0.15) {
            this.distanceKm += step;
            this.lastSpeedKmh = hours > 0 ? step / hours : this.lastSpeedKmh;
            if (this.kind === 'run') this.runKm += step;
            else this.walkKm += step;
          }
        }
        this.fixes.push(fix);
        this.kindAt.push(this.kind);
        onFix?.();
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10_000 },
    );
    return true;
  }

  /** the engine tells the tracker what the runner is doing */
  setKind(kind: 'run' | 'walk', elapsedDelta: number): void {
    if (this.kind === 'run') this.runSec += elapsedDelta;
    else this.walkSec += elapsedDelta;
    this.kind = kind;
  }

  tickSeconds(delta: number): void {
    if (this.kind === 'run') this.runSec += delta;
    else this.walkSec += delta;
  }

  stop(): TrackSummary {
    if (this.watch) navigator.geolocation.clearWatch(this.watch);
    this.watch = 0;
    const start = this.fixes[0]?.t ?? Date.now();
    return {
      distanceKm: this.distanceKm,
      path: this.fixes.map((f) => [
        Number(f.lat.toFixed(5)),
        Number(f.lon.toFixed(5)),
        Math.round((f.t - start) / 1000),
      ]),
      runPace: this.runKm > 0 ? this.runSec / this.runKm : 0,
      walkPace: this.walkKm > 0 ? this.walkSec / this.walkKm : 0,
    };
  }
}

export const KM_PER_MILE = 1.609_344;

export const distanceLabel = (km: number, units: 'mi' | 'km'): string =>
  units === 'km' ? `${km.toFixed(2)} km` : `${(km / KM_PER_MILE).toFixed(2)} mi`;

/** seconds per km → "9:42 /mi" */
export function paceLabel(secPerKm: number, units: 'mi' | 'km'): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return '—';
  const sec = units === 'km' ? secPerKm : secPerKm * KM_PER_MILE;
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.round(sec % 60)).padStart(2, '0')} /${units}`;
}

/** An offline route drawing: the path scaled to fit a box. */
export function routeSvg(path: [number, number, number][], size = 300): string {
  if (path.length < 2) return '';
  const lats = path.map((p) => p[0]);
  const lons = path.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const spanLat = maxLat - minLat || 1e-5;
  const spanLon = maxLon - minLon || 1e-5;
  const scale = Math.min((size - 16) / spanLon, (size * 0.6 - 16) / spanLat);
  const points = path
    .map(([lat, lon]) => `${(8 + (lon - minLon) * scale).toFixed(1)},${(size * 0.6 - 8 - (lat - minLat) * scale).toFixed(1)}`)
    .join(' ');
  return `<svg class="route-map" viewBox="0 0 ${size} ${size * 0.6}" width="100%" aria-label="route">
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
