# Vibe Roulette — iPhone Writing Session V1

Status: required real-device validation before any Home/main integration.

## Goal

Validate whether Product V1 is genuinely useful in a real songwriting session, not merely technically correct.

The session tests three layers separately:

1. **Product reliability** — touch, layout, playback, persistence and copy behavior.
2. **Musical usefulness** — whether the voicings and section direction create usable composition starts.
3. **Serra fit** — whether the result feels relevant to the selected emotional territory, body energy and Serra identity.

## Device

Primary validation device: real iPhone using Safari first. PWA/add-to-home-screen behavior can be checked after Safari passes.

Do not integrate into the production Home before this session passes.

## First test song idea

Start with:

- Working title: `Me topé con tu foto`
- Emotional territory: Nostalgia
- Body energy: approximately 70–75%

## Short session protocol

For 5–10 spins:

1. Spin a direction.
2. Listen to the four-bar Rhodes performance.
3. Decide quickly: does it inspire, does the mood fit, do the chords feel useful?
4. Try `Another vocal key` once or twice.
5. Listen to the Chorus / Section Direction.
6. Use one feedback button without overthinking.

## Audio checks — Human Rhodes

Product V1 now uses the sampled Rhodes FM performance engine instead of the oscillator placeholder.

Listen for:

- the displayed BPM making sense for Body Energy
- four full bars actually being audible
- a convincing Rhodes timbre
- different note strengths inside each voicing
- slight finger timing between notes rather than a hard simultaneous block chord
- a clear left-hand foundation and expressive right-hand voicing
- useful 7th/9th color without losing the underlying progression
- rhythmic phrasing inside each harmony rather than only sustained whole-note blocks
- sustain/release that feels intentional
- rotary movement that adds width and life without becoming distracting
- no stuck notes or Safari audio failure

## What to report

Concrete comments are most useful, for example:

- `The Rhodes sounds beautiful but the rotary is too strong.`
- `This feels human now, but the right-hand voicings are too dense.`
- `The tempo is right but I want more space between the rhythmic responses.`
- `The chord family is good but the ninths make this one too R&B.`
- `This immediately gave me a melody.`
- `Nostalgia is still sounding too happy.`
- `Another Vocal Key made it sit better for my voice.`

Do not report only `it works`. We want to separate UI reliability, audio performance quality, harmonic usefulness and mood fit.

## Save / persistence check

After finding at least two useful directions:

1. Save at least two directions.
2. Copy one direction.
3. Paste it into Notes and confirm the progression/section text is understandable.
4. Reload Safari.
5. Confirm saved directions still exist.
6. Confirm prior feedback remains stored on the same device.

## Acceptance gate

Product V1 is ready for the next integration discussion only if:

- Safari touch/layout has no blocking issue
- Web Audio works reliably after user gestures
- no stuck notes are observed
- the Rhodes performance is musically inspiring enough to judge the roulette fairly
- Another Key works correctly
- section directions are coherent
- Save/Copy work on iPhone
- saved ideas survive reload
- feedback survives reload
- at least several spins genuinely produce writing ideas

A technically perfect session with consistently uninspiring musical output is a **fail**. Musical usefulness is part of the acceptance gate.

## What happens after the session

Classify every issue into one of four buckets:

1. UI / touch problem
2. audio / performance problem
3. ranking / mood problem
4. corpus / compositional-content problem

Fix the smallest responsible layer instead of redesigning the whole product.

Only after those corrections should Vibe Roulette be considered for Home integration or `main`.
