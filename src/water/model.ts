/** Everything WATER knows about drinks, cups, companions and challenges. */

export { WATER_KEY } from './key';

export type Unit = 'oz' | 'ml';

export const ML_PER_OZ = 29.5735;

/** a stroke glyph, drawn on a 24 × 24 grid like the tab icons */
export type GlyphId =
  | 'glass'
  | 'bubbles'
  | 'bolt'
  | 'cup'
  | 'mug'
  | 'carton'
  | 'straw'
  | 'can'
  | 'pint'
  | 'wine'
  | 'blender'
  | 'coconut'
  | 'bowl'
  | 'bottle'
  | 'flask'
  | 'drop'
  | 'leaf'
  | 'star'
  | 'shot'
  | 'cocktail'
  | 'boba';

export type DrinkKind = 'water' | 'tea & coffee' | 'milk' | 'juice & soda' | 'alcohol' | 'food & other';

export interface Drink {
  id: string;
  name: string;
  /** how much of the volume counts as water */
  factor: number;
  glyph: GlyphId;
  /** the cup a single tap pours, in ounces */
  defaultOz: number;
  /** a rough caffeine estimate, per 8 oz */
  caffeinePer8?: number;
  /** a rough energy estimate, per 8 oz */
  kcalPer8?: number;
  kind?: DrinkKind;
  custom?: boolean;
}

export { DRINKS, DEFAULT_PANEL } from './drinks';

export const CUPS_OZ = [4, 8, 12, 16, 20, 24, 32];

/** the everyday glyphs a custom drink can wear */
export const GLYPH_PICKS: GlyphId[] = [
  'glass',
  'bottle',
  'flask',
  'cup',
  'mug',
  'straw',
  'can',
  'bubbles',
  'bolt',
  'leaf',
  'drop',
  'star',
];

const G = (body: string, size = 24): string =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const GLYPHS: Record<GlyphId, string> = {
  glass: '<path d="M6 4h12l-1.6 15.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.7 10h10.6"/>',
  bubbles: '<path d="M6 4h12l-1.6 15.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3z"/><circle cx="10.5" cy="15" r="1"/><circle cx="13.5" cy="11.5" r="1.2"/><circle cx="11" cy="8" r=".8"/>',
  bolt: '<rect x="7.5" y="6" width="9" height="15" rx="2"/><path d="M10 3h4v3h-4z"/><path d="M12.6 9.5l-2 3.2h2.8l-2 3.3"/>',
  cup: '<path d="M4.5 9h11v5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 4.5 14z"/><path d="M15.5 10.5h1.5a2 2 0 0 1 0 4h-1.7"/><path d="M3 21h15"/><path d="M8.5 6c0-1 1-1.2 1-2.2M11.5 6c0-1 1-1.2 1-2.2"/>',
  mug: '<path d="M5 6h10v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M15 9h1.5a2.5 2.5 0 0 1 0 5H15"/><path d="M5 9.5h10"/>',
  carton: '<path d="M7 8l2.5-4h5L17 8v12H7z"/><path d="M7 8h10M12 8V4"/><path d="M9.5 13h5"/>',
  straw: '<path d="M6.5 8h11l-1.3 11.8a1.3 1.3 0 0 1-1.3 1.2H9.1a1.3 1.3 0 0 1-1.3-1.2z"/><path d="M13 13l2-10 3 1"/><path d="M7 12h10"/>',
  can: '<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M7 7.5h10M7 17.5h10"/><path d="M10.5 12h3"/>',
  pint: '<path d="M6 5h10v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 6 18z"/><path d="M16 8.5h1.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H16"/><path d="M6 8c1.5-1.4 3-1.4 5 0s3.5 1.4 5 0"/>',
  wine: '<path d="M7.5 3h9c0 5-1.5 8.5-4.5 8.5S7.5 8 7.5 3z"/><path d="M12 11.5V20M8.5 20.5h7"/><path d="M8 6.5h8"/>',
  blender: '<path d="M7 3h10l-1.6 11H8.6z"/><path d="M8 17a4 4 0 0 1 8 0v3.5H8z"/><path d="M9.5 7.5l5-1.5M9.3 10.5l5.4-1.2"/>',
  coconut: '<circle cx="12" cy="13.5" r="7"/><path d="M8.5 9.5c2-1.8 5-1.8 7 0"/><path d="M14 3l-1.5 6"/><circle cx="12" cy="13.5" r="1"/>',
  bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 20.5h8"/><path d="M9 7.5c0-1.3 1.2-1.5 1.2-2.8M13.5 7.5c0-1.3 1.2-1.5 1.2-2.8"/>',
  bottle: '<path d="M10 3h4v3.5l1.8 2.2a2 2 0 0 1 .5 1.3v9A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-2v-9a2 2 0 0 1 .5-1.3L10 6.5z"/><path d="M7.7 13h8.6"/>',
  flask: '<path d="M9 3h6M10 3v6L5.4 17.5A2.3 2.3 0 0 0 7.4 21h9.2a2.3 2.3 0 0 0 2-3.5L14 9V3"/><path d="M7.5 15h9"/>',
  drop: '<path d="M12 3.5c3.5 4.4 6 7.8 6 10.9a6 6 0 0 1-12 0c0-3.1 2.5-6.5 6-10.9z"/>',
  leaf: '<path d="M5 19C5 10 10.5 5 19.5 4.5 19 13.5 14 19 5 19z"/><path d="M5 19l8-8"/>',
  star: '<path d="M12 3.5l2.5 5.3 5.7.7-4.2 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.2-4 5.7-.7z"/>',
  shot: '<path d="M6.5 9h9v4.5a4.5 4.5 0 0 1-9 0z"/><path d="M15.5 10.5h1a1.8 1.8 0 0 1 0 3.6h-1.2"/><path d="M4.5 19.5h13"/><path d="M9.5 6.5c0-1 .8-1.2.8-2.2"/>',
  cocktail: '<path d="M4.5 4.5h15L12 12.5z"/><path d="M12 12.5v7.5M8.5 20.5h7"/><path d="M15 3l2.5 4"/><circle cx="16.8" cy="7.6" r="1.2"/>',
  boba: '<path d="M6.5 8h11l-1.4 12a1.4 1.4 0 0 1-1.4 1.2H9.3a1.4 1.4 0 0 1-1.4-1.2z"/><path d="M5.5 8h13M13 8l1.5-5"/><circle cx="10" cy="18" r=".9"/><circle cx="12.5" cy="17" r=".9"/><circle cx="14" cy="19" r=".9"/>',
};

