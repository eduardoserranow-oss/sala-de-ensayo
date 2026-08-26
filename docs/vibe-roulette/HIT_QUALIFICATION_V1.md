# Vibe Roulette — Hit Qualification V1.1

Status: Sprint 1 methodology. This document defines how a track earns the right to influence Vibe Roulette. It is deliberately stricter than "popular song" and deliberately broader than "U.S. Hot 100 Top 10" so culturally important Latin, Caribbean and African records are not erased by one market's chart system.

## 1. Separate three kinds of evidence

Vibe Roulette must never collapse these into one source:

1. **Commercial / impact evidence** — proves that a recording was a hit or culturally essential record under an approved lane.
2. **Harmonic evidence** — proves what the chords/sections actually do.
3. **Editorial mood evidence** — describes how the harmonic behavior maps into Serra's emotional territory.

A source can serve more than one role, but the roles stay explicit in the data.

## 2. Historical calibration corpus: McGill Billboard 2.0

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

For the first verified calibration slice only:

**A song qualifies if it reached Billboard Hot 100 Top 10 AND an expert McGill harmonic annotation exists.**

This is intentionally conservative. It gives us a clean test set for the harmonic engine. It is **not** the permanent definition of a hit for Vibe Roulette.

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

## 5. Permanent qualification must use multiple lanes

A single U.S. all-genre chart would systematically under-value salsa, merengue, reggaetón, Afrobeats and records whose cultural impact happened first or primarily outside the English-language U.S. market.

Vibe Roulette therefore uses three explicit qualification lanes.

### Lane A — Cross-market / mainstream hit

Typical evidence:

- Billboard Hot 100 Top 10
- Billboard Global 200 / Global Excl. U.S. elite performance
- Official UK Singles Chart Top 10
- equivalent high-authority national Top 10 in a major target market
- strong multi-market corroboration

This is the cleanest "global/mainstream hit" lane.

### Lane B — Genre / territory anchor hit

A song can qualify without a U.S. Hot 100 Top 10 if it clearly dominated an authoritative chart that actually represents the culture/genre being studied.

Examples of eligible authorities after source review:

- Billboard Hot Latin Songs
- Billboard Tropical Airplay / Tropical Songs historical context
- Official UK Afrobeats Chart
- TurnTable Nigeria Top 100
- Spotify territory charts as supporting modern evidence
- recognized national charts in Latin America, Europe, Africa and the Caribbean

Typical threshold for an initial candidate:

- No. 1 or sustained Top 5/Top 10 performance, **plus** meaningful longevity or a second supporting signal.

This lane is crucial for salsa, merengue, bachata, reggaetón, dancehall, Afrobeats and other styles that cannot be judged fairly by one English-language all-genre ranking.

### Lane C — Culturally essential / genre-defining override

Some records changed a genre even if contemporary chart infrastructure did not represent that audience well.

This lane is deliberately hard to pass. It requires at least **two independent high-quality impact signals**, such as:

- national recording registry / institutional preservation
- authoritative music-industry reporting explicitly documenting genre-defining impact
- major year-end / decade-end chart distinction
- major award recognition tied to the recording
- strong multi-territory evidence
- documented long-term influence that can be audited

Example currently in research queue: **Daddy Yankee — “Gasolina.”** Its Hot 100 peak alone would not pass Lane A, but Billboard reporting and the U.S. Library of Congress document its unusual role in globalizing reggaetón. It remains blocked from the roulette until the harmonic layer is reviewed.

The override must be explicit in data as `cultural-impact-override-review`; it must never silently lower a numeric threshold.

## 6. Modern era cannot be scored identically to older eras

Candidate evidence layers include:

- Billboard Hot 100 / Billboard Global charts
- Billboard Latin charts
- Spotify Charts / streaming longevity
- Official Charts Company (including Afrobeats)
- national charts where culturally relevant
- RIAA and equivalent certifications where useful
- multi-market recurrence / longevity

A 1964 hit and a 2025 hit cannot be treated as if the same consumption system produced them. Vibe Roulette preserves source era and scores within an era/market before attempting cross-era normalization.

## 7. Harmonic evidence confidence

A song being a hit does not prove that a chord transcription is correct.

Current confidence order:

1. expert / scholarly symbolic annotation
2. professionally curated harmonic database
3. strong community database corroborated by another source
4. in-house reviewed transcription with documented reviewer state
5. single community transcription
6. automatic chord estimation only

For `corpus-v0.1` and the first historical supplement, the harmonic layer is expert McGill annotation, so harmonic confidence is high.

For culturally essential modern songs without open expert annotation, Vibe Roulette must use a reviewed transcription path before feed eligibility.

## 8. Mood evidence is not claimed as scientific fact

The numbers for `illusion`, `nostalgia`, `connection`, `energy`, `tension`, `sensuality`, `brightness`, `stability`, and `movement` are currently a **Serra editorial model**.

They are useful ranking features, not universal statements like "this progression scientifically causes nostalgia."

Future versions can combine:

- Serra editorial labels
- valence/arousal corpora
- listener studies
- section behavior
- genre/context signals

without pretending those layers are equivalent.

## 9. Mood and body energy are separate axes

This is now an engine rule, not merely a branding idea.

A nostalgic result can be:

- low-energy / intimate
- flowing / mid-energy
- highly danceable

The alpha therefore ranks by the selected emotional territory and a separate body-energy target. This prevents the model from equating "nostalgia" with "slow" or "minor ballad."

## 10. Section contrast matters as much as a four-chord loop

Vibe Roulette stores section transitions because hit-writing behavior can include:

- tonic payoff after a verse vamp
- relative-minor or parallel-mode shift
- dominant expansion
- harmonic simplification
- modal turnaround
- no harmonic change at all, with contrast created by groove/arrangement

That last case is important: a hit can prove that the best chorus move is sometimes **not changing the progression**.

## 11. Candidate queue vs feed corpus

`data/vibe-roulette/candidate-intake-v0.2.json` is a research queue, not a roulette source.

A candidate may have excellent hit evidence and still be `feedEligible: false` because its harmonic/section analysis is pending.

This separation is mandatory so research progress never becomes fake musical certainty in the product.

## 12. Gate before production

No progression may be labeled "hit-derived" in the production UI unless:

- its source song qualifies under an active Lane A, B or C policy;
- harmonic evidence is verified;
- the progression/section mapping is auditable;
- any section/chorus variation is source-observed or clearly labeled as an editorial extrapolation;
- editorial mood/energy labels are present and identified as editorial rather than scientific fact.
