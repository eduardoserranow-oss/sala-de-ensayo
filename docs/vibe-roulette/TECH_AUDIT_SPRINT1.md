# Vibe Roulette — Technical Audit (Sprint 1)

## Repository safety

- Repository: `eduardoserranow-oss/sala-de-ensayo`
- Production branch: `main`
- Sprint branch: `feature/vibe-roulette-engine`
- Sprint 1 work is isolated from `main`.

## Current application shape

FORTISSIMO is currently a static web/PWA-style application built primarily from root HTML pages plus shared assets. The Home is implemented in `index.html`, and other major experiences live in root-level HTML pages such as guitar, bass, vocal and Sound Gym pages.

This is useful for Vibe Roulette because a standalone page can be developed and tested without introducing a new framework or changing the production architecture during Sprint 1.

## Existing wheel code

`index.html` already contains an older wheel UI implementation and related styles. That code is not treated as the new Vibe Roulette engine. Sprint 1 creates a separate `vibe-roulette.html` and a separate engine module so the old wheel can remain untouched until replacement/integration is approved.

## PWA / manifest

`manifest.webmanifest` currently launches through `login.html`, uses the FORTISSIMO name and dark theme, and declares standalone display behavior. Vibe Roulette therefore needs no PWA-specific changes during Sprint 1.

## Branding / stale documentation note

`LEEME.txt` still describes an older FORTE/GitHub Pages setup and older asset names. It is stale documentation and should not be used as architectural truth for Vibe Roulette. Sprint 1 does not modify it because that cleanup is outside the feature scope.

## Current risk controls

1. Do not edit `index.html` during the initial engine build.
2. Do not change authentication or login behavior.
3. Do not touch manifest, favicon, splash or global branding.
4. Do not depend on the old wheel's state or DOM.
5. Do not call provisional seed data verified hit evidence.
6. Keep audio browser-native and user-gesture initiated.
7. Keep all new file names feature-scoped.

## Sprint 1 file boundary

New isolated files:

- `vibe-roulette.html`
- `assets/vibe-roulette-engine.js`
- `assets/vibe-roulette.css`
- `data/vibe-roulette/schema-v1.json`
- `data/vibe-roulette/seed-v0.json`
- `docs/vibe-roulette/VIBE_ROULETTE_SPEC_V1.md`
- `docs/vibe-roulette/TECH_AUDIT_SPRINT1.md`

No production Home link is added yet.

## Next technical gate

Before any merge or Home integration:

- validate Roman-numeral transposition across 12 keys
- validate applied dominant handling used by the seed
- validate anti-repeat behavior
- validate Web Audio start/stop on iOS Safari and desktop browsers
- validate mobile layout at narrow widths
- replace provisional evidence with first verified corpus records before using the phrase "hit-derived" in the UI
