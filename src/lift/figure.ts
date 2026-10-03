/**
 * One jointed figure for every exercise. A pose is a handful of directions
 * (degrees: 0 points down, 90 forward, 180 up) plus where the hips are; the
 * side view faces right, the floor is y = 0 and up is negative y. Hands and
 * feet can instead be sent to a point, and the elbow or knee is solved for.
 * Equipment hangs off joints, so a bar stays in the hands however they move.
 */
export type View = 'side' | 'front';
export type Pt = [number, number];
type Pair = number | [number, number];
/** a point in the world, a named point on the body, or nothing (use the angles) */
type Target = Pt | string | null;

export interface Frame {
  /** the hips, in the world */
  hip?: Pt;
  /** hips to shoulders */
  t?: number;
  /** shoulders to head; follows the torso when left out */
  n?: number;
  /** upper arms and forearms, near then far */
  ua?: Pair;
  fa?: Pair;
  /** or: wrists sent somewhere, the elbow pointing towards eb */
  wr?: Target | [Target, Target];
  /** or: wrists at an offset from the shoulders */
  ws?: Pt;
  eb?: Pair;
  /** thighs and shins */
  th?: Pair;
  sh?: Pair;
  /** or: ankles sent to a point, the knee pointing towards kb (the body's front by default) */
  an?: Pt | [Pt | null, Pt | null];
  kb?: Pair;
  /** feet: flat on the floor unless told */
  ft?: Pair;
  /** a bend in the spine: positive rounds the back, negative arches it */
  cv?: number;
  /** foreshortening: upper arm, forearm, thigh, shin, torso */
  sc?: [number, number, number, number, number?];
  /** drop the body until it rests on the floor */
  snap?: boolean;
  /** a free number the equipment can read (a rope's swing, a wrist's curl) */
  p?: number;
  /** where the target muscles are working hardest */
  peak?: boolean;
  label?: string;
  /** this frame shows the mistake at that index in the guide */
  mistake?: number;
}

export interface GearItem {
  k: string;
  at?: string;
  /** where a band starts, when it is a joint */
  f?: string;
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  o?: Pt;
  a?: number;
  /** a second angle, reached as the frame's p goes from 0 to 1 */
  a2?: number;
  l?: number;
  w?: number;
  h?: number;
  r?: number;
}

export interface Moves {
  v?: View;
  gear?: GearItem[];
  frames: Frame[];
}

/* ---------- lengths ---------- */

const TORSO = 31;
const NECK = 10.5;
const HEAD = 6.6;
const UPPER = 17;
const FORE = 15;
const THIGH = 24;
const SHIN = 23;
const SOLE = 2.5;
const FRONT_TORSO = 30;
const SHOULDER_W = 10;
const HIP_W = 5.5;
const STROKE = 3;

const rad = (a: number): number => (a * Math.PI) / 180;
const dir = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Pt, a: number, l: number): Pt => {
  const [dx, dy] = dir(a);
  return [p[0] + dx * l, p[1] + dy * l];
};
const angleOf = (dx: number, dy: number): number => (Math.atan2(dx, dy) * 180) / Math.PI;
const pair = (v: Pair | undefined, fallback: number): [number, number] =>
  v === undefined ? [fallback, fallback] : typeof v === 'number' ? [v, v] : [v[0], v[1]];
const isPt = (v: unknown): v is Pt => Array.isArray(v) && typeof v[0] === 'number';

/** two bones from root towards target; the middle joint sits on the side facing bend */
function ik(root: Pt, target: Pt, l1: number, l2: number, bend: number): [number, number] {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const base = angleOf(dx, dy);
  const reach = Math.hypot(dx, dy);
  const d = Math.min(l1 + l2 - 0.001, Math.max(Math.abs(l1 - l2) + 0.001, reach));
  const spread = (Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) * 180) / Math.PI;
  const [bx, by] = dir(bend);
  let best = base + spread;
  let score = -Infinity;
  for (const a1 of [base + spread, base - spread]) {
    const j = add(root, a1, l1);
    const s = (j[0] - root[0] - dx / 2) * bx + (j[1] - root[1] - dy / 2) * by;
    if (s > score) {
      score = s;
      best = a1;
    }
  }
  const joint = add(root, best, l1);
  const tip: Pt = reach > l1 + l2 ? add(root, base, l1 + l2) : target;
  return [best, angleOf(tip[0] - joint[0], tip[1] - joint[1])];
}

/* ---------- a pose, solved ---------- */

type Targets = [Pt | null, Pt | null] | null;

interface Solved {
  view: View;
  hip: Pt;
  t: number;
  n: number;
  ua: [number, number];
  fa: [number, number];
  th: [number, number];
  sh: [number, number];
  ft: [number, number];
  sc: [number, number, number, number, number];
  cv: number;
  p: number;
  snap: boolean;
  /** world targets, kept so a tween can keep a hand on the floor */
  wr: Targets;
  an: Targets;
  eb: [number, number];
  kb: [number, number];
}

const STAND_HIP: Pt = [-1, -52.3];
const mirror = (p: Pt, about: Pt): Pt => [2 * about[0] - p[0], p[1]];

