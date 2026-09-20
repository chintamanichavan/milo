/** A bottom sheet on a phone, a centred panel on a wide screen. */
export function sheet(title: string, body: string): HTMLElement {
  const host = document.createElement('div');
  host.className = 'sheet-host';
  host.innerHTML = `<div class="sheet-back"></div>
    <div class="sheet" role="dialog" aria-label="${title}">
      <header><span class="tag">${title}</span>
        <button class="link tap" data-close="1">Close</button></header>
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.appendChild(host);
  requestAnimationFrame(() => host.classList.add('open'));
  const close = (): void => {
    host.classList.remove('open');
    setTimeout(() => host.remove(), 200);
  };
  host.querySelector('.sheet-back')!.addEventListener('click', close);
  host.querySelector('[data-close]')!.addEventListener('click', close);
  host.addEventListener('keydown', (ev) => {
    if ((ev as KeyboardEvent).key === 'Escape') close();
  });
  (host as unknown as Closable).close = close;
  return host;
}

interface Closable {
  close: () => void;
}

export const closeSheet = (host: HTMLElement): void => (host as unknown as Closable).close();
