# Vibe Roulette — Rhodes FM Asset

## Selected instrument

Vibe Roulette Product V1 uses the generated `audio/rhodes-fm/` instrument from Daniel Podrazka's `danielpodrazka/piano` project.

Source repository:

- https://github.com/danielpodrazka/piano
- sample directory: `audio/rhodes-fm/`

## License

The upstream repository license explicitly lists `audio/rhodes-fm/` under generated audio distributed with the MIT License.

Do not substitute the separate `audio/rhodes/` reference folder: those jRhodes3d reference samples are CC BY-NC 4.0 and are not our production asset.

## User-supplied archive validation

Archive received for Vibe Roulette:

`danielpodrazka piano main audio-rhodes-fm.zip`

Validated structure:

- 52 root-note MP3 files
- `v1/` through `v8/`
- each velocity folder contains 52 MP3 files
- 468 MP3 files total
- note coverage: B1 through D6, chromatic
- 8 discrete velocity/timbre layers
- inspected C4 samples are approximately 5.04 seconds each
- measured C4 level rises progressively from v1 through v8, confirming the layers are materially dynamic rather than duplicate filenames

The Product V1 sampler currently resolves the exact upstream files over HTTPS using the same directory/file structure. The performance engine never references the restricted `audio/rhodes/` folder.

## Performance intent

The raw instrument is only the sound source. Vibe Roulette adds a separate human-performance layer:

- left/right-hand separation
- voice leading and inversions
- safe 7th/9th color according to harmonic context
- per-note velocity selection across the eight layers
- finger-spread microtiming
- phrase-level dynamics
- rhythmic response notes within each four-bar audition
- sustain/release behavior tied to Body Energy
- rotary-speaker emulation with separate low/high rotor behavior

The target aesthetic for composition auditioning is:

`Indie · Lo-Fi · Jazzy · Soulful · Cool`

This performance layer is inspirational scaffolding. It does not change the underlying Roman-numeral progression stored by Vibe Roulette.
