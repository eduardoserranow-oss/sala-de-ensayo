# Vibe Roulette — Source Registry V1

This registry separates **hit evidence** from **harmonic evidence**. A source can be strong for one purpose and weak for another.

## Tier A — Hit / popularity evidence

### Billboard Hot 100

Role: primary U.S. cross-genre hit evidence.

Current chart methodology describes the Hot 100 as ranking songs using streaming activity, radio airplay audience impressions and sales data tracked/compiled by Luminate.

Use for:
- chart peak
- weeks / longevity when available
- U.S. cross-genre hit status

Do not use for:
- chord annotation by itself

Reference:
- https://www.billboard.com/charts/hot-100/

### Billboard Hot Latin Songs

Role: primary U.S. Latin-market hit evidence across Latin genres.

Billboard describes Hot Latin Songs as ranking the week's most popular current Latin songs across genres. The modern chart blends streaming, radio airplay and sales data. The chart dates to 1986, although its methodology changed over time; therefore every record must retain the chart era/methodology rather than treating a 1988 position as directly equivalent to a 2026 position.

Use for:
- Latin hit qualification
- peak and longevity
- cross-genre Latin comparisons inside the same methodology era

Important limitation:
- it is a U.S. Latin-market chart, not a substitute for local-market evidence in the Dominican Republic, Puerto Rico, Colombia, Mexico, Nigeria, etc.

References:
- https://www.billboard.com/charts/latin-songs/
- https://www.billboard.com/charts/genre/latin/

### Billboard Tropical Airplay / Tropical charts

Role: supporting evidence for salsa, merengue, bachata and other tropical-market recordings, especially from the 1990s onward.

Billboard's Tropical Airplay history begins in 1994. It is useful because a salsa record can be culturally huge without dominating the all-genre Hot 100.

Use for:
- tropical hit evidence by era
- salsa / merengue / bachata market context
- corroborating major tropical records

Do not use as the only definition of historical salsa importance before the chart existed.

References:
- https://www.billboard.com/charts/genre/latin/
- https://www.billboard.com/music/latin/daddy-yankee-don-omar-aventura-top-20-tropical-songs-all-time-8478239/

### Spotify Charts

Role: modern streaming-era evidence, especially global and territory-level reach.

Spotify Charts publishes global and market charts and exposes chart-entry/peak/streak information in the chart experience. Spotify has also described Top 200 artist/song chart coverage, genre charts and city/local-pulse charts.

Use for:
- modern global/market reach
- peak/streak supporting evidence
- territory and genre context

Do not use as the only hit criterion for pre-streaming eras.

References:
- https://charts.spotify.com/
- https://artists.spotify.com/en/blog/celebrating-artist-success-with-spotify-charts

### Official Charts Company (UK)

Role: primary UK chart evidence with useful historical archive coverage.

Official Charts states that its modern system counts sales and streams from thousands of sources and captures nearly the full UK singles market. Historical and modern methodology differ, so era metadata must be retained.

Use for:
- UK hit status
- historical cross-checks
- peak and weeks
- second-market confirmation for global songs

References:
- https://www.officialcharts.com/about/
- https://www.officialcharts.com/charts/singles-chart/
- https://www.officialcharts.com/getting-into-the-charts/how-the-charts-are-compiled/

### Official UK Afrobeats Chart

Role: high-value modern Afrobeats market evidence outside Africa.

The Official Charts Company launched the dedicated UK Afrobeats chart in 2020. It is compiled from UK sales and streaming data; current chart pages expose position, peak and weeks.

Use for:
- modern Afrobeats/afropop crossover evidence
- UK longevity and peak
- secondary-market confirmation for African hits

Do not use as a replacement for Nigerian/local African popularity evidence.

References:
- https://www.officialcharts.com/charts/afrobeats-chart/
- https://www.officialcharts.com/chart-news/first-ever-official-afrobeats-chart-to-launch-this-week-to-celebrate-rise-of-afrobeats-in-the-uk__30265/

### TurnTable Nigeria Top 100

Role: primary modern Nigerian-market evidence candidate.

TurnTable publishes the Nigeria Top 100 as a weekly chart combining streaming and airplay inside Nigeria. Its published methodology describes a 50/50 streaming-airplay model, with differing weights for paid, freemium and ad-supported streaming services.

Use for:
- Nigeria-local hit qualification from the chart's launch era
- local peak / presence
- preventing a UK/US-only definition of Afrobeats success

Important limitation:
- methodology and platform coverage can evolve; archive date and active methodology must accompany each imported record.

References:
- https://www.turntablecharts.com/
- https://www.turntablecharts.com/news/480

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

