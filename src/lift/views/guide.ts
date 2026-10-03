import { miloMark } from '../../badge';
import { closeSheet, sheet } from '../../ui/sheet';
import { toast } from '../../ui/toast';
import { alternatives } from '../data';
import { rate, ratingHtml } from '../evaluate';
import { mistakeStill, play, prepare, still, stillItems, viewBox, type Figure, type Player } from '../figure';
import { allGuides, guideFor, type Guide } from '../guides';
import { GEAR_NAMES, LIBRARY, type Exercise } from '../library';
import { muscleMap, musclesOf } from '../muscles';
import { POSES } from '../poses';
import { activeGym, exerciseById, loadLift } from '../store';
import { liftSubNav } from './pages';

/* ---------- figures ---------- */

const figures = new Map<string, Figure>();

/** a custom exercise borrows the pictures of the closest one in the book */
function posesFor(ex: Exercise): string {
  if (POSES[ex.id]) return ex.id;
  return (
    LIBRARY.find((e) => e.muscle === ex.muscle && e.gear === ex.gear) ??
    LIBRARY.find((e) => e.muscle === ex.muscle) ??
    LIBRARY[0]
  ).id;
}

export function figureFor(ex: Exercise): Figure {
  const hit = figures.get(ex.id);
  if (hit) return hit;
  const fig = prepare(POSES[posesFor(ex)], [...musclesOf(ex)]);
  figures.set(ex.id, fig);
  return fig;
}

/** the little static figure for lists: the finishing pose, 44 px */
export function miniFigure(ex: Exercise): string {
  return still(figureFor(ex), 'end', 'fig-mini', 1, `${ex.name}, finishing position`);
}

/**
 * Fill every [data-fig] placeholder under root with its mini figure, a few
 * per frame so a long list never blocks.
 */
export function paintMinis(root: ParentNode): void {
  const state = loadLift();
  const todo = [...root.querySelectorAll<HTMLElement>('[data-fig]')].filter((el) => !el.firstElementChild);
  const step = (): void => {
    for (const el of todo.splice(0, 12)) el.innerHTML = miniFigure(exerciseById(state, el.dataset.fig!));
    if (todo.length) requestAnimationFrame(step);
  };
  step();
}

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the guide itself ---------- */

const ROM_WORDS = [
  '',
  'Held still rather than moved through a range.',
  'A short range, so it suits a finisher more than a main lift.',
  'A moderate range of motion.',
  'A full range of motion.',
  'A long range with a loaded stretch, the range that grows muscle best.',
];
const STABLE_WORDS = [
  '',
  'Very unsteady: balance limits how hard the target muscle can work.',
  'Balance takes a good share of the effort.',
  'A free weight you steady yourself, so some effort goes into control.',
  'Mostly guided, so the target muscle does most of the work.',
  'The path is fixed, so the target muscle is what gives out.',
];
const SFR_WORDS = [
  '',
  'Very tiring for the muscle work it gives. Use it sparingly.',
  'Tiring for the whole body. Better for strength or fitness than for volume.',
  'An average cost for the work it gives.',
  'Good muscle work for its cost.',
  'Lots of muscle work for little fatigue, so it is easy to take close to failure.',
];

const list = (items: string[], tag: 'ul' | 'ol'): string => `<${tag} class="guide-list">${items.map((i) => `<li>${i}.</li>`).join('')}</${tag}>`;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function musclesLine(ex: Exercise): string {
  const m = [...musclesOf(ex)];
  const main = m.filter(([, w]) => w === 1).map(([n]) => n);
  const help = m.filter(([, w]) => w < 1).map(([n]) => n);
  return `<b>${main.map(cap).join(', ')}</b>${help.length ? `<span> · helped by ${help.join(', ')}</span>` : ''}`;
}

/** which drawn mistake belongs to which line of the guide */
function mistakeFrames(ex: Exercise): Map<number, number> {
  const out = new Map<number, number>();
  if (!POSES[ex.id]) return out;
  POSES[ex.id].frames
    .filter((f) => f.mistake !== undefined)
    .forEach((f, j) => out.set(f.mistake!, j));
  return out;
}

