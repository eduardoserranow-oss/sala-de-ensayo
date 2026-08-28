import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  SERRA_EMOTION_FILTERS,
  SERRA_EMOTION_FAMILIES,
  SERRA_EMOTION_INFO,
  buildSerraEmotionProfile,
  serraEmotionProgressionWeight,
  serraPerformanceDirection,
  inferSerraEmotionFilters,
  deriveCompositeEmotionalState
} from '../assets/vibe-roulette-serra-emotion-v1.js';
import {suggestAfroChordAlternatives,replaceRomanAt} from '../assets/vibe-roulette-chord-alternatives-v1.js';
import {buildNeoSoulRhodesPlan} from '../assets/vibe-roulette-neo-soul-player-v12.js';
import {buildEightBarArrangement} from '../assets/vibe-roulette-eightbar.js';

assert.equal(SERRA_EMOTION_FAMILIES.length,7);
assert.ok(SERRA_EMOTION_INFO.filterCount>=30,'full emotional vocabulary should be rich enough for descriptive story analysis');
for(const id of ['joy','hope','enthusiasm','euphoria','strength','curiosity','optimism','calm','security','gratitude','fulfillment','acceptance','serenity','sensuality','desire','intimacy','tenderness','sadness','melancholy','vulnerability','abandonment','grief','anxiety','insecurity','confusion','worry','disillusionment','frustration','resentment','jealousy','introspection','liberation'])assert.ok(SERRA_EMOTION_FILTERS[id],`missing Serra filter ${id}`);
assert.ok(!SERRA_EMOTION_FILTERS.danceable,'Bailable belongs to Body Energy/groove, not Serra Emotional Filters');
assert.ok(!SERRA_EMOTION_FILTERS.party,'Fiesta is contextual activation, not a primitive emotional filter');

const releaseFilters=inferSerraEmotionFilters('No podía amarte como tú lo hacías, así que te dejé ir porque mereces algo mejor.',{primaryTerritory:'liberation',secondaryTerritory:'connection'});
assert.equal(releaseFilters.length,4);
for(const id of ['liberation','acceptance','vulnerability'])assert.ok(releaseFilters.includes(id));
assert.equal(deriveCompositeEmotionalState(releaseFilters,'liberation'),'heartbreak');

const intimate=buildSerraEmotionProfile(['sensuality','intimacy','tenderness','calm'],'connection');
assert.ok(intimate.vector.intimacy>.7);
assert.ok(intimate.vector.space>.55);
assert.equal(intimate.vector.body,.5,'Body Energy must remain independent from descriptive emotional filters');
assert.equal(intimate.vector.movement,.5,'filter vocabulary must not secretly replace the Body Energy movement control');

const calmDirection=serraPerformanceDirection(['calm','serenity','intimacy'],'calm');
const tensionDirection=serraPerformanceDirection(['anxiety','frustration','insecurity'],'introspection');
assert.ok(calmDirection.sustainRatio>tensionDirection.sustainRatio);
assert.equal(calmDirection.timingFeel,'slightly-behind');
assert.equal(tensionDirection.timingFeel,'contained-forward');

const bright={mood:{illusion:.9,nostalgia:.2,connection:.6,brightness:.9,tension:.2,movement:.8,stability:.7,sensuality:.4}};
const dark={mood:{illusion:.2,nostalgia:.9,connection:.6,brightness:.25,tension:.65,movement:.55,stability:.5,sensuality:.6}};
assert.ok(serraEmotionProgressionWeight(bright,['joy','hope','optimism'],'illusion')>serraEmotionProgressionWeight(dark,['joy','hope','optimism'],'illusion'));
assert.ok(serraEmotionProgressionWeight(dark,['sadness','melancholy','introspection'],'nostalgia')>serraEmotionProgressionWeight(bright,['sadness','melancholy','introspection'],'nostalgia'));

const alternatives=suggestAfroChordAlternatives({roman:['vi','ii','iii'],index:1,key:'F',mode:'major',emotionFilters:['sadness','melancholy'],primaryMood:'nostalgia'});
assert.ok(alternatives.length>=3&&alternatives.length<=5);
assert.ok(alternatives.every(item=>item.chord&&item.roman&&item.reason));
assert.ok(alternatives.every(item=>item.roman!=='ii'));
assert.deepEqual(replaceRomanAt(['vi','ii','iii'],1,'IV'),['vi','IV','iii']);

const expressive=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],emotionFilters:['calm','sensuality','intimacy'],mood:'connection',bpm:95,energyTarget:.62,seed:'expressive'});
const tense=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],emotionFilters:['anxiety','frustration'],mood:'nostalgia',bpm:105,energyTarget:.78,seed:'tense'});
assert.ok(expressive.afroPocket.sustainRatio>=tense.afroPocket.sustainRatio);
assert.ok(expressive.events.filter(event=>/response|pickup/.test(event.role)).length>=2,'the pianist must keep controlled musical answers');
assert.equal(expressive.harmonicSafety.count,0);

const result={id:'edit-test',progressionId:'edit-test',key:'F',mode:'major',mood:'connection',roman:['vi','ii','iii'],emotionFilters:['calm'],intent:{energyTarget:.6}};
const custom=buildEightBarArrangement({...result,customSecondRoman:['vi','IV','iii']});
assert.deepEqual(custom.secondPass.roman,['vi','IV','iii']);
assert.equal(custom.secondPass.strategy,'custom-afro-substitution');

const emotionModule=fs.readFileSync('assets/vibe-roulette-serra-emotion-v1.js','utf8');
const storyModule=fs.readFileSync('assets/vibe-roulette-story-v2.js','utf8');
const alternativeModule=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');
const previewModule=fs.readFileSync('assets/vibe-roulette-chord-preview-v1.js','utf8');
assert.ok(emotionModule.includes('Edit filters'));
assert.ok(emotionModule.includes('Serra Emotional Filters'));
assert.ok(emotionModule.includes('Choose up to 4'));
assert.ok(emotionModule.includes('Body Energy controls movement and BPM separately'));
assert.ok(storyModule.includes('installSerraEmotionFilterUi'));
assert.ok(storyModule.includes('emotionalFilters'));
assert.ok(storyModule.includes('suggestAfroChordAlternatives')===false,'story layer should not duplicate chord-editing responsibilities');
assert.ok(alternativeModule.includes("import './vibe-roulette-chord-preview-v1.js'"),'Afro replacement sheet must load audition support');
assert.ok(previewModule.includes('previewAfroChordAlternative'));
assert.ok(previewModule.includes('stopAfroChordAlternativePreview'));
assert.ok(previewModule.includes('buildCommercialAfroRhodesPlan'),'audition must use the FORTISSIMO Rhodes voicing engine');
assert.ok(previewModule.includes('midiToRhodesSampleName'),'audition must use the same Rhodes sample family');
assert.ok(previewModule.includes('previousHarmony'),'candidate voicing should use the previous bar when available');
assert.ok(previewModule.includes("play.textContent='▶'"));
assert.ok(previewModule.includes('event.stopPropagation()'),'preview must not trigger chord replacement');
assert.ok(previewModule.includes('Audition only: preview never replaces the progression or records taste feedback'));

console.log('PASS Serra Emotional Filters V2, contextual chord editing and Rhodes audition preview');
