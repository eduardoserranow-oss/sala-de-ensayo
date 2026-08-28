export const FEEDBACK_OPTIONS = {
  inspire: { label: 'Inspires me', weight: 1 },
  interesting: { label: 'Interesting', weight: 0.45 },
  generic: { label: 'Too generic', weight: -0.45 },
  wrongVibe: { label: 'Not my vibe', weight: -1 }
};

function compactStoryProfile(profile){
  if(!profile) return null;
  return {
    primaryTerritory:profile.primaryTerritory||'',
    secondaryTerritory:profile.secondaryTerritory||'',
    confidence:Number(profile.confidence||0),
    emotionalState:profile.emotionalState||'',
    vibeSignals:(profile.vibeSignals||[]).map(item=>({id:item.id,label:item.label,tag:item.tag,score:Number(item.score||0)})),
    harmonicIntent:profile.harmonicIntent||'',
    energySuggestion:Number(profile.energySuggestion||0),
    tempoSuggestion:profile.tempoSuggestion||null,
    tags:[...(profile.tags||[])],
    title:profile.title||'',
    text:profile.text||''
  };
}

function compactPerformance(pattern){
  if(!pattern)return null;
  return {id:pattern.id||'',label:pattern.label||'',tag:pattern.tag||'',variant:Number(pattern.variant||0),description:pattern.description||''};
}

function compactDrum(drum,timeStretch=null){
  if(!drum)return null;
  return {id:drum.id||'',originalName:drum.originalName||'',originalBpm:Number(drum.bpm||drum.originalBpm||0),bars:Number(drum.bars||0),pocket:drum.pocket||'',density:drum.density||'',territory:drum.territory||'',timeStretch:timeStretch||drum.timeStretch||null};
}

function compactSoundDirection(value=null){
  let source=value;
  if(!source&&typeof window!=='undefined'){
    try{source=window.__FORTISSIMO_SKYKEYS_PHASE5__?.getState?.()?.lastDecision||null;}catch(_){source=null;}
  }
  if(!source?.preset)return null;
  return {preset:source.preset||'',id:Number(source.id||0),function:source.function||'',source:source.source||'',role:source.role||'',score:Number(source.score||0),audioMode:source.availability?.total>0?'skykeys':'rhodes-fallback'};
}

function compactLineage(lineage){
  if(!lineage)return null;
  return {
    historicalSourceIds:[...(lineage.historicalSourceIds||[])],
    modernRelatives:(lineage.modernRelatives||[]).map(item=>({id:item.id,title:item.title,artist:item.artist,year:item.year,matchType:item.matchType,evidenceClass:item.evidenceClass,confidence:Number(item.confidence||0),tags:[...(item.tags||[])]})),
    performanceLens:lineage.performanceLens?{label:lineage.performanceLens.label,references:[...(lineage.performanceLens.references||[])]}:null
  };
}

function makeTasteVector(result,context,secondPass){
  const drum=compactDrum(context.drum,context.timeStretch);
  const soundDirection=compactSoundDirection(context.soundDirection);
  return {
    progressionId:result.progressionId||'',
    roman:[...(result.roman||[])],
    chords:[...(result.chords||[])],
    key:result.key||'',
    mode:result.mode||'',
    mood:result.mood||'',
    emotionalState:result.emotionalState||result.storyProfile?.emotionalState||'',
    emotionFilters:[...(result.emotionFilters||[])],
    energyTarget:Number(context.energyTarget??result.intent?.energyTarget??0.5),
    bpm:Number(context.recommendedBpm??result.intent?.recommendedBpm??0),
    tempoRange:result.intent?.suggestedTempoRange||null,
    tags:[...(result.tags||[])],
    sourceSongIds:[...(result.evidenceSummary?.supportedSongIds||[])],
    modernRelativeIds:(result.lineage?.modernRelatives||[]).map(item=>item.id),
    evidenceConfidence:Number(result.evidenceConfidence||0),
    afrobeatsPatternMatch:Boolean(result.intent?.afrobeatsPatternMatch),
    aPrimeStrategy:secondPass?.strategy||'',
    aPrimeVariationEvents:[...(secondPass?.variationEvents||[])],
    performancePattern:compactPerformance(result.performancePattern),
    drum,soundDirection,
    substitutions:result.userEdit||null,
    storyTerritory:result.storyProfile?.primaryTerritory||'',
    storySignals:(result.storyProfile?.vibeSignals||[]).map(item=>item.id)
  };
}

