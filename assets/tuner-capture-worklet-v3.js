class FortissimoTunerCaptureV3 extends AudioWorkletProcessor {
  constructor(){
    super();
    this.size=8192;
    this.hop=2048;
    this.ring=new Float32Array(this.size);
    this.write=0;
    this.filled=0;
    this.sinceWindow=0;
    this.seq=0;
  }

  process(inputs,outputs){
    const input=inputs[0];
    const channel=input&&input[0];
    const output=outputs[0];
    if(output&&output[0]) output[0].fill(0);
    if(!channel||!channel.length) return true;

    for(let i=0;i<channel.length;i++){
      this.ring[this.write]=channel[i];
      this.write=(this.write+1)%this.size;
      if(this.filled<this.size) this.filled++;
      this.sinceWindow++;
    }

    if(this.filled===this.size && this.sinceWindow>=this.hop){
      this.sinceWindow=0;
      const snapshot=new Float32Array(this.size);
      const tail=this.size-this.write;
      snapshot.set(this.ring.subarray(this.write),0);
      snapshot.set(this.ring.subarray(0,this.write),tail);
      this.port.postMessage({type:"window",seq:++this.seq,sampleRate,buffer:snapshot.buffer},[snapshot.buffer]);
    }
    return true;
  }
}

registerProcessor("fortissimo-tuner-capture-v3",FortissimoTunerCaptureV3);
