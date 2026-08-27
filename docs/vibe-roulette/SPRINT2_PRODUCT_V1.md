# Vibe Roulette — Product V1 / Writing Session Stage

Status: Product V1 approved for production Home entry after real-device feedback and corrective audio/spelling passes.

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

Research diagnostics must not dominate the writing experience. The main surface shows only what helps composition: emotional territory, body energy, key/mode, Roman numerals, chord names, playback, another vocal key, section direction, save/copy and lightweight feedback.

Evidence and vocal-fit caveats remain available under `Why this direction exists`.

## Body Energy → tempo playback

Body Energy controls a practical audition tempo: Calm ~68–82 BPM, Flowing ~84–104 BPM, Danceable ~106–126 BPM. Playback uses a fixed four-bar / 4/4 audition window. Four chords occupy one bar each.

## Practical enharmonic spelling

The theoretical harmonic engine remains separate from practical display/playback spelling. User-facing key selection favors cleaner enharmonic spellings when the pitch/function is identical, while the audio layer canonicalizes theoretical spellings before sample lookup so they cannot crash playback.

The reported Eb-minor `i–VI–III–VII` case therefore prefers the practical equivalent `D#m – B – F# – C#` when that pitch center is chosen.

## Soft Human Rhodes V2

The first aggressive Rhodes pass was replaced after iPhone listening feedback. Current behavior includes lower base velocities, greater note-to-note dynamics, open left/right-hand spacing, shell voicings, restrained 7th/9th color, expressive top voice, finger microtiming, phrase dynamics, Afro-pocket rhythmic responses, darker tone shaping, gentler dynamics processing and continuously interpolated rotary movement.

Instrument source: Daniel Podrazka `audio/rhodes-fm/`, B1–D6, eight velocity layers, MIT generated audio.

## Afrobeats practitioner evidence

The user-supplied `Popular Afrobeats Chords` reference is stored separately in `data/vibe-roulette/afrobeats-practitioner-v0.1.json`. Observed degree families include 4–5–6–5, 2–3, 4–3–6–5, 6–3–4–5 and 4–5–6. This remains practitioner/research evidence and is not silently promoted into the verified hit-derived feed.

## iPhone / Home integration

The user explicitly approved adding Vibe Roulette to the existing FORTISSIMO Home so it can be opened from the installed iPhone web app.

The Home entry is a dedicated full-screen hero with isolated `vibe-home-*` styling and a `Componer` CTA to `vibe-roulette.html?v=product-v1`.

This integration does not alter authentication, manifest/PWA identity, Guitar/Bass/Vocal flows, the old chord roulette or other training pages.

## Integration gates

- exact feature head passes Vibe Roulette CI
- Home smoke test verifies the Home entry and destination
- practical spelling tests pass
- Soft Human Rhodes V2 tests pass
- Vercel reports success on the feature head
- compare against `main` shows Vibe Roulette additions plus the intentional Home edit, without unrelated existing-app modifications

With these gates satisfied and explicit user approval, the Home integration is authorized to merge to `main`.