function figureBlock(ex: Exercise, fig: Figure): string {
  if (reducedMotion() || fig.loop.length === 1) {
    const one = fig.loop.length === 1;
    const label = (i: number): string => POSES[posesFor(ex)].frames.filter((f) => f.mistake === undefined)[i]?.label ?? '';
    return `<div class="guide-pair${one ? ' one' : ''}">
      <figure>${still(fig, 0, '', 1.25, `${ex.name}: ${label(0)}`)}<figcaption>${one ? label(0) || 'hold' : `start · ${label(0)}`}</figcaption></figure>
      ${one ? '' : `<figure>${still(fig, 'end', '', 1.25, `${ex.name}: ${label(fig.loop.length - 1)}`)}<figcaption>finish · ${label(fig.loop.length - 1)}</figcaption></figure>`}
    </div>`;
  }
  return `<div class="guide-fig" tabindex="0" role="button" aria-label="${ex.name}, moving. Tap to pause, drag to scrub."></div>
    <p class="guide-hint">Tap to pause · drag to scrub</p>`;
}

function guideBody(ex: Exercise, g: Guide | undefined, where: 'page' | 'sheet'): string {
  const fig = figureFor(ex);
  const r = rate(ex);
  const drawn = mistakeFrames(ex);
  const state = loadLift();
  const alts = alternatives(ex, 3, activeGym(state).equipment);
  const altCards = alts
    .map((a) =>
      where === 'page'
        ? `<a class="card tap alt-card" href="#/lift/exercise/${a.id}/guide"><span class="mini-fig" data-fig="${a.id}"></span><b>${a.name}</b><span class="tag">${GEAR_NAMES[a.gear]}</span></a>`
        : `<button class="card tap alt-card" data-guide-alt="${a.id}"><span class="mini-fig" data-fig="${a.id}"></span><b>${a.name}</b><span class="tag">${GEAR_NAMES[a.gear]}</span></button>`,
    )
    .join('');
  const section = (title: string, body: string, cls = ''): string =>
    `<div class="guide-sec${cls ? ` ${cls}` : ''}"><p class="tag">${title}</p>${body}</div>`;
  if (!g)
    return `${figureBlock(ex, fig)}
      <p class="guide-purpose">${ex.how}</p>
      ${section('Muscles', `<p class="line">${musclesLine(ex)}</p>`)}
      <p class="line sub">This is your own exercise, so the picture shows the closest one in the book.</p>`;
  return `${figureBlock(ex, fig)}
    <p class="guide-purpose">${g.purpose}</p>
    <div class="guide-muscles">${muscleMap(musclesOf(ex))}<p class="line">${musclesLine(ex)}</p></div>
    ${section('Set up', list(g.setup, 'ul'))}
    ${section('How to do it', list(g.steps, 'ol'))}
    ${section('Breathing', `<p class="line">${g.breathing}</p>`)}
    ${section('Three cues', `<div class="guide-cues">${g.cues.map((c) => `<q>${c}</q>`).join('')}</div>`)}
    ${section(
      'Common mistakes',
      `<div class="guide-mistakes">${g.mistakes
        .map((m, i) => {
          const j = drawn.get(i);
          return `<div class="mistake${j !== undefined ? ' drawn' : ''}">
            ${j !== undefined ? `<span class="mistake-fig">${mistakeStill(fig, j, `Mistake: ${m.what}`)}</span>` : ''}
            <p><b>${m.what}.</b> ${m.fix}.</p></div>`;
        })
        .join('')}</div>`,
    )}
    ${section('Kit and set-up', `<p class="line"><b>${cap(GEAR_NAMES[ex.gear])}.</b> ${g.numbers}</p>`)}
    ${section('Reps and tempo', `<p class="line">${g.reps}</p>`)}
    ${section('Safety', `<p class="line">${g.safety}</p>`, 'guide-safety')}
    ${section('First time?', `<p class="line">${g.first}</p>`, 'guide-first')}
    ${section(
      'How it rates',
      `<p class="line sub">${ratingHtml(ex)}</p>
       <dl class="rate-why"><dt>Range ${r.rom}/5</dt><dd>${ROM_WORDS[r.rom]}</dd>
       <dt>Stability ${r.stability}/5</dt><dd>${STABLE_WORDS[r.stability]}</dd>
       <dt>Stimulus for fatigue ${r.sfr}/5</dt><dd>${SFR_WORDS[r.sfr]}</dd></dl>`,
    )}
    ${alts.length ? section(`Alternatives at ${activeGym(state).name}`, `<div class="cards alt-cards">${altCards}</div>`) : ''}
    <div class="chips guide-actions">
      <button class="chip tap" data-guide-share="${ex.id}">share as image</button>
      <a class="chip tap" href="#/lift/print">print the library</a>
    </div>`;
}

