# Vibe Roulette — Sprint 1 / Spec V1.2

## Purpose

Vibe Roulette is a composition-direction engine for FORTISSIMO. It must not behave like a random chord generator. It should recommend harmonic starting points derived from verified hit-song evidence, filtered through Serra's emotional territory, requested body energy, musical identity, and vocal profile.

## Serra creative constraints

Initial top-level moods:

- Ilusión
- Nostalgia
- Conexión

Brand/music filter:

- urbano bailable con alma
- emocional pero accesible
- sensual pero elegante
- comercial con identidad
- not aggressive/dominant urban by default
- not generic commercial music without identity
- not disconnected-from-mainstream alternative music
- nostalgia does not imply slow music; it can be active and danceable

Creative questions the system should eventually help answer implicitly:

- What should the listener feel?
- Does it have groove?
- Is it danceable?
- Where is the listener imagined hearing it?
- Does the song establish groove early?
- Who is speaking / what is the POV?

## Vocal profile

Current professional-coach reference:

- documented range: F2–Ab4
- classification in supplied material: tenor
- sweet spot: G3

Important limitation: key alone cannot guarantee vocal fit before a melody exists. V1 ranks keys heuristically and labels the result as a recommendation, never as a certainty. Future versions should evaluate actual melodic tessitura.

## Definition of a functional V1 result

A successful spin returns:

1. mood
2. requested body-energy target
3. progression in Roman numerals
4. transposed chord names
5. suggested key
6. mode
7. evidence/confidence metadata
8. energy, energy-fit and tension profile
9. a section/chorus-variation strategy
10. transposed variation chords
11. playable audio for both base progression and variation
12. enough provenance metadata for the system to explain why the result exists

## Data integrity rule

No progression may be presented as "hit-derived" unless its supporting song/chart/harmonic evidence has been entered and verified. Temporary development records must be marked `provisional: true` and must never be counted as corpus evidence.

Modern/culturally essential songs may enter the **research queue** based on hit evidence while remaining `feedEligible: false` until the harmonic/section gate is complete. Promotion history must be auditable.

## Current corpus layers

### `corpus-v0.1.json`

Historical calibration slice using Billboard Hot 100 Top-10 songs with expert McGill Billboard Project harmonic/section annotations.

### `corpus-v0.2-supplement.json`

Verified historical supplement. The first added record is Santana's "Evil Ways," qualifying through the same historical chart rule and expert McGill annotation. It adds a Latin-rock/modal-groove family without weakening the evidence standard.

### `corpus-v0.3-modern-verified.json`

First feed-eligible modern Latin slice. "Despacito" qualifies as a cross-market/mainstream hit through Billboard evidence and its B-minor `i–VI–III–VII` chorus family is independently corroborated by:

- ChoCo's standardized iReal Pro community partition: Bm–G–D–A
- Hooktheory TheoryTab: B minor, chorus `i–VI–III–VII`

Because both harmonic sources are community-maintained rather than expert annotation, the record is deliberately assigned lower harmonic confidence than McGill records. The verified section lesson is also important: the chorus keeps the core loop, so the suggested contrast is **arrangement/melody/groove lift rather than an invented chord change**.

### `candidate-intake-v0.2.json`

Research-only queue. Despacito has graduated out of the pending list and its promotion is recorded. Remaining candidates include Dákiti, Vivir Mi Vida, Gasolina, Essence and Calm Down.

Vivir Mi Vida now has a ChoCo/iReal community harmonic lead (`Cm7–Ab–Eb–Bb`, normalized as `i7–VI–III–VII`) but remains blocked because one community source is not enough for feed eligibility under the current corroboration rule.

## Core entities

### Song

Stores title, artist, release year, market/territory, genres, source identifiers and corpus status.

### ChartEvidence

Stores why a song qualifies as a hit: chart, peak, weeks/longevity where available, territory, year, certification/streaming evidence when applicable, and source URL/reference.

### SongSection

Stores section type (verse, prechorus, chorus, bridge, intro, outro), key/mode and harmonic sequence.

### Progression

Canonical harmonic family in Roman numerals. Preserve extensions, borrowed chords, applied dominants and inversions when musically meaningful.

### ProgressionOccurrence

Links a progression to a specific song section.

### MoodProfile

Continuous scores rather than one-label classification. Initial dimensions:

- illusion
- nostalgia
- connection
- energy
- tension
- sensuality
- brightness
- stability
- movement

### SectionTransition

Describes changes between sections, especially verse→prechorus, prechorus→chorus and verse→chorus. A useful transition can also be a turnaround or a verified case of no harmonic change.

### VocalProfile

