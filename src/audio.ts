import { load } from './run/store';

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

type Note = [freq: number, startMs: number, lenMs: number, gain?: number];

const PATTERNS: Record<string, Note[]> = {
  run: [[740, 0, 110], [1109, 120, 220]],
  walk: [[622, 0, 130], [466, 140, 240]],
  halfway: [[880, 0, 90], [880, 160, 90]],
  done: [[659, 0, 150], [880, 170, 150], [1319, 340, 480]],
  tick: [[1046, 0, 45, 0.12]],
  step: [[1568, 0, 22, 0.07]],
  takeoff: [[523, 0, 140, 0.18], [784, 150, 300, 0.18]],
  chime: [[988, 0, 220, 0.16]],
  landing: [[784, 0, 150], [1047, 160, 150], [1319, 320, 460]],
  go: [[880, 0, 90], [1319, 100, 320]],
};

export function beep(pattern: keyof typeof PATTERNS): void {
  if (!ctx || !load().settings.beep) return;
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, startMs, lenMs, gainTo = 0.28] of PATTERNS[pattern]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = t0 + startMs / 1000;
    const end = start + lenMs / 1000;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainTo, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  }
}

export interface Voice {
  id: string;
  rate: number;
  pitch: number;
}

/** Speech carries over music better than beeps, so it rides a little louder. */
export function say(text: string, persona?: Voice): void {
  const { voice, beepsOnly, voices } = load().settings;
  if (!voice || beepsOnly || !('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = persona?.rate ?? 1;
  utter.pitch = persona?.pitch ?? 1;
  utter.volume = 1;
  const wanted = persona ? voices?.[persona.id] : undefined;
  if (wanted) {
    const match = speechSynthesis.getVoices().find((v) => v.voiceURI === wanted);
    if (match) utter.voice = match;
  }
  speechSynthesis.speak(utter);
}

let metro = 0;

/** A quiet click at a cadence, for the rhythm runs. */
export function metronome(bpm: number): void {
  stopMetronome();
  if (!load().settings.beep) return;
  metro = window.setInterval(() => beep('step'), Math.round(60_000 / bpm));
}

export function stopMetronome(): void {
  clearInterval(metro);
  metro = 0;
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
