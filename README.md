# Universe Explorer

An interactive astronomy simulator and lab for iPhone Safari, built with plain HTML, CSS and JavaScript (ES modules). No frameworks, no accounts, no analytics, no server. It runs as a static site on GitHub Pages and installs to the Home Screen as an offline app.

**Stage 1 (this version):** the base, the home page, and the installable-app layer.

- A live map of the Sun and eight planets at their approximate positions today, with a time control.
- Home page with a section list (Solar System, Gravity Lab, Experiments, Missions, Quizzes). These sections are marked as coming and fill in as they are built.
- Install to the Home Screen, offline support, and an update message when a new version is deployed.
- Local-only storage with settings, JSON backup export, import and erase.

## Run it on your computer

```
python3 -m http.server 8000
```

Open http://localhost:8000. The service worker also works on `localhost`, so you can test offline mode there. Opening `index.html` directly from disk (`file://`) shows the page, but offline mode is not available.

## Deploy to GitHub Pages

1. Create a repository named `universe-explorer` and put these files at the top level of it.
2. In the repository, go to Settings, then Pages. Under "Build and deployment", set Source to "Deploy from a branch", choose the `main` branch and the `/ (root)` folder, then save.
3. After a minute the site is live at `https://YOUR-USERNAME.github.io/universe-explorer/`.

All paths in the app are relative, so it works under that `/universe-explorer/` sub-path without changes.

**Before every push, run:**

```
node tools/stamp.mjs
```

This needs Node 18 or newer. It rewrites the list of offline files in `sw.js` and the version id in `js/version.js`. If you skip it, phones that already installed the app keep serving their old cached copy. `node tools/stamp.mjs --check` fails if the stamp is out of date, which is handy in a pre-push hook or a CI step.

## Install on iPhone

Open the site in Safari, tap Share, tap **Add to Home Screen**, then tap Add.

The Home Screen app keeps its own storage, separate from Safari. Install before you save progress. To move progress across, use Settings, Export backup in Safari and Import backup in the app.

## Project layout

```
index.html              the home page
manifest.webmanifest    app name, icons, colors, start URL
sw.js                   service worker (offline cache, updates)
css/style.css           all styles
js/main.js              starts everything and wires the page
js/orbits.js            planet positions (pure functions, no DOM)
js/hero.js              the live map on the home page
js/modules.js           the list of sections on the home page
js/storage.js           local storage, backup export and import
js/stars.js             star field behind the page
js/pwa.js               install prompt and service-worker registration
js/ui.js                bottom sheets and the update message
js/version.js           written by tools/stamp.mjs
icons/                  app icons (source: icon.svg)
tools/stamp.mjs         run before every deploy
tools/check-orbits.mjs  checks planet positions against known events
tools/make-icons.py     redraws the PNG icons from icon.svg (needs Playwright)
```

## Add a section

1. Build it in its own folder, for example `solar-system/index.html`, using relative paths.
2. In `js/modules.js`, set its `status` to `'ready'` and its `href` to `'solar-system/index.html'`.
3. Run `node tools/stamp.mjs` so the new files are cached for offline use.

## How the map works

Positions come from the JPL approximate orbital elements (valid 1800 to 2050) with Kepler's equation solved for each planet. Angles are the real direction of each planet from the Sun, seen from above the ecliptic. Distances are compressed on a log scale so Mercury and Neptune both fit on a phone, and orbits are drawn as circles. Beyond 2050 the map shows "less exact".

`node tools/check-orbits.mjs` compares the output with known events: Earth at the 2026 equinoxes and solstices (within 0.02 degrees), and planet and Earth sharing a heliocentric longitude at oppositions and inferior conjunctions (Mars, Jupiter, Saturn, Uranus, Neptune within 0.3 degrees; Venus within 0.3; Mercury within 1.2).

## Older iPhones

The code avoids features that older iOS Safari lacks: optional chaining, `??`, class fields, flexbox `gap`, `aspect-ratio`, `dvh`, `<dialog>`, `ResizeObserver`. It uses `-webkit-backdrop-filter` and `env(safe-area-inset-*)` with fallbacks. This is written to those limits but has not been run on an old iPhone.

## What has and has not been tested

**Tested** in headless Chromium, on a phone-sized touch viewport, a 320 px wide phone, landscape, and desktop, served from a sub-path like GitHub Pages:

- No console errors on load. No horizontal scroll at 320, 390 or desktop widths.
- Tapping planets on the map and the planet buttons; speed button; "Today" button; the map stops animating when paused.
- Reduced motion from the device setting and from the in-app setting.
- Settings sheet and install sheet open, trap focus, close with Escape and restore focus.
- Backup export, import (valid, not JSON, wrong app, newer version, hostile input) and erase; storage blocked.
- Service worker: first install, offline reload (including `?source=pwa` and `/index.html`), update message, reload into the new version, old cache removed.

**Not tested on a real iPhone or in WebKit.** Fonts in the screenshots are fallbacks: the design asks for DIN Alternate and Avenir Next, which iOS has, so spacing will differ slightly. Run the checks below on your phone.

## iPhone test plan

In Safari:

- [ ] The page loads, the map animates in, and nothing scrolls sideways. Rotate to landscape and back.
- [ ] Tap planets on the map and on the buttons. The panel under the title updates. Earth is selected at first.
- [ ] The speed button cycles 10 days, 100 days, Paused. Today returns to the current date.
- [ ] The title, buttons and map look right with DIN Alternate and Avenir Next.
- [ ] Wait for "Ready to use offline" at the bottom. Turn on Airplane Mode and reload. The page still opens.
- [ ] iOS Settings, Accessibility, Motion, Reduce Motion on: the map starts paused.
- [ ] Settings, Export backup: the share sheet offers Save to Files. Import that file back.
- [ ] Install app opens the three steps. Follow them.

In the Home Screen app:

- [ ] The icon looks right and the name under it reads "Universe".
- [ ] It opens full screen. The title bar and the status bar do not overlap (the notch area is clear).
- [ ] With Airplane Mode on, it still launches.
- [ ] Storage is separate from Safari: export in Safari, import here, and the setting carries over.
- [ ] Deploy a small change (run `node tools/stamp.mjs` first). Open the app, close it, open it again. "A new version is ready" appears. Tap Reload. The version number at the bottom changes.
- [ ] Leave the page on screen for two minutes. The phone does not get warm. Switch to another app and back: the map resumes.

## Native App Store app

This is a Home Screen web app, not an App Store app. If you later want one, the same files can be wrapped with Capacitor. That needs a Mac with Xcode and a paid Apple Developer account.
