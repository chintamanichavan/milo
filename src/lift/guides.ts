import { ALL_TEXT } from './guide-text';

/**
 * How to do every exercise, in plain words. The text lives in guide-text.ts;
 * breathing, reps and safety come from the movement family unless the
 * exercise says otherwise.
 */
export interface Guide {
  id: string;
  family: string;
  purpose: string;
  setup: string[];
  steps: string[];
  cues: string[];
  mistakes: { what: string; fix: string }[];
  numbers: string;
  breathing: string;
  reps: string;
  safety: string;
  first: string;
}

interface Family {
  breathing: string;
  reps: string;
  safety: string;
}

const FAMILIES: Record<string, Family> = {
  squat: {
    breathing: 'Big breath into the belly and brace at the top. Hold it on the way down. Breathe out as you pass the hardest part on the way up.',
    reps: 'Strength: 3–6 reps. Muscle: 6–12 reps. Lower in 2–3 seconds, stand up with intent. Rest 2–3 minutes.',
    safety: 'With a barbell, squat in a rack with the safety arms set just below your lowest point. Stop the set if your lower back rounds at the bottom.',
  },
  lunge: {
    breathing: 'Breathe in on the way down, out on the way up.',
    reps: '8–12 reps each leg. Lower in 2 seconds. Rest 1–2 minutes.',
    safety: 'Hold on to something the first few times if balance is shaky. Stop if the front knee hurts, rather than just burning.',
  },
  hinge: {
    breathing: 'Breathe in and brace before each rep. Hold it through the lift and breathe out at the top.',
    reps: 'Strength: 3–6 reps. Muscle: 6–10 reps. Lower in 2–3 seconds with control. Rest 2–3 minutes.',
    safety: 'Stop the set as soon as your lower back starts to round. During a flare of back pain, skip heavy hinges and ask a physio.',
  },
  glute: {
    breathing: 'Breathe out as you lift, in as you lower.',
    reps: '8–15 reps. Pause for one to two seconds at the top.',
    safety: 'If you feel it in your lower back rather than your glutes, lower the range and keep your ribs down.',
  },
  legmachine: {
    breathing: 'Breathe out as you push or curl, in as you return.',
    reps: '10–15 reps. Pause for a second at the hard end, return in 2–3 seconds.',
    safety: 'Set the machine to your body before you load it. Stop if the knee joint itself hurts.',
  },
  calf: {
    breathing: 'Breathe out as you rise, in as you lower.',
    reps: '10–20 reps. Pause a full second at the top and at the bottom.',
    safety: 'Build up slowly if you run a lot: calves and Achilles tendons adapt slowly.',
  },
  bodyweight: {
    breathing: 'Breathe in on the way down, out on the way up.',
    reps: '3–8 slow reps. Stop while every rep still looks the same.',
    safety: 'These are harder than they look. Build range and reps over several weeks.',
  },
  press: {
    breathing: 'Breathe in as you lower, hold briefly at the bottom, breathe out as you press.',
    reps: 'Strength: 3–6 reps. Muscle: 6–12 reps. Lower in 2 seconds, press with intent. Rest 2–3 minutes.',
    safety: 'With a barbell, use a spotter or safety arms. Do not press through sharp shoulder pain.',
  },
  pull: {
    breathing: 'Breathe out as you pull, in as you lower.',
    reps: '8–12 reps. Pull in 1 second, pause, lower in 2–3 seconds. Rest 1–2 minutes.',
    safety: 'Keep the lower back flat on any bent-over pull. Ease off if the elbow or shoulder joint hurts.',
  },
  arm: {
    breathing: 'Breathe out as you lift, in as you lower.',
    reps: '10–15 reps. Lift in 1 second, lower in 2–3 seconds. Rest about a minute.',
    safety: 'Light weights are plenty. Stop if the elbow joint hurts, rather than the muscle burning.',
  },
  raise: {
    breathing: 'Breathe out as you lift or squeeze, in as you return.',
    reps: '12–20 reps. Slow and smooth, no swinging. Rest about a minute.',
    safety: 'These muscles are small: go light. Stop if you feel a pinch in the front of the shoulder.',
  },
  hold: {
    breathing: 'Keep breathing in short, steady breaths while you hold the brace.',
    reps: 'Hold 20–45 seconds, or 8–12 slow reps, for 2–4 rounds. Stop when the position slips.',
    safety: 'Stop if you feel it in your lower back rather than your stomach.',
  },
  coremove: {
    breathing: 'Breathe out as you curl or reach, in as you return.',
    reps: '8–15 slow reps, or 6–10 each side. Stop when the movement gets sloppy.',
    safety: 'Stop if you feel it in your lower back rather than your stomach.',
  },
  balance: {
    breathing: 'Breathe slowly and steadily; holding your breath makes balance harder.',
    reps: '5–8 slow reps each side.',
    safety: 'Hold a wall or rack with one hand until you are steady.',
  },
  carry: {
    breathing: 'Breathe normally while you walk, keeping the brace.',
    reps: '20–40 metres or 30–60 seconds, 3–4 rounds. Rest until your grip is back.',
    safety: 'Pick the weight up and set it down with a flat back, as in a deadlift.',
  },
  power: {
    breathing: 'Breathe in and brace before each rep; breathe out at the finish.',
    reps: '3–6 fast reps. Rest fully between sets. Stop the set when the speed drops.',
    safety: 'Learn it light, ideally with a coach. Clear the space around you. Skip it when you are very tired.',
  },
  plyo: {
    breathing: 'Breathe out as you jump.',
    reps: '3–6 jumps, or 10–20 small hops, per set. Rest fully; quality beats count.',
    safety: 'Land softly with bent knees. Step down rather than jumping down. Build up over weeks.',
  },
  cardio: {
    breathing: 'Breathe steadily. On easy efforts you should still manage short sentences.',
    reps: 'Intervals: 20–40 seconds hard, 1–2 minutes easy, 5–10 rounds. Steady: 10–30 minutes.',
    safety: 'Warm up for 5 minutes first. Stop at once if you feel dizzy or have chest pain.',
  },
};

let cache: Map<string, Guide> | null = null;

function parse(): Map<string, Guide> {
  const out = new Map<string, Guide>();
  for (const block of ALL_TEXT.split(/\n(?=#)/)) {
    const lines = block.trim().split('\n');
    const head = lines[0].match(/^#(\S+)\s+a:(\S+)/);
    if (!head) continue;
    const [, id, family] = head;
    const f = FAMILIES[family] ?? FAMILIES.press;
    const field = (k: string): string => lines.find((l) => l.startsWith(`${k}: `))?.slice(k.length + 2).trim() ?? '';
    const list = (k: string): string[] => field(k).split(' | ').map((x) => x.trim()).filter(Boolean);
    out.set(id, {
      id,
      family,
      purpose: field('p'),
      setup: list('s'),
      steps: list('e'),
      cues: list('c'),
      mistakes: list('m').map((m) => {
        const [what, fix] = m.split(' > ');
        return { what: what.trim(), fix: (fix ?? '').trim() };
      }),
      numbers: field('n'),
      breathing: field('b') || f.breathing,
      reps: field('r') || f.reps,
      safety: field('x') || f.safety,
      first: field('f'),
    });
  }
  return out;
}

export function guideFor(id: string): Guide | undefined {
  cache ??= parse();
  return cache.get(id);
}

export function allGuides(): Map<string, Guide> {
  cache ??= parse();
  return cache;
}
