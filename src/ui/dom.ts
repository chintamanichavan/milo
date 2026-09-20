/** Writes only when the value really changed — the cheapest frame is the one that does nothing. */
export function setText(el: Element | null | undefined, value: string): void {
  if (el && el.textContent !== value) el.textContent = value;
}

/** Same idea for a style property, using the CSS property name. */
export function setStyle(el: HTMLElement | null | undefined, prop: string, value: string): void {
  if (!el) return;
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}