function solve(f: Frame, view: View): Solved {
  const hip: Pt = [...(f.hip ?? STAND_HIP)];
  const t = f.t ?? 180;
  const front = t - 90;
  const sc = f.sc ?? [1, 1, 1, 1, 1];
  const s: Solved = {
    view,
    hip,
    t,
    n: f.n ?? t,
    ua: pair(f.ua, 0),
    fa: pair(f.fa, 0),
    th: pair(f.th, view === 'front' ? 4 : 0),
    sh: pair(f.sh, view === 'front' ? 2 : 0),
    ft: pair(f.ft, view === 'front' ? 0 : 90),
    sc: [sc[0], sc[1], sc[2], sc[3], sc[4] ?? 1],
    cv: f.cv ?? 0,
    p: f.p ?? 0,
    snap: !!f.snap,
    wr: null,
    an: null,
    eb: pair(f.eb, view === 'front' ? 90 : front + 180),
    kb: pair(f.kb, view === 'front' ? 90 : front),
  };
  // legs: points in the world, mirrored for the far side in the front view when only one is given
  if (f.an) {
    const two = isPt(f.an) ? [f.an, view === 'front' ? mirror(f.an, hip) : f.an] : f.an;
    s.an = [two[0] ? [two[0][0], two[0][1]] : null, two[1] ? [two[1][0], two[1][1]] : null];
  } else if (f.th === undefined && view === 'side') s.an = [[0, -5.5], [0, -5.5]];
  // knees point forward whenever the feet are well below the hips, however the torso leans
  if (f.kb === undefined && view === 'side' && s.an) {
    s.kb = s.an.map((a, i) => {
      if (!a) return s.kb[i];
      const dx = a[0] - hip[0];
      const dy = a[1] - hip[1];
      return dy > 0.55 * Math.hypot(dx, dy) ? 90 : front;
    }) as [number, number];
  }
  place(s, 'legs');
  // arms: a body point or an offset becomes a world point, once the legs and torso are set
  if (f.wr !== undefined || f.ws) {
    const body = bodyOf(s);
    const single = f.wr === null || typeof f.wr === 'string' || isPt(f.wr);
    const one = (v: Target, i: number): Pt | null => {
      if (v === null) return null;
      if (typeof v === 'string') {
        const p = joint(body, v);
        return view === 'front' ? [p[0] + (i === 0 ? 7 : -7), p[1]] : p;
      }
      return i === 1 && view === 'front' && single ? mirror(v, hip) : [v[0], v[1]];
    };
    if (f.ws) {
      s.wr = [0, 1].map((i) => {
        const m = view === 'front' && i === 1 ? -1 : 1;
        return [body.sh[i][0] + f.ws![0] * m, body.sh[i][1] + f.ws![1]] as Pt;
      }) as [Pt, Pt];
    } else if (single) s.wr = [one(f.wr as Target, 0), one(f.wr as Target, 1)];
    else {
      const [a, b] = f.wr as [Target, Target];
      s.wr = [one(a, 0), one(b, 1)];
    }
  }
  place(s, 'arms');
  if (s.snap) settle(s);
  return s;
}

/** turn targets into angles */
function place(s: Solved, which: 'legs' | 'arms'): void {
  const targets = which === 'legs' ? s.an : s.wr;
  if (!targets) return;
  const bones = frame(s);
  for (const i of [0, 1] as const) {
    const target = targets[i];
    if (!target) continue;
    const m = s.view === 'front' && i === 1 ? -1 : 1;
    if (which === 'legs') {
      const [a1, a2] = ik(bones.hp[i], target, THIGH * s.sc[2], SHIN * s.sc[3], s.kb[i] * m);
      s.th[i] = a1 * m;
      s.sh[i] = a2 * m;
    } else {
      const [a1, a2] = ik(bones.sh[i], target, UPPER * s.sc[0], FORE * s.sc[1], s.eb[i] * m);
      s.ua[i] = a1 * m;
      s.fa[i] = a2 * m;
    }
  }
}

/** rest on the floor: the lowest point of the body touches y = 0 */
function settle(s: Solved): void {
  const b = bodyOf(s);
  const pts = [b.hip, b.neck, ...b.sh, ...b.hp, ...b.el, ...b.wr, ...b.kn, ...b.an, ...b.heel, ...b.toe];
  let low = Math.max(...pts.map((p) => p[1] + STROKE), b.head[1] + HEAD);
  if (s.view === 'side') low = Math.max(low, b.hip[1] + 5, b.neck[1] + 5);
  const dy = -low;
  s.hip = [s.hip[0], s.hip[1] + dy];
  for (const list of [s.wr, s.an]) if (list) for (const p of list) if (p) p[1] += dy;
}

/** shoulders and hip joints, for either view */
function frame(s: Solved): { sh: [Pt, Pt]; hp: [Pt, Pt]; neck: Pt } {
  if (s.view === 'side') {
    const sh = add(s.hip, s.t, TORSO * s.sc[4]);
    return { sh: [sh, sh], hp: [s.hip, s.hip], neck: sh };
  }
  const neck = add(s.hip, s.t, FRONT_TORSO * s.sc[4]);
  const right = s.t - 90;
  return {
    sh: [add(neck, right, SHOULDER_W), add(neck, right, -SHOULDER_W)],
    hp: [add(s.hip, right, HIP_W), add(s.hip, right, -HIP_W)],
    neck,
  };
}

export interface Body {
  view: View;
  t: number;
  hip: Pt;
  neck: Pt;
  head: Pt;
  sh: [Pt, Pt];
  hp: [Pt, Pt];
  el: [Pt, Pt];
  wr: [Pt, Pt];
  kn: [Pt, Pt];
  an: [Pt, Pt];
  heel: [Pt, Pt];
  toe: [Pt, Pt];
  ua: [number, number];
  fa: [number, number];
  th: [number, number];
  sh2: [number, number];
  ft: [number, number];
  p: number;
  cv: number;
}

