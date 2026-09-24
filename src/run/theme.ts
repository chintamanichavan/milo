import { load } from './store';

/** dark/light override from settings, applied before the first paint */
export function applyTheme(): void {
  const { theme, accent } = load().settings;
  document.documentElement.dataset.theme = theme === 'auto' ? '' : theme;
  // lime is the tokens themselves; any other accent is drawn over them
  if (accent && accent !== 'lime') document.documentElement.dataset.accent = accent;
  else delete document.documentElement.dataset.accent;
}

export const ACCENTS: { id: string; name: string; swatch: string }[] = [
  { id: 'lime', name: 'lime', swatch: '#c5f74f' },
  { id: 'coral', name: 'coral', swatch: '#ff7a59' },
  { id: 'amber', name: 'amber', swatch: '#fbbf24' },
  { id: 'sky', name: 'sky', swatch: '#60a5fa' },
  { id: 'rose', name: 'rose', swatch: '#f472b6' },
  { id: 'violet', name: 'violet', swatch: '#a78bfa' },
];
