import { sheet } from './sheet';

export type Tab = 'run' | 'lift' | 'water';

const G = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS: Record<Tab | 'more' | 'settings', string> = {
  run: G('<path d="M13.5 4.5a1.2 1.2 0 1 0 0-.1"/><path d="M9 21l2.5-5 3-2-1-4-3.5 2-2 3"/><path d="M14.5 10l3 1.5 2.5-1"/>'),
  lift: G('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'),
  water: G('<path d="M12 3.2c3.6 4.6 6.2 8 6.2 11.1a6.2 6.2 0 0 1-12.4 0c0-3.1 2.6-6.5 6.2-11.1z"/><path d="M9 15.2a3 3 0 0 0 3 2.8"/>'),
  more: G('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  settings: G('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>'),
};

export const LINKS: { id: Tab; label: string; href: string; blurb: string }[] = [
  { id: 'run', label: 'Run', href: '#/', blurb: 'couch to 5K' },
  { id: 'lift', label: 'Lift', href: '#/lift', blurb: 'strength' },
  { id: 'water', label: 'Water', href: '#/water', blurb: 'drink up' },
];

export { TABS_KEY } from '../keys';
import { TABS_KEY } from '../keys';

/** four tabs across the bottom and More in the fifth slot; the rest live behind More */
export const BAR_SLOTS = 4;

const DEFAULT_ORDER: Tab[] = ['run', 'lift', 'water'];

export function tabOrder(): Tab[] {
  try {
    const saved = (JSON.parse(localStorage.getItem(TABS_KEY) ?? 'null') as { order?: Tab[] } | null)?.order ?? [];
    const known = saved.filter((t, i) => DEFAULT_ORDER.includes(t) && saved.indexOf(t) === i);
    return [...known, ...DEFAULT_ORDER.filter((t) => !known.includes(t))];
  } catch {
    return [...DEFAULT_ORDER];
  }
}

export function setTabOrder(order: Tab[]): void {
  localStorage.setItem(TABS_KEY, JSON.stringify({ order }));
  mountNav();
  setActiveTab(current);
}

const tab = (id: string, label: string, href: string): string =>
  `<a class="navtab" data-tab="${id}" href="${href}" aria-label="${label}">${ICONS[id as Tab]}<span>${label}</span></a>`;

const link = (id: Tab): (typeof LINKS)[number] => LINKS.find((l) => l.id === id)!;

let current: Tab = 'run';

export function mountNav(): HTMLElement {
  document.querySelector('nav.tabbar')?.remove();
  const order = tabOrder();
  const nav = document.createElement('nav');
  nav.className = 'tabbar';
  nav.innerHTML = `
    <div class="bar-phone">
      ${order
        .slice(0, BAR_SLOTS)
        .map((id) => tab(id, link(id).label, link(id).href))
        .join('')}
      <button class="navtab" id="moreTab" aria-label="More">${ICONS.more}<span>More</span></button>
    </div>
    <div class="bar-wide">
      ${order.map((id) => tab(id, link(id).label, link(id).href)).join('')}
      ${tab('settings', 'Settings', '#/run/settings')}
    </div>`;
  document.body.appendChild(nav);
  nav.querySelector('#moreTab')!.addEventListener('click', openMore);
  return nav;
}

/** Water always leads the sheet, whatever else is behind More */
function openMore(): void {
  void import('../water/quick');
  const behind = tabOrder().slice(BAR_SLOTS);
  const rest = behind.filter((t) => t !== 'water');
  const waterInBar = !behind.includes('water');
  const host = sheet(
    'More',
    `<div class="cards">
      <div class="card wl-more">
        <a class="wl-more-open tap" href="#/water">${ICONS.water}<b>Water</b><span class="tag">${waterInBar ? 'also in your bar' : 'drink up'}</span></a>
        <button class="chip tap on" id="morePour">+ a cup</button>
      </div>
      ${rest
        .map((id) => `<a class="card tap" href="${link(id).href}">${ICONS[id]}<b>${link(id).label}</b><span class="tag">${link(id).blurb}</span></a>`)
        .join('')}
      <a class="card tap" href="#/run/settings">${ICONS.settings}<b>Settings</b><span class="tag">everything else</span></a>
    </div>
    <p class="muted mono" style="margin-top:16px;font-size:12px">build ${__BUILD__} · <img src="/apple-touch-icon-v7.png" alt="" width="18" height="18" style="vertical-align:middle;border-radius:4px"> icon v7</p>
    <button class="chip tap" id="checkUpdate" type="button" style="margin-top:8px">Check for updates</button>
    <p class="muted" id="updateNote" style="font-size:13px;margin:6px 0 0"></p>`,
  );
  {
    const note = host.querySelector<HTMLElement>('#updateNote')!;
    const btn = host.querySelector<HTMLButtonElement>('#checkUpdate')!;
    type Upd = { ready(): boolean; check(): Promise<'ready' | 'current' | 'offline'>; apply(): void };
    const upd = (window as unknown as { __miloUpdate?: Upd }).__miloUpdate;
    const showReady = (): void => {
      note.textContent = 'A new version is ready.';
      btn.textContent = 'Restart into it';
      btn.onclick = () => upd?.apply();
    };
    if (upd?.ready()) showReady();
    else
      btn.onclick = async () => {
        btn.disabled = true;
        note.textContent = 'Looking…';
        const r = await upd?.check();
        btn.disabled = false;
        if (r === 'ready') showReady();
        else note.textContent = r === 'offline' ? 'You are offline.' : 'You have the latest build.';
      };
    document.addEventListener('milo:update-ready', showReady, { once: true });
  }
  host.querySelector('#morePour')!.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    // the water chunk only loads when someone actually pours
    const { pour } = await import('../water/quick');
    pour();
    window.dispatchEvent(new CustomEvent('milo:water'));
  });
  host.querySelector('.cards')!.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('a')) setTimeout(() => host.remove(), 180);
  });
}

export function setActiveTab(active: Tab): void {
  current = active;
  for (const el of document.querySelectorAll<HTMLElement>('.tabbar .navtab[data-tab]')) {
    const on = el.dataset.tab === active;
    el.classList.toggle('on', on);
    if (on) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  }
  const more = document.querySelector('#moreTab');
  more?.classList.toggle('on', !tabOrder().slice(0, BAR_SLOTS).includes(active));
}
