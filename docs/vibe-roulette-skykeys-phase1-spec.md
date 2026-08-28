# S.K.Y. Keys Phase 1 — Audit + Implementation Specification

Status: **Phase 1 complete / ready for Phase 2 prototype**

## Goal

Integrate the S.K.Y. Keys library as a downstream sound layer for Vibe Roulette while protecting all existing composition and pianist intelligence.

Canonical chain:

`Chord/Progression Generator → Existing Pianist → Sound Direction → S.K.Y. Keys Sound Engine → Audio`

The S.K.Y. work must **not** change the notes, voicings, inversions, timing, velocities, A/A′ memory, or harmonic choices produced upstream.

## Source audit

Primary Drive source: `/Google Drive/S.K.Y. Keys`

Primary metadata source: `-Settings/S.K.Y. Keys Settings.txt`

Parsed preset records: **222**

ID range: **1–242**

Missing IDs in the settings sequence are preserved and must never be renumbered: `6, 21, 51, 59, 118, 124, 137, 142, 151, 169, 179, 184, 187, 188, 191, 197, 199, 216, 222, 231`.

### Original two-axis taxonomy

Function category:
- 1 = Keys
- 2 = Chords
- 3 = Pads
- 4 = Plucks
- 5 = raw settings label `Textures`; FORTISSIMO canonical UI/function name = `Leads`

Source/character:
- 1 = Synths
- 2 = Effected
- 3 = Vintage Tape
- 4 = Acoustic

Counts by function:
- Keys: 59
- Chords: 74
- Pads: 46
- Plucks: 28
- Leads: 15

Counts by source:
- Synths: 91
- Effected: 90
- Vintage Tape: 22
- Acoustic: 19

Original internal sections are preserved as metadata: Pads, Keys, Plucks, Panoptogon, Real Keys, Guitars, Keys Pedal, Pads Pedal, Complex, Pedal Chords, Vocals, Synth Digital, Layered, Leads.

The complete 222-preset audit table is stored at `data/vibe-roulette/skykeys-catalog-v1.csv`.

## Original preset parameter contract

The source settings define 37 fields per preset:

`ID #, Sound Type #, Source Type #, Attack, Release, Overlap, Voices, Loop Bool, Glide, Legato, Rotate, TSPower, Tone Shifts, Reverse Power, Reverse Division, Reverse Continuous, Rev Fade in, Vibrato Power, Vibrato Depth, Vibrato Speed, Flutter, Reverb, Reverb Mix, Reverb Length, Reverb Tone, Filter Power, Low pass, High Pass, Filter Slope, Start, Loop Start, Loop End, Reverse End, Reverse Start, Saturation, Tone Range, Stereo`

Phase 2 determines which parameters can be represented 1:1 in Web Audio, which require approximation, and which are sample-baked.

## Multisample mapping findings

Observed FLAC naming convention:

`<MIDI note number>-<zone label>.flac`

Validated example:
- `Beautiful Rhodes/060-dow.flac`
- 44.1 kHz
- stereo
- 24-bit FLAC
- ~3.171 s
- detected fundamental ≈ MIDI 59.955, validating numeric prefix 060 as C4/root MIDI mapping.

Observed library patterns include:
- sparse mapped instruments such as Beautiful Rhodes, with anchor samples across the keyboard;
- dense instruments such as Grand Piano, with near note-by-note coverage from MIDI 21 through 109.

Phase 2 must derive each pilot preset's complete zone map from the folder itself before playback.

## FORTISSIMO producer profile schema

Each preset keeps its original identity and receives a separate, non-destructive producer profile:

- `pianist_compatibility`: preferred / conditional / restricted
- role suitability seed scores:
  - main_harmony
  - rhythmic_chords
  - support_pad
  - pluck_arp
  - hook_lead
  - texture
- guardrail
- emotion_tags
- body_energy_range
- vocal_space_score
- afro_afropop_score
- neo_soul_hands_score
- audio_profile_status

Phase 1 seeds only structural role eligibility. Emotional/timbral scores remain unfilled until Phase 2 measurements/listening and later Sound Direction work.

### Guardrails

- **Real Keys / Keys**: preferred candidates for the existing pianist.
- **Guitars**: never receive full pianist voicings automatically; require guitar-appropriate patterns in a future layer.
- **Vocals**: primarily hook/texture/support; not a default pianist instrument.
- **Leads**: not a default full-harmony instrument.
- **Pads**: support/sustain role by default; control voicing density.
- **Plucks**: rhythmic/arp/hook role by default.
- **Chords**: conditional until Phase 2 confirms there is no encoded-harmony conflict.

## Phase 2 pilot set

Recommended isolated prototype set:
1. Beautiful Rhodes — reference sparse multisample key.
2. Soft Piano — alternate real key.
3. Modest Wurli — electric-key articulation.
4. Grand Piano — dense note-by-note stress test.
5. Smooth Pluck — pluck/rhythmic behavior.
6. Maybe Pad — sustained/loop behavior.
7. Nylon Guitar — negative/guardrail test: ensure the pianist is not blindly routed into inappropriate acoustic articulation.

## Phase 2 acceptance gates

Do not integrate into Vibe Roulette until all gates pass:

1. **Pitch mapping:** played MIDI resolves to the correct root/nearest sample.
2. **Envelope:** attack/release behavior matches source settings closely enough for musical use.
3. **Polyphony/overlap:** note stealing and overlap are intentional; no stuck notes.
4. **Looping:** loop-enabled presets sustain without clicks or discontinuity.
5. **Stereo:** stereo source and preset setting behavior are preserved/approximated safely.
6. **Performance invariance:** identical input seed/performance plan produces identical pianist notes/timing/velocity before and after sound-engine attachment.
7. **Mobile performance:** no unacceptable stalls, memory spikes, or repeated full-library downloads.
8. **Fallback:** if a preset fails to load, audio falls back to the current Rhodes path without changing the composition.

## Loading strategy

Do **not** ship or preload the full S.K.Y. Keys library in the initial page bundle.

Use:
- manifest/catalog metadata in-app;
- lazy loading per selected preset;
- sample cache after first use;
- optional curated starter set;
- later CDN/object-storage hosting for production.

The catalog is metadata only and contains no FLAC payloads.

## Phase boundary

Phase 1 changes metadata/specification only. It does not change runtime audio, pianist behavior, progression generation, drums, Taste Training, transport, or UI.

Phase 2 may build an isolated sampler prototype but still must not alter the upstream pianist or progression engine.
