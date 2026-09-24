import { playNotes, unlockAudio, type Note } from '../audio';

/** eight little sounds, made on the spot rather than downloaded */
export const CHIMES: { id: string; name: string; notes: Note[]; wave?: OscillatorType }[] = [
  { id: 'drop', name: 'Drop', notes: [[1175, 0, 40, 0.1], [1568, 45, 70, 0.08]] },
  { id: 'bubble', name: 'Bubble', notes: [[523, 0, 60, 0.12], [784, 50, 60, 0.1], [1046, 100, 90, 0.08]] },
  { id: 'glass', name: 'Glass', notes: [[2093, 0, 260, 0.07], [2637, 10, 220, 0.04]] },
  { id: 'pluck', name: 'Pluck', notes: [[660, 0, 120, 0.14]], wave: 'triangle' },
  { id: 'marimba', name: 'Marimba', notes: [[784, 0, 110, 0.14], [988, 120, 160, 0.12]], wave: 'triangle' },
  { id: 'bell', name: 'Bell', notes: [[1318, 0, 420, 0.08], [1976, 0, 300, 0.03]] },
  { id: 'fanfare', name: 'Fanfare', notes: [[523, 0, 120, 0.14], [659, 130, 120, 0.14], [784, 260, 120, 0.14], [1046, 390, 360, 0.16]], wave: 'triangle' },
  { id: 'rise', name: 'Rise', notes: [[392, 0, 90, 0.1], [523, 80, 90, 0.1], [659, 160, 90, 0.1], [784, 240, 90, 0.1], [988, 320, 220, 0.1]] },
];

/** must run inside a tap, or iOS stays silent */
export function chime(id: string): void {
  unlockAudio();
  const sound = CHIMES.find((c) => c.id === id) ?? CHIMES[0];
  playNotes(sound.notes, true, sound.wave);
}
