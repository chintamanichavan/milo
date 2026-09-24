import { sheet } from './sheet';

export type Tab = 'run' | 'lift' | 'focus' | 'cook' | 'fuel' | 'habits';

const G = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS: Record<Tab | 'more' | 'settings', string> = {
  run: G('<path d="M13.5 4.5a1.2 1.2 0 1 0 0-.1"/><path d="M9 21l2.5-5 3-2-1-4-3.5 2-2 3"/><path d="M14.5 10l3 1.5 2.5-1"/>'),
  lift: G('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'),
  focus: G('<path d="M3 13l18-7-7 18-2.5-7z"/>'),
  cook: G('<path d="M7 3v8a3 3 0 0 0 6 0V3M10 11v10"/><path d="M17 3c-1.5 2-2 4-2 6h4c0-2-.5-4-2-6zM17 9v12"/>'),
  fuel: G('<path d="M12 21a7 7 0 0 0 7-7c0-4-3-6.5-4.5-10C13 6 12 7.5 12 9c0-1.5-1-3-2.5-5C8 7.5 5 10 5 14a7 7 0 0 0 7 7z"/>'),
  habits: G('<path d="M4 12l5 5L20 6"/><path d="M4 19h16"/>'),
  more: G('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  settings: G('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>'),
};

const LINKS: { id: Tab; label: string; href: string }[] = [
  { id: 'run', label: 'Run', href: '#/' },
  { id: 'lift', label: 'Lift', href: '#/lift' },
  { id: 'focus', label: 'Focus', href: '#/focus' },
  { id: 'cook', label: 'Cook', href: '#/cook' },
  { id: 'fuel', label: 'Fuel', href: '#/fuel' },
  { id: 'habits', label: 'Habits', href: '#/habits' },
];

/** phone: five across the bottom, the sixth behind More. wide: a rail on the left. */
const PHONE_ORDER: Tab[] = ['run', 'lift', 'focus', 'fuel'];

const tab = (id: string, label: string, href: string, active: boolean): string =>
  `<a class="navtab${active ? ' on' : ''}" href="${href}" aria-label="${label}"
    ${active ? 'aria-current="page"' : ''}>${ICONS[id as Tab]}<span>${label}</span></a>`;

export function mountNav(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'tabbar';
  nav.innerHTML = `
    <div class="bar-phone">
      ${PHONE_ORDER.map((id) => {
        const link = LINKS.find((l) => l.id === id)!;
        return tab(link.id, link.label, link.href, false);
      }).join('')}
      <button class="navtab" id="moreTab" aria-label="More">${ICONS.more}<span>More</span></button>
    </div>
    <div class="bar-wide">
      ${LINKS.map((l) => tab(l.id, l.label, l.href, false)).join('')}
      ${tab('settings', 'Settings', '#/run/settings', false)}
    </div>`;
  document.body.appendChild(nav);
  nav.querySelector('#moreTab')!.addEventListener('click', () => {
    const host = sheet(
      'More',
      `<div class="cards">
        <a class="card tap" href="#/cook">${ICONS.cook}<b>Cook</b><span class="tag">recipes</span></a>
        <a class="card tap" href="#/habits">${ICONS.habits}<b>Habits</b><span class="tag">daily votes</span></a>
        <a class="card tap" href="#/run/settings">${ICONS.settings}<b>Settings</b><span class="tag">everything else</span></a>
      </div>
      <p class="muted mono" style="margin-top:16px;font-size:12px">build ${__BUILD__} · <img src="/apple-touch-icon-v4.png" alt="" width="18" height="18" style="vertical-align:middle;border-radius:4px"> icon v4 (llama)</p>`,
    );
    host.querySelector('.cards')!.addEventListener('click', () => setTimeout(() => host.remove(), 180));
  });
  return nav;
}

export function setActiveTab(active: Tab): void {
  for (const el of document.querySelectorAll<HTMLElement>('.tabbar .navtab')) {
    const label = el.querySelector('span')?.textContent?.toLowerCase() ?? '';
    el.classList.toggle('on', label === active);
  }
  const more = document.querySelector('#moreTab');
  more?.classList.toggle('on', active === 'cook' || active === 'habits');
}
