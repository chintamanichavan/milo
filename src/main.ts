import { registerSW } from 'virtual:pwa-register';
import './style.css';
import { advance } from './clock';
import { doneView } from './views/done';
import { runView } from './views/run';
import { todayView } from './views/today';

const app = document.getElementById('app')!;
let cleanup: () => void = () => {};

function route(): void {
  cleanup();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  document.body.dataset.view = parts[0] || 'today';
  if (parts[0] === 'run') cleanup = runView(app, Number(parts[1]) || 1, Number(parts[2]) || 1);
  else if (parts[0] === 'done') cleanup = doneView(app);
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
