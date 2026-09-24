export type Continent = 'NA' | 'SA' | 'EU' | 'AF' | 'AS' | 'OC';

export interface Airport {
  iata: string;
  city: string;
  lat: number;
  lon: number;
  continent: Continent;
  /** hours from UTC, for the clocks */
  tz: number;
}

const A = (
  iata: string,
  city: string,
  lat: number,
  lon: number,
  continent: Continent,
  tz: number,
): Airport => ({ iata, city, lat, lon, continent, tz });

export const AIRPORTS: Airport[] = [
  A('ORD', 'Chicago', 41.98, -87.9, 'NA', -5),
  A('JFK', 'New York', 40.64, -73.78, 'NA', -4),
  A('LAX', 'Los Angeles', 33.94, -118.41, 'NA', -7),
  A('SFO', 'San Francisco', 37.62, -122.38, 'NA', -7),
  A('SEA', 'Seattle', 47.45, -122.31, 'NA', -7),
  A('DEN', 'Denver', 39.86, -104.67, 'NA', -6),
  A('ATL', 'Atlanta', 33.64, -84.43, 'NA', -4),
  A('MIA', 'Miami', 25.79, -80.29, 'NA', -4),
  A('YYZ', 'Toronto', 43.68, -79.63, 'NA', -4),
  A('YVR', 'Vancouver', 49.19, -123.18, 'NA', -7),
  A('MEX', 'Mexico City', 19.44, -99.07, 'NA', -6),
  A('YUL', 'Montréal', 45.47, -73.74, 'NA', -4),
  A('BOS', 'Boston', 42.37, -71.01, 'NA', -4),
  A('GRU', 'São Paulo', -23.43, -46.47, 'SA', -3),
  A('EZE', 'Buenos Aires', -34.82, -58.54, 'SA', -3),
  A('BOG', 'Bogotá', 4.7, -74.15, 'SA', -5),
  A('LIM', 'Lima', -12.02, -77.11, 'SA', -5),
  A('SCL', 'Santiago', -33.39, -70.79, 'SA', -3),
  A('GIG', 'Rio de Janeiro', -22.81, -43.25, 'SA', -3),
  A('LHR', 'London', 51.47, -0.46, 'EU', 1),
  A('CDG', 'Paris', 49.01, 2.55, 'EU', 2),
  A('AMS', 'Amsterdam', 52.31, 4.76, 'EU', 2),
  A('FRA', 'Frankfurt', 50.04, 8.56, 'EU', 2),
  A('MAD', 'Madrid', 40.47, -3.56, 'EU', 2),
  A('FCO', 'Rome', 41.8, 12.25, 'EU', 2),
  A('IST', 'Istanbul', 41.28, 28.75, 'EU', 3),
  A('ARN', 'Stockholm', 59.65, 17.92, 'EU', 2),
  A('KEF', 'Reykjavík', 63.99, -22.61, 'EU', 0),
  A('DUB', 'Dublin', 53.42, -6.27, 'EU', 1),
  A('LIS', 'Lisbon', 38.77, -9.13, 'EU', 1),
  A('CPT', 'Cape Town', -33.97, 18.6, 'AF', 2),
  A('JNB', 'Johannesburg', -26.13, 28.24, 'AF', 2),
  A('CAI', 'Cairo', 30.11, 31.41, 'AF', 3),
  A('LOS', 'Lagos', 6.58, 3.32, 'AF', 1),
  A('NBO', 'Nairobi', -1.32, 36.93, 'AF', 3),
  A('CMN', 'Casablanca', 33.37, -7.59, 'AF', 1),
  A('ADD', 'Addis Ababa', 8.98, 38.8, 'AF', 3),
  A('DXB', 'Dubai', 25.25, 55.36, 'AS', 4),
  A('DEL', 'Delhi', 28.56, 77.1, 'AS', 5.5),
  A('BOM', 'Mumbai', 19.09, 72.87, 'AS', 5.5),
  A('SIN', 'Singapore', 1.36, 103.99, 'AS', 8),
  A('HKG', 'Hong Kong', 22.31, 113.91, 'AS', 8),
  A('NRT', 'Tokyo', 35.76, 140.39, 'AS', 9),
  A('ICN', 'Seoul', 37.46, 126.44, 'AS', 9),
  A('PEK', 'Beijing', 40.08, 116.58, 'AS', 8),
  A('BKK', 'Bangkok', 13.69, 100.75, 'AS', 7),
  A('TLV', 'Tel Aviv', 32.01, 34.89, 'AS', 3),
  A('SYD', 'Sydney', -33.94, 151.18, 'OC', 10),
  A('AKL', 'Auckland', -37.01, 174.79, 'OC', 12),
  A('MEL', 'Melbourne', -37.67, 144.84, 'OC', 10),
];

