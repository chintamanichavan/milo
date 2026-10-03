import { toast } from '../ui/toast';
import { amount } from './model';
import { chime } from './sound';
import { drinkById, effectiveOn, goalToday, loadWater, logSip, undoLast } from './store';

/**
 * One tap, one cup: the pour behind the More sheet.
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