export const glyph = (id: GlyphId, size = 24): string => G(GLYPHS[id] ?? GLYPHS.glass, size);

/* ---------- companions ---------- */

export type CharacterId =
  | 'llama'
  | 'cat'
  | 'dog'
  | 'fox'
  | 'penguin'
  | 'otter'
  | 'capybara'
  | 'sloth'
  | 'bunny'
  | 'bear'
  | 'frog'
  | 'owl'
  | 'duck'
  | 'turtle'
  | 'whale'
  | 'hedgehog'
  | 'koala'
  | 'panda'
  | 'seal'
  | 'axolotl'
  | 'hippo'
  | 'elephant'
  | 'mouse'
  | 'octopus';

/** what a companion waits for: a count of something, reaching n */
export type UnlockKind = 'start' | 'met' | 'streak' | 'drinks' | 'challenges' | 'variety' | 'mornings' | 'weekends';

export interface Companion {
  id: CharacterId;
  name: string;
  /** how it is earned, in plain words */
  how: string;
  unlock: [UnlockKind, number];
}

export const COMPANIONS: Companion[] = [
  { id: 'llama', name: 'Lemon the llama', how: 'With you from the first sip.', unlock: ['start', 0] },
  { id: 'cat', name: 'Pip the cat', how: 'Meet your goal once.', unlock: ['met', 1] },
  { id: 'dog', name: 'Biscuit the dog', how: 'Meet your goal three days running.', unlock: ['streak', 3] },
  { id: 'bunny', name: 'Clover the bunny', how: 'Meet your goal on five days.', unlock: ['met', 5] },
  { id: 'fox', name: 'Ember the fox', how: 'Keep a seven-day streak.', unlock: ['streak', 7] },
  { id: 'penguin', name: 'Pebble the penguin', how: 'Log fifty drinks.', unlock: ['drinks', 50] },
  { id: 'otter', name: 'Ripple the otter', how: 'Finish any challenge.', unlock: ['challenges', 1] },
  { id: 'owl', name: 'Hazel the owl', how: 'A drink before 9 AM on ten mornings.', unlock: ['mornings', 10] },
  { id: 'frog', name: 'Fern the frog', how: 'Try ten different drinks.', unlock: ['variety', 10] },
  { id: 'bear', name: 'Bramble the bear', how: 'Log a hundred drinks.', unlock: ['drinks', 100] },
  { id: 'capybara', name: 'Mango the capybara', how: 'Keep a fourteen-day streak.', unlock: ['streak', 14] },
  { id: 'seal', name: 'Nimbus the seal', how: 'Meet your goal on eight weekend days.', unlock: ['weekends', 8] },
  { id: 'duck', name: 'Puddle the duck', how: 'Keep a twenty-one-day streak.', unlock: ['streak', 21] },
  { id: 'sloth', name: 'Moss the sloth', how: 'Meet your goal on thirty days.', unlock: ['met', 30] },
  { id: 'hedgehog', name: 'Thistle the hedgehog', how: 'Finish three challenges.', unlock: ['challenges', 3] },
  { id: 'whale', name: 'Tide the whale', how: 'Log two hundred drinks.', unlock: ['drinks', 200] },
  { id: 'panda', name: 'Bao the panda', how: 'Keep a thirty-day streak.', unlock: ['streak', 30] },
  { id: 'turtle', name: 'Shelby the turtle', how: 'Meet your goal on forty-five days.', unlock: ['met', 45] },
  { id: 'koala', name: 'Gum the koala', how: 'Meet your goal on sixty days.', unlock: ['met', 60] },
  { id: 'axolotl', name: 'Coral the axolotl', how: 'Try twenty different drinks.', unlock: ['variety', 20] },
  { id: 'mouse', name: 'Crumb the mouse', how: 'Finish six challenges.', unlock: ['challenges', 6] },
  { id: 'hippo', name: 'Lotus the hippo', how: 'Log five hundred drinks.', unlock: ['drinks', 500] },
  { id: 'octopus', name: 'Inky the octopus', how: 'Keep a sixty-day streak.', unlock: ['streak', 60] },
  { id: 'elephant', name: 'Juniper the elephant', how: 'Meet your goal on a hundred days.', unlock: ['met', 100] },
];