function bodyOf(s: Solved): Body {
  const { sh, hp, neck } = frame(s);
  const side = s.view === 'side';
  const m = (i: number): number => (!side && i === 1 ? -1 : 1);
  const el = [0, 1].map((i) => add(sh[i], s.ua[i] * m(i), UPPER * s.sc[0])) as [Pt, Pt];
  const wr = [0, 1].map((i) => add(el[i], s.fa[i] * m(i), FORE * s.sc[1])) as [Pt, Pt];
  const kn = [0, 1].map((i) => add(hp[i], s.th[i] * m(i), THIGH * s.sc[2])) as [Pt, Pt];
  const an = [0, 1].map((i) => add(kn[i], s.sh[i] * m(i), SHIN * s.sc[3])) as [Pt, Pt];
  const heel = [0, 1].map((i) =>
    side ? add(add(an[i], s.ft[i] - 90, SOLE), s.ft[i], -1.5) : add(an[i], 0, 1.5),
  ) as [Pt, Pt];
  const toe = [0, 1].map((i) =>
    side ? add(add(an[i], s.ft[i] - 90, SOLE), s.ft[i], 7.5) : add(add(an[i], 0, 1.5), (s.ft[i] + 90) * m(i), 3.2),
  ) as [Pt, Pt];
  return {
    view: s.view,
    t: s.t,
    hip: s.hip,
    neck,
    head: add(neck, s.n, side ? NECK : NECK + 0.5),
    sh,
    hp,
    el,
    wr,
    kn,
    an,
    heel,
    toe,
    ua: s.ua,
    fa: s.fa,
    th: s.th,
    sh2: s.sh,
    ft: s.ft,
    p: s.p,
    cv: s.cv,
  };
}

/* ---------- tweening ---------- */

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const lerpAngle = (a: number, b: number, u: number): number => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * u;
};
const lerpPt = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const lerpPair = (a: [number, number], b: [number, number], u: number): [number, number] => [
  lerpAngle(a[0], b[0], u),
  lerpAngle(a[1], b[1], u),
];
const lerpTargets = (a: Targets, b: Targets, u: number): Targets => {
  if (!a || !b) return null;
  const out = [0, 1].map((i) => (a[i] && b[i] ? lerpPt(a[i]!, b[i]!, u) : null)) as [Pt | null, Pt | null];
  return out[0] || out[1] ? out : null;
};

function tween(a: Solved, b: Solved, u: number): Solved {
  const s: Solved = {
    view: a.view,
    hip: lerpPt(a.hip, b.hip, u),
    t: lerpAngle(a.t, b.t, u),
    n: lerpAngle(a.n, b.n, u),
    ua: lerpPair(a.ua, b.ua, u),
    fa: lerpPair(a.fa, b.fa, u),
    th: lerpPair(a.th, b.th, u),
    sh: lerpPair(a.sh, b.sh, u),
    ft: lerpPair(a.ft, b.ft, u),
    sc: a.sc.map((v, i) => lerp(v, b.sc[i], u)) as Solved['sc'],
    cv: lerp(a.cv, b.cv, u),
    p: lerp(a.p, b.p, u),
    snap: a.snap && b.snap,
    wr: lerpTargets(a.wr, b.wr, u),
    an: lerpTargets(a.an, b.an, u),
    eb: lerpPair(a.eb, b.eb, u),
    kb: lerpPair(a.kb, b.kb, u),
  };
  // only re-solve a limb when both ends pin it: a hand on the floor stays there
  place(s, 'legs');
  place(s, 'arms');
  if (s.snap) settle(s);
  return s;
}

/* ---------- drawing ---------- */

export interface Item {
  c: string;
  d: string;
  o?: number;
}

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString();
const P = (p: Pt): string => `${f1(p[0])} ${f1(p[1])}`;
const line = (...pts: Pt[]): string => `M${pts.map(P).join('L')}`;
const circle = (c: Pt, r: number): string =>
  `M${f1(c[0] - r)} ${f1(c[1])}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
const rect = (x: number, y: number, w: number, h: number): string =>
  `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;

/** a point on the body by name, for equipment to hang from and hands to reach for */
function joint(b: Body, name: string): Pt {
  const front = b.t - 90;
  const i = name.endsWith('F') ? 1 : 0;
  const base = name.replace(/F$/, '');
  const len = Math.hypot(b.neck[0] - b.hip[0], b.neck[1] - b.hip[1]);
  switch (base) {
    case 'wr':
      return b.wr[i];
    case 'el':
      return b.el[i];
    case 'sh':
      return b.sh[i];
    case 'kn':
      return b.kn[i];
    case 'an':
      return b.an[i];
    case 'toe':
      return b.toe[i];
    case 'heel':
      return b.heel[i];
    case 'sole':
      return add(add(b.an[i], b.ft[i] - 90, SOLE + 3), b.ft[i], 3);
    case 'head':
      return b.head;
    case 'neck':
      return b.neck;
    case 'hip':
      return b.hip;
    case 'hp':
      return b.hp[i];
    case 'back':
      return add(add(b.neck, front, -6), b.t, -2.5);
    case 'rack':
      return add(add(b.neck, front, 6.5), b.t, -1);
    case 'chest':
      return add(add(b.neck, front, 7.5), b.t, -7);
    case 'front':
      return add(add(b.hip, front, 7.5), b.t, len / 2);
    case 'spine':
      return add(add(b.hip, front, -7.5), b.t, len / 2);
    case 'belly':
      return add(add(b.hip, front, 7), b.t, 9);
    case 'lap':
      return add(add(b.hip, front, 7), b.th[0], 3);
    case 'seat':
      return add(b.hip, front + 180, 0);
    case 'thigh':
      return add(add(b.kn[i], b.th[i] + 90, 5.5), b.th[i], -4);
    case 'under':
      return add(add(b.kn[i], b.th[i] + 90, -5.5), b.th[i], -8);
    case 'shin':
      return add(add(b.an[i], b.sh2[i] + 90, 5.5), b.sh2[i], -3);
    case 'calf':
      return add(add(b.an[i], b.sh2[i] + 90, -5.5), b.sh2[i], -3);
    case 'tri':
      return add(add(b.sh[i], b.ua[i], 8.5), b.ua[i] - 90, 5.5);
    case 'mid':
      return b.view === 'side' ? b.wr[0] : [(b.wr[0][0] + b.wr[1][0]) / 2, (b.wr[0][1] + b.wr[1][1]) / 2];
    default:
      return b.hip;
  }
}

