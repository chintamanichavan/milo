import type { Frame, GearItem, Moves, Pt } from './figure';

/**
 * Two to four key poses for every exercise in the library, start to finish,
 * plus the common mistake where a picture helps. Directions are in degrees:
 * 0 points down, 90 forward, 180 up. The floor is y = 0, a standing figure's
 * hips are at y ≈ -52 and its ankles at y = -5.5.
 */

const R = Math.PI / 180;
const sin = (a: number): number => Math.sin(a * R);
const cos = (a: number): number => Math.cos(a * R);
const deg = (dx: number, dy: number): number => Math.atan2(dx, dy) / R;

/** hips placed so the shoulders land on a point, with the torso along t */
const hipFor = (shoulder: Pt, t: number): Pt => [shoulder[0] - 31 * sin(t), shoulder[1] - 31 * cos(t)];

/** one straight line from the ankles to the shoulders: planks, push-ups, inverted rows */
function straight(ankle: Pt, shoulder: Pt, extra: Frame = {}): Frame {
  const t = deg(shoulder[0] - ankle[0], shoulder[1] - ankle[1]);
  return { hip: hipFor(shoulder, t), t, th: t - 180, sh: t - 180, ft: t - 90, ...extra };
}

const side = (gear: GearItem[], ...frames: Frame[]): Moves => ({ gear, frames });
const front = (gear: GearItem[], ...frames: Frame[]): Moves => ({ v: 'front', gear, frames });

/* ---------- equipment ---------- */

const bb = (at = 'wr'): GearItem => ({ k: 'bb', at });
const smith = (at = 'wr'): GearItem => ({ k: 'smith', at });
const ez = (at = 'wr'): GearItem => ({ k: 'ez', at });
const trap: GearItem = { k: 'trap', at: 'wr' };
const DB: GearItem = { k: 'db' };
const oneDb: GearItem = { k: 'db', at: 'wr' };
const pad = (x: number, x2: number, y = -19, h = 2): GearItem => ({ k: 'pad', x, y, x2, y2: y, h });
const cable = (x: number, y: number, extra: Partial<GearItem> = {}): GearItem => ({ k: 'cable', x, y, ...extra });
const band = (x: number, y: number): GearItem => ({ k: 'band', x, y });

/* ---------- positions that come up again and again ---------- */

/** lying on a flat bench, feet on the floor, head to the left */
const LIE: Frame = { hip: [0, -26.5], t: 270, an: [22, -5.5] };
const BENCH = pad(-47, 8);
/** seated tall on a bench */
const SIT: Frame = { hip: [0, -26], t: 180, an: [19, -5.5] };
const SEAT = pad(-9, 9, -20.5, 1);
const BACKREST: GearItem = { k: 'pad', at: 'spine', a: 180, l: 34 };
/** an incline bench at about thirty degrees */
const INCLINE: Frame = { hip: [0, -27], t: 238, an: [24, -5.5] };
const INCLINE_PAD: GearItem[] = [pad(-10, 9, -20.5, 1), { k: 'pad', at: 'spine', a: 238, l: 40 }, { k: 'frame', x: -16, y: -34, x2: -16, y2: 0 }];
/** seated, seen from the front: thighs come towards you, so they look short */
const FSIT: Frame = { hip: [0, -33.5], sc: [1, 1, 0.35, 1, 1], th: 22, sh: 0 };
const FSEAT = pad(-16, 16, -27.5);
/** a push-up's top and bottom: ankles, then shoulders over the hands */
const TOE: Pt = [-71.5, -4];
const HANDS: Pt = [0, -3];
const PUSH_TOP = straight(TOE, [0, -35], { wr: HANDS, eb: 225 });
const PUSH_LOW = straight(TOE, [6, -12], { wr: HANDS, eb: 225 });
/** a bar hanging over the head */
const BAR_Y = -128;
/** walking: one step, then the other */
const stepA: Frame = { hip: [-1, -51], an: [[10, -5.5], [-12, -5.5]] };
const stepB: Frame = { hip: [-1, -51], an: [[-12, -5.5], [10, -5.5]] };

/* ---------- the families ---------- */

/** a curl: the upper arm still, the forearm comes up */
const curl = (gear: GearItem[], extra: Frame = {}): Moves =>
  side(
    gear,
    { label: 'arms long', ...extra, ua: 0, fa: 0 },
    { label: 'squeeze', ...extra, ua: -8, fa: 148, peak: true },
    { mistake: 0, ...extra, t: 196, hip: [-3, -52], ua: 24, fa: 150 },
  );

/** a pushdown from a high anchor */
const pushdown = (gear: GearItem[]): Moves =>
  side(
    gear,
    { label: 'elbows bent', t: 172, ua: 4, fa: 150 },
    { label: 'arms straight', t: 172, ua: 4, fa: 4, peak: true },
    { mistake: 0, t: 172, ua: 42, fa: 10 },
  );

/** a hip hinge with the bar hanging from straight arms, finishing at the given bar height */
const rdl = (gear: GearItem[]): Moves =>
  side(
    gear,
    { label: 'standing tall', wr: [-1, -51.3] },
    { label: 'hips back', hip: [-24.9, -44.2], t: 105, wr: [5, -20.2], peak: true },
    { mistake: 0, hip: [-18, -46], t: 100, cv: 8, wr: [10, -22] },
  );

/** a face pull: hands from reaching forward to beside the ears, elbows high */
const facePull = (gear: GearItem[]): Moves =>
  side(
    gear,
    { label: 'arms long', an: [[8, -5.5], [-10, -5.5]], t: 176, ws: [29, -9], eb: 0 },
    { label: 'hands to ears', an: [[8, -5.5], [-10, -5.5]], t: 176, ws: [3, -15], eb: 245, peak: true },
  );

/** a bent-over row: torso fixed, hands from hanging to the belly */
const row = (gear: GearItem[], hip: Pt = [-17, -44], t = 135): Moves => {
  const sh: Pt = [hip[0] + 31 * sin(t), hip[1] + 31 * cos(t)];
  return side(
    gear,
    { label: 'arms long', hip, t, wr: [sh[0], sh[1] + 32] },
    { label: 'elbows back', hip, t, wr: 'belly', peak: true },
    { mistake: 0, hip: [-6, -50], t: 160, wr: 'belly' },
  );
};

/** a squat with the bar or weight at a point on the body */
const squat = (gear: GearItem[], hold: string, top: number, bottom: [Pt, number], eb?: number, feet: Pt = [0, -5.5]): Moves =>
  side(
    gear,
    { label: 'standing', t: top, wr: hold, eb, an: feet, hip: [feet[0] - 1, feet[1] - 46.8] },
    { label: 'bottom', hip: bottom[0], t: bottom[1], wr: hold, eb, an: feet, peak: true },
  );

