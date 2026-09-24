import { registerSW } from 'virtual:pwa-register';
import './style.css';
import { advance } from './clock';
import { applyTheme } from './run/theme';
import { mountNav, setActiveTab, type Tab } from './ui/nav';

const app = document.getElementById('app')!;
let cleanup: () => void = () => {};
let token = 0;

/** Each tab is its own chunk, fetched the first time you open it. */
const chunks = {
  run: () => import('./run/views/today'),
  runPages: () => import('./run/views/pages'),
  runEngine: () => import('./run/views/run'),
  runDone: () => import('./run/views/done'),
  lift: () => import('./lift/views/today'),
  liftSession: () => import('./lift/views/session'),
  liftExercise: () => import('./lift/views/exercise'),
  liftPages: () => import('./lift/views/pages'),
  focus: () => import('./focus/views/board'),
  focusFlight: () => import('./focus/views/flight'),
  focusLanded: () => import('./focus/views/landed'),
  focusPages: () => import('./focus/views/pages'),
  cook: () => import('./cook/views/pages'),
  fuel: () => import('./fuel/views/pages'),
  habits: () => import('./habits/views/pages'),
  water: () => import('./water/views/pages'),
};

async function route(): Promise<void> {
  const mine = ++token;
  cleanup();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  document.body.dataset.view = [parts[0] || 'today', parts[1]].filter(Boolean).join('-');
  const tab = (parts[0] || 'run') as Tab;
  setActiveTab(['lift', 'focus', 'cook', 'fuel', 'habits', 'water'].includes(tab) ? tab : 'run');

  const mount = (next: () => void): void => {
    // a slow chunk must never render over a newer route
    if (mine === token) next();
  };

  const [a, b, c, d] = parts;
  if (a === 'run' && b === 'history') (await chunks.runPages()).runHistoryView(app);
  else if (a === 'run' && b === 'tips') (await chunks.runPages()).tipsView(app);
  else if (a === 'run' && b === 'plans') (await chunks.runPages()).plansView(app);
  else if (a === 'run' && b === 'settings') (await chunks.runPages()).runSettingsView(app);
  else if (a === 'run' && b === 'certificate') (await chunks.runPages()).certificateView(app);
  else if (a === 'run' && b && Number.isNaN(Number(b))) {
    const { runView } = await chunks.runEngine();
    mount(() => (cleanup = runView(app, Number(c) || 1, Number(d) || 1, b)));
  } else if (a === 'run') {
    const { runView } = await chunks.runEngine();
    mount(() => (cleanup = runView(app, Number(b) || 1, Number(c) || 1)));
  } else if (a === 'done') {
    const { doneView } = await chunks.runDone();
    mount(() => (cleanup = doneView(app)));
  } else if (a === 'lift' && b === 'session') {
    const { liftSessionView } = await chunks.liftSession();
    mount(() => (cleanup = liftSessionView(app, c)));
  } else if (a === 'lift' && b === 'exercise') {
    const { liftExerciseView } = await chunks.liftExercise();
    mount(() => (cleanup = liftExerciseView(app, c)));
  } else if (a === 'lift' && b?.startsWith('library')) (await chunks.liftPages()).libraryView(app);
  else if (a === 'lift' && b === 'routines') (await chunks.liftPages()).routinesView(app);
  else if (a === 'lift' && b === 'routine') (await chunks.liftPages()).routineEditView(app, c);
  else if (a === 'lift' && b === 'history') (await chunks.liftPages()).liftHistoryView(app);
  else if (a === 'lift' && b === 'body') (await chunks.liftPages()).bodyView(app);
  else if (a === 'lift' && b?.startsWith('stats')) (await chunks.liftPages()).liftStatsView(app);
  else if (a === 'lift' && b === 'progress') (await chunks.liftPages()).progressView(app);
  else if (a === 'lift' && b === 'settings') (await chunks.liftPages()).liftSettingsView(app);
  else if (a === 'lift') {
    const { liftTodayView } = await chunks.lift();
    mount(() => (cleanup = liftTodayView(app)));
  } else if (a === 'focus' && b === 'flight') {
    const { flightView } = await chunks.focusFlight();
    mount(() => (cleanup = flightView(app, Number(c) || 25, decodeURIComponent(d ?? ''))));
  } else if (a === 'focus' && b === 'landed') {
    const { landedView } = await chunks.focusLanded();
    mount(() => (cleanup = landedView(app)));
  } else if (a === 'focus' && b === 'routes') {
    const { routesView } = await chunks.focusPages();
    mount(() => (cleanup = routesView(app)));
  } else if (a === 'focus' && b === 'hangar') (await chunks.focusPages()).hangarView(app);
  else if (a === 'focus' && b === 'badges') (await chunks.focusPages()).badgesView(app);
  else if (a === 'focus' && b?.startsWith('stats')) (await chunks.focusPages()).statsView(app);
  else if (a === 'focus' && b === 'settings') (await chunks.focusPages()).focusSettingsView(app);
  else if (a === 'focus') {
    const { focusBoardView } = await chunks.focus();
    mount(() => (cleanup = focusBoardView(app)));
  } else if (a === 'cook' && b === 'recipe') (await chunks.cook()).recipeView(app, c);
  else if (a === 'cook' && b === 'edit') (await chunks.cook()).recipeEditView(app, c);
  else if (a === 'cook' && b === 'new') (await chunks.cook()).recipeEditView(app);
  else if (a === 'cook' && b === 'mode') {
    const { cookModeView } = await chunks.cook();
    mount(() => (cleanup = cookModeView(app, c)));
  } else if (a === 'cook' && b === 'list') (await chunks.cook()).shoppingView(app);
  else if (a === 'cook' && b === 'plan') (await chunks.cook()).plannerView(app);
  else if (a === 'cook') (await chunks.cook()).cookHomeView(app);
  else if (a === 'fuel' && b === 'nutrients') (await chunks.fuel()).nutrientsView(app);
  else if (a === 'fuel' && b === 'weight') (await chunks.fuel()).weightView(app);
  else if (a === 'fuel' && b === 'trends') (await chunks.fuel()).trendsView(app);
  else if (a === 'fuel' && b === 'program') (await chunks.fuel()).programView(app);
  else if (a === 'fuel') (await chunks.fuel()).fuelTodayView(app);
  else if (a === 'habits' && b === 'new') (await chunks.habits()).habitNewView(app);
  else if (a === 'habits' && b === 'edit') (await chunks.habits()).habitNewView(app, c);
  else if (a === 'habits' && b === 'habit') (await chunks.habits()).habitDetailView(app, c);
  else if (a === 'habits' && b === 'templates') (await chunks.habits()).templatesView(app);
  else if (a === 'habits' && b === 'lessons') (await chunks.habits()).lessonsView(app);
  else if (a === 'habits' && b === 'reflect') (await chunks.habits()).reflectView(app);
  else if (a === 'habits' && b === 'manage') (await chunks.habits()).manageView(app);
  else if (a === 'habits') (await chunks.habits()).habitsTodayView(app);
  else if (a === 'water' && b === 'stats') (await chunks.water()).waterStatsView(app);
  else if (a === 'water' && b === 'challenges') (await chunks.water()).waterChallengesView(app);
  else if (a === 'water' && b === 'pets') (await chunks.water()).waterPetsView(app);
  else if (a === 'water' && b === 'settings') (await chunks.water()).waterSettingsView(app);
  else if (a === 'water') {
    const { waterTodayView } = await chunks.water();
    mount(() => (cleanup = waterTodayView(app)));
  }
  else {
    const { todayView } = await chunks.run();
    mount(() => (cleanup = todayView(app)));
  }
  scrollTo(0, 0);
}

