import { load } from './store';

/** dark/light override from settings, applied before the first paint */
export function applyTheme(): void {
  const { theme } = load().settings;
  document.documentElement.dataset.theme = theme === 'auto' ? '' : theme;
}