function anchor(g: GearItem, b: Body): Pt {
  const base: Pt = g.at ? joint(b, g.at) : [g.x ?? 0, g.y ?? 0];
  return g.o ? [base[0] + g.o[0], base[1] + g.o[1]] : base;
}

/** equipment, drawn behind the body (back) or in front of it (front) */
function gearItems(g: GearItem, b: Body, out: { back: Item[]; front: Item[] }): void {
  const at = anchor(g, b);
  const side = b.view === 'side';
  switch (g.k) {
    case 'bb':
    case 'smith':
    case 'ez':
    case 'trap': {
      const r = g.r ?? (g.k === 'ez' ? 9.5 : g.k === 'smith' ? 10 : 11.5);
      if (g.k === 'smith') out.back.push({ c: 'fg-rail', d: line([at[0] - 3, 0], [at[0] - 3, -130]) });
      if (side) {
        if (g.k === 'trap') out.front.push({ c: 'fg-bar', d: line([at[0] - 14, at[1]], [at[0] + 14, at[1]]) });
        out.front.push({ c: 'fg-plate', d: circle(at, r) });
        out.front.push({ c: 'fg-hub', d: circle(at, 2) });
        if (g.k === 'ez')
          out.front.push({
            c: 'fg-bar',
            d: line([at[0] - 5, at[1] + 1.5], [at[0] - 1.7, at[1] - 1.5], [at[0] + 1.7, at[1] + 1.5], [at[0] + 5, at[1] - 1.5]),
          });
        break;
      }
      const y = at[1];
      const l = Math.min(b.wr[0][0], b.wr[1][0]);
      const rr = Math.max(b.wr[0][0], b.wr[1][0]);
      if (g.k === 'trap') {
        const hx = b.hip[0];
        out.back.push({
          c: 'fg-bar',
          d: `${line([hx - 20, y], [hx - 14, y - 7], [hx + 14, y - 7], [hx + 20, y], [hx + 14, y + 7], [hx - 14, y + 7])}z`,
        });
        out.front.push({ c: 'fg-bar', d: line([hx - 20, y], [hx - 30, y]) });
        out.front.push({ c: 'fg-bar', d: line([hx + 20, y], [hx + 30, y]) });
        out.front.push({ c: 'fg-plate', d: rect(hx - 35, y - r, 5, 2 * r) });
        out.front.push({ c: 'fg-plate', d: rect(hx + 30, y - r, 5, 2 * r) });
        break;
      }
      const ends = g.k === 'ez' ? 13 : 20;
      const mid = (l + rr) / 2;
      out.front.push({
        c: 'fg-bar',
        d:
          g.k === 'ez'
            ? line([l - ends, y], [l, y], [mid - 5, y - 2.5], [mid, y + 1], [mid + 5, y - 2.5], [rr, y], [rr + ends, y])
            : line([l - ends, y], [rr + ends, y]),
      });
      out.front.push({ c: 'fg-plate', d: rect(l - ends - 5, y - r, 5, 2 * r) });
      out.front.push({ c: 'fg-plate', d: rect(rr + ends, y - r, 5, 2 * r) });
      break;
    }
    case 'db':
      if (g.at) out.front.push({ c: 'fg-db', d: circle(at, g.r ?? 4.8) });
      else if (side) {
        out.back.push({ c: 'fg-db far', d: circle(b.wr[1], g.r ?? 4.8) });
        out.front.push({ c: 'fg-db', d: circle(b.wr[0], g.r ?? 4.8) });
      } else for (const w of b.wr) out.front.push({ c: 'fg-db', d: circle(w, g.r ?? 4.8) });
      break;
    case 'kb': {
      // resting on the body at a point, or hanging from the hand: below it, or along the forearm when a is set
      if (g.at && g.at !== 'wr' && g.at !== 'wrF') {
        out.front.push({ c: 'fg-kb', d: circle(at, g.r ?? 5.6) });
        break;
      }
      const hands = g.at === 'wrF' ? [1] : g.w || side ? [0] : [0, 1];
      for (const i of hands) {
        const hand = b.wr[i];
        const along = g.a !== undefined ? b.fa[i] * (!side && i === 1 ? -1 : 1) + lerp(g.a, g.a2 ?? g.a, b.p) : null;
        const c: Pt = along !== null ? add(hand, along, g.l ?? 7.5) : [hand[0] + (g.o?.[0] ?? 0), hand[1] + (g.o?.[1] ?? 7.5)];
        out.front.push({ c: 'fg-bar', d: line(hand, c) });
        out.front.push({ c: 'fg-kb', d: circle(c, g.r ?? 5.6) });
      }
      break;
    }
    case 'hand': {
      // a hand that bends at the wrist, p from 0 to 1 across 2a degrees, with a dumbbell in it
      const a = b.fa[0] + (g.a ?? 60) * (b.p * 2 - 1);
      const tip = add(b.wr[0], a, g.l ?? 5);
      out.front.push({ c: 'fg-limb', d: line(b.wr[0], tip) });
      out.front.push({ c: 'fg-db', d: circle(tip, 4.6) });
      break;
    }
    case 'cable': {
      const x = g.x ?? 30;
      const py = g.y ?? -60;
      const top = Math.min(py, -70) - 8;
      const to = g.at ? at : side ? b.wr[0] : joint(b, 'mid');
      out.back.push({ c: 'fg-stack', d: rect(x - 4, top, 8, -top) });
      out.back.push({ c: 'fg-cable', d: line([x, py], to) });
      if (side && g.w) out.back.push({ c: 'fg-cable far', d: line([x, py], b.wr[1]) });
      if (!side && g.w) {
        const x2 = 2 * b.hip[0] - x;
        out.back.push({ c: 'fg-stack', d: rect(x2 - 4, top, 8, -top) });
        out.back.push({ c: 'fg-cable', d: line([x2, py], g.at ? joint(b, `${g.at}F`) : b.wr[1]) });
        out.back.push({ c: 'fg-pulley', d: circle([x2, py], 2.4) });
      }
      out.back.push({ c: 'fg-pulley', d: circle([x, py], 2.4) });
      break;
    }
    case 'band': {
      const from: Pt = g.f ? joint(b, g.f) : [g.x ?? 0, g.y ?? 0];
      if (!g.f) {
        // tied to a post or a rack
        out.back.push({ c: 'fg-frame', d: line([from[0] + 2, -118], [from[0] + 2, 0]) });
        out.back.push({ c: 'fg-hub', d: circle([from[0] + 2, from[1]], 1.8) });
      }
      out.front.push({ c: 'fg-band', d: line(from, g.at ? at : b.wr[0]) });
      break;
    }
    case 'pad': {
      let a: Pt;
      let z: Pt;
      if (g.x2 !== undefined) {
        a = [g.x ?? 0, g.y ?? 0];
        z = [g.x2, g.y2 ?? 0];
      } else {
        const half = (g.l ?? 20) / 2;
        a = add(at, g.a ?? 90, -half);
        z = add(at, g.a ?? 90, half);
      }
      out.back.push({ c: 'fg-pad', d: line(a, z) });
      if (g.h) {
        // a leg down to the floor from the middle, or from each end when h is 2
        const legs: Pt[] = g.h === 2 ? [lerpPt(a, z, 0.12), lerpPt(a, z, 0.88)] : [lerpPt(a, z, 0.5)];
        for (const m of legs) out.back.push({ c: 'fg-frame', d: line([m[0], m[1] + 2.5], [m[0], 0]) });
      }
      break;
    }
    case 'roller':
      out.back.push({ c: 'fg-roller', d: circle(at, g.r ?? 3.6) });
      break;
    case 'pullbar': {
      if (side) {
        out.back.push({ c: 'fg-frame', d: line(at, [at[0] - 20, at[1] - 4]) });
        out.front.push({ c: 'fg-hub', d: circle(at, 2.4) });
      } else {
        const l = Math.min(b.wr[0][0], b.wr[1][0]);
        const rr = Math.max(b.wr[0][0], b.wr[1][0]);
        out.back.push({ c: 'fg-bar', d: line([l - 16, at[1]], [rr + 16, at[1]]) });
      }
      break;
    }
    case 'box':
      out.back.push({ c: 'fg-box', d: rect(g.x ?? 0, -(g.h ?? 20), g.w ?? 20, g.h ?? 20) });
      break;
    case 'wall':
      out.back.push({ c: 'fg-frame', d: line([g.x ?? 0, 0], [g.x ?? 0, -112]) });
      break;
    case 'lm': {
      const pivot: Pt = [g.x ?? 60, -2];
      const a = angleOf(at[0] - pivot[0], at[1] - pivot[1]);
      out.back.push({ c: 'fg-bar', d: line(pivot, add(at, a, 5)) });
      out.front.push({ c: 'fg-plate', d: circle(add(at, a, g.l ?? 10), g.r ?? 9) });
      break;
    }
    case 'wheel':
      out.front.push({ c: 'fg-plate', d: circle(at, g.r ?? 5.5) });
      out.front.push({ c: 'fg-hub', d: circle(at, 1.6) });
      break;
    case 'sled':
      out.back.push({ c: 'fg-frame', d: line(at, [at[0] + 10, -16]) });
      out.back.push({ c: 'fg-box', d: rect(at[0] + 6, -16, 28, 13) });
      out.back.push({ c: 'fg-frame', d: line([at[0] + 2, -1.5], [at[0] + 38, -1.5]) });
      break;
    case 'rower': {
      const x0 = g.x ?? -40;
      const x1 = g.x2 ?? 50;
      out.back.push({ c: 'fg-frame', d: line([x0, -6], [x1, -6]) });
      out.back.push({ c: 'fg-frame', d: line([x0, -6], [x0, 0]) });
      out.back.push({ c: 'fg-plate', d: circle([x1 + 6, -16], 10) });
      out.back.push({ c: 'fg-cable', d: line([x1 + 2, -18], b.wr[0]) });
      out.back.push({ c: 'fg-pad', d: line([b.hip[0] - 6, b.hip[1] + 5.5], [b.hip[0] + 6, b.hip[1] + 5.5]) });
      out.back.push({ c: 'fg-pad', d: line([x1 - 16, -20], [x1 - 13, -6]) });
      break;
    }
    case 'bike': {
      const c: Pt = [g.x ?? 26, -20];
      out.back.push({ c: 'fg-plate', d: circle(c, 18) });
      out.back.push({ c: 'fg-frame', d: line([b.hip[0], b.hip[1] + 6], [c[0] - 14, -24], [c[0] - 14, 0]) });
      out.back.push({ c: 'fg-pad', d: line([b.hip[0] - 6, b.hip[1] + 6], [b.hip[0] + 6, b.hip[1] + 6]) });
      out.back.push({ c: 'fg-frame', d: line(b.wr[0], [c[0] - 6, -26]) });
      out.back.push({ c: 'fg-frame far', d: line(b.wr[1], [c[0] - 6, -26]) });
      out.back.push({ c: 'fg-hub', d: circle([c[0] - 14, -24], 2.6) });
      break;
    }
    case 'tread': {
      const rise = g.h ?? 7;
      out.back.push({ c: 'fg-pad', d: line([-36, -0.5], [36, -0.5 - rise]) });
      out.back.push({ c: 'fg-frame', d: line([36, -0.5 - rise], [40, -62]) });
      out.back.push({ c: 'fg-frame', d: line([40, -62], [26, -66]) });
      break;
    }
    case 'rope': {
      // a loop from the hands, under the feet at p = 0 and over the head at p = 1
      const a = b.wr[0];
      const z = side ? b.wr[0] : b.wr[1];
      const low = Math.max(b.toe[0][1], b.heel[0][1], b.toe[1][1], b.heel[1][1]) + 4;
      const high = b.head[1] - 12;
      const y = lerp(low, high, b.p);
      const yc = (y - (0.25 * (a[1] + z[1])) / 2) / 0.75;
      const spread = side ? 13 : 0;
      out.back.push({ c: 'fg-band', d: `M${P(a)}C${f1(a[0] - spread)} ${f1(yc)} ${f1(z[0] + spread)} ${f1(yc)} ${P(z)}` });
      break;
    }
    case 'belt': {
      const low: Pt = [at[0], Math.min(-7, at[1] + 26)];
      out.back.push({ c: 'fg-cable', d: line(at, low) });
      out.back.push({ c: 'fg-plate', d: circle(low, 6.5) });
      break;
    }
    case 'dip':
      out.back.push({ c: 'fg-frame', d: line([at[0], at[1] + 3], [at[0], at[1] + 34]) });
      out.back.push({ c: 'fg-hub', d: circle(at, 2.4) });
      break;
    case 'frame':
      out.back.push({ c: 'fg-frame', d: line([g.x ?? 0, g.y ?? 0], [g.x2 ?? 0, g.y2 ?? 0]) });
      break;
  }
}

