/**
 * The growing atom: the nucleus swells with every vote, grows brighter with
 * consistency, and gathers orbits as the votes add up — one, then two, then
 * three electrons circling.
 */
export function atomSvg(votes: number, consistency: number, size = 96, label = ''): string {
  const r = 7 + Math.min(15, Math.log2(1 + votes) * 2.4);
  const glow = 0.18 + (Math.min(100, consistency) / 100) * 0.62;
  const orbits = votes < 1 ? 0 : votes < 7 ? 1 : votes < 30 ? 2 : 3;
  const speed = [0, 7, 5.5, 4.2][orbits];
  const rings = [0, 60, 120]
    .slice(0, orbits)
    .map(
      (tilt, i) => `<g transform="rotate(${tilt} 50 50)">
        <ellipse class="atom-orbit" cx="50" cy="50" rx="42" ry="15"/>
        <g class="atom-spin" style="animation-duration:${speed + i * 1.3}s;animation-delay:-${i * 1.7}s">
          <circle class="atom-electron" cx="92" cy="50" r="3.4"/>
        </g>
      </g>`,
    )
    .join('');
  return `<svg class="atom" viewBox="0 0 100 100" width="${size}" height="${size}" role="img"
    aria-label="${label || `${votes} votes, ${Math.round(consistency)} percent consistent`}">
    <circle class="atom-halo" cx="50" cy="50" r="${(r * 1.9).toFixed(1)}" style="opacity:${(glow * 0.45).toFixed(2)}"/>
    ${rings}
    <circle class="atom-core" cx="50" cy="50" r="${r.toFixed(1)}" style="opacity:${(0.45 + glow * 0.55).toFixed(2)}"/>
    <circle class="atom-shine" cx="${(50 - r * 0.35).toFixed(1)}" cy="${(50 - r * 0.35).toFixed(1)}" r="${(r * 0.28).toFixed(1)}"/>
  </svg>`;
}
