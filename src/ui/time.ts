export function clock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "1:05:30" for anything past an hour */
export function longClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  return h
    ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : clock(s);
}

/** Spoken and written length: "90 seconds", "5 minutes". */
export function spellDuration(sec: number): string {
  if (sec < 120) return `${sec} seconds`;
  const min = sec / 60;
  return `${Number.isInteger(min) ? min : min.toFixed(1)} minutes`;
}

/** Short written length: 90″ or 5′ */
export function shortDuration(sec: number): string {
  return sec < 120 ? `${sec}″` : `${+(sec / 60).toFixed(1)}′`;
}

export const dayKey = (d: Date | string = new Date()): string =>
  new Date(d).toLocaleDateString('en-CA');
