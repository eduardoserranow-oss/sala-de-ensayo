import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VibeRouletteEngine } from '../assets/vibe-roulette-engine.js';
import {
  PROGRESSION_EDITOR_V1_INFO,
  EDIT_MODE_LABELS,
  suggestProgressionEditCandidates,
  reharmonizeCandidateSemitone,
  forceCandidateQuality,
  setNextChordEditMode,
  consumeNextChordEditMode
} from '../assets/vibe-roulette-progression-editor-v1.js';

const ROOT_PC={C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const rootPc=chord=>ROOT_PC[String(chord).match(/^[A-G](?:b|#)?/)?.[0]];
const isMinor=chord=>/^[A-G](?:b|#)?m(?!aj)/.test(String(chord));

assert.equal(PROGRESSION_EDITOR_V1_INFO.phase,4.4);
assert.equal(PROGRESSION_EDITOR_V1_INFO.subphase,'4.4.1');
assert.equal(PROGRESSION_EDITOR_V1_INFO.antiRepeatWindow,8);
assert.equal(PROGRESSION_EDITOR_V1_INFO.transpositionCountsAsSame,true);
for(const mode of ['semitone-down','semitone-up','degree-down','degree-up','color','keep-root','keep-function','relative','borrowed','voice-leading','less-tension','more-tension','surprise'])assert.ok(EDIT_MODE_LABELS[mode]);

const base={roman:['IVadd9','Vadd9','vi7','vi7'],index:3,key:'D',mode:'major',primaryMood:'connection'};
const up=suggestProgressionEditCandidates({...base,editMode:'semitone-up'});
const down=suggestProgressionEditCandidates({...base,editMode:'semitone-down'});
assert.ok(up.length>=3&&down.length>=3,'chromatic nudge should expose multiple reharmonized qualities/colors');
assert.ok(up.every(item=>rootPc(item.chord)===0),'Bm root moved +1 semitone must become C-pitch-class harmony');
assert.ok(down.every(item=>rootPc(item.chord)===10),'Bm root moved -1 semitone must become Bb/A# pitch-class harmony');
assert.ok(up.every(item=>['CORE','COLOR','BOLD'].includes(item.risk)));
assert.ok(up.some(item=>/add9|7|sus|maj/i.test(item.chord)),'semitone nudge should not force a plain triad only');

const colors=suggestProgressionEditCandidates({...base,editMode:'color'});
assert.ok(colors.length>=3);
assert.ok(colors.every(item=>rootPc(item.chord)===11),'Color mode must keep B as the root');
const keepRoot=suggestProgressionEditCandidates({...base,editMode:'keep-root'});
assert.ok(keepRoot.length>=3&&keepRoot.every(item=>rootPc(item.chord)===11));
const relative=suggestProgressionEditCandidates({...base,editMode:'relative'});
assert.ok(relative.length>=1&&relative.every(item=>rootPc(item.chord)===2),'B minor relative-major target should anchor on D');

const voiceLeading=suggestProgressionEditCandidates({...base,editMode:'voice-leading'});
assert.ok(voiceLeading.length>=3&&voiceLeading.every(item=>item.referenceDnaSimilarity>=0));
const borrowed=suggestProgressionEditCandidates({...base,editMode:'borrowed'});
assert.ok(borrowed.length>=1&&borrowed.some(item=>/^[b#]/.test(item.roman)));

const candidate=colors[0];
const candidateUp=reharmonizeCandidateSemitone({candidate,context:base,direction:1});
const candidateDown=reharmonizeCandidateSemitone({candidate,context:base,direction:-1});
assert.ok(candidateUp&&candidateDown,'each individual suggestion must be chromatically editable');
assert.equal(rootPc(candidateUp.chord),(rootPc(candidate.chord)+1)%12,'per-candidate +½ must move only that suggestion root up one semitone');
assert.equal(rootPc(candidateDown.chord),(rootPc(candidate.chord)+11)%12,'per-candidate −½ must move only that suggestion root down one semitone');
const forcedMajor=forceCandidateQuality({candidate:candidateUp,context:base,quality:'major'});
const forcedMinor=forceCandidateQuality({candidate:candidateUp,context:base,quality:'minor'});
assert.ok(forcedMajor&&forcedMinor,'candidate must allow manual Major/Minor override');
assert.equal(rootPc(forcedMajor.chord),rootPc(candidateUp.chord),'quality override must preserve edited root');
assert.equal(rootPc(forcedMinor.chord),rootPc(candidateUp.chord),'quality override must preserve edited root');
assert.equal(isMinor(forcedMajor.chord),false,'Major override must expose a major-third quality');
assert.equal(isMinor(forcedMinor.chord),true,'Minor override must expose a minor-third quality');

assert.equal(setNextChordEditMode('semitone-up'),'semitone-up');
assert.equal(consumeNextChordEditMode(),'contextual','Node has no window, so UI mode state must safely fall back to contextual');

const legacy={
  id:'legacy-control',roman:['I','IV','V','I'],mode:'major',provisional:false,evidenceConfidence:.8,
  mood:{illusion:.7,nostalgia:.7,connection:.7,energy:.6,movement:.6},styleAffinity:['pop'],evidence:[],
  chorusVariation:{strategy:'legacy',roman:['I','IV','V','I'],note:'legacy'}
};
const dataset={version:'editor-test',sources:[],songs:[],vocalProfiles:[{id:'serra'}],progressions:[legacy]};
const engine=new VibeRouletteEngine(dataset,{random:()=>0});
const first=engine.spin({mood:'nostalgia'});
const second=engine.spin({mood:'nostalgia'});
assert.notDeepEqual(second.roman,first.roman,'immediate exact progression repetition should be actively avoided when alternatives exist');
assert.equal(second.progressionAntiRepeat.window,8);
assert.equal(second.progressionAntiRepeat.transpositionCountsAsSame,true);

const source=fs.readFileSync('assets/vibe-roulette-progression-editor-v1.js','utf8');
for(const token of ['Degree −','Degree +','Keep root','Keep function','Borrowed','Relative','Voice lead','Less tension','More tension','Surprise here','Lock bar'])assert.ok(source.includes(token),`missing global editor UI/control: ${token}`);
for(const token of ['fortissimo-candidate-controls','data-candidate-shift','data-candidate-quality','Major','Minor','candidateSemitone','candidateQuality'])assert.ok(source.includes(token),`missing Phase 4.4.1 per-candidate editor token: ${token}`);
assert.ok(!source.includes("for(const mode of ['semitone-down','semitone-up','degree-down'"),'global editor must no longer render semitone controls; semitone editing belongs to each candidate');
assert.ok(source.includes("backdropObserver.observe(backdrop,{attributes:true,attributeFilter:['class']})"),'editor must observe only backdrop open/close changes');
assert.ok(!source.includes("observe(document.body,{subtree:true"),'editor must never observe and mutate its own full DOM subtree');
assert.ok(source.includes("version:'1.2-per-candidate-editor'"),'Phase 4.4.1 runtime version must remain explicit');
const alternatives=fs.readFileSync('assets/vibe-roulette-chord-alternatives-v1.js','utf8');
assert.ok(alternatives.includes("from './vibe-roulette-progression-editor-v1.js'"));
assert.ok(alternatives.includes('Afro family · CORE'));

console.log('PASS Phase 4.4.1 progression editor: anti-repeat, per-candidate ±½, manual Major/Minor override, global harmonic tools, locks and iPhone-safe sheet observer');