/** a single-arm row with one knee and one hand on a bench */
const benchRow = (gear: GearItem[]): Moves =>
  side(
    [pad(-47, 20), ...gear],
    { label: 'arm long', hip: [-18, -49], t: 100, an: [[-4, -5.5], null], th: [0, 0], sh: [0, -90], ft: [90, 0], wr: [[12.5, -22.5], [13, -24]] },
    { label: 'elbow back', hip: [-18, -49], t: 100, an: [[-4, -5.5], null], th: [0, 0], sh: [0, -90], ft: [90, 0], wr: ['belly', [13, -24]], peak: true },
    { mistake: 0, hip: [-18, -49], t: 128, an: [[-4, -5.5], null], th: [0, 0], sh: [0, -90], ft: [90, 0], wr: ['belly', [8, -26]] },
  );

/** a press lying on a bench: straight arms over the shoulders, down to the chest */
const benchPress = (gear: GearItem[], base: Frame = LIE, bench: GearItem[] = [BENCH], lift: Pt = [1, -31.8]): Moves =>
  side(
    [...bench, ...gear],
    { label: 'arms locked', ...base, ws: lift },
    { label: 'bar to chest', ...base, wr: 'chest', eb: base.t === 270 ? 0 : undefined, peak: true },
    ...(base === LIE ? [{ mistake: 0, hip: [0, -34] as Pt, t: 284, an: [22, -5.5] as Pt, wr: 'chest', eb: 0 }] : []),
  );

/** a skullcrusher lying on a bench: forearms fold towards the head */
const skull = (gear: GearItem[], deep = 285): Moves =>
  side([BENCH, ...gear], { label: 'arms up', ...LIE, ua: 192, fa: 190 }, { label: 'lowered', ...LIE, ua: 196, fa: deep, peak: true });

/** a raise to the side, seen from the front */
const lateral = (gear: GearItem[], extra: Frame = {}): Moves =>
  front(
    gear,
    { label: 'arms down', ...extra, ua: 8, fa: 12 },
    { label: 'arms level', ...extra, ua: 88, fa: 95, peak: true },
    { mistake: 0, ...extra, ua: 122, fa: 128 },
  );

/** a calf raise on the edge of a step */
const calf = (gear: GearItem[], hold?: Frame): Moves =>
  side(
    [{ k: 'box', x: -3, w: 16, h: 5 }, ...gear],
    { label: 'heels down', ...hold, an: [1, -7.1], ft: 115, hip: [0, -53.9] },
    { label: 'up on the toes', ...hold, an: [5.5, -15.1], ft: 45, hip: [4.5, -61.9], peak: true },
  );

/** a plank held on the forearms: one frame, and the sag to avoid */
const PLANK = straight([-72, -4], [0, -21.5], { ua: 0, fa: 90 });

