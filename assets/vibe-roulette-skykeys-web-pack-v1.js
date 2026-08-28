export const SKYKEYS_WEB_PACK_INFO={
  version:'0.5.1-pilot',
  preset:'Beautiful Rhodes',
  codec:'audio/mpeg',
  bitrateKbps:112,
  sampleRate:44100,
  channels:2,
  zoneCount:4,
  completeSourceZones:false,
  pilotCoverage:'MIDI 60-72 source anchors; nearest-zone transposition outside hosted anchors',
  hosting:'same-origin static assets via FORTISSIMO/Vercel',
  productionPolicy:'Pilot only. Do not move the complete multi-gigabyte S.K.Y. Keys library into the Git repository.'
};

export const BEAUTIFUL_RHODES_WEB_SETTINGS={
  Attack:0,
  Release:1.451,
  Overlap:0,
  Voices:8,
  'Loop Bool':0,
  Start:0,
  'Loop Start':0,
  'Loop End':1,
  Stereo:1
};

const base='assets/vibe-roulette/skykeys/web/beautiful-rhodes';
export const BEAUTIFUL_RHODES_WEB_ZONES=[
  {rootMidi:60,zoneLabel:'dow',name:'060-dow.mp3',url:`${base}/060-dow.mp3`},
  {rootMidi:64,zoneLabel:'ev4',name:'064-ev4.mp3',url:`${base}/064-ev4.mp3`},
  {rootMidi:68,zoneLabel:'ev4',name:'068-ev4.mp3',url:`${base}/068-ev4.mp3`},
  {rootMidi:72,zoneLabel:'ev4',name:'072-ev4.mp3',url:`${base}/072-ev4.mp3`}
];

export const SKYKEYS_WEB_PACK_CONTRACT={
  purpose:'Validate real S.K.Y. Keys browser/iPhone delivery before scaling hosting to the 222-preset catalog.',
  selection:'Sound Direction remains authoritative; this pack does not force Beautiful Rhodes on every spin.',
  fallback:'Every unhosted preset continues to use the existing Rhodes safety renderer.',
  invariance:'This manifest contains audio delivery metadata only and cannot mutate harmony or pianist performance.'
};
