let timer = 0;

/** Slides up, says one thing, leaves. */
export function toast(message: string, accent = false): void {
  let el = document.querySelector<HTMLElement>('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('accent', accent);
  el.classList.remove('up');
  void el.offsetWidth;
  el.classList.add('up');
  clearTimeout(timer);
  timer = window.setTimeout(() => el?.classList.remove('up'), 2000);
}
