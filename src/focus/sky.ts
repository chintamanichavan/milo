import type { Airport } from './airports';
import { routeArc, worldMap, project } from './map';

export type SkyMode = 'globe' | 'satellite' | 'flat';

export interface Sky {
  mode: SkyMode;
  setProgress(t: number): void;
  setCamera?(mode: 'chase' | 'wing' | 'orbit' | 'overhead', manual?: boolean): void;
  cameraMode?(): 'chase' | 'wing' | 'orbit' | 'overhead';
  shake?(strength?: number): void;
  pause(): void;
  resume(): void;
  setQuality?(mode: 'full' | 'low'): void;
  dispose(): void;
}

interface SkyOptions {
  route: { from: Airport; to: Airport };
  showPlane: boolean;
  interactive: boolean;
  now?: () => Date;
  flyIn?: boolean;
  aircraft?: string;
}

/** The flat map is the one that always works: no WebGL, no network. */
function flatSky(host: HTMLElement, { route, showPlane }: SkyOptions): Sky {
  const from = project(route.from.lat, route.from.lon);
  const to = project(route.to.lat, route.to.lon);
  host.innerHTML = worldMap({
    arc: routeArc(route.from, route.to),
    dots: [from, { ...to, on: true }],
    plane: showPlane,
    tall: true,
  });
  const arc = host.querySelector<SVGPathElement>('.arc')!;
  const flown = host.querySelector<SVGPathElement>('#flown');
  const plane = host.querySelector<SVGGElement>('#plane');
  if (plane)
    plane.innerHTML = `<path d="M-6 3.6 L6 0 L-6 -3.6 L-3.6 0 Z" fill="none" stroke="currentColor"
      stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  return {
    mode: 'flat',
    setProgress(t) {
      if (flown) flown.style.strokeDasharray = `${t} 1`;
      if (!plane) return;
      const len = arc.getTotalLength();
      const here = arc.getPointAtLength(len * t);
      const ahead = arc.getPointAtLength(Math.min(len, len * t + 1));
      const angle = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
      plane.setAttribute('transform', `translate(${here.x} ${here.y}) rotate(${angle})`);
      plane.dataset.progress = String(Math.round(t * 100));
    },
    pause() {},
    resume() {},
    dispose() {
      host.innerHTML = '';
    },
  };
}

const webgl = (): boolean => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

/** three.js and maplibre are only fetched when the focus tab asks for them. */
export async function createSky(host: HTMLElement, options: SkyOptions, mode: SkyMode): Promise<Sky> {
  host.innerHTML = '';
  host.dataset.sky = mode;
  if (mode === 'satellite' && navigator.onLine) {
    try {
      const { createSatMap } = await import('./satmap');
      const map = await createSatMap(host, options.route);
      return {
        mode: 'satellite',
        setProgress: (t) => map.setProgress(t),
        pause() {},
        resume() {},
        dispose: () => map.dispose(),
      };
    } catch {
      /* fall through to the globe */
    }
  }
  if (mode !== 'flat' && webgl()) {
    try {
      const { createGlobe } = await import('./globe');
      const globe = await createGlobe(host, {
        interactive: options.interactive,
        route: options.route,
        showPlane: options.showPlane,
        now: options.now,
        flyIn: options.flyIn,
        aircraft: options.aircraft,
      });
      host.dataset.sky = 'globe';
      return {
        mode: 'globe',
        setProgress: (t) => globe.setProgress(t),
        setCamera: (mode, manual) => globe.setCamera(mode, manual),
        cameraMode: () => globe.cameraMode(),
        shake: (strength) => globe.shake(strength),
        pause: () => globe.pause(),
        resume: () => globe.resume(),
        setQuality: (mode) => globe.setQuality(mode),
        dispose: () => globe.dispose(),
      };
    } catch {
      /* fall through to the flat map */
    }
  }
  host.dataset.sky = 'flat';
  return flatSky(host, options);
}
