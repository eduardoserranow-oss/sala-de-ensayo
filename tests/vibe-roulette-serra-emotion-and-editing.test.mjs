import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildSerraEmotionProfile,serraEmotionProgressionWeight,serraPerformanceDirection} from '../assets/vibe-roulette-serra-emotion-v1.js';
import {suggestAfroChordAlternatives,replaceRomanAt} from '../assets/vibe-roulette-chord-alternatives-v1.js';
import {buildNeoSoulRhodesPlan} from '../assets/vibe-roulette-neo-soul-player-v12.js';
import {buildEightBarArrangement} from '../assets/vibe-roulette-eightbar.js';

const dual=buildSerraEmotionProfile(['sadness','danceable'],'nostalgia');
assert.ok(dual.contradictions.includes('danceable-sadness'),'Serra contradictions must be treated as creative territory');
assert.ok(dual.vector.movement>0.6&&dual.vector.brightness<0.5);
const calm=serraPerformanceDirection(['calm','sensual'],'connection');
const party=serraPerformanceDirection(['party','danceable'],'illusion');
assert.ok(calm.sustainRatio>party.sustainRatio);
assert.equal(calm.timingFeel,'slightly-behind');

const bright={mood:{illusion:.9,nostalgia:.2,connection:.6,brightness:.9,tension:.2,movement:.8,stability:.7,sensuality:.4}};
const dark={mood:{illusion:.2,nostalgia:.9,connection:.6,brightness:.25,tension:.65,movement:.55,stability:.5,sensuality:.6}};
assert.ok(serraEmotionProgressionWeight(bright,['joy','party'],'illusion')>serraEmotionProgressionWeight(dark,['joy','party'],'illusion'));
assert.ok(serraEmotionProgressionWeight(dark,['sadness','introspection'],'nostalgia')>serraEmotionProgressionWeight(bright,['sadness','introspection'],'nostalgia'));

const alternatives=suggestAfroChordAlternatives({roman:['vi','ii','iii'],index:1,key:'F',mode:'major',emotionFilters:['sadness','danceable'],primaryMood:'nostalgia'});
assert.ok(alternatives.length>=3&&alternatives.length<=5);
assert.ok(alternatives.every(item=>item.chord&&item.roman&&item.reason));
assert.ok(alternatives.every(item=>item.roman!=='ii'));
assert.deepEqual(replaceRomanAt(['vi','ii','iii'],1,'IV'),['vi','IV','iii']);

const expressive=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],emotionFilters:['calm','sensual'],mood:'connection',bpm:95,energyTarget:.62,seed:'expressive'});
const energetic=buildNeoSoulRhodesPlan(['F','G','Am','G'],{roman:['IV','V','vi','V'],emotionFilters:['party','danceable'],mood:'illusion',bpm:105,energyTarget:.78,seed:'energetic'});
assert.ok(expressive.afroPocket.sustainRatio>energetic.afroPocket.sustainRatio);
assert.ok(expressive.events.filter(event=>/response|pickup/.test(event.role)).length>=2,'the pianist must recover controlled musical answers');
assert.equal(expressive.harmonicSafety.count,0);

const result={id:'edit-test',progressionId:'edit-test',key:'F',mode:'major',mood:'connection',roman:['vi','ii','iii'],emotionFilters:['calm'],intent:{energyTarget:.6}};
const custom=buildEightBarArrangement({...result,customSecondRoman:['vi','IV','iii']});
assert.deepEqual(custom.secondPass.roman,['vi','IV','iii']);
assert.equal(custom.secondPass.strategy,'custom-afro-substitution');

const html=fs.readFileSync('vibe-roulette.html','utf8');
for(const id of ['joy','sadness','calm','sensual','danceable','party','introspection'])assert.ok(html.includes(`data-serra-filter="${id}"`));
assert.ok(html.includes('suggestAfroChordAlternatives'));
assert.ok(html.includes('AFRO-AWARE REPLACEMENT'));

console.log('PASS Serra emotional intelligence, expressive Afro pianist and contextual chord editing');

