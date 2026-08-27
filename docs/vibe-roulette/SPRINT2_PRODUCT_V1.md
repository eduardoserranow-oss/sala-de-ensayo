# Vibe Roulette — Product V1 / Writing Session Stage

Status: Product V1 approved for Home entry after real-device feedback and corrective audio/spelling passes.

## Product goal

A useful session should let Serra:

1. name a working song idea,
2. choose Ilusión / Nostalgia / Conexión,
3. choose body energy independently from mood,
4. spin a hit-derived harmonic direction,
5. hear the progression,
6. move the same family through recommended vocal keys,
7. hear a source-observed or clearly labeled section/chorus direction,
8. save the direction locally,
9. copy the harmonic idea into notes / DAW workflow,
10. rate whether the result actually helps composition.

## Product simplification rule

Research diagnostics must not dominate the writing experience.

The main surface shows only what helps composition:

- emotional territory
- body energy
- key/mode
- Roman numerals
- chord names
- playback
- another vocal key
- section/chorus direction
- save/copy
- lightweight feedback

Evidence and vocal-fit caveats remain available under a secondary `Why this direction exists` disclosure.

## Local calibration data

During this stage, saved ideas and feedback are stored only in the browser/device using localStorage.

Keys:

- `fortissimo.vibeRoulette.saved.v1`
- `fortissimo.vibeRoulette.feedback.v1`

Feedback options:

- Inspires me
- Interesting
- Too generic
- Not my vibe

The feedback is not yet allowed to silently retrain or reweight the production engine. It is calibration evidence for the next ranking iteration.

## Body Energy → tempo playback

Body Energy controls a practical audition tempo:

- Calm: approximately 68–82 BPM
- Flowing: approximately 84–104 BPM
- Danceable: approximately 106–126 BPM

Playback uses a fixed four-bar / 4/4 audition window:

- 4 chords → one chord per bar
- 2 chords → two bars per chord
- 8 chords → two chords per bar
- other progression lengths are distributed across the same 16-beat window

The BPM mapping is an audition heuristic, not a genre law.

## Practical enharmonic spelling

Product V1 keeps the theoretical harmonic engine separate from practical display/playback spelling.

- theoretical spellings such as Cb remain valid internally
- user-facing key selection scores enharmonic alternatives and prefers cleaner practical spellings when they preserve the same pitch/function
- the reported Eb-minor `i–VI–III–VII` case therefore prefers D# minor when that avoids Cb: `D#m – B – F# – C#`
- the audio layer can still canonicalize theoretical spellings before sample lookup, so an enharmonic spelling must not crash playback

## Soft Human Rhodes V2

The first aggressive Rhodes pass was replaced after iPhone listening feedback.

Instrument:

- Daniel Podrazka `audio/rhodes-fm/`
- B1–D6 chromatic coverage
- eight velocity/timbre layers
- generated audio under MIT license

Performance language:

`Indie · Lo-Fi · Jazzy · Soulful · Cool · Afro pocket`

Current performance behaviors:

- lower base velocities and greater note-to-note dynamics
- one-note left-hand foundation with open right-hand shells
- context-aware 7th/9th color without dense block stacking
- top-voice emphasis with softer inner voices
- finger microtiming
- phrase-level dynamic arc
- restrained rhythmic response notes informed by the user-supplied Afrobeats piano-roll reference
- darker tone shaping
- much gentler saturation/compression
- lower overall output than the first Rhodes pass
- continuously interpolated rotary behavior rather than abrupt energy-band jumps
- lower rotary wetness/speed so the movement remains behind the Rhodes

The performance layer remains separate from the stored Roman-numeral progression.

Asset provenance: `docs/vibe-roulette/RHODES_FM_ASSET.md`.

## Afrobeats practitioner evidence

The user-supplied `Popular Afrobeats Chords` reference is stored separately in:

`data/vibe-roulette/afrobeats-practitioner-v0.1.json`

Directly observed degree families include:

- 4–5–6–5
- 2–3
- 4–3–6–5
- 6–3–4–5
- 4–5–6

This is practitioner/research evidence only. It is not silently promoted into the verified hit-derived feed.

## iPhone hardening

Product V1 includes:

- 16px working-title input to avoid Safari focus zoom
- coarse-pointer minimum touch targets
- horizontal-overflow guards
- touch-action tuning for primary controls
- Web Audio resume logic for iOS interruption behavior
- automatic playback stop when the page is hidden/backgrounded
- clear retry error if Safari requires another explicit user gesture

## Home integration

The user explicitly approved adding Vibe Roulette to the FORTISSIMO Home so it can be reached from the installed iPhone web app.

The Home entry:

- is a dedicated full-screen hero in the existing Home scroll flow
- uses isolated `vibe-home-*` styling so existing routine sections are not redesigned
- links directly to `vibe-roulette.html?v=product-v1`
- does not alter authentication, manifest/PWA identity, existing training pages or the old chord roulette

Automated smoke coverage now verifies that the Home contains the Vibe Roulette entry and that the CTA points to the product page.

## Integration safety

Before production merge:

- Vibe Roulette CI must pass
- Vercel must report a successful deployment/status for the feature head
- compare against main must show Vibe Roulette additions plus the intentional Home entry, without unrelated existing-app modifications

Once those gates pass, the approved Home integration may merge to `main`.
