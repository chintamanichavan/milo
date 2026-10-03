import { FUEL_KEY } from '../keys';
import { dayKey } from '../ui/time';

/**
 * The scale. Weigh-ins still live under the old Fuel key, beside whatever
 * Fuel left there, so nothing logged before the Fuel tab went is lost.
 */
export interface WeighIn {
  date: string;
  lb: number;
}

type Stored = { weights?: WeighIn[] } & Record<string, unknown>;

function read(): Stored {
  try {
    return (JSON.parse(localStorage.getItem(FUEL_KEY) ?? 'null') as Stored | null) ?? {};
  } catch {
    return {};
  }
}

export const loadWeights = (): WeighIn[] => read().weights ?? [];

export function addWeight(lb: number, date = dayKey()): void {
  const stored = read();
  stored.weights = [...(stored.weights ?? []), { date, lb }];
  localStorage.setItem(FUEL_KEY, JSON.stringify(stored));
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

export const trendWeight = (): number => {
  const line = trend(loadWeights());
  return line.length ? line[line.length - 1].lb : 0;
};
