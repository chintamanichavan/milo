# Milo

Milo — couch to 5K, progressive lifting and water.
Carried daily, grows slowly. Static PWA, no backend, no accounts, works offline.

- Build: `npm install && npm run build` (output lands in `dist/`); `npm test` checks the progression rules
- Run: `docker compose up -d` — serves on `http://127.0.0.1:8200`
- Share to your phone: `tailscale serve --bg --https=8443 http://127.0.0.1:8200`
- Home screen: open that HTTPS address in Safari, Share → Add to Home Screen. It then works offline and runs full screen.

## The tabs

- **RUN** — nine weeks to a 5k, four coaches with their own scripts and voices, optional GPS with
  splits and a route map, weekly tips, warm-ups and stretches, a certificate, and four 5K+ plans.
- **LIFT** — 116 exercises, routines and a plan generator, set types, RPE, records, body
  measurements, charts, plate maths and deloads.
- **HEALTH** — import an Apple Health export (zip or xml, read in a worker as a stream) for
  recovery, strain, activity rings, sleep, trends, workouts, reports and how Milo's own logs line
  up with recovery. `npm test` also checks the scores.

## Data

Everything lives in this browser: `c25k.v1` (run), `c25k.lift.v1`,
`c25k.water.v1`, `c25k.fuel.v1` (weigh-ins), `c25k.health.v1` (health settings and import history) — names
from before the app was called Milo. Photos and the imported health days and workouts live in IndexedDB;
health data comes back by importing the Apple Health zip again, not from the JSON backup. **Export** in run settings downloads everything as one JSON; **Import** takes it back.