### ChoCo — the Chord Corpus

Role: large research corpus and normalization layer for harmonic annotations.

ChoCo integrates and standardizes 20K+ timed chord annotations from multiple research/community partitions, with Harte chord notation, tonality/modulation data and some structural segmentation. It includes partitions such as Isophonics, JAAH and Billboard and exposes both JAMS data and a knowledge-graph representation.

Use for:
- broadening harmonic coverage beyond McGill
- standardized parsing/normalization
- cross-corpus progression-frequency research
- identifying duplicate evidence inherited from the same original corpus

Critical rule:
- ChoCo is an aggregator. A ChoCo record inherits the trust/licensing/provenance of its underlying partition. We must not double-count McGill Billboard once via McGill and again via ChoCo as two independent confirmations.

References:
- https://github.com/smashub/choco
- https://zenodo.org/records/7193888

### CoCoPops

Role: coordinated popular-music meta-corpus for comparable melodic/harmonic data.

Use for:
- future melodic + harmonic research
- emotion/expectation studies where compatible annotations exist
- checking whether a song appears in another research corpus

Reference:
- https://github.com/Computational-Cognitive-Musicology-Lab/CoCoPops

## Tier B — Harmonic discovery / secondary verification

### Harmory — the Harmonic Memory

Role: research-driven harmonic-pattern discovery built from ChoCo.

Harmory models recurring and similar harmonic segments and is explicitly designed for transparent, accountable, musically plausible creative applications.

Use for:
- discovering recurring pattern families
- section-to-section similarity/novelty research
- future recommendation logic beyond exact progression matching

Do not count Harmory as independent song evidence when its source pattern came from ChoCo/McGill; preserve lineage.

Reference:
- https://github.com/smashub/harmory

### Hooktheory TheoryTab / Trends API

Role: large-scale harmonic discovery and progression-frequency evidence.

Hooktheory currently describes Trends as being powered by a database of 75,000+ song analyses. Its documented API exposes:
- next-chord probabilities
- songs/sections containing a requested progression

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

## Specialist datasets — useful but not chord ground truth

### Salsa Dataset (Icesi / Pompeu Fabra / TISMIR)

Role: expert-validated rhythmic reference for salsa.

The academic Salsa Dataset contains 124 salsa tracks and expert beat annotations, with a multi-stage expert review process. It is valuable for future groove/beat modeling and for identifying a curated salsa repertoire.

Use for:
- salsa beat/groove research
- rhythmic validation
- curated repertoire discovery

Do **not** use it as chord evidence: its published purpose is beat estimation and its released labels are beat annotations, not harmonic transcriptions.

References:
- https://zenodo.org/records/13120822
- https://doi.org/10.5334/tismir.183

## Evidence-join rule

A production corpus record should ideally satisfy two independent questions:

1. **Was this song demonstrably successful?**
   - approved chart / certification / market source.

2. **What is the harmonic behavior, and how confident are we?**
   - expert annotation, verified section analysis, Hooktheory cross-check, or our own reviewed transcription.

The system must not infer question 1 from question 2.

## Provenance rule: do not fake independence

If database B imported its chord annotation from database A, A+B count as **one lineage**, not two confirmations. Vibe Roulette must store the ultimate source partition whenever known.

Example:
- McGill annotation directly + the same McGill annotation exposed through ChoCo = one harmonic source lineage.
- McGill expert annotation + a separately produced reviewed transcription = two lineages.

## Initial evidence classes

- `A_HIT_PRIMARY`: primary chart evidence
- `A_HARMONY_EXPERT`: expert/research chord annotation
- `B_HIT_SUPPORT`: streaming/certification/secondary-market support
- `B_HARMONY_RESEARCH_AGGREGATE`: research aggregate with source lineage retained
- `B_HARMONY_COMMUNITY`: large community harmonic database
- `C_RHYTHM_EXPERT`: expert beat/groove annotation, not chord truth
- `C_MANUAL_REVIEW`: in-house reviewed transcription/analysis
- `PROVISIONAL`: development-only, never counted as hit-corpus evidence

## Next source-audit work

Still to evaluate before the corpus scales:

- historical salsa/Fania commercial evidence before dedicated Billboard tropical charts
- Dominican merengue historical chart/certification evidence
- Puerto Rico / Dominican Republic / Colombia / Mexico market archives
- Latin Grammy / Grammy awards as supporting cultural evidence (not a replacement for charts)
- older Nigerian/African hit evidence before TurnTable
- IFPI/global-recording-industry sources
- legal/technical limits for automated collection from each source
- a reviewed harmonic-analysis workflow for culturally essential songs that lack open expert chord corpora