function start(root: ParentNode, ex: Exercise): Player | null {
  paintMinis(root);
  const host = root.querySelector<HTMLElement>('.guide-fig');
  return host ? play(host, figureFor(ex), `${ex.name}, moving`) : null;
}

/* ---------- 158. as a page ---------- */

export function liftGuideView(root: HTMLElement, id: string): () => void {
  const state = loadLift();
  const ex = exerciseById(state, id);
  root.innerHTML = `
    <section class="today lift-page detail guide-page" data-guide="${ex.id}">
      <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
      ${liftSubNav('library')}
      <div class="hero">
        <p class="tag section"><a class="tap" href="#/lift/library">← Exercises</a> · <a class="tap" href="#/lift/exercise/${id}">history</a></p>
        <h1>${ex.name}</h1>
        <p class="line sub">${musclesLine(ex)} · ${GEAR_NAMES[ex.gear]}</p>
      </div>
      <div class="guide">${guideBody(ex, guideFor(id), 'page')}</div>
    </section>`;
  const player = start(root, ex);
  root.querySelector('[data-guide-share]')?.addEventListener('click', () => void shareGuide(ex));
  return () => player?.stop();
}

/* ---------- 158. as a sheet over the session ---------- */

export function guideSheet(id: string): HTMLElement {
  const state = loadLift();
  let ex = exerciseById(state, id);
  let player: Player | null = null;
  const host = sheet(ex.name, `<div class="guide"></div><button class="big tap guide-back">BACK TO SET</button>`);
  host.classList.add('sheet-full');
  const body = host.querySelector<HTMLElement>('.guide')!;
  const draw = (): void => {
    player?.stop();
    host.querySelector('.sheet')?.setAttribute('aria-label', ex.name);
    host.querySelector('.sheet header .tag')!.textContent = ex.name;
    body.innerHTML = guideBody(ex, guideFor(ex.id), 'sheet');
    player = start(body, ex);
    host.querySelector('.sheet')!.scrollTop = 0;
  };
  draw();
  host.querySelector('.guide-back')!.addEventListener('click', () => closeSheet(host));
  body.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const alt = target.closest<HTMLElement>('[data-guide-alt]');
    if (alt) {
      ex = exerciseById(loadLift(), alt.dataset.guideAlt!);
      draw();
      return;
    }
    if (target.closest('[data-guide-share]')) void shareGuide(ex);
    if (target.closest('a[href="#/lift/print"]')) closeSheet(host);
  });
  return host;
}

/* ---------- 160. a guide as an image ---------- */

