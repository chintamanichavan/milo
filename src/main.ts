import { registerSW } from 'virtual:pwa-register';
import './style.css';
import { advance } from './clock';
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
import { liftTodayView } from './lift/views/today';
import { doneView } from './views/done';
import { runView } from './views/run';
import { todayView } from './views/today';

const app = document.getElementById('app')!;
let cleanup: () => void = () => {};

function route(): void {
  cleanup();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  document.body.dataset.view = [parts[0] || 'today', parts[1]].filter(Boolean).join('-');
  if (parts[0] === 'run') cleanup = runView(app, Number(parts[1]) || 1, Number(parts[2]) || 1);
  else if (parts[0] === 'done') cleanup = doneView(app);
  else if (parts[0] === 'lift' && parts[1] === 'session') cleanup = liftSessionView(app, parts[2]);
  else if (parts[0] === 'lift' && parts[1] === 'exercise') cleanup = liftExerciseView(app, parts[2]);
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
  scrollTo(0, 0);
}

addEventListener('hashchange', route);
route();

if (new URLSearchParams(location.search).has('test'))
  (window as unknown as { __c25k: unknown }).__c25k = {
    tick: (seconds: number) => advance(seconds * 1000),
  };

registerSW({ immediate: true });
