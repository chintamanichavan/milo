import { registerSW } from 'virtual:pwa-register';
import './style.css';
import { advance } from './clock';
import { mountNav, setActiveTab, type Tab } from './ui/nav';
import { focusBoardView } from './focus/views/board';
import { flightView } from './focus/views/flight';
import { landedView } from './focus/views/landed';
import {
  badgesView,
  focusSettingsView,
  hangarView,
  routesView,
  statsView,
} from './focus/views/pages';
import { liftExerciseView } from './lift/views/exercise';
import { liftSessionView } from './lift/views/session';
import {
  bodyView,
  libraryView,
  liftHistoryView,
  liftSettingsView,
  liftStatsView,
  progressView,
  routineEditView,
  routinesView,
} from './lift/views/pages';
import { liftTodayView } from './lift/views/today';
import { doneView } from './run/views/done';
import {
  applyTheme,
  certificateView,
  plansView,
  runHistoryView,
  runSettingsView,
  tipsView,
} from './run/views/pages';
import { runView } from './run/views/run';
import { todayView } from './run/views/today';

const app = document.getElementById('app')!;
let cleanup: () => void = () => {};

function route(): void {
  cleanup();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  document.body.dataset.view = [parts[0] || 'today', parts[1]].filter(Boolean).join('-');
  if (parts[0] === 'run' && parts[1] === 'history') cleanup = runHistoryView(app);
  else if (parts[0] === 'run' && parts[1] === 'tips') cleanup = tipsView(app);
  else if (parts[0] === 'run' && parts[1] === 'plans') cleanup = plansView(app);
  else if (parts[0] === 'run' && parts[1] === 'settings') cleanup = runSettingsView(app);
  else if (parts[0] === 'run' && parts[1] === 'certificate') cleanup = certificateView(app);
  else if (parts[0] === 'run' && Number.isNaN(Number(parts[1])) && parts[1])
    // #/run/<programme>/<week>/<run>
    cleanup = runView(app, Number(parts[2]) || 1, Number(parts[3]) || 1, parts[1]);
  else if (parts[0] === 'run') cleanup = runView(app, Number(parts[1]) || 1, Number(parts[2]) || 1);
  else if (parts[0] === 'done') cleanup = doneView(app);
  else if (parts[0] === 'lift' && parts[1] === 'session') cleanup = liftSessionView(app, parts[2]);
  else if (parts[0] === 'lift' && parts[1] === 'exercise') cleanup = liftExerciseView(app, parts[2]);
  else if (parts[0] === 'lift' && parts[1]?.startsWith('library')) cleanup = libraryView(app);
  else if (parts[0] === 'lift' && parts[1] === 'routines') cleanup = routinesView(app);
  else if (parts[0] === 'lift' && parts[1] === 'routine') cleanup = routineEditView(app, parts[2]);
  else if (parts[0] === 'lift' && parts[1] === 'history') cleanup = liftHistoryView(app);
  else if (parts[0] === 'lift' && parts[1] === 'body') cleanup = bodyView(app);
  else if (parts[0] === 'lift' && parts[1]?.startsWith('stats')) cleanup = liftStatsView(app);
  else if (parts[0] === 'lift' && parts[1] === 'progress') cleanup = progressView(app);
  else if (parts[0] === 'lift' && parts[1] === 'settings') cleanup = liftSettingsView(app);
  else if (parts[0] === 'lift') cleanup = liftTodayView(app);
  else if (parts[0] === 'focus' && parts[1] === 'flight')
    cleanup = flightView(app, Number(parts[2]) || 25, decodeURIComponent(parts[3] ?? ''));
  else if (parts[0] === 'focus' && parts[1] === 'landed') cleanup = landedView(app);
  else if (parts[0] === 'focus' && parts[1] === 'routes') cleanup = routesView(app);
  else if (parts[0] === 'focus' && parts[1] === 'hangar') cleanup = hangarView(app);
  else if (parts[0] === 'focus' && parts[1] === 'badges') cleanup = badgesView(app);
  else if (parts[0] === 'focus' && parts[1]?.startsWith('stats')) cleanup = statsView(app);
  else if (parts[0] === 'focus' && parts[1] === 'settings') cleanup = focusSettingsView(app);
  else if (parts[0] === 'focus') cleanup = focusBoardView(app);
  else cleanup = todayView(app);
  const tab = (parts[0] || 'run') as Tab;
  setActiveTab(['lift', 'focus', 'cook', 'fuel', 'habits'].includes(tab) ? tab : 'run');
  scrollTo(0, 0);
}

applyTheme();
mountNav();
addEventListener('hashchange', route);
route();

if (new URLSearchParams(location.search).has('test'))
  (window as unknown as { __c25k: unknown }).__c25k = {
    tick: (seconds: number) => advance(seconds * 1000),
  };

registerSW({ immediate: true });
