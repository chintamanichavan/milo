import { toast } from '../ui/toast';
import { petSvg } from './art';
import { amount, COMPANIONS } from './model';
import { chime } from './sound';
import { cupFor, drinkById, effectiveOn, goalToday, loadWater, logSip, undoLast } from './store';

/**
 * One tap, one cup: the pour the Fuel card and the More sheet share.
 * Must run inside a tap handler, so the drop can be heard on iOS.
 */
export function pour(drinkId?: string, oz?: number): void {
  const state = loadWater();
  const id = drinkId ?? state.settings.quick;
  const wasMet = effectiveOn(state) >= goalToday(state) - 0.05;
  const { sip, earned } = logSip(id, oz);
  const after = loadWater();
  if (state.settings.sound) chime(!wasMet && effectiveOn(after) >= goalToday(after) - 0.05 ? state.settings.cheer : state.settings.chime);
  const drink = drinkById(state, id);
  if (earned.length) toast(earned.join(' · '), true);
  else toast(`${amount(sip.oz, state.settings.unit)} ${drink.name.toLowerCase()}`);
}

export function takeBack(): void {
  const gone = undoLast();
  const state = loadWater();
  toast(gone ? `Took back ${amount(gone.oz, state.settings.unit)} ${drinkById(state, gone.drinkId).name.toLowerCase()}` : 'Nothing to undo');
}

/** the card at the top of Fuel's day: how full the companion is, and a cup to pour */
export function quickCardHtml(): string {
  const state = loadWater();
  const goal = goalToday(state);
  const drunk = effectiveOn(state);
  const unit = state.settings.unit;
  const drink = drinkById(state, state.settings.quick);
  const who = COMPANIONS.find((c) => c.id === state.settings.character)!;
  const left = Math.max(0, goal - drunk);
  return `<div class="panel wl-quick" id="waterCard">
    <a class="wl-quick-pet tap" href="#/water" aria-label="Open Water">${petSvg(state.settings.character, drunk / goal, 64, `${who.name}, ${Math.round((drunk / goal) * 100)} percent full`)}</a>
    <div class="wl-quick-text">
      <p class="tag">Water</p>
      <b class="mono">${amount(drunk, unit)} <span class="muted">of ${amount(goal, unit)}</span></b>
      <span class="line sub">${left > 0 ? `${amount(left, unit)} to go` : 'Goal met'}</span>
    </div>
    <div class="wl-quick-do">
      <button class="chip tap on" id="waterPour">+ ${amount(cupFor(state, drink.id), unit)} ${drink.name.toLowerCase()}</button>
      <button class="link tap" id="waterUndo">undo</button>
    </div>
  </div>`;
}

export function bindQuickCard(root: ParentNode, redraw: () => void): void {
  root.querySelector('#waterPour')?.addEventListener('click', () => {
    pour();
    redraw();
  });
  root.querySelector('#waterUndo')?.addEventListener('click', () => {
    takeBack();
    redraw();
  });
}
