import type { CharacterId } from './model';

/**
 * The companions, drawn from rounded shapes in the style of the app icon: lime
 * on dark, soft corners, banana ears on the llama. Every shape of a body is
 * also its clip path, so the day's water rises inside the animal itself.
 */
interface Art {
  shapes: string;
  top: number;
  bottom: number;
  eyes: [number, number][];
  mouth: [number, number];
  /** party hat: x, y, tilt */
  hat: [number, number, number];
  /** where the sleepy z's float */
  snore: [number, number];
  /** lines that sit on top of the body and do not fill */
  details?: string;
}

const ART: Record<CharacterId, Art> = {
  llama: {
    shapes: `
      <rect x="40" y="108" width="104" height="58" rx="29"/>
      <rect x="50" y="146" width="17" height="44" rx="8.5"/><rect x="73" y="146" width="17" height="44" rx="8.5"/>
      <rect x="104" y="146" width="17" height="44" rx="8.5"/><rect x="126" y="146" width="17" height="44" rx="8.5"/>
      <rect x="108" y="52" width="36" height="92" rx="18"/>
      <ellipse cx="136" cy="56" rx="31" ry="25"/>
      <ellipse cx="161" cy="67" rx="19" ry="15"/>
      <path d="M114 44 C104 28 106 10 117 5 C123 13 126 28 128 41 Z"/>
      <path d="M133 37 C131 20 137 5 148 3 C150 14 146 28 141 39 Z"/>
      <ellipse cx="40" cy="122" rx="11" ry="15"/>`,
    top: 3,
    bottom: 190,
    eyes: [[142, 52]],
    mouth: [165, 75],
    hat: [124, 34, -12],
    snore: [170, 26],
    details: '<path class="pet-line" d="M174 62 q3 2 2 5"/>',
  },
  cat: {
    shapes: `
      <ellipse cx="100" cy="148" rx="52" ry="44"/>
      <ellipse cx="154" cy="158" rx="13" ry="30" transform="rotate(-28 154 158)"/>
      <circle cx="100" cy="84" r="46"/>
      <path d="M58 66 L62 20 L96 42 Z"/><path d="M142 66 L138 20 L104 42 Z"/>
      <ellipse cx="80" cy="187" rx="16" ry="8"/><ellipse cx="120" cy="187" rx="16" ry="8"/>`,
    top: 20,
    bottom: 195,
    eyes: [
      [82, 82],
      [118, 82],
    ],
    mouth: [100, 102],
    hat: [100, 38, 0],
    snore: [152, 50],
    details:
      '<path class="pet-line" d="M56 96 h18 M56 104 l18 -3 M144 96 h-18 M144 104 l-18 -3"/><path class="pet-ink" d="M96 95 h8 l-4 4 z"/>',
  },
  dog: {
    shapes: `
      <ellipse cx="100" cy="150" rx="50" ry="42"/>
      <ellipse cx="152" cy="132" rx="9" ry="22" transform="rotate(40 152 132)"/>
      <circle cx="100" cy="86" r="42"/>
      <ellipse cx="60" cy="80" rx="14" ry="31" transform="rotate(26 60 80)"/>
      <ellipse cx="140" cy="80" rx="14" ry="31" transform="rotate(-26 140 80)"/>
      <ellipse cx="100" cy="104" rx="22" ry="16"/>
      <ellipse cx="80" cy="188" rx="16" ry="8"/><ellipse cx="120" cy="188" rx="16" ry="8"/>`,
    top: 44,
    bottom: 196,
    eyes: [
      [84, 80],
      [116, 80],
    ],
    mouth: [100, 111],
    hat: [100, 44, 6],
    snore: [150, 50],
    details: '<ellipse class="pet-ink" cx="100" cy="98" rx="7" ry="5"/>',
  },
  fox: {
    shapes: `
      <ellipse cx="152" cy="150" rx="22" ry="42" transform="rotate(-35 152 150)"/>
      <ellipse cx="100" cy="152" rx="44" ry="40"/>
      <path d="M50 70 C50 50 70 44 100 44 C130 44 150 50 150 70 C150 100 122 124 100 124 C78 124 50 100 50 70 Z"/>
      <path d="M56 62 L62 14 L94 46 Z"/><path d="M144 62 L138 14 L106 46 Z"/>
      <ellipse cx="82" cy="188" rx="14" ry="7"/><ellipse cx="118" cy="188" rx="14" ry="7"/>`,
    top: 14,
    bottom: 195,
    eyes: [
      [82, 78],
      [118, 78],
    ],
    mouth: [100, 108],
    hat: [100, 40, -6],
    snore: [154, 52],
    details: '<ellipse class="pet-ink" cx="100" cy="99" rx="5" ry="4"/><path class="pet-line" d="M140 172 q14 6 22 -4"/>',
  },
  penguin: {
    shapes: `
      <ellipse cx="46" cy="122" rx="12" ry="32" transform="rotate(20 46 122)"/>
      <ellipse cx="154" cy="122" rx="12" ry="32" transform="rotate(-20 154 122)"/>
      <ellipse cx="100" cy="112" rx="56" ry="76"/>
      <ellipse cx="80" cy="189" rx="16" ry="7"/><ellipse cx="120" cy="189" rx="16" ry="7"/>`,
    top: 36,
    bottom: 196,
    eyes: [
      [84, 72],
      [116, 72],
    ],
    mouth: [100, 100],
    hat: [100, 38, 8],
    snore: [148, 40],
    details:
      '<ellipse class="pet-line" cx="100" cy="132" rx="34" ry="46"/><path class="pet-beak" d="M92 86 L108 86 L100 95 Z"/>',
  },
  otter: {
    shapes: `
      <ellipse cx="150" cy="168" rx="12" ry="30" transform="rotate(-52 150 168)"/>
      <rect x="58" y="70" width="84" height="118" rx="42"/>
      <circle cx="62" cy="44" r="11"/><circle cx="138" cy="44" r="11"/>
      <ellipse cx="100" cy="72" rx="44" ry="38"/>
      <ellipse cx="82" cy="192" rx="14" ry="6"/><ellipse cx="118" cy="192" rx="14" ry="6"/>`,
    top: 33,
    bottom: 198,
    eyes: [
      [84, 66],
      [116, 66],
    ],
    mouth: [100, 92],
    hat: [100, 34, -4],
    snore: [152, 28],
    details:
      '<ellipse class="pet-ink" cx="100" cy="81" rx="6" ry="4.5"/><path class="pet-line" d="M80 132 q10 8 20 0 q10 8 20 0"/>',
  },
  capybara: {
    shapes: `
      <rect x="28" y="86" width="132" height="86" rx="43"/>
      <rect x="46" y="150" width="19" height="40" rx="9.5"/><rect x="70" y="150" width="19" height="40" rx="9.5"/>
      <rect x="120" y="150" width="19" height="40" rx="9.5"/><rect x="144" y="150" width="19" height="40" rx="9.5"/>
      <rect x="112" y="48" width="74" height="70" rx="32"/>
      <circle cx="128" cy="50" r="11"/>`,
    top: 39,
    bottom: 190,
    eyes: [[152, 70]],
    mouth: [176, 98],
    hat: [140, 42, 10],
    snore: [176, 40],
    details: '<path class="pet-line" d="M178 82 v6"/>',
  },
  sloth: {
    shapes: `
      <ellipse cx="52" cy="130" rx="12" ry="40" transform="rotate(14 52 130)"/>
      <ellipse cx="148" cy="130" rx="12" ry="40" transform="rotate(-14 148 130)"/>
      <ellipse cx="100" cy="142" rx="46" ry="46"/>
      <circle cx="100" cy="80" r="44"/>
      <ellipse cx="78" cy="188" rx="14" ry="7"/><ellipse cx="122" cy="188" rx="14" ry="7"/>`,
    top: 36,
    bottom: 195,
    eyes: [
      [84, 78],
      [116, 78],
    ],
    mouth: [100, 100],
    hat: [100, 38, 4],
    snore: [148, 42],
    details:
      '<ellipse class="pet-mask" cx="82" cy="80" rx="15" ry="9" transform="rotate(-18 82 80)"/><ellipse class="pet-mask" cx="118" cy="80" rx="15" ry="9" transform="rotate(18 118 80)"/><ellipse class="pet-ink" cx="100" cy="92" rx="5" ry="4"/>',
  },
};

