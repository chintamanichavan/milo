# Milo

Milo — couch to 5K + progressive lifting. Carried daily, grows slowly. Static PWA, no backend, no accounts.

- Build: `npm install && npm run build` (output lands in `dist/`); `npm test` checks the progression rules
- Run: `docker compose up -d` — serves on `http://127.0.0.1:8200`
- Share to your phone: `tailscale serve --bg --https=8443 http://127.0.0.1:8200`
- Home screen: open that HTTPS address in Safari, Share → Add to Home Screen. It then works offline and runs full screen.
- **RUN**: nine weeks, three runs a week. START counts you in, the screen stays awake, each change beeps and speaks, and it dims between glances. Any tap wakes it. Hold anywhere for a moment to pause.
- **LIFT**: two routines that take turns. Log each set as you go; hit the top of the rep range on every set and the weight goes up next time, fall under the bottom twice and it backs off.
- History lives in this browser only, under the `c25k.v1` and `c25k.lift.v1` keys (named before the app was). **Export** downloads both halves as one JSON; **Import** takes that file back — the way to move to a new phone.
