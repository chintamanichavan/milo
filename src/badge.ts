const LEAVES: [number, number, number][] = [
  [14, 34, -30],
  [11.5, 27, -8],
  [13, 19.5, 14],
  [17, 13, 34],
];

/** A small laurel, one per finished week. */
export function laurel(week: number, size = 44): string {
  const leaves = LEAVES.map(
    ([x, y, rot]) =>
      `<ellipse cx="${x}" cy="${y}" rx="4.4" ry="2.3" transform="rotate(${rot} ${x} ${y})"/>` +
      `<ellipse cx="${48 - x}" cy="${y}" rx="4.4" ry="2.3" transform="rotate(${-rot} ${48 - x} ${y})"/>`,
  ).join('');
  return `<svg class="laurel" viewBox="0 0 48 48" width="${size}" height="${size}" aria-label="Week ${week} finished">
    <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M18.5 40C10.5 34.5 10 21 18 10.5"/><path d="M29.5 40C37.5 34.5 38 21 30 10.5"/>
    </g><g fill="currentColor" opacity=".85">${leaves}</g>
    <text x="24" y="30" text-anchor="middle" font-size="15" font-family="ui-monospace,monospace" fill="currentColor">${week}</text>
  </svg>`;
}
