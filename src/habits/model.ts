export type Schedule =
  | { kind: 'daily' }
  | { kind: 'days'; days: number[] }
  | { kind: 'times'; perWeek: number };

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  /** who this is a vote for */
  identity: string;
  behaviour: string;
  time: string;
  place: string;
  /** "After I make coffee, I will…" */
  anchor?: string;
  tiny: string;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  laws?: { cue?: string; craving?: string; response?: string; reward?: string };
  reminder?: string;
  archived?: boolean;
  paused?: { from: string; to: string };
  order: number;
  /** a habit you are quitting, counted in clean days */
  avoid?: boolean;
  inversion?: string;
  /** a number to reach each day, like eight glasses; one if left out */
  target?: number;
  unit?: string;
  /** minutes of focus that count as doing it, launched as a Focus flight */
  focusMin?: number;
}

/** partial: some of a numeric goal, not all of it yet */
export type Mark = 'done' | 'tiny' | 'skip' | 'slip' | 'partial';

export interface Entry {
  habitId: string;
  date: string;
  mark: Mark;
  reason?: string;
  note?: string;
  /** how many, for a habit with a number to reach */
  count?: number;
}

export interface Reflection {
  date: string;
  went: string;
  blocked: string;
  change: string;
  proud: string;
}

export interface HabitState {
  habits: Habit[];
  entries: Entry[];
  reflections: Reflection[];
  readLessons: string[];
  lessonDay?: string;
}

/** The plain-words version of the four laws. */
export const LAWS = [
  { key: 'cue', name: 'Make it obvious', line: 'Put the cue where you cannot miss it.' },
  { key: 'craving', name: 'Make it attractive', line: 'Tie it to something you already want.' },
  { key: 'response', name: 'Make it easy', line: 'Shrink it until starting is trivial.' },
  { key: 'reward', name: 'Make it satisfying', line: 'End with something that feels good.' },
] as const;

export const INVERSIONS = [
  'Make it invisible — move the cue out of reach.',
  'Make it unattractive — write down what it really costs you.',
  'Make it difficult — add steps between you and it.',
  'Make it unsatisfying — tell someone who will ask.',
];

export interface Template {
  identity: string;
  behaviour: string;
  time: string;
  place: string;
  tiny: string;
  timeOfDay: TimeOfDay;
  category: string;
}

