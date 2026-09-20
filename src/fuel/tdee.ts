export interface WeighIn {
  date: string;
  lb: number;
}

export interface DayIntake {
  date: string;
  kcal: number;
}

/** exponentially weighted trend — the scale lies, the trend does not */
export function trend(points: WeighIn[], alpha = 0.25): { date: string; lb: number }[] {
  const byDay = new Map<string, number[]>();
  for (const p of points) byDay.set(p.date, [...(byDay.get(p.date) ?? []), p.lb]);
  const days = [...byDay.entries()]
    .map(([date, list]) => ({ date, lb: list.reduce((s, v) => s + v, 0) / list.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const out: { date: string; lb: number }[] = [];
  let value = days[0]?.lb ?? 0;
  for (const day of days) {
    value = value + alpha * (day.lb - value);
    out.push({ date: day.date, lb: Math.round(value * 100) / 100 });
  }
  return out;
}

export interface Estimate {
  tdee: number;
  confidence: number;
  sentence: string;
}

const KCAL_PER_LB = 3500;

/** Mifflin-St Jeor, the starting guess before there is any data. */
export function baseline(
  sex: 'male' | 'female',
  age: number,
  heightIn: number,
  weightLb: number,
  activity: number,
): number {
  const kg = weightLb * 0.453_592;
  const cm = heightIn * 2.54;
  const bmr =
    10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
  return Math.round(bmr * activity);
}

/**
 * The signature move: energy in, minus what the trend weight did, is what you burned.
 * Smoothed, and trusted more as the logged days pile up.
 */
export function estimate(
  intake: DayIntake[],
  weights: WeighIn[],
  previous: number,
): Estimate | null {
  const line = trend(weights);
  if (line.length < 2 || intake.length < 5) return null;
  const days = Math.max(
    1,
    (new Date(line[line.length - 1].date).getTime() - new Date(line[0].date).getTime()) / 86_400_000,
  );
  const change = line[line.length - 1].lb - line[0].lb;
  const window = intake.slice(-Math.round(days) - 1);
  const meanIntake = window.reduce((s, d) => s + d.kcal, 0) / Math.max(1, window.length);
  const fromBalance = meanIntake - (change * KCAL_PER_LB) / days;
  const confidence = Math.min(1, window.length / 21);
  const blended = previous ? previous * (1 - confidence * 0.6) + fromBalance * confidence * 0.6 : fromBalance;
  const tdee = Math.round(blended / 10) * 10;
  const direction = change > 0.2 ? 'gaining' : change < -0.2 ? 'losing' : 'holding';
  return {
    tdee,
    confidence,
    sentence: `Over ${Math.round(days)} days you averaged ${Math.round(
      meanIntake,
    )} kcal and the trend went ${direction} ${Math.abs(change).toFixed(1)} lb, so your burn looks like about ${tdee} kcal a day.`,
  };
}

export type Pace = 'lose1' | 'lose05' | 'maintain' | 'gain025' | 'gain05';

export const PACE_LB_PER_WEEK: Record<Pace, number> = {
  lose1: -1,
  lose05: -0.5,
  maintain: 0,
  gain025: 0.25,
  gain05: 0.5,
};

export const targetFromTdee = (tdee: number, pace: Pace): number =>
  Math.max(1200, Math.round((tdee + (PACE_LB_PER_WEEK[pace] * KCAL_PER_LB) / 7) / 10) * 10);

export type MacroProgram = 'balanced' | 'lowcarb' | 'highprotein' | 'keto' | 'custom';

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** grams a day, from the calorie target and the programme */
export function macrosFor(
  kcal: number,
  program: MacroProgram,
  weightLb: number,
  custom?: { proteinPerLb: number; fatPercent: number },
): Macros {
  const proteinPerLb =
    program === 'highprotein' ? 1 : program === 'keto' ? 0.9 : program === 'custom' ? custom?.proteinPerLb ?? 0.8 : 0.8;
  const fatPercent =
    program === 'keto' ? 0.7 : program === 'lowcarb' ? 0.4 : program === 'custom' ? (custom?.fatPercent ?? 30) / 100 : 0.3;
  const protein = Math.round(Math.max(60, proteinPerLb * (weightLb || 160)));
  const fat = Math.round((kcal * fatPercent) / 9);
  const carbs = Math.max(20, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

/** male 19–30 reference intakes, for the micronutrient bars */
export const RDA: Record<string, number> = {
  calcium: 1000,
  iron: 8,
  magnesium: 400,
  phosphorus: 700,
  potassium: 3400,
  sodium: 1500,
  zinc: 11,
  copper: 0.9,
  manganese: 2.3,
  selenium: 55,
  'vitamin A': 900,
  'vitamin E': 15,
  'vitamin D': 15,
  'vitamin C': 90,
  thiamin: 1.2,
  riboflavin: 1.3,
  niacin: 16,
  'pantothenic acid': 5,
  'vitamin B6': 1.3,
  folate: 400,
  'vitamin B12': 2.4,
  choline: 550,
  'vitamin K': 120,
  fibre: 38,
};
