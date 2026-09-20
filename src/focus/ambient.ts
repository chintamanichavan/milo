import { loadFocus } from './store';

type Sound = 'off' | 'cabin' | 'rain' | 'cafe';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let nodes: AudioNode[] = [];
let playing: Sound = 'off';

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
  if (master) master.gain.value = volume;
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
