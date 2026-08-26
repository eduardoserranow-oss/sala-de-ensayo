# Vibe Roulette — Technical Audit (Sprint 1)

## Repository safety

- Repository: `eduardoserranow-oss/sala-de-ensayo`
- Production branch: `main`
- Sprint branch: `feature/vibe-roulette-engine`
- Sprint 1 work remains isolated from `main`.
- Pull request #1 remains a draft and must not be merged until the production-integration gate is explicitly approved.

## Current application shape

FORTISSIMO is currently a static web/PWA-style application built primarily from root HTML pages plus shared assets. The Home is implemented in `index.html`, and other major experiences live in root-level HTML pages such as guitar, bass, vocal and Sound Gym pages.

This allows Vibe Roulette to be developed as a standalone page without introducing a new framework or changing production architecture during Sprint 1.

## Existing wheel code

`index.html` already contains an older wheel UI implementation and related styles. That code is **not** treated as the Vibe Roulette engine. Sprint 1 keeps `vibe-roulette.html` and its engine isolated so the old wheel remains untouched until replacement/integration is approved.

## PWA / manifest

`manifest.webmanifest` launches through `login.html`, uses the FORTISSIMO name and dark theme, and declares standalone display behavior. Vibe Roulette needs no PWA-specific production change during Sprint 1.

## Branding / stale documentation note

`LEEME.txt` still describes an older FORTE/GitHub Pages setup and old asset names. It is stale documentation and must not be used as architectural truth for Vibe Roulette. Sprint 1 intentionally does not mix that cleanup into this feature branch.

## Current risk controls

1. Do not edit production Home integration during the isolated engine build.
2. Do not change authentication or login behavior.
3. Do not touch manifest, favicon, splash or global branding.
4. Do not depend on the old wheel's state or DOM.
5. Do not call provisional seed data verified hit evidence.
6. Keep audio browser-native and user-gesture initiated.
7. Keep new file names feature-scoped.
8. Keep source provenance explicit and do not double-count the same annotation through aggregators.
9. Keep Serra mood scores labeled as editorial/model data, not universal scientific emotion claims.
10. Treat vocal key fit as low-confidence until melody/tessitura exists.

## Sprint 1 feature boundary

Feature-scoped files now include:

- `vibe-roulette.html`
- `assets/vibe-roulette-engine.js`
- `assets/vibe-roulette.css`
- `data/vibe-roulette/schema-v1.json`
- `data/vibe-roulette/seed-v0.json`
- `data/vibe-roulette/corpus-v0.1.json`
- `tests/vibe-roulette-engine.browser.html`
- `tests/vibe-roulette-engine.test.mjs`
- `tests/vibe-roulette-corpus.test.mjs`
- `tests/vibe-roulette-ui-smoke.test.mjs`
- `.github/workflows/vibe-roulette-ci.yml`
- `docs/vibe-roulette/VIBE_ROULETTE_SPEC_V1.md`
- `docs/vibe-roulette/HIT_QUALIFICATION_V1.md`
- `docs/vibe-roulette/SOURCE_REGISTRY_V1.md`
- `docs/vibe-roulette/TECH_AUDIT_SPRINT1.md`

No production Home link has been added.

## Gates completed automatically

### Harmonic engine

- [x] 12-key progression generation covered by automated tests.
- [x] Key-aware enharmonic spelling added (for example E major uses C#m, F# major uses sharps, Gb major can spell Cb).
- [x] Borrowed-degree handling covered (`bVII`, `iv`).
- [x] Applied dominant handling covered (`V/vi`, `V7/vi`).
- [x] Common extensions covered (`7`, `maj7`, `9` family parsing where supported).
- [x] Anti-repeat weighting covered.
- [x] Verified-evidence weighting covered.
- [x] Explainability/evidence summary covered.

### Corpus

- [x] Provisional development seed remains explicitly separated from verified corpus.
- [x] `corpus-v0.1.json` introduced as first verified historical slice.
- [x] First slice contains 10 Billboard Hot 100 Top-10 songs with expert McGill harmonic annotations.
- [x] Corpus integrity tests enforce chart qualification, source references, evidence classes and Serra vocal profile.
- [x] Mood values explicitly identify Serra editorial derivation rather than scientific causality.

### Isolated UI

- [x] Alpha loads `corpus-v0.1.json`, not the provisional seed.
- [x] Illusion / Nostalgia / Connection controls exist.
- [x] Spin result displays Roman progression and transposed chords.
- [x] Result exposes source-song evidence, chart peak and weeks.
- [x] Section/chorus variation is displayed and playable.
- [x] Another-key control re-transposes the same harmonic family rather than spinning a new result.
- [x] Responsive/mobile CSS breakpoint exists.
- [x] Static UI smoke test protects required controls and verified-corpus wiring.

### Continuous integration

GitHub Actions workflow `Vibe Roulette CI` now runs:

1. engine tests,
2. verified-corpus integrity tests,
3. isolated UI smoke test,
4. JSON parse validation.

The latest run covering the isolated verified-alpha UI completed successfully before this audit update.

## Gates that still require real-device/manual validation

These are intentionally **not** marked complete by static or Node tests:

- [ ] Web Audio start/resume/stop on a real iPhone Safari/PWA session.
- [ ] Audible chord quality/voicing review by Serra, especially seventh and borrowed-color examples.
- [ ] Touch ergonomics and narrow-device visual review on the actual FORTISSIMO target devices.
- [ ] Confirm preview deployment once Vercel build-rate limiting clears; a build-rate-limit response is operational, not a code-test failure.

## Data/research gates still open

- [ ] Expand the historical verified slice beyond 10 songs before using it to infer broad prevalence statistics.
- [ ] Add Latin hit evidence via Hot Latin Songs / Tropical charts with era-aware methodology.
- [ ] Add salsa/merengue harmonic evidence without pretending a beat-only dataset is chord ground truth.
- [ ] Add Nigeria-local evidence (TurnTable) and UK Afrobeats evidence for modern afropop/afrobeats.
- [ ] Audit ChoCo / CoCoPops / Harmory lineage before importing so McGill-derived annotations are not double-counted.
- [ ] Build a reviewed-transcription path for culturally essential hits that have no suitable open expert harmonic corpus.

## Production integration gate

Do **not** merge or add a Home link merely because the alpha works.

Production integration should require:

1. all automated CI green;
2. real-device audio/UI validation;
3. a larger and culturally broader verified corpus;
4. no provisional result exposed as hit-derived;
5. explicit review of how the new page replaces/coexists with the old wheel;
6. explicit approval to merge into `main`.
