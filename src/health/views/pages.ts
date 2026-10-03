import { RUN_KEY } from '../../keys';
import { wireCharts } from '../charts';
import type { DayScore, ScoreSettings } from '../scores';
import { ageOf, loadHealth, loadMeta, maxHrOf, sexOf, type HealthData, type HealthMeta } from '../store';
import { dataView } from './data';
import { shell } from './shell';

/** what every HEALTH page is drawn from */
export interface Ctx {
  data: HealthData;
  meta: HealthMeta;
  s: ScoreSettings;
  scores: Map<string, DayScore>;
  /** the newest day anything was recorded */
  latest: string | null;
  units: 'mi' | 'km';
  /** the age is a guess until the export or you say otherwise */
  ageKnown: boolean;
}

export type View = (root: HTMLElement, ctx: Ctx, arg: string | undefined, again: () => void) => (() => void) | void;

let memo: { data: HealthData; key: string; scores: Map<string, DayScore> } | null = null;

async function context(): Promise<Ctx> {
  const data = await loadHealth();
  const meta = loadMeta();
  const { age, known } = ageOf(meta);
  const s: ScoreSettings = { age, sex: sexOf(meta), maxHr: maxHrOf(meta), needH: meta.settings.needH };
  const key = JSON.stringify(s);
  if (!memo || memo.data !== data || memo.key !== key) memo = { data, key, scores: new Map() };
  const lastDay = data.days[data.days.length - 1]?.date;
  const lastWorkout = data.workouts[data.workouts.length - 1]?.date;
  const latest = [lastDay, lastWorkout].filter(Boolean).sort().pop() ?? null;
  let units: 'mi' | 'km' = 'mi';
  try {
    units = (JSON.parse(localStorage.getItem(RUN_KEY) ?? 'null') as { settings?: { units?: 'mi' | 'km' } } | null)?.settings?.units ?? 'mi';
  } catch {
    /* the run tab's default */
  }
  return { data, meta, s, scores: memo.scores, latest, units, ageKnown: known };
}

const VIEWS: Record<string, View> = {
  '': dataView,
  data: dataView,
};

export function healthView(root: HTMLElement, sub = '', arg?: string): () => void {
  const page = sub in VIEWS ? sub : '';
  let alive = true;
  let undo: (() => void)[] = [];
  const stop = (): void => {
    undo.forEach((fn) => fn());
    undo = [];
  };
  root.innerHTML = shell(page, '<p class="line sub hl-wait">Opening your health data…</p>', 'hl-page');
  const draw = async (): Promise<void> => {
    let ctx: Ctx;
    try {
      ctx = await context();
    } catch {
      if (alive) root.innerHTML = shell(page, '<p class="line sub">This browser would not open its health store. Private browsing can block it.</p>', 'hl-page');
      return;
    }
    if (!alive) return;
    stop();
    const view = VIEWS[page];
    const done = view(root, ctx, arg, () => void draw());
    if (done) undo.push(done);
    undo.push(wireCharts(root));
  };
  void draw();
  return () => {
    alive = false;
    stop();
  };
}
