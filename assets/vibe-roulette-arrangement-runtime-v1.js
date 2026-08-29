import { SeamlessEightBarLoopTransport } from './vibe-roulette-seamless-loop-v1.js';
import {
  buildPhase5ArrangementDirection,
  applyPhase5FoundationArrangement,
  PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO
} from './vibe-roulette-arrangement-intelligence-v1.js';

function directionForTransport(transport){
  const options=transport?.options||{};
  const performance=transport?.performance||{};
  const arrangement=transport?.arrangement||null;
  if(!arrangement)return null;
  return buildPhase5ArrangementDirection(arrangement,{
    energyTarget:options.energyTarget??performance.energy??.62,
    mood:options.mood||performance.mood||'connection',
    emotionFilters:options.emotionFilters||performance.emotionFilters||[],
    seed:options.performanceSeed||options.performancePattern?.variantSeed||arrangement?.performancePattern?.variantSeed||arrangement?.firstPass?.roman?.join('-')||'phase5-runtime'
  });
}

function installPhase5Runtime(){
  const proto=SeamlessEightBarLoopTransport.prototype;
  const original=proto.prepareSources;
  if(!original||original.__phase5ArrangementRuntimePatched)return false;
  const patched=async function(token){
    if(this.performance?.events?.length&&this.arrangement&&this.performance.arrangementIntelligence?.phase!==5){
      const direction=directionForTransport(this);
      if(direction){
        this.__phase5ArrangementDirection=direction;
        this.performance=applyPhase5FoundationArrangement(this.performance,direction);
      }
    }
    return original.call(this,token);
  };
  patched.__phase5ArrangementRuntimePatched=true;
  patched.__phase5WrappedPrepareSources=original;
  proto.prepareSources=patched;
  return true;
}

export const PHASE5_ARRANGEMENT_RUNTIME_V1_INFO=Object.freeze({
  phase:5,version:'1.0',
  wrapsCurrentPrepareSources:true,
  transformsFoundationBeforeDecode:true,
  supportArrangedBySongStarterProducer:true,
  harmonyMutated:false,
  drumsTouched:false,
  editorTouched:false,
  arrangementVersion:PHASE5_ARRANGEMENT_INTELLIGENCE_V1_INFO.version
});

const installed=installPhase5Runtime();
if(typeof window!=='undefined'){
  window.__FORTISSIMO_PHASE5_ARRANGEMENT_RUNTIME__={info:PHASE5_ARRANGEMENT_RUNTIME_V1_INFO,installed};
  document?.dispatchEvent?.(new CustomEvent('fortissimo:phase5-arrangement-ready',{detail:{installed,version:PHASE5_ARRANGEMENT_RUNTIME_V1_INFO.version}}));
}
