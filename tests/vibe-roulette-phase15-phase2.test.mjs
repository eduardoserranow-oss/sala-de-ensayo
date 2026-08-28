import assert from 'node:assert/strict';
import fs from 'node:fs';

const phase15=fs.readFileSync('assets/vibe-roulette-phase15-workflow-v1.js','utf8');
const phase151=fs.readFileSync('assets/vibe-roulette-phase151-ux-v1.js','utf8');
const phase2=fs.readFileSync('assets/vibe-roulette-phase2-library-midi-v1.js','utf8');
const phase25=fs.readFileSync('assets/vibe-roulette-phase25-background-audio-v1.js','utf8');
const taste=fs.readFileSync('assets/vibe-roulette-taste-training-v1.js','utf8');

assert.match(phase15,/switchToSection/);assert.match(phase15,/returnToMain/);assert.match(phase15,/getCurrentPerformance/);assert.match(phase15,/Section queued/);assert.match(phase15,/Main queued/);
assert.match(phase151,/version:'1\.5\.2'/);assert.match(phase151,/Main Progression/);assert.match(phase151,/Play Section/);assert.match(phase151,/SECTION DIRECTION/);assert.match(phase151,/moveMetadataIntoDetails/);assert.match(phase151,/moveSectionBelowMain/);assert.match(phase151,/syncSectionAvailability/);
assert.match(phase2,/version:2/);assert.match(phase2,/favorites\.v2/);assert.match(phase2,/LEGACY_KEY/);assert.match(phase2,/sectionDirection/);assert.match(phase2,/Main progression/);assert.match(phase2,/Use Again/);assert.match(phase2,/restoreSection/);assert.match(phase2,/emotionFilters/);assert.match(phase2,/performancePattern/);assert.match(phase2,/drum/);assert.match(phase2,/performanceToMidiBytes/);assert.match(phase2,/audio\/midi/);assert.match(phase2,/actual Pianist notes, inversions, timing and velocities/i);assert.match(phase2,/FORTISSIMO\.mid/);assert.match(phase2,/Export MIDI/);assert.match(phase2,/Favorites/);
assert.match(phase25,/version:'2\.5'/);assert.match(phase25,/Background Composition Mode/);assert.match(phase25,/mediaSession/);assert.match(phase25,/visibilitychange/);assert.match(phase25,/AudioContext recovery/);assert.match(phase25,/armKeeper/);assert.match(phase25,/resumeTransport/);assert.match(phase25,/pauseTransport/);assert.match(phase25,/best-effort bridge/i);assert.match(taste,/vibe-roulette-phase25-background-audio-v1\.js/);

assert.match(taste,/tasteTraining\.v2/);assert.match(taste,/version:2/);assert.match(taste,/migrateLegacy/);assert.match(taste,/progressionLength/);assert.match(taste,/formula/);assert.match(taste,/primeBehavior/);assert.match(taste,/neoSoulDensity/);assert.match(taste,/extensions/);assert.match(taste,/topLine/);assert.match(taste,/grooveEnergy/);assert.match(taste,/territoryHarmony/);assert.match(taste,/granularTasteWeight/);assert.match(taste,/applyTasteWithExploration/);assert.match(taste,/explorationFloor:EXPLORATION_FLOOR/);assert.match(taste,/Afrobeats harmony first/);assert.match(taste,/vocal space/);assert.match(taste,/drum constraints/);

console.log('Vibe Roulette phases 1.5.2, 2, 2.5 and phase 3 Taste Training V2 regression checks passed.');
