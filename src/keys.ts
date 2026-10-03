/**
 * Every storage key in one tiny module, so the export can name them all
 * without pulling each tab's code into the first paint.
 */
export const RUN_KEY = 'c25k.v1';
export const LIFT_KEY = 'c25k.lift.v1';
/**
 * The Focus, Cook, Fuel and Habits tabs are gone; backups still carry their old data so it is
 * never lost. FUEL_KEY also still holds the weigh-ins (see body/weight).
 */
export const FOCUS_KEY = 'c25k.focus.v1';
export const COOK_KEY = 'c25k.cook.v1';
export const FUEL_KEY = 'c25k.fuel.v1';
export const HABITS_KEY = 'c25k.habits.v1';
export const WATER_KEY = 'c25k.water.v1';
export const TABS_KEY = 'c25k.nav.v1';
export const BODY_KEY = 'c25k.body.v1';
/**
 * HEALTH's small half: last import, coverage, settings. The days and workouts
 * live in IndexedDB and come back from the Apple Health zip, not from a backup.
 */
export const HEALTH_KEY = 'c25k.health.v1';
