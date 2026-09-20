import { spellDuration } from '../ui/time';

export type CueKind = 'takeoff' | 'run' | 'walk' | 'halfway' | 'last' | 'cool' | 'finish';

export interface Persona {
  id: string;
  name: string;
  blurb: string;
  rate: number;
  pitch: number;
  lines: Record<CueKind, ((sec: number) => string)[]>;
  weekIntro: (week: number) => string;
}

const plain = (s: string) => () => s;

export const PERSONAS: Persona[] = [
  {
    id: 'steady',
    name: 'Steady',
    blurb: 'Calm, few words, gets out of the way.',
    rate: 0.98,
    pitch: 1,
    lines: {
      takeoff: [plain('Warm up. Walk for five minutes.'), plain('Five minutes of walking to start.')],
      run: [
        (s) => `Run for ${spellDuration(s)}.`,
        (s) => `Easy run now, ${spellDuration(s)}.`,
        (s) => `Start running. ${spellDuration(s)}.`,
      ],
      walk: [
        (s) => `Walk for ${spellDuration(s)}.`,
        (s) => `Walk it out, ${spellDuration(s)}.`,
        (s) => `Recover. ${spellDuration(s)} of walking.`,
      ],
      halfway: [plain('Halfway.'), plain('Halfway through.')],
      last: [(s) => `Last one. ${spellDuration(s)}.`, (s) => `Final run, ${spellDuration(s)}.`],
      cool: [plain('Cool down. Walk for five minutes.'), plain('Cool down now. Nice and easy.')],
      finish: [plain('Done. Nice work.'), plain('That is the run. Well done.')],
    },
    weekIntro: (w) => `Week ${w}. Same as last time, one step further.`,
  },
  {
    id: 'hype',
    name: 'Hype',
    blurb: 'Loud, warm, thinks you are magnificent.',
    rate: 1.08,
    pitch: 1.15,
    lines: {
      takeoff: [plain('Here we go. Five minutes of walking, wake those legs up.')],
      run: [
        (s) => `Run. ${spellDuration(s)}. You have got this.`,
        (s) => `Off you go, ${spellDuration(s)} of running. Light feet.`,
        (s) => `This is your bit. ${spellDuration(s)}. Go.`,
      ],
      walk: [
        (s) => `Beautiful. Walk ${spellDuration(s)} and enjoy it.`,
        (s) => `Shake it out. ${spellDuration(s)} walking.`,
        (s) => `Breathe. ${spellDuration(s)} of walking, you earned it.`,
      ],
      halfway: [plain('Halfway. You are flying.'), plain('Half done. Look at you.')],
      last: [
        (s) => `Last one. ${spellDuration(s)}. Finish it.`,
        (s) => `Final effort. ${spellDuration(s)}. Empty the tank.`,
      ],
      cool: [plain('Cool down. Five minutes to feel smug.')],
      finish: [plain('Done. That was brilliant.'), plain('Finished. Take the win.')],
    },
    weekIntro: (w) => `Week ${w}. Big week. You are going to love this one.`,
  },
  {
    id: 'dry',
    name: 'Dry',
    blurb: 'Deadpan. Mildly amused by the whole thing.',
    rate: 0.95,
    pitch: 0.92,
    lines: {
      takeoff: [plain('Five minutes of walking. Try to look serious.')],
      run: [
        (s) => `Running now. ${spellDuration(s)}. Sorry.`,
        (s) => `${spellDuration(s)} of running. It will pass.`,
        (s) => `Jog. ${spellDuration(s)}. Nobody is watching.`,
      ],
      walk: [
        (s) => `Walk for ${spellDuration(s)}. Enjoy your brief retirement.`,
        (s) => `${spellDuration(s)} of walking. Use it wisely.`,
        (s) => `Walking. ${spellDuration(s)}. Pretend it was your idea.`,
      ],
      halfway: [plain('Halfway. Statistically, you will survive.')],
      last: [(s) => `Last one. ${spellDuration(s)}. Then you may stop.`],
      cool: [plain('Cool down. Five minutes of walking, and a small sense of achievement.')],
      finish: [plain('Done. You may tell people about this.')],
    },
    weekIntro: (w) => `Week ${w}. The plan says this is reasonable. The plan is usually right.`,
  },
  {
    id: 'pro',
    name: 'Pro',
    blurb: 'Technique: posture, cadence, breathing.',
    rate: 1,
    pitch: 0.98,
    lines: {
      takeoff: [plain('Warm-up walk, five minutes. Tall posture, relaxed shoulders.')],
      run: [
        (s) => `Run ${spellDuration(s)}. Short strides, quick feet, land under your hips.`,
        (s) => `${spellDuration(s)} running. Breathe in for three steps, out for two.`,
        (s) => `Running ${spellDuration(s)}. Eyes up the road, arms loose at ninety degrees.`,
      ],
      walk: [
        (s) => `Walk ${spellDuration(s)}. Long exhale, drop the shoulders.`,
        (s) => `${spellDuration(s)} walking. Keep moving, keep the rhythm.`,
      ],
      halfway: [plain('Halfway. Check your form: tall, light, quiet feet.')],
      last: [(s) => `Last effort, ${spellDuration(s)}. Cadence up, stride the same.`],
      cool: [plain('Cool down, five minutes. Let the heart rate come down slowly.')],
      finish: [plain('Done. Walk a little more, then stretch the calves and hips.')],
    },
    weekIntro: (w) => `Week ${w}. Focus this week: hold an even effort, not an even pace.`,
  },
];

export const personaById = (id: string): Persona =>
  PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];

const lastIndex = new Map<string, number>();

/** Rotates through the variants, never repeating the previous one. */
export function cueLine(persona: Persona, kind: CueKind, sec = 0): string {
  const options = persona.lines[kind];
  if (options.length === 1) return options[0](sec);
  const key = `${persona.id}:${kind}`;
  const before = lastIndex.get(key) ?? -1;
  let next = Math.floor(Math.random() * options.length);
  if (next === before) next = (next + 1) % options.length;
  lastIndex.set(key, next);
  return options[next](sec);
}