Stores documented range and sweet spot plus future tessitura observations.

### RouletteResult

Stores a generated recommendation, filters used, selected progression, selected key, energy target/fit, section variation and confidence/provenance.

## Hit qualification

V1.2 does not treat one U.S. mainstream threshold as the permanent definition of a hit.

Approved methodology has three lanes:

1. **Cross-market/mainstream hit** — elite performance on major all-genre charts.
2. **Genre/territory anchor hit** — dominant performance on an authoritative chart that represents the style/market being studied.
3. **Culturally essential override** — rare, explicitly documented path requiring multiple independent high-quality impact signals.

The full rules live in `HIT_QUALIFICATION_V1.md`.

## Harmonic evidence tiers

A hit record and a harmonic transcription are separate claims.

Current practical tiers:

1. expert/scholarly symbolic annotation
2. professionally curated harmonic source
3. independently corroborated strong community sources
4. one community source plus documented in-house review
5. one uncorroborated community source — research lead only
6. automatic chord estimation — discovery only until reviewed

The UI may show different confidence for two equally successful hits because their harmonic evidence quality differs.

## Harmonic normalization

Example:

- C–G–Am–F
- D–A–Bm–G
- Eb–Bb–Cm–Ab

all normalize to:

`I–V–vi–IV`

But the model preserves meaningful details such as:

- ii7
- V7
- V/vi
- iv (borrowed)
- bVII
- maj7 / 6 / 9 color where structurally important
- modal major IV inside a minor field
- inversions / slash bass when structurally important

## Mood + Body Energy Engine

Mood and body energy are independent ranking axes.

"Nostalgia" must not force minor mode, low BPM or low energy. A nostalgic result can be:

- calm / intimate
- flowing / mid-energy
- danceable / high-energy

The alpha exposes a body-energy slider. The ranking score combines:

1. mood compatibility
2. requested energy proximity
3. evidence confidence
4. movement/groove affinity
5. Serra-brand compatibility encoded in editorial metadata
6. variety / anti-repetition

Randomness happens only after filtering and weighting.

## Vocal Fit Engine — V1 boundary

Because there is no melody yet, V1 cannot calculate true tessitura fit. V1 should:

- keep the documented profile F2–Ab4 / sweet spot G3 available to the engine
- return several key candidates rather than pretend there is one objectively correct key
- favor keys whose expected melodic center can be placed near the sweet spot under a documented low-confidence heuristic
- allow `Another vocal key` without changing the harmonic family
- preserve headroom for chorus lift
- label confidence as heuristic until melody data exists

## Section / Chorus Variation Engine

The variation suggestion must be a transformation or a source-supported decision not to transform harmony. Strategies include:

- rotate starting degree
- replace one functional chord
- relative-major/minor emphasis
- borrowed chord
- secondary/applied dominant
- stronger or weaker dominant resolution
- deceptive resolution
- cadence change
- modal turnaround
- harmonic-rhythm change
- **constant-loop arrangement contrast** when the hit source demonstrates that chorus lift happens without changing the harmonic loop

Every production-facing variation should be source-observed or clearly labeled editorial extrapolation.

## Audio Engine — V1.2

Use browser-native Web Audio API so the prototype has no external dependency.

Current preview requirements:

- user gesture starts/resumes AudioContext
- stop/cancel previous playback before new playback
- no stuck notes
- play base progression
- play section variation
- retain seventh/color tones when represented in the chord symbol
- use compact voice-leading rather than jumping through root-position block chords
- remain a musical sketching aid, not pretend to be production instrumentation

A dedicated pure voice-leading layer is unit-tested separately from browser audio.

## Sprint 1 automated gates

GitHub Actions currently checks:

- Roman-numeral/harmonic spelling behavior
- intent/energy ranking
- voice-leading behavior
- base verified corpus integrity
- historical supplement integrity
- first modern verified corpus integrity
- research-candidate isolation and promotion audit trail
- isolated UI wiring
- JSON validity

Run #65 passed all of these gates after the first modern Latin promotion.

## Acceptance gate before Home integration

Do not add Vibe Roulette to production Home until:

- the engine runs without console errors on desktop and mobile browsers
- candidate research data cannot leak into production results before harmonic review
- repeated spins do not simply repeat the same progression
- mood and body energy demonstrably affect ranking independently
- base and variation audio both work on real iPhone/PWA and desktop browsers
- audible voicings are musically useful, not merely technically correct
- transposition is correct for all 12 chromatic keys
- the culturally broad verified corpus is expanded beyond the current Santana + Despacito first steps
- no existing FORTISSIMO page is modified or broken
- explicit approval is given before merge/linking from Home