export type Mood = 'sleepy' | 'content' | 'beaming' | 'party';

/** empty → sleepy, part-way → content, goal met → beaming, well over → party */
export const moodFor = (fraction: number): Mood =>
  fraction >= 1.25 ? 'party' : fraction >= 1 ? 'beaming' : fraction >= 0.1 ? 'content' : 'sleepy';

function face(art: Art, mood: Mood): string {
  const [mx, my] = art.mouth;
  const eyes = art.eyes
    .map(([x, y]) => {
      if (mood === 'sleepy') return `<path class="pet-stroke" d="M${x - 6} ${y} q6 5 12 0"/>`;
      if (mood === 'content')
        return `<circle class="pet-ink" cx="${x}" cy="${y}" r="5"/><circle class="pet-glint" cx="${x + 1.8}" cy="${y - 1.8}" r="1.6"/>`;
      return `<path class="pet-stroke" d="M${x - 7} ${y + 2} q7 -9 14 0"/>`;
    })
    .join('');
  const cheeks =
    mood === 'beaming' || mood === 'party'
      ? art.eyes
          .map(([x, y]) => `<ellipse class="pet-blush" cx="${x + (art.eyes.length === 1 ? 4 : x < 100 ? -6 : 6)}" cy="${y + 13}" rx="6" ry="3.5"/>`)
          .join('')
      : '';
  const mouth =
    mood === 'sleepy'
      ? `<ellipse class="pet-ink" cx="${mx}" cy="${my}" rx="2.6" ry="2"/>`
      : mood === 'content'
        ? `<path class="pet-stroke" d="M${mx - 6} ${my - 1} q6 6 12 0"/>`
        : `<path class="pet-ink" d="M${mx - 9} ${my - 3} h18 a9 9 0 0 1 -18 0 z"/><path class="pet-tongue" d="M${mx - 4} ${my + 3} a4 3 0 0 0 8 0 z"/>`;
  const snore =
    mood === 'sleepy'
      ? `<g class="pet-z"><path d="M${art.snore[0]} ${art.snore[1]} h8 l-8 8 h8"/><path d="M${art.snore[0] + 12} ${art.snore[1] - 13} h6 l-6 6 h6"/></g>`
      : '';
  return eyes + cheeks + mouth + snore;
}

