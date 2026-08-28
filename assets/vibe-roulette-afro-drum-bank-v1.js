export const AFRO_DRUM_BANK_URL='https://sducrbueumvxyfwwlvtf.supabase.co/storage/v1/object/public/vibe-roulette-audio/afro/vr-afro-drum-bank-v1.m4a';

export const AFRO_DRUM_BANK={
  'vr-afro-drum-001':{start:0.000000000,duration:19.200000000},
  'vr-afro-drum-002':{start:19.450000000,duration:8.421043084},
  'vr-afro-drum-003':{start:28.121043084,duration:9.795918367},
  'vr-afro-drum-004':{start:38.166961451,duration:17.142857143},
  'vr-afro-drum-005':{start:55.559818594,duration:9.411768707},
  'vr-afro-drum-006':{start:65.221587302,duration:15.737709751},
  'vr-afro-drum-007':{start:81.209297052,duration:16.000000000},
  'vr-afro-drum-008':{start:97.459297052,duration:20.210521542},
  'vr-afro-drum-009':{start:117.919818594,duration:16.410249433},
  'vr-afro-drum-010':{start:134.580068027,duration:16.271179138},
  'vr-afro-drum-011':{start:151.101247166,duration:17.454557823},
  'vr-afro-drum-012':{start:168.805804989,duration:16.551723356},
  'vr-afro-drum-013':{start:185.607528345,duration:17.142857143},
  'vr-afro-drum-014':{start:203.000385488,duration:16.271179138},
  'vr-afro-drum-015':{start:219.521564626,duration:9.795918367},
  'vr-afro-drum-016':{start:229.567482993,duration:16.000000000},
  'vr-afro-drum-017':{start:245.817482993,duration:17.142857143},
  'vr-afro-drum-018':{start:263.210340136,duration:15.360000000},
  'vr-afro-drum-019':{start:278.820340136,duration:16.271179138},
  'vr-afro-drum-020':{start:295.341519274,duration:15.867777778},
  'vr-afro-drum-021':{start:311.459297052,duration:16.991133787},
  'vr-afro-drum-022':{start:328.700430839,duration:19.591836735},
  'vr-afro-drum-023':{start:348.542267574,duration:16.695668934},
  'vr-afro-drum-024':{start:365.487936508,duration:15.360000000},
  'vr-afro-drum-025':{start:381.097936508,duration:15.483877551},
  'vr-afro-drum-026':{start:396.831814059,duration:8.727278912},
  'vr-afro-drum-027':{start:405.809092971,duration:16.695668934},
  'vr-afro-drum-028':{start:422.754761905,duration:9.600000000}
};

// Compatibility export retained for older callers. All cues now live in one compact bank.
export function afroDrumPackPath(){return AFRO_DRUM_BANK_URL;}

export const AFRO_DRUM_BANK_INFO={
  version:2,
  cues:28,
  codec:'AAC-LC',
  sampleRateHz:44100,
  delivery:'FORTISSIMO Supabase Storage public object',
  source:'user-supplied WAV masters',
  purpose:'compact web playback bank; original commercial filenames remain visible in UI'
};