const STYLE: Record<string, { stroke?: string; fill?: string; width?: number; dash?: number[]; alpha?: number }> = {
  'fg-limb': { stroke: 'text', width: 6 },
  'fg-torso': { stroke: 'text', width: 10 },
  'fg-trunk': { stroke: 'text', fill: 'text', width: 6 },
  'fg-head': { fill: 'text' },
  'fg-glow': { stroke: 'accent', width: 9, alpha: 0.7 },
  'fg-plate': { stroke: 'muted', fill: 'bg', width: 2.2 },
  'fg-db': { stroke: 'muted', fill: 'bg', width: 2.2 },
  'fg-kb': { stroke: 'muted', fill: 'bg', width: 2.2 },
  'fg-hub': { fill: 'muted' },
  'fg-pulley': { fill: 'muted' },
  'fg-bar': { stroke: 'muted', width: 2.2 },
  'fg-frame': { stroke: 'muted', width: 2.2 },
  'fg-rail': { stroke: 'muted', width: 1.6, dash: [3, 3] },
  'fg-pad': { stroke: 'pad', width: 5 },
  'fg-roller': { fill: 'pad' },
  'fg-box': { stroke: 'pad', fill: 'panel', width: 1.6 },
  'fg-stack': { stroke: 'pad', fill: 'panel', width: 1.6 },
  'fg-cable': { stroke: 'muted', width: 1.2 },
  'fg-band': { stroke: 'band', width: 2 },
  'fg-floor': { stroke: 'line', width: 1.5 },
};

function drawFigure(g: CanvasRenderingContext2D, fig: Figure, which: number | 'end', x: number, y: number, w: number, h: number, colours: Record<string, string>): void {
  const [vx, vy, vw, vh] = viewBox(fig, w / h).split(' ').map(Number);
  const k = Math.min(w / vw, h / vh);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x - vx * k, y - vy * k);
  g.scale(k, k);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const it of stillItems(fig, which)) {
    const base = it.c.split(' ')[0];
    const s = STYLE[base];
    if (!s) continue;
    const path = new Path2D(it.d);
    g.globalAlpha = (it.c.includes('far') ? 0.4 : 1) * (s.alpha ?? 1) * (it.o ?? 1);
    if (s.fill) {
      g.fillStyle = colours[s.fill];
      g.fill(path);
    }
    if (s.stroke) {
      g.strokeStyle = colours[s.stroke];
      g.lineWidth = s.width ?? 2;
      g.setLineDash(s.dash ?? []);
      g.stroke(path);
    }
  }
  g.restore();
}

/** wrap text to a width; returns the y after the last line */
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number): number {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > width && line) {
      g.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else line = next;
  }
  if (line) g.fillText(line, x, y);
  return y + lineHeight;
}

