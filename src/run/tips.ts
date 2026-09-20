export interface Tip {
  title: string;
  body: string[];
}

export const WEEK_TIPS: Record<number, Tip> = {
  1: {
    title: 'Pacing and shoes',
    body: [
      'Run slower than feels right. If you cannot say a short sentence out loud, ease off — the sixty seconds should end with you wanting more, not less.',
      'Any trainers with cushioning will do for week one. If you keep going past week three, a proper fitting at a running shop is the one purchase worth making.',
    ],
  },
  2: {
    title: 'Breathing',
    body: [
      'Breathe through mouth and nose together; there is no prize for nasal purity.',
      'Try a rhythm: in for three steps, out for two. The odd number keeps you from landing hard on the same foot every exhale.',
    ],
  },
  3: {
    title: 'The talk test',
    body: [
      'Your effort is right if you can speak a few words but not recite a paragraph.',
      'Heart-rate straps and watches are optional. Your own voice is the cheapest gauge you own.',
    ],
  },
  4: {
    title: 'Hills and routes',
    body: [
      'Flat and boring beats scenic and brutal while the legs are new. Save the hills for week seven.',
      'An out-and-back route has a useful honesty: the halfway point decides how far you went.',
    ],
  },
  5: {
    title: 'The twenty-minute run',
    body: [
      'Run three is twenty minutes with no walking. It looks impossible on paper and is not.',
      'Slow the first five minutes to a pace that feels almost silly. The run is won there.',
    ],
  },
  6: {
    title: 'Recovery and sleep',
    body: [
      'The fitness is built while you sleep, not while you run. Aim for a consistent bedtime in the weeks you are pushing.',
      'A rest day between runs is part of the plan, not a lapse in it.',
    ],
  },
  7: {
    title: 'Hydration and fuel',
    body: [
      'For runs under forty minutes you need nothing but water, and not much of that.',
      'Eat something small an hour or two before if morning running leaves you hollow. Test it on an easy day, never on a hard one.',
    ],
  },
  8: {
    title: 'Form check',
    body: [
      'Tall through the spine, shoulders low, hands loose. Imagine carrying a crisp in each hand.',
      'Aim for quick, light steps — around 170 a minute. Shorter strides, not faster legs.',
    ],
  },
  9: {
    title: 'Graduation, and then what',
    body: [
      'Thirty minutes of continuous running is a real thing to be able to do. Most people never get here.',
      'After this: keep three runs a week, add distance slowly, or pick one of the 5K+ plans. Nothing needs to get harder for a while.',
    ],
  },
};

export interface Move {
  name: string;
  how: string;
}

export const WARM_UP_MOVES: Move[] = [
  { name: 'Ankle rolls', how: 'Ten circles each way, each foot. Wake the joints before you load them.' },
  { name: 'Leg swings', how: 'Hold a wall, swing one leg forward and back ten times. Then the other.' },
  { name: 'Hip circles', how: 'Hands on hips, ten slow circles each way. Keep the ribs still.' },
  { name: 'Walking knee hugs', how: 'Ten steps, pulling each knee gently to your chest.' },
  { name: 'Heel flicks', how: 'Twenty light flicks, heel towards the backside, staying tall.' },
  { name: 'Brisk walk', how: 'Two minutes at a pace that makes you slightly warm. This is the real warm-up.' },
];

export const COOL_DOWN_MOVES: Move[] = [
  { name: 'Calf stretch', how: 'Back leg straight, heel down, lean into a wall. Thirty seconds each side.' },
  { name: 'Hamstring reach', how: 'Heel on the ground in front, hinge at the hips. Thirty seconds each side.' },
  { name: 'Quad stretch', how: 'Heel to backside, knees together, hips forward. Thirty seconds each side.' },
  { name: 'Hip flexor lunge', how: 'Half-kneeling, squeeze the back glute, thirty seconds each side.' },
  { name: 'Glute figure four', how: 'Ankle over the opposite knee, sit back gently. Thirty seconds each side.' },
  { name: 'Slow walk', how: 'Two minutes of nothing but walking and breathing. Let the heart rate come down.' },
];
