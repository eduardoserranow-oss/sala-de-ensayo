# Vibe Roulette — Hit Qualification V1

Status: Sprint 1 methodology. This document defines how a track earns the right to influence Vibe Roulette. It is deliberately stricter than "popular song".

## 1. Separate three kinds of evidence

Vibe Roulette must never collapse these into one source:

1. **Commercial evidence** — proves that a recording was a hit.
2. **Harmonic evidence** — proves what the chords/sections actually do.
3. **Editorial mood evidence** — describes how the harmonic behavior maps into Serra's emotional territory.

A source can serve more than one role, but the roles stay explicit in the data.

## 2. Historical corpus: McGill Billboard 2.0

For the first historical slice, the McGill Billboard Project is unusually useful because its index includes:

- chart date
- actual chart rank at the sampled slot
- peak Billboard Hot 100 rank
- weeks on chart

Its expert annotations separately provide:

- tonic
- metre
- named sections such as verse / chorus / bridge
- beat-level chord annotations

The DDMAL release is CC0 and requests scholarly citation.

Authority: https://ddmal.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/

## 3. Acceptance rule for corpus-v0.1

For the first verified slice only:

**A song qualifies if it reached Billboard Hot 100 Top 10 AND an expert McGill harmonic annotation exists.**

This is intentionally conservative. It gives us a clean calibration set before broadening the definition of hit.

The first slice therefore uses only songs with `peakRank <= 10`.

## 4. Historical Hit Score V1

A numeric score may help order evidence inside the already-qualified pool. It is NOT yet a universal cross-era score.

For McGill-era Hot 100 songs:

```text
peakComponent = 1 - ((peakRank - 1) / 99)
longevityComponent = min(weeksOnChart / 30, 1)
historicalHitScoreV1 = 0.70 * peakComponent + 0.30 * longevityComponent
```

Why peak gets more weight in V1:

- the first corpus is already Top-10 restricted;
- peak position is a strong success signal;
- weeks on chart protects us from one-week spikes;
- the formula remains simple enough to audit.

This score must be recalibrated before it is compared directly with streaming-era success.

## 5. Modern era cannot be scored identically

For later decades we will build an era-aware score. Candidate evidence layers include:

- Billboard Hot 100 / Billboard Global charts
- Spotify Charts / streaming longevity
- national charts where culturally relevant
- RIAA and equivalent certifications where useful
- multi-market recurrence / longevity

A 1964 hit and a 2025 hit cannot be treated as if the same consumption system produced them. Vibe Roulette will preserve the source era and score within an era before attempting any cross-era normalization.

## 6. Harmonic evidence confidence

A song being a hit does not prove that a chord transcription is correct.

Current confidence order:

1. expert / scholarly symbolic annotation
2. professionally curated harmonic database
3. strong community database corroborated by another source
4. single community transcription
5. automatic chord estimation only

For `corpus-v0.1`, the harmonic layer is expert McGill annotation, so the harmonic evidence confidence is high.

## 7. Mood evidence is not claimed as scientific fact

The numbers for `illusion`, `nostalgia`, `connection`, `energy`, `tension`, `sensuality`, `brightness`, `stability`, and `movement` are currently a **Serra editorial model**.

They are useful ranking features, not universal statements like "this progression scientifically causes nostalgia."

Future versions can combine:

- Serra editorial labels
- valence/arousal corpora
- listener studies
- section behavior
- genre/context signals

without pretending those layers are equivalent.

## 8. Section contrast matters as much as a four-chord loop

Vibe Roulette stores section transitions because hit-writing behavior can include:

- tonic payoff after a verse vamp
- relative-minor or parallel-mode shift
- dominant expansion
- harmonic simplification
- no harmonic change at all, with contrast created by groove/arrangement

That last case is important: a hit can prove that the best chorus move is sometimes **not changing the progression**.

## 9. Gate before production

No progression may be labeled "hit-derived" in the production UI unless:

- its source song qualifies under the active hit policy;
- harmonic evidence is verified;
- the progression/section mapping is auditable;
- any chorus variation is either source-observed or clearly labeled as an editorial extrapolation.
