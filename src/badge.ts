/** The app icon: an M whose outer stems curl like a bull's horns. */
export function miloMark(size = 20, _stroke = 34): string {
  // the llama from the app icon, so the header matches the home screen
  return `<img class="mark" src="/icon-v7.svg" width="${size}" height="${size}" alt="" aria-hidden="true"
    style="border-radius:${Math.round(size * 0.22)}px;vertical-align:middle">`;
}

/** Small watch face, for the interval-recipe disclosure. */
export function watchGlyph(): string {
  return `<svg class="glyph" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5.5" y="5.5" width="9" height="9" rx="2.6"/><path d="M7.4 5.2 7.8 2.6h4.4l.4 2.6"/>
    <path d="M7.4 14.8l.4 2.6h4.4l.4-2.6"/><path d="M10 8.2V10.4h1.9"/>
  </svg>`;
}
