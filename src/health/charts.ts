/**
 * Small SVG charts for HEALTH, drawn as strings. The rules they keep:
 * - series colours in a fixed order (--s1 … --s4), never the UI lime
 * - one y-axis per chart, hairline grid, 2px lines, bars with 2px gaps and 4px tops
 * - text in ink, never in a series colour; a value only at the end and the peak
 * - every chart has a tooltip (a crosshair, or one per mark) and a "numbers" table
 */

export const W = 320;
export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];
/** single-hue steps of the teal, for anything sequential */
export const SEQ = [0.3, 0.45, 0.6, 0.8, 1];
export const seq = (step: number): string => `rgba(42, 160, 141, ${SEQ[Math.max(0, Math.min(4, step))]})`;

export interface Series {
  name: string;
  values: (number | null)[];
}

interface Base {
  /** read out to screen readers and shown under the chart */
  caption: string;
  /** what each index is called in a tooltip and the table, such as "Mon 14 Sep" */
  labels: string[];
  /** a few labels under the axis, '' for none */
  ticks?: string[];
  fmt: (v: number) => string;
  height?: number;
  /** column header for the table's first column */
  what?: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** a handful of round numbers spanning lo..hi, and the domain they make */
export function niceScale(lo: number, hi: number, count = 3): { lo: number; hi: number; ticks: number[] } {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1, ticks: [0, 1] };
  if (hi - lo < 1e-9) {
    hi += Math.abs(hi) * 0.1 || 1;
    lo -= Math.abs(lo) * 0.1 || 0;
  }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const a = Math.floor(lo / step + 1e-9) * step;
  const b = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = a; v <= b + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo: a, hi: b, ticks };
}

export function legend(names: string[], colors: string[] = SERIES): string {
  return `<div class="hc-legend">${names
    .map((n, i) => `<span><i style="background:${colors[i % colors.length]}"></i>${n}</span>`)
    .join('')}</div>`;
}

/** the same data as a small table: the light theme's colours lean on this */
export function numbers(head: string[], rows: (string | number)[][]): string {
  return `<details class="hc-num"><summary class="link tap">numbers</summary><div class="hc-table"><table>
    <thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div></details>`;
}

interface Frame {
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  y: (v: number) => number;
  scale: { lo: number; hi: number; ticks: number[] };
}

function stepScale(lo: number, hi: number, step: number): { lo: number; hi: number; ticks: number[] } {
  const a = Math.floor(lo / step) * step;
  const b = Math.ceil(hi / step) * step;
  const every = (b - a) / step > 5 ? 2 : 1;
  const ticks: number[] = [];
  for (let v = a; v <= b; v += step * every) ticks.push(v);
  return { lo: a, hi: b, ticks };
}

function frame(values: number[], o: { height?: number; zero?: boolean; right?: number; lo?: number; hi?: number; fmt: (v: number) => string; invert?: boolean; step?: number }): Frame {
  const h = o.height ?? 140;
  const lo0 = o.lo ?? (o.zero ? 0 : Math.min(...values));
  const hi0 = o.hi ?? Math.max(...values);
  const pad = o.zero || o.lo !== undefined ? 0 : (hi0 - lo0) * 0.08;
  const scale = o.step ? stepScale(lo0, hi0, o.step) : niceScale(lo0 - pad, hi0 + (o.hi !== undefined ? 0 : pad));
  const widest = Math.max(...scale.ticks.map((t) => o.fmt(t).length));
  const left = 8 + widest * 6;
  const top = 12;
  const bottom = h - 18;
  const span = scale.hi - scale.lo || 1;
  const y = (v: number): number =>
    o.invert ? top + ((v - scale.lo) / span) * (bottom - top) : bottom - ((v - scale.lo) / span) * (bottom - top);
  return { h, left, right: W - (o.right ?? 8), top, bottom, y, scale };
}

