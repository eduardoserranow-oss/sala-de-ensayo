// Vibe Roulette drum UI factory defaults.
// Runs after the page's inline module has installed its listeners, so it can
// migrate the current V1 markup/state without duplicating the transport logic.
export const VIBE_DRUM_UI_DEFAULTS={muted:true,volume:0.42};

function installFactoryDefaults(){
  const mute=document.getElementById('drumMuteBtn');
  const slider=document.getElementById('drumVolume');
  const value=document.getElementById('drumVolumeValue');
  const panel=document.getElementById('drumVolumePanel');
  const toggle=document.getElementById('drumVolumeToggle');

  if(panel) panel.hidden=false;
  if(toggle) toggle.remove();

  if(slider){
    slider.value='42';
    slider.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(value) value.textContent='42%';

  // Current page state starts legacy-unmuted. Trigger its own handler once so
  // the private page state and transport state become muted too.
  if(mute&&mute.getAttribute('aria-pressed')!=='true'){
    mute.click();
    mute.setAttribute('aria-pressed','true');
  }
}

if(typeof window!=='undefined'){
  window.setTimeout(installFactoryDefaults,0);
}