export const POSES: Record<string, Moves> = {
  /* ---------- squats and lunges ---------- */
  squat: side(
    [bb('back')],
    { label: 'standing', t: 176, wr: 'back' },
    { label: 'bottom', hip: [-15, -24], t: 138, wr: 'back', peak: true },
    { mistake: 0, hip: [-9, -30], t: 108, wr: 'back', cv: 5 },
  ),
  'front-squat': side(
    [bb('rack')],
    { label: 'standing', t: 179, wr: 'rack', eb: 80 },
    { label: 'bottom', hip: [-12, -22], t: 156, wr: 'rack', eb: 80, peak: true },
    { mistake: 0, hip: [-13, -25], t: 132, wr: 'rack', eb: 0 },
  ),
  'goblet-squat': side(
    [{ k: 'db', at: 'chest', r: 5.5 }],
    { label: 'standing', t: 178, wr: 'chest', eb: 0 },
    { label: 'bottom', hip: [-11, -21], t: 158, wr: 'chest', eb: 0, peak: true },
    { mistake: 0, hip: [-7, -24], t: 150, wr: 'chest', eb: 0, an: [0, -9], ft: 55 },
  ),
  'box-squat': side(
    [{ k: 'box', x: -27, w: 17, h: 25 }, bb('back')],
    { label: 'standing', t: 176, wr: 'back' },
    { label: 'seated on the box', hip: [-18, -30.5], t: 130, wr: 'back', peak: true },
  ),
  'hack-squat': side(
    [{ k: 'pad', at: 'spine', a: 200, l: 38 }, { k: 'frame', x: 4, y: 0, x2: -34, y2: -104 }, pad(6, 30, -1.5, 0)],
    { label: 'legs long', hip: [-2, -48], t: 200, an: [16, -5.5], ws: [5, -3], eb: 0 },
    { label: 'bottom', hip: [5.5, -27.3], t: 200, an: [16, -5.5], ws: [5, -3], eb: 0, peak: true },
  ),
  'leg-press': side(
    [{ k: 'pad', at: 'spine', a: 240, l: 36 }, pad(-9, 9, -16, 1), { k: 'pad', at: 'sole', a: 215, l: 24 }],
    { label: 'legs long', hip: [0, -22], t: 240, an: [36, -47.2], ft: 215, kb: 180, ua: 20, fa: 60 },
    { label: 'knees to chest', hip: [0, -22], t: 240, an: [18, -34.6], ft: 215, kb: 180, ua: 20, fa: 60, peak: true },
    { mistake: 0, hip: [2, -24], t: 250, cv: 6, an: [14, -30], ft: 215, kb: 180, ua: 20, fa: 60 },
  ),
  'split-squat': side(
    [DB],
    { label: 'top', hip: [-3, -48], an: [[14, -5.5], [-22, -8]], ft: [90, 40] },
    { label: 'bottom', hip: [-4, -30], an: [[14, -5.5], [-22, -8]], ft: [90, 40], peak: true },
    { mistake: 0, hip: [0, -32], t: 172, an: [[14, -5.5], [-8, -8]], ft: [90, 40] },
  ),
  bulgarian: side(
    [pad(-40, -16), DB],
    { label: 'top', hip: [-2, -46], t: 172, an: [[16, -5.5], [-22, -25]], ft: [90, 270] },
    { label: 'bottom', hip: [-4, -28], t: 166, an: [[16, -5.5], [-22, -25]], ft: [90, 270], peak: true },
  ),
  lunge: side(
    [DB],
    { label: 'standing', hip: [-1, -52] },
    { label: 'step and drop', hip: [-1, -30], an: [[18, -5.5], [-21, -8]], ft: [90, 40], peak: true },
  ),
  'reverse-lunge': side(
    [DB],
    { label: 'standing', hip: [-1, -52] },
    { label: 'step back and drop', hip: [-3, -30], an: [[2, -5.5], [-26, -8]], ft: [90, 40], peak: true },
  ),
  'step-up': side(
    [{ k: 'box', x: 4, w: 24, h: 22 }, DB],
    { label: 'foot on the box', hip: [-4, -45], an: [[12, -27.5], [-8, -5.5]] },
    { label: 'standing on top', hip: [11, -74], an: [[12, -27.5], [14, -34]], ft: [90, 60], peak: true },
    { mistake: 0, hip: [-2, -50], t: 196, an: [[12, -27.5], [-14, -8]], ft: [90, 40] },
  ),
  'leg-extension': side(
    [pad(-10, 22, -30, 2), { k: 'pad', at: 'spine', a: 188, l: 32 }, { k: 'roller', at: 'shin' }],
    { label: 'knees bent', hip: [0, -36], t: 188, th: 90, sh: -12, ft: 78, ua: 8, fa: 60 },
    { label: 'legs straight', hip: [0, -36], t: 188, th: 90, sh: 86, ft: 176, ua: 8, fa: 60, peak: true },
  ),
  'sissy-squat': side(
    [{ k: 'frame', x: 16, y: -60, x2: 16, y2: 0 }],
    { label: 'standing', an: [0, -8], ft: 40, hip: [-2, -54], wr: [16, -60] },
    { label: 'knees forward', an: [0, -8], ft: 40, hip: [-7, -26], t: 208, wr: [16, -60], peak: true },
  ),

  /* ---------- hinges ---------- */
  deadlift: side(
    [bb()],
    { label: 'set up', hip: [-23.4, -29], t: 118, wr: [4, -11.5] },
    { label: 'locked out', t: 180, wr: [-1, -51.3], peak: true },
    { mistake: 0, hip: [-20, -33], t: 106, cv: 8, wr: [4, -11.5] },
  ),
  rdl: rdl([bb()]),
  'trap-bar': side(
    [trap],
    { label: 'set up', hip: [-21, -22.8], t: 132, wr: [1, -11.5] },
    { label: 'standing', t: 180, wr: [-1, -51.3], peak: true },
  ),
  'stiff-leg': side(
    [bb()],
    { label: 'standing tall', wr: [-1, -51.3] },
    { label: 'hinged', hip: [-22.9, -46.4], t: 95, wr: [8, -11.7], peak: true },
  ),
  'good-morning': side(
    [bb('back')],
    { label: 'standing tall', t: 180, wr: 'back' },
    { label: 'hinged', hip: [-22, -45], t: 98, wr: 'back', peak: true },
    { mistake: 0, hip: [-16, -46], t: 100, cv: 8, wr: 'back' },
  ),
  'back-extension': side(
    [{ k: 'pad', at: 'hip', o: [5, 5], a: 135, l: 16, h: 1 }, { k: 'roller', at: 'calf' }, { k: 'frame', x: -30, y: -2, x2: 4, y2: -2 }],
    { label: 'hanging down', hip: [0, -40], t: 20, th: -45, sh: -45, ft: 45, wr: 'chest', eb: 0 },
    { label: 'body in line', hip: [0, -40], t: 135, th: -45, sh: -45, ft: 45, wr: 'chest', eb: 0, peak: true },
  ),
  'leg-curl': side(
    [pad(-22, 26), { k: 'roller', at: 'calf' }],
    { label: 'legs long', hip: [0, -26.5], t: 90, n: 100, th: -90, sh: -90, ft: 0, ua: 20, fa: 90 },
    { label: 'heels to glutes', hip: [0, -26.5], t: 90, n: 100, th: -90, sh: 158, ft: 248, ua: 20, fa: 90, peak: true },
  ),
  'seated-curl': side(
    [pad(-12, 16, -28, 2), { k: 'pad', at: 'spine', a: 185, l: 32 }, { k: 'roller', at: 'calf' }, { k: 'roller', at: 'thigh' }],
    { label: 'legs long', hip: [0, -34], t: 185, th: 90, sh: 84, ft: 174, ua: 8, fa: 60 },
    { label: 'heels under', hip: [0, -34], t: 185, th: 90, sh: -28, ft: 62, ua: 8, fa: 60, peak: true },
  ),
  nordic: side(
    [{ k: 'roller', at: 'calf' }, pad(-8, 8, -1.5, 0)],
    { label: 'kneeling tall', hip: [0, -29], t: 180, th: 0, sh: -90, ft: 0, ua: 20, fa: 60 },
    { label: 'lowering', hip: [19.7, -18.8], t: 125, th: -55, sh: -90, ft: 0, ua: 70, fa: 90, peak: true },
  ),
  'hip-thrust': side(
    [pad(-46, -20), bb('lap')],
    { label: 'hips down', hip: [-4, -12], t: 228, an: [20, -5.5], wr: 'lap' },
    { label: 'hips up', hip: [9, -28], t: 270, an: [20, -5.5], wr: 'lap', peak: true },
    { mistake: 0, hip: [9, -33], t: 282, cv: -5, an: [20, -5.5], wr: 'lap' },
  ),
  'glute-bridge': side(
    [],
    { label: 'on the floor', hip: [0, -5.2], t: 270, an: [16, -5.5], ua: 90, fa: 90, snap: true },
    { label: 'hips up', hip: [-2, -20], t: 298, an: [16, -5.5], ua: 64, fa: 90, peak: true },
    { mistake: 0, hip: [-2, -25], t: 308, cv: -5, an: [16, -5.5], ua: 60, fa: 90 },
  ),
  'cable-kickback': side(
    [cable(26, -8, { at: 'an' })],
    { label: 'leg under you', t: 165, an: [null, [0, -5.5]], th: [6, 0], sh: [0, 0], wr: [20, -62] },
    { label: 'leg back', t: 165, an: [null, [0, -5.5]], th: [-42, 0], sh: [-48, 0], ft: [40, 90], wr: [20, -62], peak: true },
  ),
  abduction: front(
    [FSEAT, { k: 'roller', at: 'kn', o: [4, 0] }, { k: 'roller', at: 'knF', o: [-4, 0] }],
    { label: 'knees together', ...FSIT, th: 6, sh: -4, ua: 20, fa: 10 },
    { label: 'knees apart', ...FSIT, th: 58, sh: 10, ua: 20, fa: 10, peak: true },
  ),
  'calf-raise': calf([{ k: 'roller', at: 'back', r: 4 }, { k: 'frame', x: -10, y: -92, x2: -10, y2: 0 }], { wr: 'back' }),
  'seated-calf': side(
    [{ k: 'box', x: 1, w: 16, h: 5 }, pad(-30, -6, -21.5, 2), { k: 'roller', at: 'thigh' }],
    { label: 'heels down', hip: [-18, -27], th: 90, an: [7, -7.1], ft: 115, ua: 20, fa: 80, kb: 120 },
    { label: 'up on the toes', hip: [-18, -27], th: 90, an: [11, -15.1], ft: 45, ua: 20, fa: 80, kb: 120, peak: true },
  ),

  /* ---------- presses ---------- */
  bench: benchPress([bb()]),
  'incline-bench': benchPress([bb()], INCLINE, INCLINE_PAD, [3, -31.7]),
  'decline-bench': side(
    [{ k: 'pad', at: 'spine', a: 285, l: 42, h: 1 }, { k: 'roller', at: 'shin' }, bb()],
    { label: 'arms locked', hip: [0, -31], t: 285, an: [16, -18], ft: 150, ws: [0, -31.8] },
    { label: 'bar to chest', hip: [0, -31], t: 285, an: [16, -18], ft: 150, wr: 'chest', eb: 20, peak: true },
  ),
  'db-bench': benchPress([DB]),
  'db-incline': benchPress([DB], INCLINE, INCLINE_PAD, [3, -31.7]),
  'chest-press': side(
    [SEAT, BACKREST, { k: 'frame', x: -8, y: -40, x2: -8, y2: 0 }, { k: 'roller', at: 'wr', r: 2.6 }],
    { label: 'hands by the chest', ...SIT, ws: [5, 2], eb: 270 },
    { label: 'arms long', ...SIT, ws: [31, 2], peak: true },
  ),
  'cable-fly': front(
    [cable(44, -100, { w: 1 })],
    { label: 'arms open', ua: 80, fa: 86 },
    { label: 'hands together', wr: [3, -80], eb: 90, sc: [0.35, 0.35, 1, 1], peak: true },
  ),
  'pec-deck': front(
    [FSEAT, { k: 'roller', at: 'el' }, { k: 'roller', at: 'elF' }],
    { label: 'arms open', ...FSIT, ua: 90, fa: 180 },
    { label: 'elbows together', ...FSIT, ua: -80, fa: 180, sc: [0.45, 1, 0.35, 1, 1], peak: true },
  ),
  pushup: side(
    [],
    { label: 'arms long', ...PUSH_TOP },
    { label: 'chest down', ...PUSH_LOW, peak: true },
    { mistake: 0, hip: [-25.4, -17.2], t: 125, an: TOE, wr: HANDS, eb: 225, ft: 30 },
  ),
  dip: side(
    [{ k: 'dip', at: 'wr' }],
    { label: 'arms locked', hip: [-4, -63], t: 170, wr: [0, -62], th: -10, sh: -80, ft: 10 },
    { label: 'lowered', hip: [-7, -44], t: 155, wr: [0, -62], th: -10, sh: -80, ft: 10, peak: true },
    { mistake: 0, hip: [-9, -36], t: 150, wr: [0, -62], th: -10, sh: -80, ft: 10 },
  ),
  ohp: side(
    [bb()],
    { label: 'bar at the collarbone', t: 180, n: 188, wr: 'rack', eb: 70 },
    { label: 'arms locked overhead', t: 180, ws: [1.5, -31.8], peak: true },
    { mistake: 0, hip: [-4, -52], t: 200, ws: [8, -31] },
  ),
  'push-press': side(
    [bb()],
    { label: 'bar at the collarbone', t: 180, wr: 'rack', eb: 70 },
    { label: 'dip', hip: [-3, -45], t: 178, wr: 'rack', eb: 70 },
    { label: 'drive overhead', t: 180, ws: [1.5, -31.8], peak: true },
  ),
  'db-press': front(
    [FSEAT, DB],
    { label: 'elbows out', ...FSIT, ua: 88, fa: 178 },
    { label: 'arms overhead', ...FSIT, ua: 166, fa: 174, peak: true },
  ),
  arnold: front(
    [FSEAT, DB],
    { label: 'palms to you', ...FSIT, ua: -30, fa: 180, sc: [0.6, 1, 0.35, 1, 1] },
    { label: 'turn and open', ...FSIT, ua: 88, fa: 178 },
    { label: 'arms overhead', ...FSIT, ua: 166, fa: 174, peak: true },
  ),
  'lateral-raise': lateral([DB]),
  'cable-lateral': front(
    [cable(-32, -8, { at: 'wr' })],
    { label: 'arm across', ua: [-14, 45], fa: [-14, 45] },
    { label: 'arm level', ua: [86, 45], fa: [92, 45], peak: true },
  ),
  'front-raise': side(
    [DB],
    { label: 'arms down', ua: 0, fa: 0 },
    { label: 'arms level', ua: 96, fa: 96, peak: true },
    { mistake: 0, hip: [-3, -52], t: 198, ua: 112, fa: 112 },
  ),
  'rear-delt-fly': front(
    [DB],
    { label: 'hinged, arms down', hip: [0, -51], sc: [1, 1, 1, 1, 0.45], n: 180, ua: 4, fa: 4 },
    { label: 'arms out wide', hip: [0, -51], sc: [1, 1, 1, 1, 0.45], n: 180, ua: 84, fa: 88, peak: true },
  ),
  'face-pull': facePull([cable(44, -92)]),
  'upright-row': front(
    [bb('mid')],
    { label: 'bar at the thighs', wr: [6, -50] },
    { label: 'elbows high', wr: [6, -80], eb: 90, peak: true },
  ),

  /* ---------- pulls ---------- */
  row: row([bb()]),
  pendlay: side(
    [bb()],
    { label: 'bar on the floor', hip: [-24, -40.8], t: 95, wr: [7, -11.5] },
    { label: 'bar to the belly', hip: [-24, -40.8], t: 95, wr: 'belly', peak: true },
  ),
  'db-row': benchRow([oneDb]),
  'chest-row': side(
    [{ k: 'pad', at: 'front', a: 128, l: 40 }, { k: 'frame', x: 10, y: -42, x2: 10, y2: 0 }, DB],
    { label: 'arms long', hip: [-10, -40], t: 128, an: [-14, -5.5], wr: [14.4, -27.5] },
    { label: 'elbows back', hip: [-10, -40], t: 128, an: [-14, -5.5], wr: 'belly', peak: true },
  ),
  'cable-row': side(
    [pad(-12, 12, -12), cable(60, -14), { k: 'frame', x: 45, y: -2, x2: 45, y2: -24 }],
    { label: 'arms long', hip: [0, -18], t: 160, an: [36, -12], ft: 180, ws: [30, 6] },
    { label: 'handle to the belly', hip: [0, -18], t: 186, an: [36, -12], ft: 180, wr: 'belly', peak: true },
    { mistake: 0, hip: [0, -18], t: 140, cv: 7, an: [36, -12], ft: 180, ws: [30, 10] },
  ),
  pulldown: front(
    [FSEAT, { k: 'pullbar', at: 'wr' }, cable(0, -134), { k: 'roller', at: 'thigh' }, { k: 'roller', at: 'thighF' }],
    { label: 'arms up', ...FSIT, wr: [22, -94] },
    { label: 'bar to the chest', ...FSIT, wr: [22, -66], eb: 20, peak: true },
  ),
  pullup: front(
    [{ k: 'pullbar', at: 'wr' }],
    { label: 'hanging', hip: [0, -67.6], wr: [20, BAR_Y], th: 3, sh: 3 },
    { label: 'chin over', hip: [0, -92], wr: [20, BAR_Y], eb: 0, th: 3, sh: 3, peak: true },
  ),
  chinup: side(
    [{ k: 'pullbar', at: 'wr' }],
    { label: 'hanging', hip: [8, -65], wr: [8, BAR_Y], th: 12, sh: -50, ft: 40 },
    { label: 'chin over', hip: [1, -89], t: 184, wr: [8, BAR_Y], eb: 30, th: 12, sh: -50, ft: 40, peak: true },
  ),
  'straight-arm': side(
    [cable(44, -108)],
    { label: 'arms up', hip: [-6, -51], t: 158, ua: 128, fa: 128 },
    { label: 'hands to thighs', hip: [-6, -51], t: 158, ua: 8, fa: 8, peak: true },
  ),
  shrug: front([DB], { label: 'arms long' }, { label: 'shoulders up', sc: [1, 1, 1, 1, 1.14], peak: true }),

  /* ---------- arms ---------- */
  curl: curl([bb()]),
  'db-curl': curl([DB]),
  'hammer-curl': curl([DB]),
  'incline-curl': side(
    [...INCLINE_PAD, DB],
    { label: 'arms hanging', ...INCLINE, t: 236, ua: 0, fa: 0 },
    { label: 'curled', ...INCLINE, t: 236, ua: 0, fa: 150, peak: true },
  ),
  preacher: side(
    [{ k: 'pad', at: 'tri', a: 40, l: 18, h: 1 }, pad(-24, -2, -20.5, 1), ez()],
    { label: 'arms long', hip: [-12, -28], t: 170, an: [10, -5.5], ua: 40, fa: 44 },
    { label: 'curled', hip: [-12, -28], t: 170, an: [10, -5.5], ua: 40, fa: 168, peak: true },
  ),
  'cable-curl': curl([cable(24, -8)], { an: [[6, -5.5], [-6, -5.5]] }),
  pushdown: pushdown([cable(18, -122)]),
  'overhead-triceps': side(
    [{ k: 'db', at: 'wr', r: 5.5 }],
    { label: 'weight behind the head', ua: 172, fa: -20 },
    { label: 'arms straight up', ua: 172, fa: 178, peak: true },
  ),
  skullcrusher: skull([ez()]),
  cgbp: benchPress([bb()]),
  kickback: side(
    [DB],
    { label: 'forearm hanging', hip: [-20, -47], t: 100, ua: -80, fa: 0 },
    { label: 'arm straight back', hip: [-20, -47], t: 100, ua: -80, fa: -80, peak: true },
    { mistake: 0, hip: [-20, -47], t: 100, ua: -40, fa: -60 },
  ),
  'wrist-curl': side(
    [pad(-26, 0, -18.5, 2), { k: 'hand', a: 50, l: 5 }],
    { label: 'wrist down', hip: [-12, -26], t: 160, an: [12, -5.5], wr: [14, -34], eb: 0, p: 0 },
    { label: 'wrist up', hip: [-12, -26], t: 160, an: [12, -5.5], wr: [14, -34], eb: 0, p: 1, peak: true },
  ),
  farmer: side([DB], { label: 'step', ...stepA }, { label: 'step', ...stepB, peak: true }),

  /* ---------- core ---------- */
  plank: side([], { label: 'hold', ...PLANK }, { mistake: 0, hip: [-28.1, -8.4], t: 115, an: [-72, -4], ua: 0, fa: 90, ft: 14 }),
  'side-plank': front([], { label: 'hold', t: 104, th: [-76, 76], sh: [-76, 76], ua: [0, 180], fa: [70, 180], sc: [1, 0.4, 1, 1], snap: true }),
  'knee-raise': side(
    [{ k: 'pullbar', at: 'wr' }],
    { label: 'hanging', hip: [6, -66], t: 182, wr: [6, BAR_Y], th: 0, sh: 0, ft: 60 },
    { label: 'knees up', hip: [6, -66], t: 190, wr: [6, BAR_Y], th: 104, sh: 4, ft: 80, peak: true },
  ),
  'leg-raise': side(
    [{ k: 'pullbar', at: 'wr' }],
    { label: 'hanging', hip: [6, -66], t: 182, wr: [6, BAR_Y], th: 0, sh: 0, ft: 60 },
    { label: 'legs level', hip: [6, -66], t: 192, wr: [6, BAR_Y], th: 92, sh: 92, ft: 160, peak: true },
  ),
  'cable-crunch': side(
    [cable(30, -112)],
    { label: 'tall', hip: [0, -29], th: 0, sh: -90, ft: 0, t: 168, wr: 'head', eb: 150 },
    { label: 'curled down', hip: [0, -29], th: 0, sh: -90, ft: 0, t: 78, cv: 7, wr: 'head', eb: 150, peak: true },
  ),
  'ab-wheel': side(
    [{ k: 'wheel', at: 'wr' }],
    { label: 'kneeling', hip: [-10.1, -26.8], t: 110.2, th: 24.9, sh: -90, ft: 0, wr: [19, -5.5] },
    { label: 'rolled out', hip: [20.8, -17], t: 100, th: -60, sh: -90, ft: 0, wr: [78.5, -5.5], peak: true },
    { mistake: 0, hip: [20.8, -12], t: 92, cv: -6, th: -45, sh: -90, ft: 0, wr: [78.5, -5.5] },
  ),
  deadbug: side(
    [],
    { label: 'arms up, knees up', hip: [0, -5], t: 270, ua: 180, fa: 180, th: 180, sh: 90, ft: 180, snap: true },
    { label: 'opposite arm and leg long', hip: [0, -5], t: 270, ua: [264, 180], fa: [264, 180], th: [180, 95], sh: [90, 95], ft: [180, 185], snap: true, peak: true },
  ),
  pallof: side(
    [cable(-6, -74, { at: 'wr' })],
    { label: 'hands at the chest', an: [[8, -5.5], [-8, -5.5]], hip: [0, -50], wr: 'chest', eb: 0 },
    { label: 'arms long', an: [[8, -5.5], [-8, -5.5]], hip: [0, -50], ws: [31, 6], peak: true },
  ),
  russian: front(
    [],
    { label: 'turn one way', hip: [0, -6], t: 186, sc: [1, 1, 0.45, 0.8, 0.82], th: 70, sh: 20, wr: [[-14, -34], [-13.9, -34]], eb: 0, snap: true },
    { label: 'and the other', hip: [0, -6], t: 174, sc: [1, 1, 0.45, 0.8, 0.82], th: 70, sh: 20, wr: [[14, -34], [13.9, -34]], eb: 0, snap: true, peak: true },
  ),
  'hip-airplane': side(
    [],
    { label: 'standing on one leg', an: [[0, -5.5], [-6, -14]], ua: 30, fa: 60 },
    { label: 'hinged, leg back', hip: [-8, -50], t: 95, an: [[0, -5.5], null], th: [0, -86], sh: [0, -86], ft: [90, 0], ua: 60, fa: 60, peak: true },
  ),
  'sled-push': side(
    [{ k: 'sled', at: 'wr' }],
    { label: 'drive', hip: [-14, -44], t: 130, wr: [18, -50], an: [[6, -5.5], [-32, -8]], ft: [90, 40] },
    { label: 'drive', hip: [-14, -44], t: 130, wr: [18, -50], an: [[-32, -8], [6, -5.5]], ft: [40, 90], peak: true },
  ),
  'kb-swing': side(
    [{ k: 'kb', a: 0, w: 1 }],
    { label: 'hike back', hip: [-18, -44], t: 118, ua: -14, fa: -22 },
    { label: 'hips snap forward', t: 180, ua: 92, fa: 92, peak: true },
    { mistake: 0, hip: [-12, -30], t: 150, ua: 10, fa: 10 },
  ),
  clean: side(
    [bb()],
    { label: 'set up', hip: [-23.4, -29], t: 118, wr: [4, -11.5] },
    { label: 'extend', hip: [-1, -56], t: 186, an: [2, -9], ft: 60, ua: 0, fa: 0 },
    { label: 'catch in the rack', hip: [-8, -44], t: 170, wr: 'rack', eb: 75, peak: true },
  ),
  snatch: side(
    [bb()],
    { label: 'set up', hip: [-26, -25], t: 112, wr: [4, -11.5] },
    { label: 'extend', hip: [-1, -56], t: 186, an: [2, -9], ft: 60, ua: 0, fa: 0 },
    { label: 'catch overhead', hip: [-10, -38], t: 166, ws: [-3, -31.6], peak: true },
  ),
  thruster: side(
    [bb()],
    { label: 'front squat', hip: [-12, -22], t: 156, wr: 'rack', eb: 80 },
    { label: 'drive it overhead', t: 180, ws: [1.5, -31.8], peak: true },
  ),
  burpee: side(
    [],
    { label: 'plank', ...PUSH_TOP },
    { label: 'feet in', hip: [-26.8, -19.5], t: 120, an: [-14, -5.5], wr: HANDS, eb: 225 },
    { label: 'jump', hip: [-12, -62], t: 180, ua: 172, fa: 178, th: 0, sh: 0, ft: 40, peak: true },
  ),
  'mountain-climber': side(
    [],
    { label: 'knee in', ...PUSH_TOP, th: undefined, sh: undefined, an: [[-38, -5], TOE] },
    { label: 'switch', ...PUSH_TOP, th: undefined, sh: undefined, an: [TOE, [-38, -5]], peak: true },
  ),
  rowing: side(
    [{ k: 'rower', x: -44, x2: 52 }],
    { label: 'catch', hip: [10, -16], t: 150, an: [36, -14], kb: 180, ft: 160, ws: [24, 18] },
    { label: 'finish', hip: [-18, -16], t: 200, an: [36, -14], kb: 180, ft: 160, wr: 'belly', peak: true },
  ),
  'assault-bike': side(
    [{ k: 'bike', x: 28 }],
    { label: 'push, pull', hip: [-2, -48], t: 170, an: [[24, -18], [8, -26]], wr: [[26, -64], [14, -60]], eb: 0 },
    { label: 'and switch', hip: [-2, -48], t: 170, an: [[8, -26], [24, -18]], wr: [[14, -60], [26, -64]], eb: 0, peak: true },
  ),
  'jump-rope': front(
    [{ k: 'rope' }],
    { label: 'rope under', hip: [0, -56], ua: 14, fa: 64, ft: 30, p: 0 },
    { label: 'rope over', hip: [0, -52.3], ua: 14, fa: 64, p: 1, peak: true },
  ),
  'box-jump': side(
    [{ k: 'box', x: 16, w: 26, h: 28 }],
    { label: 'load', hip: [-12, -32], t: 140, ua: -40, fa: -40 },
    { label: 'jump', hip: [6, -76], t: 172, th: 64, sh: -18, ft: 60, ua: 150, fa: 150 },
    { label: 'land soft', hip: [20, -57], t: 150, an: [29, -33.5], ua: 80, fa: 80, peak: true },
  ),
  sprint: side(
    [],
    { label: 'stride', hip: [-1, -50], t: 168, th: [72, -26], sh: [-18, -72], ft: [72, 18], ua: [-42, 42], fa: [40, 128] },
    { label: 'stride', hip: [-1, -50], t: 168, th: [-26, 72], sh: [-72, -18], ft: [18, 72], ua: [42, -42], fa: [128, 40], peak: true },
  ),
  'incline-walk': side(
    [{ k: 'tread', h: 7 }],
    { label: 'step', hip: [-1, -58], t: 172, an: [[12, -13], [-12, -11]], ft: 96 },
    { label: 'step', hip: [-1, -58], t: 172, an: [[-12, -11], [12, -13]], ft: 96, peak: true },
  ),
  'bench-dip': side(
    [pad(-34, -8)],
    { label: 'arms locked', hip: [-6, -25], t: 178, wr: [-10, -24], an: [34, -5.5], ft: 150 },
    { label: 'lowered', hip: [-4, -10], t: 172, wr: [-10, -24], an: [34, -5.5], ft: 150, peak: true },
  ),
  'pike-pushup': side(
    [],
    { label: 'hips high', hip: [-22, -50], t: 25, wr: HANDS, an: [-38, -6], ft: 50 },
    { label: 'head down', hip: [-22, -50], t: 42, wr: HANDS, an: [-38, -6], ft: 50, peak: true },
  ),
  'inverted-row': side(
    [{ k: 'pullbar', at: 'wr' }],
    { label: 'arms long', ...straight([50, -4], [0, -20]), wr: [2, -52], ft: 165 },
    { label: 'chest to the bar', ...straight([50, -4], [2, -40]), wr: [2, -52], ft: 165, peak: true },
  ),
  'hip-hinge': side(
    [oneDb],
    { label: 'standing on one leg', an: [[0, -5.5], [-4, -10]] },
    { label: 'hinged, leg back', hip: [-10, -49], t: 95, an: [[0, -5.5], null], th: [0, -86], sh: [0, -86], ft: [90, 0], peak: true },
  ),
  copenhagen: front(
    [{ k: 'pad', at: 'anF', o: [0, 6], a: 90, l: 20, h: 2 }],
    { label: 'hold', hip: [0, -32.1], t: 86, th: [-80, 94], sh: [-10, 94], ft: [0, 94], ua: [0, 180], fa: [60, 180], sc: [1, 0.4, 1, 1] },
  ),
  'calf-hop': side(
    [],
    { label: 'on the toes', an: [0, -9], ft: 50, hip: [-1, -55] },
    { label: 'off the floor', hip: [-1, -62], th: 0, sh: 0, ft: 40, peak: true },
  ),
  'landmine-press': side(
    [{ k: 'lm', x: 90, at: 'wr' }],
    { label: 'at the shoulder', an: [[8, -5.5], [-10, -5.5]], wr: 'rack', eb: 60 },
    { label: 'pressed up and out', an: [[8, -5.5], [-10, -5.5]], ws: [18, -25], peak: true },
  ),
  'landmine-row': side(
    [{ k: 'lm', x: -90, at: 'wr' }],
    { label: 'arms long', hip: [-18, -44], t: 130, wr: [5.7, -31.9] },
    { label: 'to the chest', hip: [-18, -44], t: 130, wr: 'belly', peak: true },
  ),
  zercher: squat([bb('el')], 'chest', 180, [[-10, -22], 160], 60),
  'belt-squat': side(
    [{ k: 'box', x: -14, w: 28, h: 10 }, { k: 'belt', at: 'hip' }],
    { label: 'standing', an: [0, -15.5], hip: [-1, -62.3], ws: [14, 8] },
    { label: 'bottom', an: [0, -15.5], hip: [-12, -36], t: 172, ws: [14, 8], peak: true },
  ),
  'chest-fly-db': side(
    [BENCH, DB],
    { label: 'arms up', ...LIE, ua: 180, fa: 180 },
    { label: 'arms wide', ...LIE, ua: 28, fa: 40, sc: [0.6, 0.6, 1, 1], peak: true },
  ),
  'reverse-curl': curl([bb()]),
  'neck-curl': side(
    [pad(-28, 16)],
    { label: 'head back', ...LIE, n: 305, wr: 'chest', eb: 0 },
    { label: 'chin to chest', ...LIE, n: 232, wr: 'chest', eb: 0, peak: true },
  ),
  'tib-raise': side(
    [{ k: 'wall', x: -20 }],
    { label: 'toes down', hip: [-8, -48], t: 190, an: [12, -5.5] },
    { label: 'toes up', hip: [-8, -48], t: 190, an: [12, -5.5], ft: 128, peak: true },
  ),
  'calf-jump': side(
    [],
    { label: 'landing', an: [0, -8], ft: 55, hip: [-1, -54.5] },
    { label: 'spring up', hip: [-1, -60], th: 0, sh: 0, ft: 42, peak: true },
  ),
  'front-plank-reach': side(
    [],
    { label: 'plank', ...PUSH_TOP },
    { label: 'reach', ...PUSH_TOP, wr: [null, HANDS], ua: [104, 0], fa: [104, 0], peak: true },
  ),
  'suitcase-carry': side([oneDb], { label: 'step', ...stepA }, { label: 'step', ...stepB, peak: true }),
  'hollow-hold': side(
    [],
    { label: 'hold', hip: [0, -5], t: 256, ua: 262, fa: 262, th: 98, sh: 98, ft: 190, snap: true },
    { mistake: 0, hip: [0, -5], t: 262, cv: -5, ua: 262, fa: 262, th: 93, sh: 93, ft: 190, snap: true },
  ),
  'bird-dog': side(
    [],
    { label: 'on all fours', hip: [0, -29], t: 105, th: 0, sh: -90, ft: 0, ua: 0, fa: 0 },
    { label: 'opposite arm and leg long', hip: [0, -29], t: 105, th: [0, -75], sh: [-90, -75], ft: [0, 15], ua: [105, 0], fa: [105, 0], peak: true },
  ),
  'wall-sit': side([{ k: 'wall', x: -20 }], { label: 'hold', hip: [-12, -28.5], an: [12, -5.5], wr: 'lap', eb: 0 }),
  'glute-ham': side(
    [pad(-6, 16, -34.5, 1), { k: 'roller', at: 'calf' }],
    { label: 'body level', hip: [24, -40], t: 90, th: -90, sh: -90, ft: 0, wr: 'chest', eb: 0 },
    { label: 'upright on the knees', hip: [0, -64], t: 180, th: 0, sh: -90, ft: 0, wr: 'chest', eb: 0, peak: true },
  ),
  'chest-supported-fly': front(
    [FSEAT],
    { label: 'arms forward', ...FSIT, wr: [3, -62], eb: 90, sc: [0.35, 0.35, 0.35, 1, 1] },
    { label: 'arms open', ...FSIT, ua: 88, fa: 90, peak: true },
  ),

  /* ---------- cables ---------- */
  'cable-crossover': front(
    [cable(38, -10, { w: 1 })],
    { label: 'hands low', ua: 38, fa: 38 },
    { label: 'hands meet high', wr: [3, -88], eb: 90, sc: [0.4, 0.4, 1, 1], peak: true },
  ),
  'single-cable-row': side(
    [cable(50, -62)],
    { label: 'arm long', an: [[10, -5.5], [-14, -5.5]], t: 170, wr: [[36, -62], null] },
    { label: 'elbow back', an: [[10, -5.5], [-14, -5.5]], t: 176, wr: ['belly', null], peak: true },
  ),
  'cable-pullover': side(
    [cable(42, -112)],
    { label: 'arms up', hip: [-8, -51], t: 150, ua: 150, fa: 150 },
    { label: 'hands to thighs', hip: [-8, -51], t: 150, ua: 12, fa: 12, peak: true },
  ),
  'overhead-cable-ext': side(
    [cable(-34, -70)],
    { label: 'elbows bent', an: [[10, -5.5], [-12, -5.5]], hip: [-2, -50], t: 150, ua: 158, fa: 305 },
    { label: 'arms straight', an: [[10, -5.5], [-12, -5.5]], hip: [-2, -50], t: 150, ua: 158, fa: 156, peak: true },
  ),
  'cable-hip-abduction': front(
    [cable(-34, -8, { at: 'an' })],
    { label: 'leg under you', th: [4, 4], sh: [4, 2], ua: [10, 62], fa: [10, 62] },
    { label: 'leg out', th: [38, 4], sh: [38, 2], ua: [10, 62], fa: [10, 62], peak: true },
  ),
  'cable-woodchop': front(
    [cable(44, -118)],
    { label: 'hands high', t: 186, th: 10, sh: 6, wr: [[26, -110], [25.9, -110]] },
    { label: 'hands low across', t: 174, th: 10, sh: 6, wr: [[-24, -42], [-24.1, -42]], peak: true },
  ),
  'cable-y-raise': front(
    [cable(36, -10, { w: 1 })],
    { label: 'hands low', ua: 14, fa: 14 },
    { label: 'arms in a Y', ua: 146, fa: 146, peak: true },
  ),

  /* ---------- kettlebells ---------- */
  'kb-goblet': squat([{ k: 'kb', at: 'chest', o: [2, 2] }], 'chest', 178, [[-11, -21], 158], 0),
  'kb-press': side(
    [{ k: 'kb', a: 160, w: 1 }],
    { label: 'bell in the rack', wr: ['rack', null], eb: 70 },
    { label: 'arm locked overhead', ua: [180, 0], fa: [180, 0], peak: true },
  ),
  'kb-row': benchRow([{ k: 'kb', w: 1 }]),
  'turkish-getup': side(
    [{ k: 'kb', a: 160, w: 1 }],
    { label: 'lying, arm up', hip: [0, -5], t: 270, ua: [180, 92], fa: [180, 92], an: [[18, -5.5], null], th: [0, 92], sh: [0, 92], ft: [90, 180], snap: true },
    { label: 'up on the hand', hip: [0, -5], t: 212, ua: [180, 330], fa: [180, 330], an: [[18, -5.5], null], th: [0, 92], sh: [0, 92], ft: [90, 180], snap: true },
    { label: 'standing, arm up', ua: [180, 0], fa: [180, 0], peak: true },
  ),
  'kb-clean': side(
    [{ k: 'kb', a: 0, a2: 160, w: 1 }],
    { label: 'hike back', hip: [-18, -44], t: 118, ua: [-14, -14], fa: [-22, -22], p: 0 },
    { label: 'bell in the rack', wr: ['rack', null], eb: 70, p: 1, peak: true },
  ),
  'kb-snatch': side(
    [{ k: 'kb', a: 0, a2: 160, w: 1 }],
    { label: 'hike back', hip: [-18, -44], t: 118, ua: [-14, -14], fa: [-22, -22], p: 0 },
    { label: 'arm locked overhead', ua: [180, 0], fa: [180, 0], p: 1, peak: true },
  ),
  'kb-deadlift': side(
    [{ k: 'kb', w: 1 }],
    { label: 'set up', hip: [-18, -26], t: 128, wr: [4, -14] },
    { label: 'standing', t: 180, wr: [-1, -51.3], peak: true },
  ),

  /* ---------- bands ---------- */
  'band-pull-apart': front(
    [{ k: 'band', f: 'wrF', at: 'wr' }],
    { label: 'arms forward', wr: [5, -80], sc: [0.2, 0.2, 1, 1] },
    { label: 'arms wide', ua: 90, fa: 90, peak: true },
  ),
  'band-face-pull': facePull([band(44, -92)]),
  'band-row': side(
    [band(46, -66)],
    { label: 'arms long', an: [[8, -5.5], [-8, -5.5]], t: 176, ws: [28, 8] },
    { label: 'elbows back', an: [[8, -5.5], [-8, -5.5]], t: 178, wr: 'belly', peak: true },
  ),
  'band-curl': curl([{ k: 'band', f: 'toe', at: 'wr' }]),
  'band-pushdown': pushdown([band(16, -122)]),
  'band-walk': front(
    [{ k: 'band', f: 'knF', at: 'kn' }],
    { label: 'feet under you', hip: [0, -50], th: [8, 8], sh: [2, 2] },
    { label: 'step out', hip: [2, -50], th: [24, 8], sh: [14, 2], peak: true },
  ),
  'band-pallof': side(
    [{ k: 'band', x: -6, y: -74 }],
    { label: 'hands at the chest', an: [[8, -5.5], [-8, -5.5]], hip: [0, -50], wr: 'chest', eb: 0 },
    { label: 'arms long', an: [[8, -5.5], [-8, -5.5]], hip: [0, -50], ws: [31, 6], peak: true },
  ),

  /* ---------- the Smith machine ---------- */
  'smith-squat': squat([smith('back')], 'back', 180, [[-10, -26], 150], undefined, [8, -5.5]),
  'smith-bench': benchPress([smith()]),
  'smith-incline': benchPress([smith()], INCLINE, INCLINE_PAD, [3, -31.7]),
  'smith-ohp': side(
    [SEAT, BACKREST, smith()],
    { label: 'bar at the chin', ...SIT, wr: 'rack', eb: 60 },
    { label: 'arms locked', ...SIT, ws: [2, -31.8], peak: true },
  ),
  'smith-rdl': side(
    [smith()],
    { label: 'standing tall', wr: [2, -51.3] },
    { label: 'hips back', hip: [-24.9, -44.2], t: 105, wr: [2, -21], peak: true },
  ),
  'smith-calf': calf([smith('back')], { wr: 'back' }),

  /* ---------- the trap bar ---------- */
  'trapbar-row': side(
    [trap],
    { label: 'arms long', hip: [-22, -44], t: 110, ua: 0, fa: 0 },
    { label: 'elbows back', hip: [-22, -44], t: 110, wr: 'belly', peak: true },
  ),
  'trapbar-carry': side([trap], { label: 'step', ...stepA }, { label: 'step', ...stepB, peak: true }),
  'trapbar-jump': side(
    [trap],
    { label: 'dip', hip: [-14, -36], t: 145, ua: 0, fa: 0 },
    { label: 'jump', hip: [-1, -64], t: 180, th: 0, sh: 0, ft: 45, peak: true },
  ),

  /* ---------- the EZ bar ---------- */
  'ez-curl': curl([ez()]),
  'ez-skull': skull([ez()], 300),
  'ez-upright': front(
    [ez('mid')],
    { label: 'bar at the thighs', wr: [5, -50] },
    { label: 'elbows high', wr: [5, -80], eb: 90, peak: true },
  ),
  'ez-reverse-curl': curl([ez()]),
  'ez-pullover': side(
    [BENCH, ez()],
    { label: 'arms up', ...LIE, ua: 182, fa: 188 },
    { label: 'behind the head', ...LIE, ua: 262, fa: 272, peak: true },
  ),
};