/** which parts of the body light up for a muscle; 1 = front surface, -1 = back */
const REGIONS: Record<string, [string, number][]> = {
  quads: [['th', 1]],
  hamstrings: [['th', -1]],
  glutes: [['glute', -1]],
  calves: [['shin', -1]],
  chest: [['chest', 1]],
  back: [['upper', -1]],
  traps: [['upper', -1]],
  shoulders: [['delt', 0]],
  biceps: [['ua', 1]],
  triceps: [['ua', -1]],
  forearms: [['fa', 0]],
  core: [['abs', 1]],
};

function glowItems(b: Body, muscles: [string, number][], level: number): Item[] {
  const out: Item[] = [];
  const side = b.view === 'side';
  const front = b.t - 90;
  // a segment nudged to one surface of a limb; limbs hang from the body, so their front is a quarter turn round
  const off = (a: Pt, z: Pt, s: number, k = 2.2): string => {
    const along = angleOf(z[0] - a[0], z[1] - a[1]);
    return line(add(a, along + 90, k * s), add(z, along + 90, k * s));
  };
  const trim = (a: Pt, z: Pt, k: number): [Pt, Pt] => [lerpPt(a, z, k), lerpPt(z, a, k)];
  const len = Math.hypot(b.neck[0] - b.hip[0], b.neck[1] - b.hip[1]);
  for (const [muscle, weight] of muscles) {
    const o = Math.max(0, Math.min(1, level)) * weight;
    const push = (d: string): void => {
      out.push({ c: 'fg-glow', d, o });
    };
    for (const [part, surface] of REGIONS[muscle] ?? []) {
      const s = side ? surface : 0;
      for (const i of side ? [0] : [0, 1]) {
        if (part === 'th') push(off(...trim(b.hp[i], b.kn[i], 0.15), s));
        else if (part === 'shin') push(off(...trim(b.kn[i], b.an[i], 0.2), s));
        else if (part === 'ua') push(off(...trim(b.sh[i], b.el[i], 0.2), s));
        else if (part === 'fa') push(off(...trim(b.el[i], b.wr[i], 0.2), 0));
        else if (part === 'delt') push(circle(b.sh[i], 1.6));
      }
      if (part === 'chest')
        push(
          side
            ? line(add(add(b.neck, front, 2.5), b.t, -4), add(add(b.neck, front, 2.5), b.t, -12))
            : line(add(b.sh[0], b.t, -6), add(b.sh[1], b.t, -6)),
        );
      else if (part === 'upper')
        push(
          side
            ? line(add(add(b.neck, front, -2.5), b.t, -3), add(add(b.neck, front, -2.5), b.t, -len * 0.55))
            : line(add(b.neck, b.t, -3), add(b.neck, b.t, -len * 0.5)),
        );
      else if (part === 'abs')
        push(
          side
            ? line(add(add(b.hip, front, 2.5), b.t, 4), add(add(b.hip, front, 2.5), b.t, len * 0.55))
            : line(add(b.hip, b.t, 4), add(b.hip, b.t, len * 0.5)),
        );
      else if (part === 'glute')
        push(side ? line(add(b.hip, front, -3), add(add(b.hip, front, -3), b.t, 5)) : line(b.hp[0], b.hp[1]));
    }
  }
  return out;
}

