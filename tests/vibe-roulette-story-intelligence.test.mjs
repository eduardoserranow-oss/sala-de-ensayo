import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analyzeStoryLocally
} from '../assets/vibe-roulette-story-v1.js';
import {
  recommendedBpmForEnergy,
  describeBodyEnergy,
  suggestedTempoRangeForEnergy,
  VIBE_BPM_MIN,
  VIBE_BPM_MAX
} from '../assets/vibe-roulette-tempo-v2.js';

assert.equal(VIBE_BPM_MIN,68);
assert.equal(VIBE_BPM_MAX,170);
assert.equal(recommendedBpmForEnergy(0),68);
assert.equal(recommendedBpmForEnergy(1),170);
assert.ok(recommendedBpmForEnergy(0.72)>=108 && recommendedBpmForEnergy(0.72)<=112);
assert.ok(recommendedBpmForEnergy(0.85)<150,'upper BPM range should be reserved rather than making ordinary danceable energy too fast');
assert.equal(describeBodyEnergy(0.2).label,'Calm');
assert.equal(describeBodyEnergy(0.55).label,'Flowing');
assert.equal(describeBodyEnergy(0.8).label,'Danceable');
const range=suggestedTempoRangeForEnergy(0.58);
assert.ok(range.min>=68 && range.max<=170 && range.min<range.center && range.center<range.max);

const friends=analyzeStoryLocally(`Como si solo fueran amigos: comparten tiempo juntos, hablan incluso de sus parejas y mantienen la dinámica de solo amigos. Aunque ambos sienten una conexión evidente, todavía ninguno reconoce lo que realmente está ocurriendo.`,{title:'Como si solo fuéramos amigos'});
assert.equal(friends.primaryTerritory,'connection');
assert.ok(friends.vibeSignals.some(signal=>signal.id==='romantic-tension'));
assert.ok(friends.tags.includes('#Afropop'));
assert.ok(friends.tags.includes('#AfroTropical'));
assert.ok(friends.tempoSuggestion.min>=68 && friends.tempoSuggestion.max<=170);
assert.match(friends.harmonicIntent,/tension|loop/i);

const photo=analyzeStoryLocally('Me topé con una foto de alguien que desapareció. Me acordé de lo que fuimos y me dio nostalgia, pero quiero seguir moviéndome.',{title:'Me topé con tu foto'});
assert.equal(photo.primaryTerritory,'nostalgia');

const beginning=analyzeStoryLocally('Antes de ella llevaba una vida estable. Todo cambia cuando ella aparece en mi camino y siento que empieza una etapa nueva.',{title:'Antes de ella'});
assert.equal(beginning.primaryTerritory,'illusion');

const storyModule=fs.readFileSync('assets/vibe-roulette-story-v1.js','utf8');
const engine=fs.readFileSync('assets/vibe-roulette-engine-v2.js','utf8');
const session=fs.readFileSync('assets/vibe-roulette-session.js','utf8');
assert.ok(storyModule.includes('Story / Chapter / Creative Brief'));
assert.ok(storyModule.includes('Suggested tempo'));
assert.ok(storyModule.includes('HIT-DERIVED · VERIFIED'));
assert.ok(storyModule.includes('Show verified hit sources'));
assert.ok(engine.includes('storyAffinityWeight'));
assert.ok(engine.includes('deriveResultTags'));
assert.ok(session.includes('tasteVector'));
assert.ok(session.includes('storyProfile'));
assert.ok(session.includes('tags'));

console.log('PASS Vibe Roulette Story Intelligence, 68–170 BPM and taste-training metadata');