export const TEMPLATES: Template[] = [
  { category: 'health', identity: 'a runner', behaviour: 'run for twenty minutes', time: '07:00', place: 'the park', tiny: 'put my running shoes on', timeOfDay: 'morning' },
  { category: 'health', identity: 'someone who lifts', behaviour: 'do one lifting session', time: '18:00', place: 'the gym', tiny: 'pack my gym bag', timeOfDay: 'evening' },
  { category: 'health', identity: 'a person who sleeps well', behaviour: 'be in bed with the lights off', time: '23:00', place: 'the bedroom', tiny: 'put my phone on the charger across the room', timeOfDay: 'evening' },
  { category: 'health', identity: 'someone who stays hydrated', behaviour: 'drink a full glass of water', time: '08:00', place: 'the kitchen', tiny: 'fill the glass', timeOfDay: 'morning' },
  { category: 'health', identity: 'a person who stretches', behaviour: 'stretch for five minutes', time: '21:30', place: 'the living room floor', tiny: 'sit on the floor', timeOfDay: 'evening' },
  { category: 'health', identity: 'someone who walks daily', behaviour: 'walk for half an hour', time: '12:30', place: 'the block', tiny: 'step outside the door', timeOfDay: 'afternoon' },
  { category: 'health', identity: 'a person who cooks', behaviour: 'cook dinner from scratch', time: '19:00', place: 'the kitchen', tiny: 'chop one onion', timeOfDay: 'evening' },
  { category: 'health', identity: 'someone who eats enough protein', behaviour: 'eat a protein-first breakfast', time: '08:30', place: 'the kitchen', tiny: 'crack two eggs', timeOfDay: 'morning' },
  { category: 'focus', identity: 'a focused scientist', behaviour: 'do one deep work flight', time: '09:30', place: 'my desk', tiny: 'open the document and read one line', timeOfDay: 'morning' },
  { category: 'focus', identity: 'someone who writes every day', behaviour: 'write three hundred words', time: '07:30', place: 'the kitchen table', tiny: 'write one sentence', timeOfDay: 'morning' },
  { category: 'focus', identity: 'a person who finishes things', behaviour: 'close one open task', time: '16:00', place: 'my desk', tiny: 'pick the task and name it out loud', timeOfDay: 'afternoon' },
  { category: 'focus', identity: 'someone who plans the day', behaviour: 'write down the three things that matter', time: '08:45', place: 'my desk', tiny: 'open the notebook', timeOfDay: 'morning' },
  { category: 'focus', identity: 'a person who protects mornings', behaviour: 'stay off the phone until nine', time: '07:00', place: 'anywhere', tiny: 'leave the phone face down', timeOfDay: 'morning' },
  { category: 'focus', identity: 'someone who reviews the week', behaviour: 'run a weekly review', time: '17:00', place: 'my desk', tiny: 'open last week’s notes', timeOfDay: 'evening' },
  { category: 'learning', identity: 'a person who reads', behaviour: 'read ten pages', time: '22:00', place: 'the armchair', tiny: 'open the book', timeOfDay: 'evening' },
  { category: 'learning', identity: 'someone fluent in C++', behaviour: 'solve one low-latency exercise', time: '20:00', place: 'my desk', tiny: 'open the editor', timeOfDay: 'evening' },
  { category: 'learning', identity: 'a person who studies daily', behaviour: 'study for thirty minutes', time: '19:30', place: 'the study', tiny: 'sit at the desk with the book open', timeOfDay: 'evening' },
  { category: 'learning', identity: 'someone who takes notes', behaviour: 'write one note about what I learned', time: '21:00', place: 'anywhere', tiny: 'open the notes app', timeOfDay: 'evening' },
  { category: 'learning', identity: 'a person learning a language', behaviour: 'do one language lesson', time: '08:00', place: 'the train', tiny: 'open the app', timeOfDay: 'morning' },
  { category: 'home', identity: 'someone who keeps a tidy home', behaviour: 'tidy for ten minutes', time: '20:30', place: 'the living room', tiny: 'put five things away', timeOfDay: 'evening' },
  { category: 'home', identity: 'a person who cooks ahead', behaviour: 'prep food for tomorrow', time: '20:00', place: 'the kitchen', tiny: 'take one thing out of the freezer', timeOfDay: 'evening' },
  { category: 'home', identity: 'someone who stays on top of laundry', behaviour: 'run and fold one load', time: '18:30', place: 'the utility room', tiny: 'load the machine', timeOfDay: 'evening' },
  { category: 'home', identity: 'a person who empties the sink', behaviour: 'wash up before bed', time: '22:30', place: 'the kitchen', tiny: 'wash one plate', timeOfDay: 'evening' },
  { category: 'home', identity: 'someone who budgets', behaviour: 'check the week’s spending', time: '10:00', place: 'anywhere', tiny: 'open the banking app', timeOfDay: 'morning' },
  { category: 'relationships', identity: 'a good friend', behaviour: 'message someone I care about', time: '13:00', place: 'anywhere', tiny: 'open the chat', timeOfDay: 'afternoon' },
  { category: 'relationships', identity: 'someone who calls home', behaviour: 'call my parents', time: '19:00', place: 'anywhere', tiny: 'press call', timeOfDay: 'evening' },
  { category: 'relationships', identity: 'a person who is present', behaviour: 'put the phone away at dinner', time: '19:30', place: 'the table', tiny: 'leave the phone in another room', timeOfDay: 'evening' },
  { category: 'relationships', identity: 'someone who says thank you', behaviour: 'thank one person properly', time: '17:30', place: 'anywhere', tiny: 'think of who it is', timeOfDay: 'afternoon' },
  { category: 'mind', identity: 'a calm person', behaviour: 'sit quietly for ten minutes', time: '07:15', place: 'the chair by the window', tiny: 'sit down and take one breath', timeOfDay: 'morning' },
  { category: 'mind', identity: 'someone who keeps a journal', behaviour: 'write a few lines about the day', time: '22:15', place: 'the bedroom', tiny: 'open the journal', timeOfDay: 'evening' },
];
