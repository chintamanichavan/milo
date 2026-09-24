import type { MusicTrack } from './store';

/**
 * Four pieces of focus music, generated on the spot: a lo-fi pad, slow piano
 * plucks, a brown-noise wash and a binaural beat. Nothing is downloaded, and
 * they sit under the cabin sounds on their own volume.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let live: AudioNode[] = [];
let timers: number[] = [];
let playing: MusicTrack = 'off';

// a gentle progression, and a pentatonic scale for the piano
const CHORDS = [
  [220, 261.63, 329.63, 392],
  [174.61, 220, 261.63, 329.63],
  [196, 246.94, 293.66, 369.99],
  [164.81, 207.65, 246.94, 329.63],
];
const PENTATONIC = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];

function context(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = ctx ?? new Ctor();
  void ctx.resume();
  return ctx;
}

function brown(c: AudioContext): AudioBufferSourceNode {
  const length = c.sampleRate * 4;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.2;
  }
  const node = c.createBufferSource();
  node.buffer = buffer;
  node.loop = true;
  return node;
}

export function startMusic(track: MusicTrack, volume: number): void {
  stopMusic();
  if (track === 'off') return;
  const c = context();
  if (!c) return;
  master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);
  playing = track;
  const out = master;

  if (track === 'lofi') {
    // four soft voices, slightly detuned, through a warm filter; the chord moves every six seconds
    const warm = c.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 900;
    warm.connect(out);
    const voices = CHORDS[0].map((f, i) => {
      const osc = c.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 6;
      const gain = c.createGain();
      gain.gain.value = 0.05;
      osc.connect(gain).connect(warm);
      osc.start();
      live.push(osc);
      return osc;
    });
    // and a little vinyl crackle
    const crackle = brown(c);
    const hiss = c.createBiquadFilter();
    hiss.type = 'highpass';
    hiss.frequency.value = 3000;
    const hissGain = c.createGain();
    hissGain.gain.value = 0.025;
    crackle.connect(hiss).connect(hissGain).connect(out);
    crackle.start();
    live.push(crackle);
    let step = 0;
    timers.push(
      window.setInterval(() => {
        step = (step + 1) % CHORDS.length;
        CHORDS[step].forEach((f, i) => voices[i].frequency.setTargetAtTime(f, c.currentTime, 0.6));
      }, 6000),
    );
  } else if (track === 'piano') {
    // plucked notes that ring and fade, never quite in a pattern
    const room = c.createBiquadFilter();
    room.type = 'lowpass';
    room.frequency.value = 2600;
    room.connect(out);
    const pluck = (): void => {
      const t = c.currentTime + 0.02;
      const f = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      for (const [mult, level] of [
        [1, 0.16],
        [2, 0.04],
        [3, 0.015],
      ] as const) {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * mult;
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(level, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        osc.connect(gain).connect(room);
        osc.start(t);
        osc.stop(t + 2.5);
      }
    };
    pluck();
    const again = (): void => {
      pluck();
      if (Math.random() < 0.3) window.setTimeout(pluck, 180);
      timers.push(window.setTimeout(again, 700 + Math.random() * 1400));
    };
    timers.push(window.setTimeout(again, 900));
  } else if (track === 'brown') {
    const wash = brown(c);
    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    const gain = c.createGain();
    gain.gain.value = 0.9;
    wash.connect(low).connect(gain).connect(out);
    wash.start();
    live.push(wash);
  } else if (track === 'binaural') {
    // 200 Hz in one ear, 210 in the other: a ten-beat shimmer, best on headphones
    for (const [f, pan] of [
      [200, -1],
      [210, 1],
    ] as const) {
      const osc = c.createOscillator();
      osc.frequency.value = f;
      const gain = c.createGain();
      gain.gain.value = 0.09;
      const panner = c.createStereoPanner();
      panner.pan.value = pan;
      osc.connect(gain).connect(panner).connect(out);
      osc.start();
      live.push(osc);
    }
    const bed = brown(c);
    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 300;
    const bedGain = c.createGain();
    bedGain.gain.value = 0.25;
    bed.connect(low).connect(bedGain).connect(out);
    bed.start();
    live.push(bed);
  }
}

export function setMusicVolume(volume: number): void {
  if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
}

export function stopMusic(): void {
  for (const t of timers) {
    clearInterval(t);
    clearTimeout(t);
  }
  timers = [];
  for (const node of live) {
    try {
      (node as AudioScheduledSourceNode).stop();
    } catch {
      /* already stopped */
    }
    node.disconnect();
  }
  live = [];
  master?.disconnect();
  master = null;
  playing = 'off';
}

export const musicPlaying = (): MusicTrack => playing;