function axes(fr: Frame, fmt: (v: number) => string, xs: { x: number; label: string }[]): string {
  const grid = fr.scale.ticks
    .map((t) => {
      const y = fr.y(t).toFixed(1);
      return `<line class="hc-g" x1="${fr.left}" x2="${fr.right}" y1="${y}" y2="${y}"/>
        <text class="hc-t" x="${fr.left - 6}" y="${y}" text-anchor="end" dy="3.5">${fmt(t)}</text>`;
    })
    .join('');
  const under = xs
    .filter((x) => x.label)
    .map((x) => `<text class="hc-t" x="${x.x.toFixed(1)}" y="${fr.h - 4}" text-anchor="middle">${x.label}</text>`)
    .join('');
  return grid + under;
}

function figure(o: Base, svg: string, fr: Frame, x0: number, step: number, n: number, tips: string[], extra = '', attrs = ''): string {
  return `<figure class="hc"${attrs} data-x0="${x0.toFixed(2)}" data-step="${step.toFixed(3)}" data-n="${n}" data-tips="${esc(JSON.stringify(tips))}">
    <svg class="hc-svg" viewBox="0 0 ${W} ${fr.h}" role="img" aria-label="${esc(o.caption)}">
      ${svg}
      <line class="hc-x" x1="0" x2="0" y1="${fr.top - 4}" y2="${fr.bottom}"/>
    </svg>
    <div class="hc-tip" aria-hidden="true"></div>
    ${extra}
  </figure>`;
}

/** a label that keeps inside the plot */
function valueLabel(x: number, y: number, text: string, fr: Frame, below = false): string {
  const wid = text.length * 6;
  const cx = Math.min(fr.right - wid / 2, Math.max(fr.left + wid / 2, x));
  const cy = below ? Math.min(fr.bottom - 3, y + 13) : Math.max(fr.top - 2, y - 6);
  return `<text class="hc-v" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle">${text}</text>`;
}

export interface LineOpts extends Base {
  series: Series[];
  zero?: boolean;
  lo?: number;
  hi?: number;
  /** x positions in data units (seconds, say); evenly spaced when missing */
  xs?: number[];
  /** a dashed reference line */
  ref?: { value: number; label: string };
  /** shaded horizontal bands, drawn behind */
  bands?: { from: number; to: number; fill: string; label?: string }[];
  /** dots instead of a line */
  dots?: boolean;
  invert?: boolean;
  /** grid lines at multiples of this, such as 60 minutes */
  step?: number;
  /** custom tooltip lines, one per index */
  tips?: string[];
  /** the table's columns, when the default is not right */
  table?: { head: string[]; rows: (string | number)[][] };
}

