/** Wall-clock time, so a backgrounded tab never drifts.
 *  The offset only moves when the test hook fast-forwards it. */
let offsetMs = 0;
let onAdvance: (() => void) | null = null;

export const now = (): number => Date.now() + offsetMs;

export function advance(ms: number): void {
  offsetMs += ms;
  onAdvance?.();
}

export function whenAdvanced(fn: (() => void) | null): void {
  onAdvance = fn;
}
