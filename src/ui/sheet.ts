/** A bottom sheet on a phone, a centred panel on a wide screen. */
export function sheet(title: string, body: string): HTMLElement {
  const host = document.createElement('div');
  host.className = 'sheet-host';
  host.innerHTML = `<div class="sheet-back"></div>
    <div class="sheet" role="dialog" aria-label="${title}" tabindex="-1">
      <header><span class="tag">${title}</span>
        <button class="link tap" data-close="1">Close</button></header>
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.appendChild(host);
  requestAnimationFrame(() => {
    host.classList.add('open');
    // focus comes into the sheet, so Escape and the keyboard land here
    if (!host.contains(document.activeElement))
      host.querySelector<HTMLElement>('.sheet')?.focus({ preventScroll: true });
  });
  const close = (): void => {
    host.classList.remove('open');
    setTimeout(() => host.remove(), 200);
  };
  host.querySelector('.sheet-back')!.addEventListener('click', close);
  host.querySelector('[data-close]')!.addEventListener('click', close);
  // anything marked data-done closes the sheet after its own handler has run
  host.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('[data-done]')) setTimeout(close, 0);
  });
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
