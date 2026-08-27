# Vibe Roulette — Compositional Value V1

Status: Sprint 1 refinement prompted by corpus review.

## Why this exists

Commercial success and compositional usefulness are not the same thing.

A song can be an enormous hit while using a deliberately simple harmonic loop. That record is still valid hit evidence, but it should not automatically dominate Vibe Roulette recommendations merely because its chart performance is exceptional.

Vibe Roulette therefore separates:

1. **Hit / Impact Score** — how strongly the song is proven as a successful or culturally essential record.
2. **Harmonic Evidence Confidence** — how reliable the chord/section transcription is.
3. **Compositional Value Score** — how much the record teaches us for songwriting direction.
4. **Serra Relevance Score** — how useful the lesson is for Serra's emotional, rhythmic and stylistic identity.

The roulette recommendation weight must never be a synonym for chart success.

## Compositional Value dimensions

Each reviewed song can receive editorial/research scores for:

- `harmonicRichness`: extensions, modal color, borrowed harmony, secondary dominants, non-trivial functional movement.
- `sectionContrast`: how meaningfully verse/pre/chorus/bridge differ harmonically.
- `transformationalUsefulness`: whether the song demonstrates a reusable songwriting move, e.g. rotating the same chord pool for the chorus.
- `melodicHarmonicInteraction`: whether chord/melody tension or register behavior adds a useful lesson.
- `grooveArrangementDependency`: how much the record proves that arrangement/groove can create section lift even with static harmony.
- `emotionalSpecificity`: whether the harmonic behavior maps clearly to an emotional territory rather than generic major/minor labeling.
- `novelty`: how unusual the progression/section behavior is relative to the corpus.

These are not scientific truth claims. They are auditable editorial/research features used to prevent the corpus from becoming a popularity contest.

## Recommendation rule

A high Hit Score is an admission criterion, not a guarantee of high recommendation weight.

A simple chart monster can contribute a lesson such as:

- persistent loop + arrangement lift
- strong groove with low harmonic motion
- memorable melody over static harmony

but it should not crowd out richer examples when the user wants sophisticated harmonic direction.

Future scoring should allow a user-facing/internal intent similar to:

- `direct`: favor simpler, highly proven harmonic families
- `balanced`: favor strong hit evidence plus useful section craft
- `rich`: favor harmonically or structurally richer hit-derived ideas

No such user-facing switch is required in Sprint 1; the data model should support it.

## Immediate analysis findings

### Dákiti — Bad Bunny & Jhay Cortez

- Commercial evidence: Billboard Hot Latin Songs No. 1 for 27 weeks; also a major Hot 100 crossover hit.
- Harmonic sources currently reviewed: Hooktheory, Chordify, Cifra Club.
- Tonal center: E minor.
- Repeated core loop corroborated by Chordify/Cifra Club: `C – Am – Em – D`.
- Normalized in E minor: `VI – iv – i – VII`.
- Hooktheory reports the chorus in E minor, 110 BPM, with relatively low chord complexity and a narrow melodic range in the analyzed chorus.
- Lesson: atmospheric/minimal harmony can still produce a strong modern emotional identity; this is useful for Serra, but it should be scored as a different kind of craft than a harmony-dense record.

### Por Amar a Ciegas — Arcángel

- Cultural/catalog evidence: the song remains a major Arcángel catalog record and was selected for a special Latin GRAMMY 2022 pre-show performance years after release.
- Production credits reported by Shazam include Luny Tunes, Noriega and Tainy.
- Harmonic corroboration currently available from Chordify, Cifra Club and Lamucal.
- Tonal center: G minor.
- Verse/core loop: `Gm – F – Eb – Cm` = `i – VII – VI – iv`.
- Chorus begins from the same chord pool but reorders the emotional center: `Eb – Cm – Gm – F` = `VI – iv – i – VII`, with `Cm7` / `F7` color appearing in section detail.
- Lesson: **same harmonic vocabulary, different starting degree/order** can create a real chorus identity. This is exactly the kind of source-observed transformation Vibe Roulette's Chorus Variation Engine should learn.

This song should not be forced into the corpus under a fake mainstream-chart claim. It should be evaluated under the genre/catalog/cultural-impact lane with independent longevity evidence.

### Suavemente — Elvis Crespo

- Historical hit evidence: No. 1 on Billboard Hot Latin Tracks; contemporary Billboard archive confirms the chart leadership.
- Harmonic sources: Hooktheory + Chordify.
- Hooktheory: C minor, 125 BPM, 2/4, borrowed-chord behavior, materially higher chord-progression novelty/complexity than the minimalist modern loops reviewed above.
- Lesson: high-energy merengue can carry modal/borrowed harmonic color; this is especially valuable for preventing the 'danceable = harmonically simple' bias.

### A Puro Dolor — Son by Four

- Billboard Hot Latin Songs: No. 1 for 20 weeks.
- Chord sources currently reviewed: Chordify + Cifra Club.
- The arrangement uses a longer verse/pre/chorus harmonic sentence than a single four-chord loop, including inversions and ii/iii-family motion in common transcriptions.
- Lesson: nostalgia/pop-tropical writing can preserve accessibility while giving sections more harmonic narrative.

### Todo Tiene Su Final — Héctor Lavoe

- Hooktheory exposes a substantially more elaborate F-minor section vocabulary than the modern four-chord-loop examples, including `i`, `iv`, `V7`, `VI`, `VII`, `III` and other functional movement in the analyzed intro.
- Historical/cultural hit evidence still needs to be documented under the salsa lane before feed eligibility.
- Lesson target: salsa's harmonic motion and turnaround language should be represented as a first-class source of compositional craft, not as decorative genre coverage.

## Next analysis batch

Priority is not 'biggest songs first'. Priority is **coverage of different compositional lessons**.

### Modern urbano / reggaetón
- Dákiti — Bad Bunny & Jhay Cortez
- Por Amar a Ciegas — Arcángel
- Gasolina — Daddy Yankee
- Lo Siento BB:/ — Tainy, Bad Bunny, Julieta Venegas
- Callaíta — Bad Bunny & Tainy
- one or two Tainy-led records with richer color/section behavior

### Salsa / tropical
- Vivir Mi Vida — Marc Anthony
- A Puro Dolor — Son by Four
- Todo Tiene Su Final — Héctor Lavoe
- one Fania-era song with clearly reviewed harmonic structure

### Merengue / Dominican-Caribbean
- Suavemente — Elvis Crespo
- one Juan Luis Guerra hit with stronger harmonic movement
- one modern merengue/merenguetón reference when hit evidence and harmonic sources are sufficient

### Bachata / Dominican diaspora
- Propuesta Indecente — Romeo Santos
- one additional major bachata hit with contrasting section behavior

### Afrobeats / afropop
- Essence — Wizkid feat. Tems
- Calm Down — Rema / Selena Gomez
- one Fela Kuti-era cultural anchor for groove/harmonic-vamp contrast

### Pop / soul / harmonic craft anchors
- Stevie Wonder
- Michael Jackson
- The Beatles / Paul McCartney
- Bruno Mars / Silk Sonic

The point of these anchors is not genre prestige. They give the model examples where chord color, voice-leading and section writing are unusually instructive.

## Corpus balance rule

Before Home integration, the verified feed should contain a useful spread of:

- simple-loop hits
- medium-complexity hits
- harmony-rich hits
- songs with strong section contrast
- songs with almost no harmonic section contrast but strong arrangement/groove lessons
- Latin/Caribbean/African and Anglo/global examples

The target is not to prove that complicated harmony is better. The target is to prevent Vibe Roulette from learning the false rule that 'most successful = most useful progression.'
