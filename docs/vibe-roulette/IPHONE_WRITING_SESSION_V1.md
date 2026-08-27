# Vibe Roulette — iPhone Writing Session V1

Status: required real-device validation before any Home/main integration.

## Goal

Validate whether Product V1 is genuinely useful in a real songwriting session, not merely technically correct.

The session should test three layers separately:

1. **Product reliability** — touch, layout, playback, persistence and copy behavior.
2. **Musical usefulness** — whether the voicings and section direction create usable composition starts.
3. **Serra fit** — whether the result feels relevant to the selected emotional territory, body energy and Serra identity.

## Device

Primary validation device: real iPhone using Safari first. PWA/add-to-home-screen behavior can be checked after Safari passes.

Do not integrate into the production Home before this session passes.

## Test song idea

Start with a real Serra idea rather than a fake QA title. Recommended first case:

- Working title: `Me topé con tu foto`
- Emotional territory: Nostalgia
- Body energy: approximately 65–80% so nostalgia is tested as active/flowing rather than automatically slow

Then repeat with at least one Ilusión idea and one Conexión idea.

## Session protocol

### Pass 1 — First impression

1. Open the private preview on iPhone Safari.
2. Confirm no horizontal overflow or accidental zoom.
3. Enter the working title.
4. Select the mood.
5. Set body energy.
6. Press `SPIN A DIRECTION`.
7. Do not inspect source evidence yet.
8. Judge only the musical result.

Questions:

- Did the direction appear immediately enough to feel usable in a studio?
- Are the chord names readable without zooming?
- Does the progression make you want to touch an instrument or sing something?
- Does the selected mood feel plausible?
- Does the selected body energy feel reflected independently from mood?

### Pass 2 — Audio

1. Press `Play progression`.
2. Let it finish.
3. Press it again before/after another playback to confirm there are no stuck notes.
4. Press `Another vocal key` and replay.
5. Repeat across at least three suggested keys.

Judge:

- no silence caused by iOS audio locking
- no stuck notes
- no harsh level jumps
- no ridiculous octave jumps between chords
- voicings sound musical enough to write over
- changing key does not change the Roman-numeral family

### Pass 3 — Section / chorus direction

1. Listen to the base progression.
2. Listen to `Play section direction`.
3. Decide whether the second idea feels related to the first rather than random.
4. If the source-observed lesson is "same progression, arrangement/melody creates lift", verify that the interface explains that instead of inventing unnecessary chord changes.

Judge:

- useful contrast
- coherent relationship
- not random
- not always forcing more harmonic complexity

### Pass 4 — Calibration feedback

For multiple spins, use only one feedback label per result:

- `Inspires me`
- `Interesting`
- `Too generic`
- `Not my vibe`

Do not overthink the label. It should capture the first practical studio reaction.

Minimum recommended sample for the first session: 12–20 spins across the three moods.

### Pass 5 — Save / persistence

1. Save at least two directions.
2. Copy one direction.
3. Paste it into Notes and confirm the progression/section text is understandable.
4. Reload Safari.
5. Confirm saved directions still exist.
6. Confirm prior feedback remains stored on the same device.

## Friend/observer role

If another person is present, their job is not to teach harmony or influence every choice. They should observe friction and record reactions such as:

- where the user hesitates
- what control is misunderstood
- whether the user starts humming/writing spontaneously
- when a result feels generic
- when a section variation feels genuinely useful
- whether evidence text distracts from composition

The observer should avoid explaining the interface unless the user is actually stuck. If something requires explanation, that is itself product feedback.

## Acceptance gate

Product V1 is ready for the next integration discussion only if:

- Safari touch/layout has no blocking issue
- Web Audio works reliably after user gestures
- no stuck notes are observed
- playback voicings are judged musically usable
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
2. audio / voicing problem
3. ranking / mood problem
4. corpus / compositional-content problem

Fix the smallest responsible layer instead of redesigning the whole product.

Only after those corrections should Vibe Roulette be considered for Home integration or `main`.
