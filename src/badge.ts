/** The app icon: an M whose outer stems curl like a bull's horns. */
export function miloMark(size = 20, stroke = 34): string {
  return `<svg class="mark" viewBox="0 0 512 512" width="${size}" height="${size}" aria-hidden="true"
    fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M132 384 L132 208 C132 158 112 128 76 112"/>
    <path d="M380 384 L380 208 C380 158 400 128 436 112"/>
    <path d="M132 208 L256 336 L380 208"/>
  </svg>`;
}

/** Small watch face, for the interval-recipe disclosure. */
export function watchGlyph(): string {
  return `<svg class="glyph" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5.5" y="5.5" width="9" height="9" rx="2.6"/><path d="M7.4 5.2 7.8 2.6h4.4l.4 2.6"/>
    <path d="M7.4 14.8l.4 2.6h4.4l.4-2.6"/><path d="M10 8.2V10.4h1.9"/>
  </svg>`;
}