export const HOME = 'ORD';

export const airport = (iata: string): Airport =>
  AIRPORTS.find((a) => a.iata === iata) ?? AIRPORTS[0];

export function distanceKm(a: Airport, b: Airport): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** minutes in the air decide how far you get */
export const BANDS: { name: string; min: number; max: number }[] = [
  { name: 'short hop', min: 150, max: 1200 },
  { name: 'regional', min: 1200, max: 3500 },
  { name: 'long-haul', min: 3500, max: 8000 },
  { name: 'intercontinental', min: 8000, max: 20_100 },
];

export const bandFor = (minutes: number): number =>
  minutes < 35 ? 0 : minutes < 70 ? 1 : minutes < 110 ? 2 : 3;

const hash = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

export interface Route {
  from: Airport;
  to: Airport;
  km: number;
  band: string;
}

/** a flight to a particular airport, for the surprises and the chosen seats */
export function routeTo(fromIata: string, toIata: string, minutes: number): Route {
  const from = airport(fromIata);
  const to = airport(toIata);
  return { from, to, km: distanceKm(from, to), band: BANDS[bandFor(minutes)].name };
}

/** Surprise me: any airport in the world that fits the time, picked at random. */
export function surpriseRoute(fromIata: string, minutes: number, avoid = ''): Route {
  const from = airport(fromIata);
  const { min, max } = BANDS[bandFor(minutes)];
  let pool = AIRPORTS.filter((a) => {
    if (a.iata === from.iata || a.iata === avoid) return false;
    const km = distanceKm(from, a);
    return km >= min && km < max;
  });
  if (pool.length === 0) pool = AIRPORTS.filter((a) => a.iata !== from.iata && a.iata !== avoid);
  return routeTo(from.iata, pool[Math.floor(Math.random() * pool.length)].iata, minutes);
}

/** Same inputs, same route — the board and the flight always agree. */
export function planRoute(fromIata: string, minutes: number, seed: string): Route {
  const from = airport(fromIata);
  const bandIndex = bandFor(minutes);
  const reach = (i: number): Airport[] => {
    const { min, max } = BANDS[i];
    return AIRPORTS.filter((a) => {
      if (a.iata === from.iata) return false;
      const km = distanceKm(from, a);
      return km >= min && km < max;
    });
  };
  let pool = reach(bandIndex);
  for (let step = 1; pool.length === 0 && step < BANDS.length; step++)
    pool = reach(Math.max(0, Math.min(BANDS.length - 1, bandIndex - step))).concat(
      reach(Math.max(0, Math.min(BANDS.length - 1, bandIndex + step))),
    );
  if (pool.length === 0) pool = AIRPORTS.filter((a) => a.iata !== from.iata);
  const to = pool[hash(`${from.iata}|${minutes}|${seed}`) % pool.length];
  return { from, to, km: distanceKm(from, to), band: BANDS[bandIndex].name };
}

/** wall-clock time at an airport right now */
export const localTime = (airport: Airport, when = new Date()): string => {
  const utc = when.getTime() + when.getTimezoneOffset() * 60_000;
  const there = new Date(utc + airport.tz * 3_600_000);
  return there.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const KM_TO_MI = 0.621_371;
export const EARTH_CIRCUMFERENCE_KM = 40_075;
