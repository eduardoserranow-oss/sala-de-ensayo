export const AFRO_DRUM_WEB_BASE='./assets/vibe-roulette/drums/afro/web';

const loop=(id,alias,bpm,bars,bodyEnergy,density,pocket,territory,emotionTags,originalName)=>({
  id,alias,originalName,bpm,bars,bodyEnergy,density,pocket,territory,emotionTags,
  webPath:`${AFRO_DRUM_WEB_BASE}/${id}.m4a`,
  sourceType:'user-supplied-audio',evidenceClass:'CREATIVE_AUDIO_ASSET',
  historicalEvidence:false,billboardEvidence:false,harmonicEvidence:false
});

export const AFRO_DRUM_LOOPS=[
  loop('vr-afro-drum-001','Amaka',100,8,2,'medium','laid-back syncopated afro','Nostalgia',['calm','sadness'],'Afrobeat Producers_AfroBanger_Vol.3_Amaka_100Bpm_Full Drums.wav'),
  loop('vr-afro-drum-002','Binary',114,4,4,'very-dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Binary_114Bpm_Full Drums.wav'),
  loop('vr-afro-drum-003','Bonita',98,4,2,'dense','relaxed syncopated afro','Conexión',['calm','sadness'],'Afrobeat Producers_AfroBanger_Vol.3_Bonita_98Bpm_Full Drums.wav'),
  loop('vr-afro-drum-004','Calabar',112,8,3,'sparse','syncopated afro pocket','Conexión',['sensual','introspection'],'Afrobeat Producers_AfroBanger_Vol.3_Calabar_112Bpm_Full Drums.wav'),
  loop('vr-afro-drum-005','Dealer',102,4,2,'medium','laid-back syncopated afro','Conexión',['calm','sensual'],'Afrobeat Producers_AfroBanger_Vol.3_Dealer_102Bpm_Full Drums.wav'),
  loop('vr-afro-drum-006','Fatela',122,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Fatela_122Bpm_Full Drums.wav'),
  loop('vr-afro-drum-007','Gyrate',120,8,4,'very-dense','driving percussive afro','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Gyrate_120Bpm_Full Drums.wav'),
  loop('vr-afro-drum-008','Indigo',95,8,1,'sparse','laid-back syncopated afro','Nostalgia',['calm','introspection'],'Afrobeat Producers_AfroBanger_Vol.3_Indigo_95Bpm_Full Drums.wav'),
  loop('vr-afro-drum-009','Jalingo',117,8,4,'very-dense','rolling/busy afro','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Jalingo_117Bpm_Full Drums.wav'),
  loop('vr-afro-drum-010','JangiLover',118,8,4,'medium','syncopated afro pocket','Conexión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_JangiLover_118Bpm_Full Drums.wav'),
  loop('vr-afro-drum-011','Jos',110,8,3,'very-dense','syncopated afro pocket','Conexión',['joy','party','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Jos_110Bpm_Full Drums.wav'),
  loop('vr-afro-drum-012','Kente',116,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Kente_116 Bpm_Full Drums.wav'),
  loop('vr-afro-drum-013','Lafia',112,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Lafia_112Bpm_Full Drums.wav'),
  loop('vr-afro-drum-014','Maboko',118,8,4,'very-dense','rolling/busy afro','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Maboko_118Bpm_Full Drums.wav'),
  loop('vr-afro-drum-015','Mistura',98,4,2,'medium','laid-back syncopated afro','Nostalgia',['calm','sadness'],'Afrobeat Producers_AfroBanger_Vol.3_Mistura_98pm_Full Drums.wav'),
  loop('vr-afro-drum-016','Nosey',120,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Nosey_120Bpm_Full Drums.wav'),
  loop('vr-afro-drum-017','Owerri',112,8,4,'very-dense','rolling/busy afro','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Owerri_112Bpm_Full Drums_.wav'),
  loop('vr-afro-drum-018','Selebobo',125,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Selebobo_125Bpm_Full Drums.wav'),
  loop('vr-afro-drum-019','Sewele',118,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Sewele_118Bpm_Full Drums.wav'),
  loop('vr-afro-drum-020','Shayo',121,8,3,'sparse','syncopated afro pocket','Conexión',['introspection','sensual'],'Afrobeat Producers_AfroBanger_Vol.3_Shayo_121Bpm_Full Drums.wav'),
  loop('vr-afro-drum-021','Timbuktu',113,8,3,'medium','syncopated afro pocket','Conexión',['introspection','sensual'],'Afrobeat Producers_AfroBanger_Vol.3_Timbuktu_113Bpm_Full Drums.wav'),
  loop('vr-afro-drum-022','Tonight',98,8,2,'very-dense','relaxed syncopated afro','Nostalgia',['sadness','sensual'],'Afrobeat Producers_AfroBanger_Vol.3_Tonight_98Bpm_Full Drums.wav'),
  loop('vr-afro-drum-023','Vintage',115,8,3,'sparse','syncopated afro pocket','Conexión',['sensual','introspection'],'Afrobeat Producers_AfroBanger_Vol.3_Vintage_115Bpm_Full Drums.wav'),
  loop('vr-afro-drum-024','Wena',125,8,4,'dense','syncopated afro pocket','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Wena_125Bpm_Full Drums.wav'),
  loop('vr-afro-drum-025','Yano Worro',124,8,5,'very-dense','driving percussive afro','Ilusión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Yano Worro_124Bpm_Full Drums.wav'),
  loop('vr-afro-drum-026','Yenogoa',110,4,3,'medium','syncopated afro pocket','Conexión',['sensual','introspection'],'Afrobeat Producers_AfroBanger_Vol.3_Yenogoa_110Bpm_Full Drums.wav'),
  loop('vr-afro-drum-027','Yola',115,8,3,'dense','syncopated afro pocket','Conexión',['party','joy','danceable'],'Afrobeat Producers_AfroBanger_Vol.3_Yola_115Bpm_Full Drums.wav'),
  loop('vr-afro-drum-028','Zambezzi',100,4,2,'sparse','laid-back syncopated afro','Nostalgia',['sensual','calm'],'Afrobeat Producers_AfroBanger_Vol.3_Zambezzi_100Bpm_Full Drums.wav')
];

export const AFRO_DRUM_LIBRARY_INFO={
  version:1,count:28,nativeEightBar:22,nativeFourBar:6,meter:'4/4',sampleRateHz:44100,sourceBitDepth:24,
  sourcePolicy:'User-supplied creative audio. Never treat these loops as Billboard, historical, or harmonic verification.',
  webDerivative:'AAC/M4A derivative path reserved for browser playback; source WAV masters remain untouched and outside GitHub.'
};
