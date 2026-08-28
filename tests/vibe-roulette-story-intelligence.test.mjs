import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzeStoryLocally, EMOTIONAL_STATES, EMOTIONAL_TERRITORIES, corpusTerritoryProxy } from '../assets/vibe-roulette-story-v2.js';
import {
  recommendedBpmForEnergy,
  describeBodyEnergy,
  suggestedTempoRangeForEnergy,
  VIBE_BPM_MIN,
  VIBE_BPM_MAX
} from '../assets/vibe-roulette-tempo-v2.js';

assert.equal(VIBE_BPM_MIN,90);
assert.equal(VIBE_BPM_MAX,150);
assert.equal(recommendedBpmForEnergy(0),90);
assert.equal(recommendedBpmForEnergy(1),150);
assert.ok(recommendedBpmForEnergy(0.72)>=117 && recommendedBpmForEnergy(0.72)<=120);
assert.ok(recommendedBpmForEnergy(0.85)<140,'ordinary danceable energy should remain inside the core Afrobeats writing zone');
assert.equal(describeBodyEnergy(0.2).label,'Calm');
assert.equal(describeBodyEnergy(0.55).label,'Flowing');
assert.equal(describeBodyEnergy(0.8).label,'Danceable');
const range=suggestedTempoRangeForEnergy(0.58);
assert.ok(range.min>=90 && range.max<=150 && range.min<range.center && range.center<range.max);

assert.deepEqual(Object.keys(EMOTIONAL_TERRITORIES),['illusion','nostalgia','connection','desire','introspection','calm','liberation']);
assert.equal(corpusTerritoryProxy('desire'),'connection');
assert.equal(corpusTerritoryProxy('introspection'),'nostalgia');
assert.equal(corpusTerritoryProxy('calm'),'connection');
assert.equal(corpusTerritoryProxy('liberation'),'illusion');

const friends=analyzeStoryLocally(`Como si solo fueran amigos: comparten tiempo juntos, hablan incluso de sus parejas y mantienen la dinámica de solo amigos. Aunque ambos sienten una conexión evidente, todavía ninguno reconoce lo que realmente está ocurriendo.`,{title:'Como si solo fuéramos amigos'});
assert.ok(['connection','desire'].includes(friends.primaryTerritory));
assert.equal(friends.emotionalState,'love');
assert.ok(friends.vibeSignals.some(signal=>signal.id==='romantic-tension'));
assert.ok(friends.tags.includes('#Afropop'));
assert.ok(friends.emotionalFilters.length>=2&&friends.emotionalFilters.length<=4);
assert.ok(friends.tempoSuggestion.min>=90 && friends.tempoSuggestion.max<=150);
assert.match(friends.harmonicIntent,/tension|loop/i);

const casual=analyzeStoryLocally('Comienza en una relación casual. Existe una fuerte química física y emocional, pero ninguno habla de sentimientos. Todo parece sencillo.',{title:'Amigos con derecho'});
assert.ok(['connection','desire'].includes(casual.primaryTerritory),'casual mutual chemistry belongs to Connection/Desire, not generic Illusion');
assert.ok(casual.emotionalFilters.includes('desire')||casual.emotionalFilters.includes('intimacy')||casual.emotionalFilters.includes('sensuality'));

const photo=analyzeStoryLocally('Me topé con una foto de alguien que desapareció. Me acordé de lo que fuimos y me dio nostalgia, pero quiero seguir moviéndome.',{title:'Me topé con tu foto'});
assert.equal(photo.primaryTerritory,'nostalgia');
assert.ok(photo.emotionalFilters.includes('melancholy')||photo.emotionalFilters.includes('sadness'));

const beginning=analyzeStoryLocally('Antes de ella llevaba una vida estable. Todo cambia cuando ella aparece en mi camino y siento que empieza una etapa nueva.',{title:'Antes de ella'});
assert.equal(beginning.primaryTerritory,'illusion');

const release=analyzeStoryLocally('No podía amarte como tú lo hacías, así que te dejé ir porque mereces algo mejor.',{title:'Dejarte ir'});
assert.equal(release.primaryTerritory,'liberation','letting someone go for their own good must not be classified as Illusion/Beach');
for(const id of ['liberation','acceptance','vulnerability'])assert.ok(release.emotionalFilters.includes(id),`release story should detect ${id}`);
if(release.secondaryTerritory)assert.ok(['connection','nostalgia','introspection','calm'].includes(release.secondaryTerritory));
assert.ok(!release.vibeSignals.some(signal=>signal.id==='beach'));

const calm=analyzeStoryLocally('Por fin acepté lo que pasó. Estoy en paz, sin prisa, respirando y entendiendo que fue lo mejor.',{title:'En paz'});
assert.equal(calm.primaryTerritory,'calm');
assert.ok(calm.emotionalFilters.includes('acceptance')||calm.emotionalFilters.includes('serenity')||calm.emotionalFilters.includes('calm'));

const inward=analyzeStoryLocally('Me di cuenta de que ya no sé quién soy. Estoy aprendiendo a entenderme y a preguntarme qué quiero realmente.',{title:'Volver a mí'});
assert.equal(inward.primaryTerritory,'introspection');
assert.ok(inward.emotionalFilters.includes('introspection'));

const spite=analyzeStoryLocally('Me engañó, me mintió y todavía me duele. Tengo resentimiento y frustración por lo que pasó.',{title:'Pa lante'});
assert.equal(spite.emotionalState,'spite');
const suffocation=analyzeStoryLocally('No puedo dejar de pensar en ti, me consume, tengo miedo de perderte y necesito verte.',{title:'Asfixia'});
assert.equal(suffocation.emotionalState,'suffocation');
assert.deepEqual(Object.keys(EMOTIONAL_STATES).sort(),['heartbreak','love','spite','suffocation']);

const storyModule=fs.readFileSync('assets/vibe-roulette-story-v2.js','utf8');
const engine=fs.readFileSync('assets/vibe-roulette-engine-v2.js','utf8');
const session=fs.readFileSync('assets/vibe-roulette-session.js','utf8');
assert.ok(storyModule.includes('Story / Chapter / Creative Brief'));
assert.ok(storyModule.includes('up to 4 Serra Emotional Filters'));
assert.ok(storyModule.includes('data-territory'));
assert.ok(storyModule.includes('data-mood="${item.corpusMood}"'),'seven visible territories must bridge safely to the three historical corpus mood axes');
assert.ok(storyModule.includes('HIT-DERIVED · VERIFIED'));
assert.ok(storyModule.includes('Contemporary relatives'));
assert.ok(!storyModule.includes('emotional-state-title">Mood'),'separate visible Mood controls must stay removed');
assert.ok(engine.includes('storyAffinityWeight'));
assert.ok(engine.includes('getActiveEmotionalState'));
assert.ok(engine.includes('progressionTasteWeight'));
assert.ok(session.includes('tasteVector'));
assert.ok(session.includes('storyTerritory'));

console.log('PASS Vibe Roulette Story Intelligence V3, seven Serra territories, four-filter analysis and 90–150 BPM');
