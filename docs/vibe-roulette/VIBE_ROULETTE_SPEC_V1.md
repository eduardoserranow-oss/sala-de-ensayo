# Vibe Roulette — Sprint 1 / Spec V1

## Purpose

Vibe Roulette is a composition-direction engine for FORTISSIMO. It must not behave like a random chord generator. It should recommend harmonic starting points derived from verified hit-song evidence, filtered through Serra's emotional territory, musical identity, and vocal profile.

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

Important limitation: key alone cannot guarantee vocal fit before a melody exists. V1 may rank keys heuristically and label the result as a recommendation, never as a certainty. Future versions should evaluate actual melodic tessitura.

## Definition of a functional V1 result

A successful spin returns:

1. mood
2. progression in Roman numerals
3. transposed chord names
4. suggested key
5. mode
6. evidence/confidence metadata
7. energy and tension profile
8. a chorus-variation strategy
9. transposed chorus-variation chords
10. playable audio for both base progression and chorus variation
11. enough provenance metadata for the system to explain why the result exists

## Data integrity rule

No progression may be presented as "hit-derived" unless its supporting song/chart/harmonic evidence has been entered and verified. Temporary development records must be marked `provisional: true` and must never be counted as corpus evidence.

## Core entities

### Song

Stores title, artist, release year, market/territory, genres, source identifiers and corpus status.

### ChartEvidence

Stores why a song qualifies as a hit: chart, peak, weeks, territory, year, certification/streaming evidence when applicable, and source URL/reference.

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

Describes changes between sections, especially verse→prechorus, prechorus→chorus and verse→chorus.

### VocalProfile

Stores documented range and sweet spot plus future tessitura observations.

### RouletteResult

Stores a generated recommendation, filters used, selected progression, selected key, chorus variation and confidence/provenance.

## Hit Score — design requirement

Sprint 1 defines the structure but does not lock weights until source availability is audited. Score must support era-sensitive evidence. Signals can include:

- chart peak
- weeks on chart / longevity
- cross-market reach
- year-end or decade-level recognition
- certifications where comparable
- streaming performance for modern releases
- historically important chart evidence

The score must not disadvantage older music because streaming did not exist, and must not overvalue modern streaming when chart history is weak.

## Harmonic normalization

Example:

- C–G–Am–F
- D–A–Bm–G
- Eb–Bb–Cm–Ab

all normalize to:

`I–V–vi–IV`

But the model must preserve meaningful details such as:

- ii7
- V7
- V/vi
- iv (borrowed)
- bVII
- maj7 / 6 / 9 color where structurally important
- inversions / slash bass when structurally important

## Mood Engine

Mood selection is multidimensional. "Nostalgia" must not force minor mode, low BPM or low energy. A nostalgic result can be active, danceable and bright while still carrying longing/retrospection.

The mood engine will rank candidates by:

1. mood compatibility
2. Serra-brand compatibility
3. evidence confidence
4. variety / anti-repetition
5. section-use relevance
6. vocal-key heuristic

Randomness happens only after filtering and weighting.

## Vocal Fit Engine — V1 boundary

Because there is no melody yet, V1 cannot calculate true tessitura fit. V1 should:

- keep the documented profile F2–Ab4 / sweet spot G3 available to the engine
- return several key candidates rather than pretend there is one objectively correct key
- favor keys whose expected melodic center can be placed comfortably near the sweet spot under a documented heuristic
- preserve headroom for chorus lift
- label confidence as heuristic until melody data exists

## Chorus Variation Engine

The chorus suggestion must be a transformation, not an unrelated random progression. Strategies to support:

- rotate starting degree
- replace one functional chord
- relative-major/minor emphasis
- borrowed chord
- secondary/applied dominant
- stronger or weaker dominant resolution
- deceptive resolution
- cadence change
- harmonic-rhythm change

Later corpus work will attach real section-transition evidence and frequencies to these strategies.

## Audio Engine — V1

Use browser-native Web Audio API so the prototype has no external dependency. Requirements:

- user gesture starts/resumes AudioContext
- chord playback with short envelopes
- no stuck notes
- play base progression
- play chorus variation
- stop/cancel previous playback before a new one starts

V1 audio is harmonic-preview audio, not production-grade instrumentation.

## Sprint 1 deliverables

- isolated Git branch
- documented data contract
- provisional seed dataset explicitly marked non-corpus
- deterministic/weighted recommendation engine
- Roman-numeral transposition utility
- chorus-variation utility
- browser audio preview
- standalone `vibe-roulette.html` prototype not linked into production home yet
- no changes to `main` until review

## Acceptance gate before Home integration

Do not add Vibe Roulette to production Home until:

- the engine runs without console errors on desktop and mobile browsers
- provisional data is visibly distinguished from verified corpus data internally
- repeated spins do not simply repeat the same progression
- base and chorus audio both work
- transposition is correct for all 12 chromatic keys
- no existing FORTISSIMO page is modified or broken
