(function(){
  "use strict";

  const TARGET_ACTIVE_RMS_DB=-20;
  const MAX_BOOST_DB=2.5;
  const MAX_CUT_DB=-12;
  const PEAK_CEILING_DB=-1.5;
  const ANALYSIS_STEP=16;
  const BLOCK_SECONDS=.4;
  const LEVELING_VERSION="sg-loudness-v1";

  const SourceProto=window.AudioBufferSourceNode?.prototype;
  if(!SourceProto || SourceProto.__soundGymLoudnessPatched) return;

  const nativeConnect=SourceProto.connect;
  const analysisCache=new WeakMap();

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function ampToDb(value){return 20*Math.log10(Math.max(value,1e-9));}
  function dbToGain(db){return Math.pow(10,db/20);}

  function balanceMemoryIsActive(){
    return !!document.querySelector("#sgBalanceMemoryTrainer.show");
  }

  function analyze(buffer){
    if(analysisCache.has(buffer)) return analysisCache.get(buffer);

    const channels=Math.max(1,buffer.numberOfChannels||1);
    const rate=Math.max(8000,buffer.sampleRate||44100);
    const blockFrames=Math.max(1,Math.round(rate*BLOCK_SECONDS));
    const blockSamples=Math.max(1,Math.floor(blockFrames/ANALYSIS_STEP));
    const blocks=[];
    let blockEnergy=0;
    let blockCount=0;
    let peak=0;

    const channelData=[];
    for(let ch=0;ch<channels;ch++) channelData.push(buffer.getChannelData(ch));

    for(let frame=0;frame<buffer.length;frame+=ANALYSIS_STEP){
      let frameEnergy=0;
      for(let ch=0;ch<channels;ch++){
        const sample=channelData[ch][frame]||0;
        const abs=Math.abs(sample);
        if(abs>peak) peak=abs;
        frameEnergy+=sample*sample;
      }
      frameEnergy/=channels;
      blockEnergy+=frameEnergy;
      blockCount++;

      if(blockCount>=blockSamples){
        blocks.push(blockEnergy/blockCount);
        blockEnergy=0;
        blockCount=0;
      }
    }
    if(blockCount) blocks.push(blockEnergy/blockCount);

    const blockDb=blocks.map(power=>10*Math.log10(Math.max(power,1e-12)));
    const maxBlockDb=blockDb.length?Math.max(...blockDb):-80;
    const gateDb=Math.max(-60,maxBlockDb-35);
    const activePowers=blocks.filter((power,index)=>blockDb[index]>=gateDb);
    const integratedPower=(activePowers.length?activePowers:blocks).reduce((sum,power)=>sum+power,0)/Math.max(1,(activePowers.length||blocks.length));
    const activeRmsDb=10*Math.log10(Math.max(integratedPower,1e-12));
    const peakDb=ampToDb(peak);

    let gainDb=TARGET_ACTIVE_RMS_DB-activeRmsDb;
    gainDb=clamp(gainDb,MAX_CUT_DB,MAX_BOOST_DB);
    gainDb=Math.min(gainDb,PEAK_CEILING_DB-peakDb);
    gainDb=clamp(gainDb,MAX_CUT_DB,MAX_BOOST_DB);

    if(Math.abs(gainDb)<.35) gainDb=0;

    const result={
      version:LEVELING_VERSION,
      activeRmsDb:Number(activeRmsDb.toFixed(2)),
      peakDb:Number(peakDb.toFixed(2)),
      gainDb:Number(gainDb.toFixed(2)),
      gateDb:Number(gateDb.toFixed(2))
    };
    analysisCache.set(buffer,result);
    return result;
  }

  SourceProto.connect=function(destination,output,input){
    if(balanceMemoryIsActive() || !this.buffer){
      return arguments.length>=3
        ? nativeConnect.call(this,destination,output,input)
        : arguments.length>=2
          ? nativeConnect.call(this,destination,output)
          : nativeConnect.call(this,destination);
    }

    const info=analyze(this.buffer);
    if(!info.gainDb){
      return arguments.length>=3
        ? nativeConnect.call(this,destination,output,input)
        : arguments.length>=2
          ? nativeConnect.call(this,destination,output)
          : nativeConnect.call(this,destination);
    }

    const gain=this.context.createGain();
    gain.gain.value=dbToGain(info.gainDb);
    gain.__soundGymLoudnessCalibration=info;

    if(arguments.length>=2) nativeConnect.call(this,gain,output);
    else nativeConnect.call(this,gain);

    if(destination instanceof AudioParam){
      gain.connect(destination,0);
    }else if(arguments.length>=3){
      gain.connect(destination,0,input);
    }else{
      gain.connect(destination);
    }
    return destination;
  };

  SourceProto.__soundGymLoudnessPatched=true;
  window.SoundGymLoudnessLeveling={
    version:LEVELING_VERSION,
    targetActiveRmsDb:TARGET_ACTIVE_RMS_DB,
    maxBoostDb:MAX_BOOST_DB,
    maxCutDb:MAX_CUT_DB,
    peakCeilingDb:PEAK_CEILING_DB,
    analyze
  };
})();