export function createSessionSnapshot(result, context = {}) {
  if (!result) throw new Error('A roulette result is required.');
  const title = String(context.title || '').trim();
  const secondPass = context.secondPass || null;
  const drum=compactDrum(context.drum,context.timeStretch);
  const soundDirection=compactSoundDirection(context.soundDirection);
  const snapshot={
    id: context.id || `${Date.now()}-${result.progressionId || 'direction'}`,
    createdAt: context.createdAt || new Date().toISOString(),
    title,
    mood: result.mood,
    emotionalState:result.emotionalState||result.storyProfile?.emotionalState||'',
    emotionFilters:[...(result.emotionFilters||[])],
    energyTarget: Number(context.energyTarget ?? result.intent?.energyTarget ?? 0.5),
    recommendedBpm: Number(context.recommendedBpm ?? result.intent?.recommendedBpm ?? 0),
    suggestedTempoRange:result.intent?.suggestedTempoRange||null,
    playbackBars: Number(context.playbackBars ?? 8),
    beatsPerBar: Number(context.beatsPerBar ?? 4),
    key: result.key,
    mode: result.mode,
    progressionId: result.progressionId,
    roman: [...(result.roman || [])],
    chords: [...(result.chords || [])],
    tags:[...(result.tags||[])],
    storyProfile:compactStoryProfile(result.storyProfile),
    performancePattern:compactPerformance(result.performancePattern),
    drum,soundDirection,
    substitutions:result.userEdit||null,
    lineage:compactLineage(result.lineage),
    secondPass: secondPass ? {
      strategy: secondPass.strategy || '',
      note: secondPass.note || '',
      variationEvents:[...(secondPass.variationEvents||[])],
      roman: [...(secondPass.roman || [])],
      chords: [...(secondPass.chords || [])],
      romanBars: [...(secondPass.romanBars || [])],
      chordBars: [...(secondPass.chordBars || [])]
    } : null,
    chorusVariation: {
      strategy: result.chorusVariation?.strategy || '',
      note: result.chorusVariation?.note || '',
      roman: [...(result.chorusVariation?.roman || [])],
      chords: [...(result.chorusVariation?.chords || [])]
    },
    sourceSongIds: [...(result.evidenceSummary?.supportedSongIds || [])],
    evidenceConfidence: Number(result.evidenceConfidence || 0),
    feedback: context.feedback || null
  };
  snapshot.tasteVector=makeTasteVector(result,context,secondPass);
  return snapshot;
}

export function formatSnapshotForClipboard(snapshot) {
  if (!snapshot) return '';
  const title = snapshot.title ? `${snapshot.title}\n` : '';
  const mood = snapshot.mood ? `${snapshot.mood}` : 'vibe';
  const emotional=snapshot.emotionalState?` + ${snapshot.emotionalState}`:'';
  const energy = Math.round((Number(snapshot.energyTarget) || 0) * 100);
  const bpm = Number(snapshot.recommendedBpm) > 0 ? ` · ${Math.round(snapshot.recommendedBpm)} BPM` : '';
  const range=snapshot.suggestedTempoRange?.min?` · suggested ${snapshot.suggestedTempoRange.min}–${snapshot.suggestedTempoRange.max} BPM`:'';
  const meter = Number(snapshot.playbackBars) > 0 ? ` · ${snapshot.playbackBars} bars / ${snapshot.beatsPerBar || 4}/4` : '';
  const roman = (snapshot.roman || []).join(' – ');
  const chords = (snapshot.chords || []).join(' – ');
  const secondRoman = (snapshot.secondPass?.roman || []).join(' – ');
  const secondChords = (snapshot.secondPass?.chords || []).join(' – ');
  const chorusRoman = (snapshot.chorusVariation?.roman || []).join(' – ');
  const chorusChords = (snapshot.chorusVariation?.chords || []).join(' – ');
  const second = snapshot.secondPass ? `\nA′: ${secondRoman}\n${secondChords}` : '';
  const performance=snapshot.performancePattern?.label?`\nKeyboard feel: ${snapshot.performancePattern.label} · variant ${snapshot.performancePattern.variant}`:'';
  const drum=snapshot.drum?.originalName?`\nDrums: ${snapshot.drum.originalName} · ${snapshot.drum.originalBpm}→${Math.round(snapshot.recommendedBpm)} BPM`:'';
  const sound=snapshot.soundDirection?.preset?`\nS.K.Y. Keys direction: ${snapshot.soundDirection.preset} · ${snapshot.soundDirection.role}${snapshot.soundDirection.audioMode==='rhodes-fallback'?' · Rhodes fallback':''}`:'';
  const tags=snapshot.tags?.length?`\n${snapshot.tags.join(' ')}`:'';
  const story=snapshot.storyProfile?.text?`\nStory: ${snapshot.storyProfile.text}`:'';
  return `${title}${mood}${emotional} · energy ${energy}%${bpm}${range}${meter} · ${snapshot.key} ${snapshot.mode}\nA: ${roman}\n${chords}${second}\nSection direction: ${chorusRoman}\n${chorusChords}${performance}${drum}${sound}${tags}${story}`.trim();
}

export function upsertRecentSnapshot(items = [], snapshot, maxItems = 8) {
  if (!snapshot?.id) return items.slice(0, maxItems);
  const next = [snapshot, ...items.filter(item => item.id !== snapshot.id)];
  return next.slice(0, maxItems);
}

export function applyFeedback(snapshot, feedbackKey, reason='') {
  const option = FEEDBACK_OPTIONS[feedbackKey];
  if (!option) throw new Error(`Unsupported feedback: ${feedbackKey}`);
  return {
    ...snapshot,
    feedback: {
      key: feedbackKey,
      label: option.label,
      weight: option.weight,
      reason:String(reason||''),
      createdAt: new Date().toISOString(),
      tasteVector:snapshot.tasteVector||null
    }
  };
}
