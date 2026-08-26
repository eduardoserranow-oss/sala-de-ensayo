# Vibe Roulette — Source Registry V1

This registry separates **hit evidence** from **harmonic evidence**. A source can be strong for one purpose and weak for another.

## Tier A — Hit / popularity evidence

### Billboard Hot 100

Role: primary U.S. hit evidence.

Current chart methodology describes the Hot 100 as ranking songs using streaming activity, radio airplay audience impressions and sales data tracked/compiled by Luminate.

Use for:
- chart peak
- weeks / longevity when available
- U.S. cross-genre hit status

Do not use for:
- chord annotation by itself

Reference:
- https://www.billboard.com/charts/hot-100/

### Spotify Charts

Role: modern streaming-era evidence, especially global and territory-level reach.

Spotify Charts publishes global and market charts and exposes chart-entry/peak/streak information in the chart experience. Spotify has also described Top 200 artist/song chart coverage, genre charts and city/local-pulse charts.

Use for:
- modern global/market reach
- peak/streak supporting evidence
- territory and genre context

Do not use as the only hit criterion for pre-streaming eras.

Reference:
- https://charts.spotify.com/
- https://artists.spotify.com/en/blog/celebrating-artist-success-with-spotify-charts

### Official Charts Company (UK)

Role: primary UK chart evidence with useful historical archive coverage.

Official Charts pages expose rank, peak and weeks and have historical weekly chart pages reaching back into the 1950s. Their rules state the objective of reflecting popularity through genuine transactions; modern chart methodology combines streaming and sales under published chart rules.

Use for:
- UK hit status
- historical cross-checks
- peak and weeks
- second-market confirmation for global songs

References:
- https://www.officialcharts.com/charts/singles-chart/
- https://www.officialcharts.com/sites/default/files/2023-08/Official%20UK%20Singles%20Chart%20Rules%20August%202023.pdf

### RIAA Gold & Platinum

Role: U.S. certification evidence.

RIAA describes Gold & Platinum awards as a benchmark of success in the recorded-music industry and provides searchable certification records.

Use for:
- supporting commercial-success evidence
- longevity/catalog significance where certifications remain meaningful

Do not treat certification as a harmonic source.

Reference:
- https://www.riaa.com/gold-platinum/

## Tier A — Harmonic / structural evidence

### McGill Billboard Project 2.0

Role: high-trust historical harmonic ground truth.

The McGill/Digital Distributed Music Archives & Libraries project publishes expert chord annotations under CC0. The 2.0 release describes annotations/features for 890 sampled Billboard chart slots representing 740 distinct songs, with corrected/improved annotations and structural metadata.

Use for:
- chord ground truth
- section/structure-aware harmonic analysis
- historical pattern statistics
- validating our normalization pipeline

Strength:
- expert-annotated and research-oriented
- legally reusable CC0 annotation data

Limitation:
- not a complete 1950–2026 corpus; must be combined with other sources

Reference:
- https://ddmal.ca/research/The_McGill_Billboard_Project_%28Chord_Analysis_Dataset%29/

## Tier B — Harmonic discovery / secondary verification

### Hooktheory TheoryTab / Trends API

Role: large-scale harmonic discovery and progression-frequency evidence.

Hooktheory currently describes Trends as being powered by a database of 75,000+ song analyses. Its documented API exposes:
- next-chord probabilities
- songs/sections containing a requested progression

The API documentation currently states a rate limit of 10 requests per 10 seconds and does not offer a full TheoryTab dump.

Use for:
- discovering progression families
- estimating common next-chord behavior
- locating candidate songs/sections to verify
- cross-checking section-level progression usage

Important limitation:
- community/crowdsourced harmonic data should not automatically outrank expert annotation
- Hooktheory presence does not itself prove that a song qualifies as a hit
- therefore Hooktheory harmonic evidence must be joined with separate hit evidence

References:
- https://www.hooktheory.com/trends
- https://www.hooktheory.com/api/trends/docs

## Evidence-join rule

A production corpus record should ideally satisfy two independent questions:

1. **Was this song demonstrably successful?**
   - Billboard / Official Charts / Spotify Charts / certification or another approved market source.

2. **What is the harmonic behavior, and how confident are we?**
   - expert annotation, verified section analysis, Hooktheory cross-check, or our own reviewed transcription.

The system must not infer question 1 from question 2.

## Initial evidence classes

Suggested internal classes:

- `A_HIT_PRIMARY`: primary chart evidence
- `A_HARMONY_EXPERT`: expert/research chord annotation
- `B_HIT_SUPPORT`: streaming/certification/secondary-market support
- `B_HARMONY_COMMUNITY`: large community harmonic database
- `C_MANUAL_REVIEW`: in-house reviewed transcription/analysis
- `PROVISIONAL`: development-only, never counted as hit-corpus evidence

## Next source-audit work

Still to evaluate before the corpus scales:

- reliable Latin-market historical chart sources by territory
- salsa/merengue historical success evidence where Billboard coverage is incomplete
- Nigeria/Africa market and streaming chart history for afrobeat/afropop
- IFPI/global-recording-industry sources
- additional research chord corpora
- legal/technical limits for automated collection from each source
