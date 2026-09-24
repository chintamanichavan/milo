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
  bunny: {
    shapes: `
      <ellipse cx="82" cy="44" rx="11" ry="34" transform="rotate(-8 82 44)"/>
      <ellipse cx="118" cy="44" rx="11" ry="34" transform="rotate(8 118 44)"/>
      <ellipse cx="146" cy="160" rx="11" ry="11"/>
      <ellipse cx="100" cy="152" rx="46" ry="40"/>
      <circle cx="100" cy="98" r="40"/>
      <ellipse cx="80" cy="189" rx="15" ry="7"/><ellipse cx="120" cy="189" rx="15" ry="7"/>`,
    top: 10,
    bottom: 196,
    eyes: [
      [84, 94],
      [116, 94],
    ],
    mouth: [100, 118],
    hat: [100, 60, 0],
    snore: [146, 66],
    details: '<ellipse class="pet-tongue" cx="100" cy="108" rx="5" ry="3.5"/><path class="pet-line" d="M82 36 v22 M118 36 v22"/>',
  },
  bear: {
    shapes: `
      <circle cx="66" cy="48" r="15"/><circle cx="134" cy="48" r="15"/>
      <ellipse cx="100" cy="150" rx="52" ry="44"/>
      <circle cx="100" cy="84" r="43"/>
      <ellipse cx="100" cy="102" rx="18" ry="13"/>
      <ellipse cx="78" cy="190" rx="17" ry="7"/><ellipse cx="122" cy="190" rx="17" ry="7"/>`,
    top: 33,
    bottom: 197,
    eyes: [
      [84, 78],
      [116, 78],
    ],
    mouth: [100, 110],
    hat: [100, 42, -4],
    snore: [148, 52],
    details: '<ellipse class="pet-ink" cx="100" cy="97" rx="6.5" ry="4.5"/><circle class="pet-mask" cx="66" cy="48" r="7"/><circle class="pet-mask" cx="134" cy="48" r="7"/>',
  },
  frog: {
    shapes: `
      <circle cx="68" cy="74" r="21"/><circle cx="132" cy="74" r="21"/>
      <ellipse cx="100" cy="136" rx="64" ry="52"/>
      <ellipse cx="58" cy="186" rx="24" ry="9"/><ellipse cx="142" cy="186" rx="24" ry="9"/>`,
    top: 53,
    bottom: 195,
    eyes: [
      [68, 74],
      [132, 74],
    ],
    mouth: [100, 120],
    hat: [100, 88, 0],
    snore: [150, 44],
    details: '<path class="pet-line" d="M70 112 q30 20 60 0"/><path class="pet-line" d="M76 160 q24 10 48 0"/>',
  },
  owl: {
    shapes: `
      <path d="M56 56 L62 24 L86 44 Z"/><path d="M144 56 L138 24 L114 44 Z"/>
      <ellipse cx="46" cy="124" rx="13" ry="36" transform="rotate(14 46 124)"/>
      <ellipse cx="154" cy="124" rx="13" ry="36" transform="rotate(-14 154 124)"/>
      <ellipse cx="100" cy="112" rx="56" ry="76"/>
      <ellipse cx="84" cy="190" rx="12" ry="6"/><ellipse cx="116" cy="190" rx="12" ry="6"/>`,
    top: 24,
    bottom: 196,
    eyes: [
      [80, 86],
      [120, 86],
    ],
    mouth: [100, 122],
    hat: [100, 40, 0],
    snore: [150, 40],
    details:
      '<circle class="pet-line" cx="80" cy="86" r="16"/><circle class="pet-line" cx="120" cy="86" r="16"/><path class="pet-beak" d="M93 102 L107 102 L100 113 Z"/><path class="pet-line" d="M80 146 q6 5 12 0 M108 146 q6 5 12 0 M94 160 q6 5 12 0"/>',
  },
  duck: {
    shapes: `
      <ellipse cx="160" cy="130" rx="16" ry="10" transform="rotate(-32 160 130)"/>
      <ellipse cx="108" cy="146" rx="58" ry="42"/>
      <circle cx="80" cy="86" r="36"/>`,
    top: 50,
    bottom: 188,
    eyes: [[76, 78]],
    mouth: [66, 104],
    hat: [84, 52, -8],
    snore: [112, 44],
    details:
      '<path class="pet-beak" d="M52 90 C36 90 30 98 36 104 C42 108 54 106 60 100 Z"/><path class="pet-line" d="M100 138 q20 18 44 0"/><path class="pet-beak" d="M86 186 h18 l-4 8 h-10 z M116 186 h18 l-4 8 h-10 z"/>',
  },
  turtle: {
    shapes: `
      <path d="M36 140 C36 96 66 72 100 72 C134 72 164 96 164 140 Z"/>
      <rect x="30" y="128" width="140" height="26" rx="13"/>
      <ellipse cx="172" cy="126" rx="21" ry="18"/>
      <ellipse cx="56" cy="164" rx="15" ry="18"/><ellipse cx="140" cy="164" rx="15" ry="18"/>
      <ellipse cx="24" cy="142" rx="10" ry="6"/>`,
    top: 72,
    bottom: 182,
    eyes: [[176, 120]],
    mouth: [184, 132],
    hat: [170, 108, 10],
    snore: [184, 86],
    details:
      '<path class="pet-line" d="M70 128 l14 -30 h32 l14 30 M84 98 l-18 -12 M116 98 l18 -12 M100 98 v-24"/>',
  },
  whale: {
    shapes: `
      <ellipse cx="164" cy="92" rx="12" ry="26" transform="rotate(40 164 92)"/>
      <ellipse cx="182" cy="112" rx="12" ry="24" transform="rotate(-60 182 112)"/>
      <path d="M22 132 C22 92 58 78 98 78 C140 78 170 100 170 128 C170 160 138 178 96 178 C50 178 22 164 22 132 Z"/>
      <ellipse cx="86" cy="178" rx="20" ry="8" transform="rotate(12 86 178)"/>`,
    top: 68,
    bottom: 186,
    eyes: [[62, 122]],
    mouth: [48, 144],
    hat: [96, 80, -6],
    snore: [110, 50],
    details:
      '<path class="pet-line" d="M36 150 q60 26 120 0"/><path class="pet-z" d="M92 72 q-6 -12 -2 -22 M100 72 v-24 M108 72 q6 -12 2 -22" style="fill:none;stroke:var(--sea);stroke-width:3;stroke-linecap:round"/>',
  },
  hedgehog: {
    shapes: `
      <path d="M52 170 L44 140 L30 132 L44 120 L38 104 L56 102 L58 84 L76 90 L86 72 L100 84 L114 70 L124 88 L142 80 L146 98 L164 100 L160 116 L176 124 L164 136 L172 152 L158 158 L160 176 Z"/>
      <ellipse cx="108" cy="146" rx="58" ry="40"/>
      <ellipse cx="54" cy="148" rx="30" ry="24"/>
      <ellipse cx="30" cy="156" rx="12" ry="9"/>
      <ellipse cx="84" cy="188" rx="13" ry="6"/><ellipse cx="134" cy="188" rx="13" ry="6"/>`,
    top: 70,
    bottom: 194,
    eyes: [[56, 140]],
    mouth: [42, 164],
    hat: [70, 92, -14],
    snore: [74, 54],
    details: '<ellipse class="pet-ink" cx="22" cy="155" rx="5" ry="4"/>',
  },
  koala: {
    shapes: `
      <circle cx="54" cy="66" r="24"/><circle cx="146" cy="66" r="24"/>
      <ellipse cx="100" cy="156" rx="44" ry="38"/>
      <circle cx="100" cy="90" r="45"/>
      <ellipse cx="80" cy="190" rx="15" ry="7"/><ellipse cx="120" cy="190" rx="15" ry="7"/>`,
    top: 42,
    bottom: 197,
    eyes: [
      [80, 84],
      [120, 84],
    ],
    mouth: [100, 122],
    hat: [100, 46, 0],
    snore: [150, 30],
    details: '<ellipse class="pet-ink" cx="100" cy="102" rx="10" ry="13"/><circle class="pet-mask" cx="54" cy="66" r="12"/><circle class="pet-mask" cx="146" cy="66" r="12"/>',
  },
  panda: {
    shapes: `
      <circle cx="64" cy="48" r="16"/><circle cx="136" cy="48" r="16"/>
      <ellipse cx="100" cy="152" rx="52" ry="42"/>
      <circle cx="100" cy="86" r="44"/>
      <ellipse cx="78" cy="190" rx="17" ry="7"/><ellipse cx="122" cy="190" rx="17" ry="7"/>`,
    top: 32,
    bottom: 197,
    eyes: [
      [82, 82],
      [118, 82],
    ],
    mouth: [100, 112],
    hat: [100, 44, 4],
    snore: [150, 52],
    details:
      '<circle class="pet-ink" cx="64" cy="48" r="16" opacity=".85"/><circle class="pet-ink" cx="136" cy="48" r="16" opacity=".85"/><ellipse class="pet-mask" cx="82" cy="84" rx="13" ry="16" transform="rotate(24 82 84)" style="opacity:.45"/><ellipse class="pet-mask" cx="118" cy="84" rx="13" ry="16" transform="rotate(-24 118 84)" style="opacity:.45"/><ellipse class="pet-ink" cx="100" cy="100" rx="6" ry="4.5"/><path class="pet-line" d="M52 140 q-6 18 6 30 M148 140 q6 18 -6 30"/>',
  },
  seal: {
    shapes: `
      <ellipse cx="62" cy="182" rx="20" ry="9" transform="rotate(-18 62 182)"/>
      <ellipse cx="138" cy="182" rx="20" ry="9" transform="rotate(18 138 182)"/>
      <ellipse cx="100" cy="140" rx="42" ry="52"/>
      <circle cx="100" cy="76" r="36"/>
      <ellipse cx="58" cy="142" rx="10" ry="24" transform="rotate(26 58 142)"/>
      <ellipse cx="142" cy="142" rx="10" ry="24" transform="rotate(-26 142 142)"/>`,
    top: 40,
    bottom: 193,
    eyes: [
      [86, 70],
      [114, 70],
    ],
    mouth: [100, 96],
    hat: [100, 42, 0],
    snore: [140, 40],
    details:
      '<ellipse class="pet-ink" cx="100" cy="84" rx="6" ry="4.5"/><path class="pet-line" d="M70 88 l14 -2 M70 96 l14 -4 M130 88 l-14 -2 M130 96 l-14 -4"/>',
  },
  axolotl: {
    shapes: `
      <ellipse cx="44" cy="76" rx="7" ry="18" transform="rotate(-50 44 76)"/>
      <ellipse cx="40" cy="98" rx="7" ry="18" transform="rotate(-90 40 98)"/>
      <ellipse cx="46" cy="120" rx="7" ry="18" transform="rotate(-130 46 120)"/>
      <ellipse cx="156" cy="76" rx="7" ry="18" transform="rotate(50 156 76)"/>
      <ellipse cx="160" cy="98" rx="7" ry="18" transform="rotate(90 160 98)"/>
      <ellipse cx="154" cy="120" rx="7" ry="18" transform="rotate(130 154 120)"/>
      <ellipse cx="138" cy="172" rx="28" ry="10" transform="rotate(-24 138 172)"/>
      <ellipse cx="100" cy="150" rx="34" ry="36"/>
      <ellipse cx="100" cy="98" rx="52" ry="38"/>
      <ellipse cx="80" cy="188" rx="12" ry="6"/><ellipse cx="116" cy="188" rx="12" ry="6"/>`,
    top: 58,
    bottom: 194,
    eyes: [
      [76, 94],
      [124, 94],
    ],
    mouth: [100, 112],
    hat: [100, 62, 0],
    snore: [150, 38],
    details: '<path class="pet-blush" d="M40 98 h-12 M160 98 h12"/>',
  },
  hippo: {
    shapes: `
      <rect x="22" y="92" width="136" height="80" rx="40"/>
      <rect x="40" y="150" width="20" height="38" rx="10"/><rect x="66" y="150" width="20" height="38" rx="10"/>
      <rect x="112" y="150" width="20" height="38" rx="10"/><rect x="136" y="150" width="20" height="38" rx="10"/>
      <circle cx="138" cy="60" r="10"/>
      <ellipse cx="146" cy="88" rx="32" ry="30"/>
      <ellipse cx="166" cy="112" rx="28" ry="24"/>`,
    top: 50,
    bottom: 190,
    eyes: [[148, 78]],
    mouth: [176, 126],
    hat: [140, 58, 12],
    snore: [174, 46],
    details: '<ellipse class="pet-ink" cx="176" cy="104" rx="3" ry="4"/><ellipse class="pet-ink" cx="186" cy="106" rx="3" ry="4"/>',
  },
  elephant: {
    shapes: `
      <ellipse cx="50" cy="96" rx="30" ry="38" transform="rotate(-10 50 96)"/>
      <ellipse cx="150" cy="96" rx="30" ry="38" transform="rotate(10 150 96)"/>
      <ellipse cx="100" cy="156" rx="48" ry="36"/>
      <circle cx="100" cy="88" r="42"/>
      <path d="M90 112 C88 138 92 160 108 170 C116 174 122 168 116 160 C106 150 110 132 112 112 Z"/>
      <ellipse cx="74" cy="190" rx="16" ry="7"/><ellipse cx="126" cy="190" rx="16" ry="7"/>`,
    top: 46,
    bottom: 197,
    eyes: [
      [82, 82],
      [118, 82],
    ],
    mouth: [128, 126],
    hat: [100, 48, 0],
    snore: [160, 40],
    details:
      '<path class="pet-line" d="M90 112 C88 138 92 160 108 170 C116 174 122 168 116 160 C106 150 110 132 112 112"/><path class="pet-line" d="M94 134 h14 M97 148 h12"/><path class="pet-line" d="M40 90 q8 10 6 24 M160 90 q-8 10 -6 24"/>',
  },
  mouse: {
    shapes: `
      <circle cx="62" cy="64" r="24"/><circle cx="138" cy="64" r="24"/>
      <ellipse cx="150" cy="176" rx="26" ry="5" transform="rotate(-24 150 176)"/>
      <ellipse cx="100" cy="158" rx="40" ry="32"/>
      <circle cx="100" cy="102" r="38"/>
      <ellipse cx="82" cy="190" rx="13" ry="6"/><ellipse cx="118" cy="190" rx="13" ry="6"/>`,
    top: 40,
    bottom: 196,
    eyes: [
      [86, 98],
      [114, 98],
    ],
    mouth: [100, 124],
    hat: [100, 66, 0],
    snore: [150, 32],
    details:
      '<circle class="pet-tongue" cx="62" cy="64" r="11" opacity=".55"/><circle class="pet-tongue" cx="138" cy="64" r="11" opacity=".55"/><ellipse class="pet-ink" cx="100" cy="113" rx="5" ry="4"/><path class="pet-line" d="M72 112 l16 2 M72 120 l16 -2 M128 112 l-16 2 M128 120 l-16 -2"/>',
  },
  octopus: {
    shapes: `
      <ellipse cx="52" cy="150" rx="10" ry="30" transform="rotate(24 52 150)"/>
      <ellipse cx="76" cy="160" rx="10" ry="30" transform="rotate(10 76 160)"/>
      <ellipse cx="100" cy="164" rx="10" ry="30"/>
      <ellipse cx="124" cy="160" rx="10" ry="30" transform="rotate(-10 124 160)"/>
      <ellipse cx="148" cy="150" rx="10" ry="30" transform="rotate(-24 148 150)"/>
      <ellipse cx="100" cy="86" rx="54" ry="54"/>`,
    top: 32,
    bottom: 194,
    eyes: [
      [82, 94],
      [118, 94],
    ],
    mouth: [100, 116],
    hat: [100, 34, 6],
    snore: [152, 36],
    details: '<circle class="pet-line" cx="60" cy="176" r="3"/><circle class="pet-line" cx="100" cy="186" r="3"/><circle class="pet-line" cx="140" cy="176" r="3"/>',
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