/** the torso: straight, or bowed when the back rounds (bulging away from the front) */
function spine(b: Body): string {
  if (Math.abs(b.cv) < 0.05) return line(b.hip, b.neck);
  const mid: Pt = [(b.hip[0] + b.neck[0]) / 2, (b.hip[1] + b.neck[1]) / 2];
  const c = add(mid, b.t - 90, -b.cv * 2);
  return `M${P(b.hip)}Q${P(c)} ${P(b.neck)}`;
}

function bodyItems(b: Body): { far: Item[]; near: Item[] } {
  const limb = (i: number): Item[] => [
    { c: 'fg-limb', d: line(b.hp[i], b.kn[i], b.an[i]) },
    { c: 'fg-limb', d: line(b.heel[i], b.toe[i]) },
    { c: 'fg-limb', d: line(b.sh[i], b.el[i], b.wr[i]) },
  ];
  if (b.view === 'side')
    return {
      far: limb(1),
      near: [{ c: 'fg-torso', d: spine(b) }, { c: 'fg-head', d: circle(b.head, HEAD) }, ...limb(0)],
    };
  return {
    far: [],
    near: [
      { c: 'fg-trunk', d: `${line(b.sh[1], b.sh[0], b.hp[0], b.hp[1])}z` },
      { c: 'fg-head', d: circle(b.head, HEAD) },
      ...limb(0),
      ...limb(1),
    ],
  };
}