applyTheme();
mountNav();
addEventListener('hashchange', () => void route(), { passive: true });
// a cup poured from the More sheet shows up on the screen underneath it
addEventListener('milo:water', () => {
  const view = document.body.dataset.view ?? '';
  if (view === 'water' || view === 'fuel') void route();
});
void route();

// the tab you are about to press is already on its way
document.addEventListener(
  'pointerdown',
  (ev) => {
    const tab = (ev.target as HTMLElement).closest<HTMLAnchorElement>('.navtab[href]');
    if (!tab) return;
    const where = tab.getAttribute('href') ?? '';
    if (where.includes('lift')) void chunks.lift();
    else if (where.includes('focus')) void chunks.focus();
    else if (where.includes('cook')) void chunks.cook();
    else if (where.includes('fuel')) void chunks.fuel();
    else if (where.includes('habits')) void chunks.habits();
    else if (where.includes('water')) void chunks.water();
    else void chunks.run();
  },
  { passive: true, capture: true },
);

if (new URLSearchParams(location.search).has('test'))
  (window as unknown as { __c25k: unknown }).__c25k = {
    tick: (seconds: number) => advance(seconds * 1000),
    sunAt: (iso: string) => {
      (window as unknown as { __c25kSun?: string }).__c25kSun = iso;
    },
  };

// a new version waits until you are on a board screen, never mid-flight
let swReg: ServiceWorkerRegistration | undefined;
let updateReady = false;
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    swReg = reg;
    // a home-screen app resumes without reloading, so look for a new build
    // every time it comes to the front and every 15 minutes while it is open
    const look = (): void => { void reg?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
    setInterval(look, 15 * 60 * 1000);
  },
  onNeedRefresh() {
    updateReady = true;
    document.dispatchEvent(new CustomEvent('milo:update-ready'));
    const settle = (): void => {
      const view = document.body.dataset.view ?? '';
      const busy = view.startsWith('run-') || view.startsWith('focus-flight') || view.startsWith('lift-session');
      if (busy) return;
      window.removeEventListener('hashchange', settle);
      void updateSW(true);
    };
    window.addEventListener('hashchange', settle);
    settle();
  },
});


(window as unknown as { __miloUpdate: unknown }).__miloUpdate = {
  ready: () => updateReady,
  check: async (): Promise<'ready' | 'current' | 'offline'> => {
    if (!navigator.onLine) return 'offline';
    try { await swReg?.update(); } catch { /* no network */ }
    await new Promise((r) => setTimeout(r, 1500));
    return updateReady ? 'ready' : 'current';
  },
  apply: () => { void updateSW(true); },
};
