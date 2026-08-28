import fs from 'node:fs';

for(const path of [
  'assets/vibe-roulette-skykeys-sound-direction-v1.js',
  'data/vibe-roulette/skykeys-sound-direction-v1.json',
  'data/vibe-roulette/skykeys-catalog-v1.csv'
]){
  if(!fs.existsSync(path))throw new Error(`Missing Phase 4 artifact: ${path}`);
}

console.log('PASS S.K.Y. Keys Phase 4 artifacts present; Sound Direction remains downstream and isolated until Phase 5');