/* ---------- challenges ---------- */

export type ChallengeId =
  | 'week'
  | 'fortnight'
  | 'month'
  | 'nosoda'
  | 'nobooze'
  | 'nolate'
  | 'morning'
  | 'tea'
  | 'early'
  | 'variety'
  | 'weekend'
  | 'runday';

export interface Challenge {
  id: ChallengeId;
  name: string;
  blurb: string;
  /** what it takes to finish */
  target: number;
}

export const CHALLENGES: Challenge[] = [
  { id: 'week', name: 'Seven straight', blurb: 'Meet your goal seven days in a row.', target: 7 },
  { id: 'fortnight', name: 'Fourteen straight', blurb: 'Meet your goal fourteen days in a row.', target: 14 },
  { id: 'month', name: 'Thirty straight', blurb: 'Meet your goal thirty days in a row.', target: 30 },
  { id: 'nosoda', name: 'No-soda week', blurb: 'Seven days without a single soda.', target: 7 },
  { id: 'nobooze', name: 'Dry week', blurb: 'Seven days without beer, wine, cider or spirits.', target: 7 },
  { id: 'nolate', name: 'Calm evenings', blurb: 'Seven days with no caffeine after 2 PM.', target: 7 },
  { id: 'morning', name: 'Morning glass', blurb: 'A glass of water before 10 AM on five days.', target: 5 },
  { id: 'tea', name: 'Tea time', blurb: 'A cup of tea on five days.', target: 5 },
  { id: 'early', name: 'Early finish', blurb: 'Reach your goal before 8 PM on five days.', target: 5 },
  { id: 'variety', name: 'Tasting flight', blurb: 'Seven different drinks while it runs.', target: 7 },
  { id: 'weekend', name: 'Weekend water', blurb: 'Meet your goal on four weekend days.', target: 4 },
  {
    id: 'runday',
    name: 'Run-day water',
    blurb: 'Meet your goal on every run or lift day, four of them in a row.',
    target: 4,
  },
];

/* ---------- achievements ---------- */

export interface Achievement {
  id: string;
  name: string;
  how: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-sip', name: 'First sip', how: 'Log a drink.' },
  { id: 'first-goal', name: 'Topped up', how: 'Meet your goal for the first time.' },
  { id: 'streak-3', name: 'Three in a row', how: 'A three-day streak.' },
  { id: 'streak-7', name: 'A good week', how: 'A seven-day streak.' },
  { id: 'streak-14', name: 'Fortnight', how: 'A fourteen-day streak.' },
  { id: 'streak-30', name: 'Tidewater', how: 'A thirty-day streak.' },
  { id: 'drinks-50', name: 'Fifty pours', how: 'Log fifty drinks.' },
  { id: 'drinks-250', name: 'Reservoir', how: 'Log two hundred and fifty drinks.' },
  { id: 'over', name: 'Overflow', how: 'Reach a day and a quarter of your goal.' },
  { id: 'variety', name: 'Mixologist', how: 'Log six different drinks.' },
  { id: 'early', name: 'Early bird', how: 'A drink before 7 AM.' },
  { id: 'challenge', name: 'Challenger', how: 'Finish a challenge.' },
];

/* ---------- units ---------- */

export const toUnit = (oz: number, unit: Unit): number =>
  unit === 'ml' ? Math.round((oz * ML_PER_OZ) / 10) * 10 : Math.round(oz * 10) / 10;

export const fromUnit = (value: number, unit: Unit): number => (unit === 'ml' ? value / ML_PER_OZ : value);

export const amount = (oz: number, unit: Unit): string => {
  const v = toUnit(oz, unit);
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit}`;
};
