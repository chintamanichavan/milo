/** its own module, so the Run home does not load every Run page to draw its tabs */
export function runSubNav(active: string): string {
  const link = (id: string, label: string): string =>
    `<a class="subtab tap${active === id ? ' on' : ''}" href="#/${id ? `run/${id}` : ''}">${label}</a>`;
  return `<nav class="subnav">${link('', 'Today')}${link('history', 'History')}${link(
    'tips',
    'Tips',
  )}${link('plans', 'Plans')}${link('settings', 'Settings')}</nav>`;
}
