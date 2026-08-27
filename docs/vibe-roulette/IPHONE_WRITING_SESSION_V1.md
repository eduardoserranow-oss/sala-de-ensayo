# Vibe Roulette — iPhone Writing Session V1

Status: real-device QA continues through the FORTISSIMO Home entry approved by the user.

## Goal

Validate whether Product V1 is genuinely useful in a real songwriting session, not merely technically correct.

The session tests three layers separately:

1. **Product reliability** — touch, layout, playback, persistence and copy behavior.
2. **Musical usefulness** — whether the voicings and section direction create usable composition starts.
3. **Serra fit** — whether the result feels relevant to the selected emotional territory, body energy and Serra identity.

## Device and entry path

Primary validation device: real iPhone.

The user approved a dedicated Vibe Roulette entry in the existing FORTISSIMO Home so QA can continue from the installed Home Screen app instead of relying on a standalone preview URL.

Expected path:

`FORTISSIMO Home → Vibe Roulette → Componer`

## First test song idea

Start with:

- Working title: `Me topé con tu foto`
- Emotional territory: Nostalgia
- Body energy: approximately 70–75%

## Short session protocol

For 5–10 spins:

1. Spin a direction.
2. Listen to the four-bar Soft Human Rhodes V2 performance.
3. Decide quickly: does it inspire, does the mood fit, do the chords feel useful?
4. Try `Another vocal key` once or twice.
5. Listen to the Chorus / Section Direction.
6. Use one feedback button without overthinking.

## Audio checks — Soft Human Rhodes V2

Listen for:

- the displayed BPM making sense for Body Energy
- four full bars actually being audible
- a convincing, softer Rhodes timbre
- different note strengths inside each voicing
- slight finger timing rather than a hard block chord
- open space between left and right hand
- an expressive top voice without hard inner-voice attacks
- useful 7th/9th color without losing the underlying progression
- restrained rhythmic phrasing inspired by the supplied Afrobeats piano-roll reference
- sustain/release that feels intentional
- rotary movement that adds life without dominating
- no stuck notes or Safari audio failure

## Practical-spelling check

The user-facing experience should favor readable spellings. The previously reported `Ebm – Cb – Gb – Db` case should resolve to the practical equivalent `D#m – B – F# – C#` when that pitch center is chosen.

Even if a theoretical spelling such as Cb appears internally, the audio layer must not fail with `Unsupported chord`.

## What to report

Concrete comments are most useful, for example:

- `The Rhodes is soft enough now, but the rotary is still too obvious.`
- `This feels human now, but the right-hand voicings are too dense.`
- `The tempo is right but I want more space between the rhythmic responses.`
- `This immediately gave me a melody.`
- `Nostalgia is still sounding too happy.`
- `Another Vocal Key made it sit better for my voice.`

## Save / persistence check

After finding at least two useful directions:

1. Save at least two directions.
2. Copy one direction.
3. Paste it into Notes and confirm the progression/section text is understandable.
4. Reload/reopen the installed app.
5. Confirm saved directions still exist.
6. Confirm prior feedback remains stored on the same device.

## Acceptance for continued production use

- Home entry opens Vibe Roulette correctly from the installed iPhone app
- touch/layout has no blocking issue
- Web Audio works reliably after user gestures
- no stuck notes are observed
- the Rhodes performance is musically inspiring enough to judge the roulette fairly
- practical key spelling is readable
- Another Key works correctly
- section directions are coherent
- Save/Copy work on iPhone
- saved ideas survive reload
- feedback survives reload
- at least several spins genuinely produce writing ideas

A technically perfect session with consistently uninspiring musical output is still a fail. Musical usefulness remains part of the acceptance gate.