/** everything to draw for one moment, in paint order */
function items(b: Body, moves: Moves, glow: [string, number][], level: number, floor: [number, number] | null): Item[] {
  const g = { back: [] as Item[], front: [] as Item[] };
  for (const item of moves.gear ?? []) gearItems(item, b, g);
  const { far, near } = bodyItems(b);
  const out: Item[] = [];
  if (floor) out.push({ c: 'fg-floor', d: line([floor[0], 0], [floor[1], 0]) });
  out.push(...g.back, ...far.map((i) => ({ ...i, c: `${i.c} far` })), ...glowItems(b, glow, level), ...near, ...g.front);
  return out;
}

/* ---------- bounds ---------- */

function boundsOf(list: Item[], box: [number, number, number, number]): void {
  const grow = (x: number, y: number, r = 0): void => {
    box[0] = Math.min(box[0], x - r);
    box[2] = Math.max(box[2], x + r);
    box[1] = Math.min(box[1], y - r);
    box[3] = Math.max(box[3], y + r);
  };
  for (const it of list) {
    if (it.c === 'fg-glow' || it.c === 'fg-floor' || it.c.startsWith('fg-rail')) continue;
    const nums = it.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const pad = /fg-(limb|torso)/.test(it.c) ? STROKE + 0.5 : 1.5;
    if (it.d.includes('a')) grow(nums[0] + nums[2], nums[1], nums[2] + 1);
    else if (it.d.includes('h')) {
      grow(nums[0], nums[1]);
      grow(nums[0] + nums[2], nums[1] + nums[3]);
    } else for (let i = 0; i + 1 < nums.length; i += 2) grow(nums[i], nums[i + 1], pad);
  }
}

/* ---------- the public side ---------- */

export interface Figure {
  moves: Moves;
  view: View;
  loop: Solved[];
  mistakes: Solved[];
  box: [number, number, number, number];
  floor: [number, number] | null;
  glow: [string, number][];
  peak: number;
}

export function prepare(moves: Moves, glow: [string, number][] = []): Figure {
  const view = moves.v ?? 'side';
  const loopFrames = moves.frames.filter((f) => f.mistake === undefined);
  const loop = loopFrames.map((f) => solve(f, view));
  const mistakes = moves.frames.filter((f) => f.mistake !== undefined).map((f) => solve(f, view));
  const peakAt = loopFrames.findIndex((f) => f.peak);
  const peak = peakAt >= 0 ? peakAt : loop.length - 1;
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const s of [...loop, ...mistakes]) boundsOf(items(bodyOf(s), moves, [], 0, null), box);
  // the tweens too, so nothing swings out of frame
  for (let i = 0; i + 1 < loop.length; i++)
    for (const u of [0.25, 0.5, 0.75]) boundsOf(items(bodyOf(tween(loop[i], loop[i + 1], u)), moves, [], 0, null), box);
  box[0] -= 5;
  box[1] -= 5;
  box[2] += 5;
  box[3] += 3;
  const floor: [number, number] | null = box[3] > -8 ? [box[0] - 40, box[2] + 40] : null;
  if (floor) box[3] = Math.max(box[3], 3);
  return { moves, view, loop, mistakes, box, floor, glow, peak };
}

/** a viewBox around the figure at a fixed aspect, so every guide sits the same way */
export function viewBox(fig: Figure, aspect: number): string {
  let [x0, y0] = fig.box;
  let w = fig.box[2] - x0;
  let h = fig.box[3] - y0;
  if (w / h < aspect) {
    const grow = h * aspect - w;
    x0 -= grow / 2;
    w += grow;
  } else {
    const grow = w / aspect - h;
    // grow upwards when standing on the floor, so the floor stays at the bottom
    y0 -= fig.floor ? grow : grow / 2;
    h += grow;
  }
  return `${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}`;
}

/** the pose at a phase through the loop: 0 start, 0.5 the far end, back to start at 1 */
function at(fig: Figure, phase: number): { s: Solved; level: number } {
  const n = fig.loop.length;
  if (n === 1) return { s: fig.loop[0], level: 1 };
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  // a short hold at each end, eased in between
  const held = Math.max(0, Math.min(1, (tri - 0.08) / 0.84));
  const e = held < 0.5 ? 4 * held ** 3 : 1 - (-2 * held + 2) ** 3 / 2;
  const x = e * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const s = tween(fig.loop[i], fig.loop[i + 1], x - i);
  const level = Math.max(0, 1 - Math.abs(x - fig.peak) * 1.4);
  return { s, level };
}