export async function guideCard(ex: Exercise): Promise<Blob> {
  const g0 = guideFor(ex.id);
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--run').trim() || '#c5f74f';
  const colours: Record<string, string> = {
    text: '#e9eef1',
    muted: '#7d888f',
    bg: '#0b0d0f',
    panel: '#14181b',
    line: '#2a3338',
    pad: '#4a555c',
    band: '#5eead4',
    accent,
  };
  const sans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const mono = 'ui-monospace, Menlo, monospace';
  g.fillStyle = colours.bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = accent;
  g.font = `600 28px ${mono}`;
  g.fillText('MILO · LIFT · HOW TO', 72, 96);
  g.fillStyle = colours.text;
  g.font = `800 72px ${sans}`;
  g.fillText(ex.name, 72, 180, w - 144);
  g.fillStyle = colours.muted;
  g.font = `400 32px ${sans}`;
  g.fillText(`${cap(ex.muscle)}${ex.also ? ` · helped by ${ex.also}` : ''} · ${GEAR_NAMES[ex.gear]}`, 72, 232, w - 144);

  const fig = figureFor(ex);
  const panels: [number | 'end', string][] = fig.loop.length > 1 ? [[0, 'START'], ['end', 'FINISH']] : [[0, 'HOLD']];
  const pw = panels.length === 1 ? w - 144 : (w - 144 - 24) / 2;
  panels.forEach(([which, label], i) => {
    const x = 72 + i * (pw + 24);
    g.fillStyle = colours.panel;
    g.fillRect(x, 272, pw, 420);
    drawFigure(g, fig, which, x + 16, 288, pw - 32, 360, colours);
    g.fillStyle = colours.muted;
    g.font = `600 22px ${mono}`;
    g.fillText(label, x + 20, 676);
  });

  let y = 760;
  g.font = `400 30px ${sans}`;
  for (const [i, step] of (g0?.steps ?? [ex.how]).entries()) {
    g.fillStyle = accent;
    g.font = `700 30px ${mono}`;
    g.fillText(String(i + 1), 72, y);
    g.fillStyle = colours.text;
    g.font = `400 30px ${sans}`;
    y = wrap(g, `${step}.`, 120, y, w - 192, 40) + 8;
    if (y > h - 180) break;
  }
  if (g0) {
    g.fillStyle = colours.muted;
    g.font = `italic 400 28px ${sans}`;
    wrap(g, g0.cues.map((c) => `“${c}”`).join('   '), 72, Math.min(y + 16, h - 110), w - 144, 36);
  }
  g.fillStyle = colours.muted;
  g.font = `400 22px ${mono}`;
  g.fillText('carried daily, grows slowly', 72, h - 48);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

export async function shareGuide(ex: Exercise): Promise<void> {
  const blob = await guideCard(ex);
  const file = new File([blob], `milo-how-to-${ex.id}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `How to: ${ex.name}` });
      return;
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Guide saved');
}

/* ---------- 160. the whole library, to print ---------- */

export function liftPrintView(root: HTMLElement): () => void {
  const figsOnly = /[?&]figs\b/.test(location.hash);
  const guides = allGuides();
  const cards = LIBRARY.map((ex) => {
    const fig = figureFor(ex);
    const g = guides.get(ex.id);
    const frames = POSES[ex.id].frames;
    const loopLabels = frames.filter((f) => f.mistake === undefined).map((f) => f.label ?? '');
    const figs = figsOnly
      ? [
          ...fig.loop.map((_, i) => `<figure>${still(fig, i, '', 1.25, loopLabels[i])}<figcaption>${loopLabels[i]}</figcaption></figure>`),
          ...fig.mistakes.map((_, j) => `<figure>${mistakeStill(fig, j, 'mistake')}<figcaption>mistake</figcaption></figure>`),
        ]
      : [
          `<figure>${still(fig, 0, '', 1.25, loopLabels[0])}<figcaption>${loopLabels[0]}</figcaption></figure>`,
          ...(fig.loop.length > 1 ? [`<figure>${still(fig, 'end', '', 1.25, loopLabels.at(-1))}<figcaption>${loopLabels.at(-1)}</figcaption></figure>`] : []),
        ];
    return `<article class="print-card">
      <h3>${ex.name}</h3>
      <p class="line sub">${musclesLine(ex)} · ${GEAR_NAMES[ex.gear]}</p>
      <div class="print-figs n${figs.length}">${figs.join('')}</div>
      ${figsOnly || !g ? '' : `${list(g.steps, 'ol')}<p class="line sub">${g.cues.map((c) => `“${c}”`).join(' · ')}</p>`}
    </article>`;
  });
  const sheets: string[] = [];
  for (let i = 0; i < cards.length; i += 12) sheets.push(`<div class="print-sheet" data-sheet="${i / 12 + 1}">${cards.slice(i, i + 12).join('')}</div>`);
  root.innerHTML = `
    <section class="today lift-page detail print-page${figsOnly ? ' figs-only' : ''}">
      <header class="head"><span class="wordmark">${miloMark()}<b>MILO</b></span></header>
      ${liftSubNav('library')}
      <div class="hero">
        <p class="tag section"><a class="tap" href="#/lift/library">← Exercises</a></p>
        <h1>${LIBRARY.length}<span><i> · </i>exercises, start to finish</span></h1>
        <div class="chips"><button class="chip tap" id="printIt">print</button>
          <a class="chip tap" href="#/lift/print${figsOnly ? '' : '?figs'}">${figsOnly ? 'with steps' : 'every frame'}</a></div>
      </div>
      ${sheets.join('')}
    </section>`;
  root.querySelector('#printIt')!.addEventListener('click', () => window.print());
  return () => {};
}
