# Milo

Milo — couch to 5K, progressive lifting, deep-focus flights, recipes, food and habits.
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
- **FOCUS** — flights: pick a length and a destination, tear the boarding pass, and leave the phone
  alone. The sky behind the clock is the real Earth, lit from where the sun actually is.
- **COOK** — recipes that parse, scale and cook, a shopping list by aisle, and a week planner.
- **FUEL** — 7,587 USDA foods, barcode scanning, targets that adapt to your own trend weight.
- **HABITS** — identity first: every tick is a vote for the person you are becoming.

## Data

Everything lives in this browser: `c25k.v1` (run), `c25k.lift.v1`, `c25k.focus.v1`, `c25k.cook.v1`,
`c25k.fuel.v1`, `c25k.habits.v1` — names from before the app was called Milo. Recipe photos live in
IndexedDB. **Export** in run settings downloads all six as one JSON; **Import** takes it back.

## Credits

Earth imagery: NASA Visible Earth — Blue Marble Next Generation (day), Black Marble (night lights),
GEBCO-derived topography, all public domain. Satellite map tiles, hillshade and place labels © Esri
and its contributors, used online only and never cached. Food data: USDA FoodData Central (SR Legacy
and Foundation, public domain) — rebuild with `node scripts/build_foods.ts <sr.json> <foundation.json>`.
Branded food lookups: Open Food Facts. Destination weather: Open-Meteo. Everything else is ours.
