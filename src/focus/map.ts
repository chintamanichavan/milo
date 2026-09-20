import type { Airport } from './airports';

/** equirectangular: the whole world in a 360 × 180 box */
export const project = (lat: number, lon: number): { x: number; y: number } => ({
  x: lon + 180,
  y: 90 - lat,
});

// coarse, dotted, deliberately unserious coastlines
const LAND: number[][][] = [
  [
    [-168, 65], [-160, 71], [-140, 70], [-120, 72], [-95, 73], [-80, 70], [-64, 60], [-56, 51],
    [-66, 45], [-70, 42], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-105, 20], [-110, 24],
    [-117, 32], [-124, 40], [-130, 54], [-140, 60], [-155, 59], [-168, 65],
  ],
  [[-45, 60], [-20, 70], [-25, 83], [-55, 83], [-60, 75], [-50, 66], [-45, 60]],
  [
    [-81, 8], [-70, 12], [-60, 10], [-50, 0], [-35, -6], [-38, -15], [-48, -25], [-56, -34],
    [-62, -40], [-68, -50], [-75, -52], [-73, -40], [-71, -25], [-76, -14], [-80, -3], [-78, 2],
    [-81, 8],
  ],
  [
    [-10, 36], [0, 43], [4, 43], [3, 51], [8, 54], [12, 55], [10, 58], [18, 60], [24, 66],
    [30, 70], [28, 60], [22, 55], [28, 45], [20, 42], [16, 38], [12, 45], [3, 42], [-9, 39],
    [-10, 36],
  ],
  [
    [-17, 15], [-16, 22], [-10, 30], [0, 35], [11, 37], [24, 32], [34, 28], [43, 12], [51, 12],
    [48, 2], [40, -5], [40, -16], [35, -24], [25, -34], [18, -35], [12, -18], [9, -1], [0, 5],
    [-8, 5], [-17, 15],
  ],
  [
    [30, 70], [60, 72], [90, 76], [120, 74], [145, 71], [165, 68], [160, 60], [140, 55],
    [135, 44], [126, 40], [122, 31], [110, 21], [100, 13], [95, 6], [92, 21], [80, 13],
    [72, 21], [60, 25], [48, 30], [44, 40], [36, 45], [32, 55], [30, 70],
  ],
  [
    [113, -22], [122, -18], [130, -12], [142, -10], [150, -20], [153, -28], [147, -38],
    [138, -35], [129, -32], [118, -34], [113, -22],
  ],
  [[172, -34], [178, -38], [174, -42], [167, -46], [170, -44], [172, -34]],
  [[130, 31], [140, 36], [145, 44], [141, 42], [133, 34], [130, 31]],
  [[-6, 50], [-2, 53], [-3, 58], [-6, 56], [-6, 50]],
];

export const worldPaths = (): string =>
  LAND.map((poly) => {
    const d = poly
      .map(([lon, lat], i) => {
        const p = project(lat, lon);
        return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(' ');
    return `<path d="${d}Z"/>`;
  }).join('');

/** A shallow arc between two airports — not a true geodesic, but it reads like one. */
export function routeArc(from: Airport, to: Airport): string {
  const a = project(from.lat, from.lon);
  const b = project(to.lat, to.lon);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(26, len * 0.22);
  // bow towards the pole the route is nearest, the way long flights really go
  const side = (a.y + b.y) / 2 < 90 ? -1 : 1;
  const cx = (a.x + b.x) / 2 + (dy / len) * bend * side * -1;
  const cy = (a.y + b.y) / 2 + (dx / len) * bend * side;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(
    1,
  )} ${b.y.toFixed(1)}`;
}

export interface MapOptions {
  arc?: string;
  dots?: { x: number; y: number; on?: boolean }[];
  plane?: boolean;
  tall?: boolean;
}

/** The whole map as one inline SVG; the caller animates #plane. */
export function worldMap({ arc, dots = [], plane, tall }: MapOptions): string {
  return `<svg class="map${tall ? ' tall' : ''}" viewBox="0 0 360 180" width="100%"
    preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <g class="land">${worldPaths()}</g>
    ${arc ? `<path class="arc" d="${arc}"/><path class="arc flown" id="flown" d="${arc}" pathLength="1"/>` : ''}
    ${dots
      .map((d) => `<circle class="pin${d.on ? ' on' : ''}" cx="${d.x}" cy="${d.y}" r="2.4"/>`)
      .join('')}
    ${plane ? `<g id="plane" data-progress="0"></g>` : ''}
  </svg>`;
}
