# Vibe Roulette — Product V1 / Writing Session Stage

Status: active development after Sprint 1 foundation freeze.

## Why this stage exists

Sprint 1 proved the engine, data separation, evidence model, transposition, mood/energy ranking, voice-led audio preview and corpus gates. This stage turns that foundation into something Serra can actually use during a writing session.

The research program continues in parallel, but research no longer blocks product use.

## Product goal

A useful session should let Serra:

1. name a working song idea,
2. choose Ilusión / Nostalgia / Conexión,
3. choose body energy independently from mood,
4. spin a hit-derived harmonic direction,
5. hear the progression,
6. move the same family through recommended vocal keys,
7. hear a source-observed or clearly labeled section/chorus direction,
8. save the direction locally,
9. copy the harmonic idea into notes / DAW workflow,
10. rate whether the result actually helps composition.

## Product simplification rule

Research diagnostics must not dominate the writing experience.

The main surface shows only what helps composition:

- emotional territory
- body energy
- key/mode
- Roman numerals
- chord names
- playback
- another vocal key
- section/chorus direction
- save/copy
- lightweight feedback

Evidence and vocal-fit caveats remain available under a secondary `Why this direction exists` disclosure.

## Local calibration data

During this stage, saved ideas and feedback are stored only in the browser/device using localStorage.

Keys:

- `fortissimo.vibeRoulette.saved.v1`
- `fortissimo.vibeRoulette.feedback.v1`

This is intentional. We do not add a database write path until the feedback vocabulary and session UX are proven useful.

Feedback options:

- Inspires me
- Interesting
- Too generic
- Not my vibe

The feedback is not yet allowed to silently retrain or reweight the production engine. It is calibration evidence for the next ranking iteration.

## iPhone hardening now included

Product V1 now includes pre-session hardening specifically for real iPhone Safari validation:

- 16px working-title input to avoid Safari focus zoom
- coarse-pointer minimum touch targets
- horizontal-overflow guards
- touch-action tuning for primary controls
- Web Audio resume logic that handles any non-running context state, including iOS interruption behavior
- automatic playback stop when the page is hidden or backgrounded
- clear retry error if Safari still requires another explicit user gesture

These changes reduce known browser friction but do not replace the required real-device test.

## Safety / isolation

This stage remains isolated from production Home.

Do not modify:

- existing Home navigation
- auth
- PWA manifest
- global FORTISSIMO branding
- existing Sound Gym / Guitar / Bass / Vocal flows

Do not merge into `main` until a real-device writing session is completed.

## Real-device acceptance session

Before Home integration, test on a real iPhone/PWA:

- touch targets
- SPIN responsiveness
- Web Audio starts after user gesture
- no stuck notes
- base progression sounds musical
- section direction sounds meaningfully related
- Another vocal key works without changing harmonic family
- Save survives reload on the same device
- Copy returns the expected progression + chorus text
- feedback remains after reload
- layout has no horizontal overflow

Detailed protocol: `docs/vibe-roulette/IPHONE_WRITING_SESSION_V1.md`.

## Deployment gate

The code is ready for an isolated preview, but the repository's Vercel status is currently blocked by the Hobby build-rate limit. This is a hosting quota condition, not a detected Vibe Roulette test failure.

Do not merge to production just to obtain a test URL. The correct next move is one isolated preview deployment after the hosting quota allows it, followed by the real iPhone writing-session protocol.

## What research does in parallel

Research continues to expand culturally and compositionally valuable examples, but every record still passes separate gates for:

- commercial/cultural impact evidence
- harmonic evidence confidence
- compositional value
- Serra relevance

A commercially huge but compositionally basic record may remain in the corpus while receiving less compositional weight than a richer record.