function svgOf(fig: Figure, list: Item[], cls: string, aspect: number, label: string): string {
  return `<svg class="fig${cls ? ` ${cls}` : ''}" viewBox="${viewBox(fig, aspect)}" role="img" aria-label="${label}">${list
    .map((it) => `<path class="${it.c}" d="${it.d}"${it.o !== undefined ? ` style="opacity:${f1(it.o * 0.8)}"` : ''}/>`)
    .join('')}</svg>`;
}

/** the moment to draw for a still: a loop frame by index, the last one, or a mistake */
function pick(fig: Figure, which: number | 'end' | 'mistake'): { s: Solved; level: number } {
  if (which === 'mistake') return { s: fig.mistakes[0] ?? fig.loop[0], level: 0 };
  const i = which === 'end' ? fig.loop.length - 1 : Math.min(which, fig.loop.length - 1);
  return { s: fig.loop[i], level: i === fig.peak ? 1 : 0 };
}

/** one still, as SVG markup */
export function still(fig: Figure, which: number | 'end' | 'mistake', cls = '', aspect = 1.25, label = ''): string {
  const { s, level } = pick(fig, which);
  const extra = which === 'mistake' ? 'fig-mistake' : '';
  return svgOf(fig, items(bodyOf(s), fig.moves, fig.glow, level, fig.floor), [cls, extra].filter(Boolean).join(' '), aspect, label);
}

/** a mistake by its frame's position among the mistakes */
export function mistakeStill(fig: Figure, index: number, label = ''): string {
  const s = fig.mistakes[index];
  return s ? svgOf(fig, items(bodyOf(s), fig.moves, [], 0, fig.floor), 'fig-mistake', 1.25, label) : '';
}

/** path data for a still, for a canvas to draw with Path2D */
export function stillItems(fig: Figure, which: number | 'end'): Item[] {
  const { s, level } = pick(fig, which);
  return items(bodyOf(s), fig.moves, fig.glow, level, fig.floor);
}

export interface Player {
  stop: () => void;
  toggle: () => void;
  paused: () => boolean;
  /** 0–1 through the loop */
  seek: (phase: number) => void;
}

/**
 * A figure that moves: 1.6 s per rep, a tap pauses, a drag scrubs. It stops
 * when it leaves the page and sleeps while it is off screen.
 */
export function play(host: HTMLElement, fig: Figure, label: string, aspect = 1.25): Player {
  const first = at(fig, 0);
  host.innerHTML = svgOf(fig, items(bodyOf(first.s), fig.moves, fig.glow, first.level, fig.floor), 'fig-live', aspect, label);
  const svg = host.querySelector('svg')!;
  const paths = [...svg.querySelectorAll('path')];
  const LOOP = 1600;
  let phase = 0;
  let last = performance.now();
  let paused = false;
  let visible = true;
  let raf = 0;
  let stopped = false;

  const draw = (): void => {
    const { s, level } = at(fig, phase);
    const list = items(bodyOf(s), fig.moves, fig.glow, level, fig.floor);
    for (let i = 0; i < paths.length && i < list.length; i++) {
      const p = paths[i];
      if (p.getAttribute('d') !== list[i].d) p.setAttribute('d', list[i].d);
      if (list[i].o !== undefined) p.style.opacity = f1(list[i].o! * 0.8);
    }
  };
  const tick = (now: number): void => {
    if (stopped) return;
    if (!svg.isConnected) return stop();
    const dt = Math.min(64, now - last);
    last = now;
    if (!paused && visible && fig.loop.length > 1) {
      phase = (phase + dt / LOOP) % 1;
      draw();
    }
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
  });
  io.observe(host);

  // a tap pauses, a drag scrubs: left edge is the start, right edge the finish
  let downX: number | null = null;
  let moved = false;
  host.addEventListener('pointerdown', (ev) => {
    downX = ev.clientX;
    moved = false;
    host.setPointerCapture?.(ev.pointerId);
  });
  host.addEventListener('pointermove', (ev) => {
    if (downX === null) return;
    const dx = ev.clientX - downX;
    if (Math.abs(dx) > 6) moved = true;
    if (!moved) return;
    paused = true;
    host.classList.add('paused');
    const rect = host.getBoundingClientRect();
    phase = Math.max(0, Math.min(1, (ev.clientX - rect.left) / Math.max(1, rect.width))) * 0.5;
    draw();
  });
  host.addEventListener('pointerup', () => {
    if (downX === null) return;
    if (!moved) toggle();
    downX = null;
  });
  host.addEventListener('pointercancel', () => (downX = null));
  host.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      toggle();
    } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      paused = true;
      host.classList.add('paused');
      const from = phase > 0.5 ? 1 - phase : phase;
      phase = Math.max(0, Math.min(0.5, from + (ev.key === 'ArrowRight' ? 0.05 : -0.05)));
      draw();
    }
  });

  function toggle(): void {
    paused = !paused;
    host.classList.toggle('paused', paused);
    last = performance.now();
  }
  function stop(): void {
    stopped = true;
    cancelAnimationFrame(raf);
    io.disconnect();
  }
  raf = requestAnimationFrame(tick);
  return {
    stop,
    toggle,
    paused: () => paused,
    seek: (p: number) => {
      phase = ((p % 1) + 1) % 1;
      draw();
    },
  };
}
