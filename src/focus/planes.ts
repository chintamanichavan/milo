export interface Aircraft {
  id: string;
  name: string;
  hours: number;
  glyph: string;
}

const svg = (body: string, size: number): string =>
  `<svg class="plane-glyph" viewBox="0 0 64 32" width="${size}" height="${size / 2}" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const SHAPES: Record<string, string> = {
  paper: '<path d="M6 22 L58 16 L6 10 L14 16 Z"/>',
  prop: '<path d="M14 16 L46 16"/><path d="M46 16 L54 12 L54 20 Z"/><path d="M28 16 L22 8 M28 16 L22 24"/><path d="M10 10 L10 22"/>',
  jet: '<path d="M8 16 L48 16 L56 16"/><path d="M30 16 L20 7 M30 16 L20 25"/><path d="M12 16 L6 10 M12 16 L6 22"/><path d="M48 16 L44 11 M48 16 L44 21"/>',
  airliner:
    '<path d="M6 16 L52 16 L60 16"/><path d="M34 16 L18 5 M34 16 L18 27"/><path d="M14 16 L6 8 M14 16 L6 24"/><circle cx="24" cy="16" r="2"/><circle cx="38" cy="16" r="2"/>',
  wide: '<path d="M4 16 L54 16 L62 16"/><path d="M36 16 L16 4 M36 16 L16 28"/><path d="M12 16 L4 7 M12 16 L4 25"/><circle cx="22" cy="16" r="2.4"/><circle cx="30" cy="16" r="2.4"/><circle cx="42" cy="16" r="2"/>',
  concorde:
    '<path d="M4 18 C24 18 44 16 62 14 L46 22 L6 22 Z"/><path d="M30 17 L24 8"/><path d="M46 15 L40 9"/>',
};

export const FLEET: Aircraft[] = [
  { id: 'paper', name: 'Paper plane', hours: 0, glyph: SHAPES.paper },
  { id: 'prop', name: 'Prop', hours: 5, glyph: SHAPES.prop },
  { id: 'jet', name: 'Regional jet', hours: 20, glyph: SHAPES.jet },
  { id: 'airliner', name: 'Airliner', hours: 50, glyph: SHAPES.airliner },
  { id: 'wide', name: 'Wide-body', hours: 100, glyph: SHAPES.wide },
  { id: 'concorde', name: 'Concorde', hours: 250, glyph: SHAPES.concorde },
];

export const planeGlyph = (id: string, size = 56): string =>
  svg(SHAPES[id] ?? SHAPES.paper, size);

export const unlocked = (hours: number): Aircraft[] => FLEET.filter((a) => hours >= a.hours);

export const nextUnlock = (hours: number): Aircraft | undefined =>
  FLEET.find((a) => hours < a.hours);

export const aircraftById = (id: string): Aircraft =>
  FLEET.find((a) => a.id === id) ?? FLEET[0];
