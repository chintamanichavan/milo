export interface Point {
  x: number;
  y: number;
}

/** A small line chart: 300 × 90, no axes, one plain caption. */
export function lineChart(values: number[], caption: string): string {
  if (values.length < 2) return `<p class="line sub">${caption}: not enough history yet.</p>`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 296 + 2;
    const y = 82 - ((v - min) / span) * 74;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<figure class="chart">
    <svg viewBox="0 0 300 90" width="100%" height="90" preserveAspectRatio="none" aria-label="${caption}">
      <polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="2"
        vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <figcaption class="tag">${caption}<span>${round(min)} → ${round(max)}</span></figcaption>
  </figure>`;
}

const round = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Rows of label + bar + value, scaled to the biggest row. */
export function barList(
  rows: { label: string; value: number; note?: string }[],
  unit = '',
): string {
  if (rows.length === 0) return '<p class="line sub">Nothing logged yet.</p>';
  const top = Math.max(...rows.map((r) => r.value)) || 1;
  return `<div class="barlist">${rows
    .map(
      (r) => `<div class="barrow"><span>${r.label}</span>
        <i><b style="width:${(r.value / top) * 100}%"></b></i>
        <span class="mono">${round(r.value)}${unit}${r.note ? ` ${r.note}` : ''}</span></div>`,
    )
    .join('')}</div>`;
}

/** A column strip, e.g. hours by hour-of-day. */
export function columns(values: number[], labels: string[], height = 64): string {
  const top = Math.max(...values) || 1;
  return `<div class="colstrip" style="height:${height}px">${values
    .map(
      (v, i) =>
        `<div class="colbar" title="${labels[i]}"><i style="height:${(v / top) * 100}%"></i>
         <b>${labels[i]}</b></div>`,
    )
    .join('')}</div>`;
}