export function lineChart(o: LineOpts): string {
  const all = o.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (all.length < 2) return `<p class="line sub">${o.caption}: not enough data yet.</p>`;
  if (o.ref) all.push(o.ref.value);
  for (const b of o.bands ?? []) if (o.lo === undefined) all.push(b.from, b.to);
  const fr = frame(all, { ...o, hi: o.hi, lo: o.lo });
  const n = o.series[0].values.length;
  const xsData = o.xs ?? o.series[0].values.map((_, i) => i);
  const x0d = xsData[0];
  const x1d = xsData[xsData.length - 1];
  const x = (i: number): number => fr.left + ((xsData[i] - x0d) / (x1d - x0d || 1)) * (fr.right - fr.left);

  const bands = (o.bands ?? [])
    .map((b) => {
      const ya = fr.y(Math.min(fr.scale.hi, b.to));
      const yb = fr.y(Math.max(fr.scale.lo, b.from));
      const top = Math.min(ya, yb);
      const tall = Math.abs(yb - ya);
      return `<rect x="${fr.left}" y="${top.toFixed(1)}" width="${fr.right - fr.left}" height="${tall.toFixed(1)}" fill="${b.fill}"/>${
        b.label && tall >= 11 ? `<text class="hc-t" x="${fr.left + 3}" y="${(top + tall / 2 + 3.5).toFixed(1)}">${b.label}</text>` : ''
      }`;
    })
    .join('');

  const marks = o.series
    .map((s, si) => {
      const color = SERIES[si % SERIES.length];
      if (o.dots)
        return s.values
          .map((v, i) => (v === null ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${fr.y(v).toFixed(1)}" r="3" fill="${color}"/>`))
          .join('');
      let d = '';
      let pen = false;
      s.values.forEach((v, i) => {
        if (v === null) return void (pen = false);
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${fr.y(v).toFixed(1)}`;
        pen = true;
      });
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    })
    .join('');

  const ref = o.ref
    ? `<line class="hc-ref" x1="${fr.left}" x2="${fr.right}" y1="${fr.y(o.ref.value).toFixed(1)}" y2="${fr.y(o.ref.value).toFixed(1)}"/>
       <text class="hc-t" x="${fr.left + 3}" y="${(fr.y(o.ref.value) - 4).toFixed(1)}">${o.ref.label}</text>`
    : '';

  // selective labels: the latest value and the peak of the first series
  const first = o.series[0].values;
  let lastI = -1;
  for (let i = first.length - 1; i >= 0; i--) if (first[i] !== null) { lastI = i; break; }
  let peakI = -1;
  first.forEach((v, i) => {
    if (v !== null && (peakI < 0 || v > (first[peakI] as number))) peakI = i;
  });
  let labels = '';
  if (o.dots) lastI = -1;
  if (lastI >= 0) labels += valueLabel(x(lastI), fr.y(first[lastI]!), o.fmt(first[lastI]!), fr, o.invert);
  if (!o.dots && peakI >= 0 && peakI !== lastI && Math.abs(x(peakI) - x(lastI)) > 34)
    labels += valueLabel(x(peakI), fr.y(first[peakI]!), o.fmt(first[peakI]!), fr, o.invert);
  if (lastI >= 0)
    labels += `<circle cx="${x(lastI).toFixed(1)}" cy="${fr.y(first[lastI]!).toFixed(1)}" r="3" fill="${SERIES[0]}"/>`;

  const tips =
    o.tips ??
    o.labels.map((l, i) =>
      [l, ...o.series.map((s) => `${o.series.length > 1 ? `${s.name} ` : ''}${s.values[i] === null ? '—' : o.fmt(s.values[i]!)}`)].join('\n'),
    );
  const step = n > 1 ? (fr.right - fr.left) / (n - 1) : 0;
  const ticks = (o.ticks ?? []).map((label, i) => ({ x: x(i), label }));
  const svg = bands + axes(fr, o.fmt, ticks) + ref + marks + labels;
  const table = o.table ?? {
    head: [o.what ?? 'day', ...o.series.map((s) => s.name)],
    rows: o.labels.map((l, i) => [l, ...o.series.map((s) => (s.values[i] === null ? '—' : o.fmt(s.values[i]!)))]),
  };
  return figure(
    o,
    svg,
    fr,
    fr.left,
    step,
    n,
    tips,
    `${o.series.length > 1 ? legend(o.series.map((s) => s.name)) : ''}<figcaption class="hc-cap">${o.caption}</figcaption>${numbers(table.head, table.rows)}`,
    o.xs ? ` data-xs="${esc(JSON.stringify(xsData.map((_, i) => +x(i).toFixed(1))))}"` : '',
  );
}

export interface BarOpts extends Base {
  /** stacked bottom to top */
  series: Series[];
  zero?: boolean;
  ref?: { value: number; label: string };
  /** one fill per bar, for a single series coloured by status */
  fills?: string[];
  /** name each segment of the latest bar beside it */
  direct?: boolean;
  tips?: string[];
  table?: { head: string[]; rows: (string | number)[][] };
  colors?: string[];
  step?: number;
}

/** a top-rounded bar from the baseline: radius 4 or less */
function barPath(x: number, y: number, w: number, h: number, round: boolean): string {
  if (h <= 0 || w <= 0) return '';
  const r = round ? Math.min(4, w / 2, h) : 0;
  return `M${x.toFixed(1)},${(y + h).toFixed(1)}V${(y + r).toFixed(1)}${
    r ? `Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)}` : ''
  }H${(x + w - r).toFixed(1)}${r ? `Q${(x + w).toFixed(1)},${y.toFixed(1)} ${(x + w).toFixed(1)},${(y + r).toFixed(1)}` : ''}V${(y + h).toFixed(1)}Z`;
}

export function barChart(o: BarOpts): string {
  const n = o.series[0].values.length;
  const totals = o.series[0].values.map((_, i) => o.series.reduce((s, ser) => s + (ser.values[i] ?? 0), 0));
  if (!totals.some((t) => t > 0)) return `<p class="line sub">${o.caption}: not enough data yet.</p>`;
  const colors = o.colors ?? SERIES;
  const fr = frame([...totals, ...(o.ref ? [o.ref.value] : [])], { ...o, zero: true, right: o.direct ? 64 : 8 });
  const slot = (fr.right - fr.left) / n;
  const bw = Math.max(1, slot - 2);
  const xOf = (i: number): number => fr.left + i * slot + (slot - bw) / 2;
  let lastI = -1;
  totals.forEach((t, i) => t > 0 && (lastI = i));

  const bars = o.series[0].values
    .map((_, i) => {
      let base = fr.bottom;
      const top = o.series.reduce((k, s, si) => ((s.values[i] ?? 0) > 0 ? si : k), -1);
      return o.series
        .map((s, si) => {
          const v = s.values[i] ?? 0;
          if (v <= 0) return '';
          const full = fr.bottom - fr.y(v);
          // 2px of surface between stacked segments
          const h = si === top ? full : Math.max(0.5, full - 2);
          const y = base - full;
          base -= full;
          const fill = o.fills?.[i] ?? colors[si % colors.length];
          return `<path d="${barPath(xOf(i), y + (si === top ? 0 : 2), bw, h, si === top)}" fill="${fill}"/>`;
        })
        .join('');
    })
    .join('');

  let direct = '';
  if (o.direct && lastI >= 0) {
    let base = fr.bottom;
    let prevY = Infinity;
    for (const s of o.series) {
      const v = s.values[lastI] ?? 0;
      if (v <= 0) continue;
      const full = fr.bottom - fr.y(v);
      let y = base - full / 2 + 3;
      if (y > prevY - 10) y = prevY - 10;
      prevY = y;
      base -= full;
      direct += `<text class="hc-t" x="${(xOf(lastI) + bw + 4).toFixed(1)}" y="${y.toFixed(1)}">${s.name} ${o.fmt(v)}</text>`;
    }
  }

  const ref = o.ref
    ? `<line class="hc-ref" x1="${fr.left}" x2="${fr.right}" y1="${fr.y(o.ref.value).toFixed(1)}" y2="${fr.y(o.ref.value).toFixed(1)}"/>
       <text class="hc-t" x="${fr.left + 3}" y="${(fr.y(o.ref.value) - 4).toFixed(1)}">${o.ref.label}</text>`
    : '';

  // selective: the latest total and the peak, when it is somewhere else
  let peakI = 0;
  totals.forEach((t, i) => t > totals[peakI] && (peakI = i));
  let labels = '';
  if (!o.direct && lastI >= 0) labels += valueLabel(xOf(lastI) + bw / 2, fr.y(totals[lastI]), o.fmt(totals[lastI]), fr);
  if (!o.direct && peakI !== lastI && Math.abs(peakI - lastI) * slot > 34)
    labels += valueLabel(xOf(peakI) + bw / 2, fr.y(totals[peakI]), o.fmt(totals[peakI]), fr);

  const tips =
    o.tips ??
    o.labels.map((l, i) =>
      [l, ...(o.series.length > 1 ? o.series.map((s) => `${s.name} ${o.fmt(s.values[i] ?? 0)}`) : [o.fmt(totals[i])])].join('\n'),
    );
  const ticks = (o.ticks ?? []).map((label, i) => ({ x: xOf(i) + bw / 2, label }));
  const table = o.table ?? {
    head: [o.what ?? 'day', ...o.series.map((s) => s.name)],
    rows: o.labels.map((l, i) => [l, ...o.series.map((s) => (s.values[i] === null ? '—' : o.fmt(s.values[i] ?? 0)))]),
  };
  return figure(
    o,
    axes(fr, o.fmt, ticks) + ref + bars + labels + direct,
    fr,
    fr.left + slot / 2,
    slot,
    n,
    tips,
    `${o.series.length > 1 ? legend(o.series.map((s) => s.name), colors) : ''}<figcaption class="hc-cap">${o.caption}</figcaption>${numbers(table.head, table.rows)}`,
  );
}

export interface RangeOpts extends Base {
  /** [from, to] per index, null for a gap */
  ranges: ([number, number] | null)[];
  name: string;
  step?: number;
  tips: string[];
  table: { head: string[]; rows: (string | number)[][] };
}

/** floating bars, from..to, the earlier at the top: lights out to up */
export function rangeChart(o: RangeOpts): string {
  const all = o.ranges.flatMap((r) => r ?? []);
  if (all.length < 2) return `<p class="line sub">${o.caption}: not enough data yet.</p>`;
  const fr = frame(all, { ...o, invert: true });
  const n = o.ranges.length;
  const slot = (fr.right - fr.left) / n;
  const bw = Math.max(1, slot - 2);
  const xOf = (i: number): number => fr.left + i * slot + (slot - bw) / 2;
  const bars = o.ranges
    .map((r, i) => {
      if (!r) return '';
      const y1 = fr.y(r[0]);
      const y2 = fr.y(r[1]);
      return `<rect x="${xOf(i).toFixed(1)}" y="${Math.min(y1, y2).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y2 - y1).toFixed(1)}" rx="${Math.min(2, bw / 2)}" fill="${SERIES[0]}"/>`;
    })
    .join('');
  const ticks = (o.ticks ?? []).map((label, i) => ({ x: xOf(i) + bw / 2, label }));
  return figure(
    o,
    axes(fr, o.fmt, ticks) + bars,
    fr,
    fr.left + slot / 2,
    slot,
    n,
    o.tips,
    `<figcaption class="hc-cap">${o.caption}</figcaption>${numbers(o.table.head, o.table.rows)}`,
  );
}

/* ---------- marks with their own tooltips ---------- */

export interface Part {
  name: string;
  value: number;
  fill: string;
  tip: string;
}

/** one horizontal bar in parts, 2px apart, each part its own tooltip */
export function hStack(parts: Part[], caption: string, table: { head: string[]; rows: (string | number)[][] }, height = 14): string {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (!total) return '';
  const live = parts.filter((p) => p.value > 0);
  const room = W - 2 * (live.length - 1);
  let x = 0;
  const rects = live
    .map((p) => {
      const w = Math.max(1, (p.value / total) * room);
      const r = `<rect data-tip="${esc(p.tip)}" x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" rx="2" fill="${p.fill}"/>`;
      x += w + 2;
      return r;
    })
    .join('');
  return `<figure class="hc hc-h">
    <svg class="hc-svg" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(caption)}">${rects}</svg>
    <div class="hc-tip" aria-hidden="true"></div>
    ${legend(parts.map((p) => p.name), parts.map((p) => p.fill))}
    ${numbers(table.head, table.rows)}
  </figure>`;
}

/** Apple-style rings, outermost first; past 100% a ring laps itself */
export function rings(list: { name: string; value: number; goal: number; unit: string }[], size = 168): string {
  const stroke = size * 0.105;
  const gap = 2;
  const c = size / 2;
  const arcs = list
    .map((r, i) => {
      const radius = c - stroke / 2 - i * (stroke + gap);
      const circ = 2 * Math.PI * radius;
      const frac = r.goal > 0 ? r.value / r.goal : 0;
      const shown = Math.min(frac, 2);
      const color = SERIES[i];
      const first = Math.min(1, shown);
      const lap = Math.max(0, shown - 1);
      const tip = `${r.name}: ${Math.round(r.value)} of ${Math.round(r.goal)} ${r.unit} (${Math.round(frac * 100)}%)`;
      const arc = (part: number, extra: string, cls: string): string =>
        `<circle class="hr-arc ${cls}" cx="${c}" cy="${c}" r="${radius.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${stroke.toFixed(2)}"
          stroke-linecap="round" stroke-dasharray="${(part * circ).toFixed(2)} ${circ.toFixed(2)}"
          style="--full:${(part * circ).toFixed(2)}" transform="rotate(-90 ${c} ${c})" ${extra}/>`;
      return `<g data-tip="${esc(tip)}">
        <circle cx="${c}" cy="${c}" r="${radius.toFixed(2)}" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="${stroke.toFixed(2)}"/>
        ${first > 0.002 ? arc(first, '', '') : ''}
        ${lap > 0.002 ? arc(lap, 'filter="url(#hrShade)"', 'lap') : ''}
      </g>`;
    })
    .join('');
  return `<svg class="hr-rings" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img"
      aria-label="${esc(list.map((r) => `${r.name} ${Math.round(r.value)} of ${Math.round(r.goal)} ${r.unit}`).join(', '))}">
    <defs><filter id="hrShade" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="#000" flood-opacity="0.55"/></filter></defs>
    ${arcs}
  </svg>`;
}

/** a 270° dial for a 0–100 score */
export function dial(score: number | null, fill: string, size = 220, label = ''): string {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75 * circ;
  const v = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return `<svg class="hd-dial" viewBox="0 0 ${size} ${size * 0.86}" role="img" aria-label="${esc(label)}">
    <g transform="rotate(135 ${c} ${c})">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${sweep.toFixed(1)} ${circ.toFixed(1)}"/>
      ${v > 0 ? `<circle class="hr-arc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${fill}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${(v * sweep).toFixed(1)} ${circ.toFixed(1)}" style="--full:${(v * sweep).toFixed(1)}"/>` : ''}
    </g>
  </svg>`;
}

/* ---------- tooltips: crosshair columns and marks, by mouse or by finger ---------- */

export function wireCharts(root: HTMLElement): () => void {
  let shown: HTMLElement | null = null;
  const hide = (): void => {
    if (!shown) return;
    shown.querySelector('.hc-tip')?.classList.remove('on');
    shown.querySelector('.hc-x')?.classList.remove('on');
    shown = null;
  };
  const place = (fig: HTMLElement, text: string, xPx: number): void => {
    const tip = fig.querySelector<HTMLElement>('.hc-tip');
    if (!tip) return;
    if (shown && shown !== fig) hide();
    shown = fig;
    if (tip.textContent !== text) tip.textContent = text;
    const w = tip.offsetWidth;
    const left = Math.max(0, Math.min(fig.clientWidth - w, xPx - w / 2));
    tip.style.transform = `translateX(${left.toFixed(0)}px)`;
    tip.classList.add('on');
  };
  const onMove = (ev: PointerEvent): void => {
    const target = ev.target as Element;
    const fig = target.closest<HTMLElement>('figure.hc');
    if (!fig) return hide();
    const figBox = fig.getBoundingClientRect();
    const mark = target.closest<SVGElement | HTMLElement>('[data-tip]');
    if (mark) {
      const box = mark.getBoundingClientRect();
      return place(fig, mark.dataset.tip ?? mark.getAttribute('data-tip') ?? '', box.left + box.width / 2 - figBox.left);
    }
    const n = Number(fig.dataset.n);
    const svg = fig.querySelector('svg');
    if (!n || !svg) return hide();
    const box = svg.getBoundingClientRect();
    const k = box.width / W;
    const vx = (ev.clientX - box.left) / k;
    let i: number;
    let xAt: number;
    const xs = fig.dataset.xs ? (JSON.parse(fig.dataset.xs) as number[]) : null;
    if (xs) {
      i = 0;
      for (let j = 1; j < xs.length; j++) if (Math.abs(xs[j] - vx) < Math.abs(xs[i] - vx)) i = j;
      xAt = xs[i];
    } else {
      const x0 = Number(fig.dataset.x0);
      const step = Number(fig.dataset.step) || 1;
      i = Math.max(0, Math.min(n - 1, Math.round((vx - x0) / step)));
      xAt = x0 + i * step;
    }
    const tips = JSON.parse(fig.dataset.tips ?? '[]') as string[];
    const line = fig.querySelector('.hc-x');
    line?.setAttribute('x1', xAt.toFixed(1));
    line?.setAttribute('x2', xAt.toFixed(1));
    line?.classList.add('on');
    place(fig, tips[i] ?? '', xAt * k + (box.left - figBox.left));
  };
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerdown', onMove);
  root.addEventListener('pointerleave', hide);
  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerdown', onMove);
    root.removeEventListener('pointerleave', hide);
  };
}
