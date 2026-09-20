import { loadFocus } from './store';

export type Sound = 'off' | 'cabin' | 'rain' | 'cafe' | 'engine';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let playing: Sound = 'off';
let engine: { low: BiquadFilterNode; whine: GainNode; osc: OscillatorNode } | null = null;
let ducked = false;

function noiseBuffer(context: AudioContext, brown: boolean): AudioBuffer {
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else data[i] = white;
  }
  return buffer;
}

function source(context: AudioContext, brown: boolean): AudioBufferSourceNode {
  const node = context.createBufferSource();
  node.buffer = noiseBuffer(context, brown);
  node.loop = true;
  return node;
}

/** Three synthesised loops — no audio files, nothing to download. */
export function startAmbient(sound: Sound, volume: number): void {
  stopAmbient();
  if (sound === 'off') return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  ctx = ctx ?? new Ctor();
  void ctx.resume();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  playing = sound;

  if (sound === 'cabin') {
    const hum = source(ctx, true);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 220;
    const air = source(ctx, false);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 600;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.08;
    hum.connect(low).connect(master);
    air.connect(band).connect(airGain).connect(master);
    hum.start();
    air.start();
    nodes = [hum, air];
  } else if (sound === 'rain') {
    const drops = source(ctx, false);
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 900;
    const shimmer = ctx.createGain();
    shimmer.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.18;
    lfo.connect(lfoGain).connect(shimmer.gain);
    drops.connect(high).connect(shimmer).connect(master);
    drops.start();
    lfo.start();
    nodes = [drops, lfo];
  } else if (sound === 'engine') {
    const roar = source(ctx, true);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 160;
    const whine = ctx.createOscillator();
    whine.type = 'sawtooth';
    whine.frequency.value = 92;
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0.02;
    roar.connect(low).connect(master);
    whine.connect(whineGain).connect(master);
    roar.start();
    whine.start();
    engine = { low, whine: whineGain, osc: whine };
    nodes = [roar, whine];
  } else {
    const murmur = source(ctx, true);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 700;
    const room = source(ctx, false);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400;
    band.Q.value = 0.8;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.05;
    const sway = ctx.createOscillator();
    sway.frequency.value = 0.15;
    const swayGain = ctx.createGain();
    swayGain.gain.value = 0.25;
    sway.connect(swayGain).connect(low.gain ?? roomGain.gain);
    murmur.connect(low).connect(master);
    room.connect(band).connect(roomGain).connect(master);
    murmur.start();
    room.start();
    sway.start();
    nodes = [murmur, room, sway];
  }
}

export function setAmbientVolume(volume: number): void {
  if (master) master.gain.value = ducked ? volume * 0.35 : volume;
}

/** engines are loud on the roll and soft at altitude */
export function setEnginePower(power: number): void {
  if (!engine || !ctx) return;
  engine.low.frequency.setTargetAtTime(120 + power * 220, ctx.currentTime, 0.4);
  engine.whine.gain.setTargetAtTime(0.012 + power * 0.05, ctx.currentTime, 0.4);
  engine.osc.frequency.setTargetAtTime(70 + power * 90, ctx.currentTime, 0.4);
}

/** the cabin drops away while the captain talks */
export function duckAmbient(on: boolean, volume: number): void {
  ducked = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? volume * 0.3 : volume, ctx.currentTime, 0.2);
}

export function stopAmbient(): void {
  for (const node of nodes) {
    try {
      (node as AudioScheduledSourceNode).stop();
    } catch {
      /* already stopped */
    }
    node.disconnect();
  }
  nodes = [];
  engine = null;
  master?.disconnect();
  master = null;
  playing = 'off';
}

export const ambientPlaying = (): Sound => playing;

/** what the settings say, when a flight begins */
export function startAmbientFromSettings(): void {
  const { ambient } = loadFocus().settings;
  if (ambient.sound !== 'off') startAmbient(ambient.sound, ambient.volume);
}
