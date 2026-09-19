# C25K

Nine weeks, three runs a week, walking to a 5k. Static PWA, no backend, no accounts.

- Build: `npm install && npm run build` (output lands in `dist/`)
- Run: `docker compose up -d` — serves on `http://127.0.0.1:8200`
- Share to your phone: `tailscale serve --bg --https=8443 http://127.0.0.1:8200`
- Home screen: open that HTTPS address in Safari, Share → Add to Home Screen. It then works offline and runs full screen.
- Start a session from Today; the run view keeps the screen awake, beeps and speaks each change, and dims itself between glances. Any tap wakes it.
- Your history lives in this browser only, under the `c25k.v1` key. **Export** downloads it as JSON; **Import** takes that file back — the way to move to a new phone.