function hat(art: Art): string {
  const [x, y, tilt] = art.hat;
  return `<g class="pet-hat" transform="translate(${x} ${y}) rotate(${tilt})">
    <path d="M-13 0 L0 -30 L13 0 Z"/>
    <path class="pet-hat-band" d="M-9 -9 L9 -9 M-5 -19 L5 -19"/>
    <circle class="pet-pom" cx="0" cy="-31" r="4"/>
  </g>`;
}

const CONFETTI = [
  [24, 40, 'a'],
  [176, 30, 'b'],
  [18, 110, 'b'],
  [184, 96, 'a'],
  [34, 172, 'c'],
  [170, 168, 'c'],
  [60, 18, 'c'],
  [140, 14, 'a'],
] as const;

const SPARKLES = [
  [26, 58, 7],
  [178, 64, 9],
  [168, 138, 6],
  [20, 150, 8],
  [100, 12, 6],
] as const;

const star = (x: number, y: number, r: number, i: number): string =>
  `<path class="pet-sparkle" style="animation-delay:${i * 0.35}s" d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z"/>`;

let made = 0;

/**
 * A companion, filled to `fraction` of the day's goal.
 * @param size rendered width and height in CSS pixels
 */
export function petSvg(id: CharacterId, fraction: number, size = 220, label = ''): string {
  const art = ART[id] ?? ART.llama;
  const mood = moodFor(fraction);
  const clip = `pet-clip-${++made}`;
  const level = art.bottom - Math.min(1, Math.max(0, fraction)) * (art.bottom - art.top);
  // an empty animal still shows a sliver of water, so there is something to fill
  const y = fraction <= 0 ? art.bottom + 6 : level;
  return `<svg class="pet pet-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img"
    aria-label="${label || `${id}, ${Math.round(fraction * 100)} percent full`}">
    <defs><clipPath id="${clip}">${art.shapes}</clipPath></defs>
    <g class="pet-bob">
      <g class="pet-edge">${art.shapes}</g>
      <g class="pet-body">${art.shapes}</g>
      <g clip-path="url(#${clip})">
        <g class="pet-water" style="transform:translateY(${y.toFixed(1)}px)">
          <g class="pet-wave">
            <path class="pet-crest" d="M-200 0 q25 -7 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V14 H-200 Z"/>
            <path class="pet-sea" d="M-200 3 q25 -7 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 V240 H-200 Z"/>
          </g>
        </g>
      </g>
      ${art.details ?? ''}
      ${face(art, mood)}
      ${mood === 'party' ? hat(art) : ''}
    </g>
    ${fraction >= 1 ? SPARKLES.map(([x, sy, r], i) => star(x, sy, r, i)).join('') : ''}
    ${
      mood === 'party'
        ? CONFETTI.map(
            ([x, cy, k], i) =>
              `<rect class="pet-confetti c-${k}" style="animation-delay:${i * 0.2}s" x="${x}" y="${cy}" width="6" height="3" rx="1" transform="rotate(${i * 37} ${x} ${cy})"/>`,
          ).join('')
        : ''
    }
  </svg>`;
}
