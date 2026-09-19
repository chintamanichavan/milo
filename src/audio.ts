import { load } from './store';

let ctx: AudioContext | null = null;

/** Must be called from inside a tap handler, or iOS stays silent. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (Ctor) ctx = new Ctor();
  }
  void ctx?.resume();
  if (load().settings.voice && 'speechSynthesis' in window) {
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0;
    speechSynthesis.speak(warm);
  }
}

type Note = [freq: number, startMs: number, lenMs: number];

const PATTERNS: Record<string, Note[]> = {
  run: [[740, 0, 110], [1109, 120, 220]],
  walk: [[622, 0, 130], [466, 140, 240]],
  halfway: [[880, 0, 90], [880, 160, 90]],
  done: [[659, 0, 150], [880, 170, 150], [1319, 340, 480]],
};

export function beep(pattern: keyof typeof PATTERNS): void {
  if (!ctx || !load().settings.beep) return;
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, startMs, lenMs] of PATTERNS[pattern]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = t0 + startMs / 1000;
    const end = start + lenMs / 1000;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  }
}

export function say(text: string): void {
  if (!load().settings.voice || !('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  speechSynthesis.speak(utter);
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
