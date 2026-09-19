/** Points along the left branch, with the angle each leaf leans away from it. */
const LEAVES: [number, number, number][] = [
  [13.8, 33.5, 200],
  [11.2, 27, 195],
  [11, 19.5, 210],
  [14, 12.5, 232],
];

const LEAF = 'M0 0Q3 -2.7 6.2 -0.4Q3.2 2.4 0 0';

/** A small laurel, one per finished week. */
export function laurel(week: number, size = 44): string {
  const leaves = LEAVES.map(
    ([x, y, deg]) =>
      `<path d="${LEAF}" transform="translate(${x} ${y}) rotate(${deg})"/>` +
      `<path d="${LEAF}" transform="translate(${48 - x} ${y}) rotate(${180 - deg})"/>`,
  ).join('');
  return `<svg class="laurel" viewBox="0 0 48 48" width="${size}" height="${size}" aria-label="Week ${week} finished">
    <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M16.5 38.5C9.5 32 9.5 18 16.5 9.5"/><path d="M31.5 38.5C38.5 32 38.5 18 31.5 9.5"/>
    </g><g fill="currentColor" opacity=".8">${leaves}</g>
    <text x="24" y="29.5" text-anchor="middle" font-size="15" font-family="ui-monospace,monospace" fill="currentColor">${week}</text>
  </svg>`;
}
