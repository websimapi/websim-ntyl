const AUDIO_DURATION = 95, FADE = 15, FADE_OUT_START = 80;
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;
let backgroundAudioElement;
let knockBuffers = [], uiHoverBuffer = null, tvStaticLoopBuffer = null, primaryKnockBuffer = null, gateCreakBuffer = null, gateThudBuffer = null, gateStuckBuffer = null;
let knockTimeoutId = null, knockingActive = false;
/* declare Howler instances and counters */
let gateLongHowl = null, gateCreakHowl = null, gateThudHowl = null, gateStuckHowl = null;
let gateShortPlayCount = 0;

import { Howl, Howler } from 'howler';

async function loadSound(url){
  try { const r=await fetch(url); const b=await r.arrayBuffer(); return await audioCtx.decodeAudioData(b); } catch(e){ console.error('Failed sound', url, e); return null; }
}
export async function loadAllSounds(){
  const urls = ['knock.mp3','knock_2.mp3','knock_3.mp3','knock_4.mp3'];
  knockBuffers = (await Promise.all(urls.map(loadSound))).filter(Boolean);
  uiHoverBuffer = await loadSound('ui_hover.mp3');
  tvStaticLoopBuffer = await loadSound('tv_static_loop.mp3');
  primaryKnockBuffer = await loadSound('knock.mp3');
  gateCreakBuffer = await loadSound('gate_long_creak.mp3');
  gateThudBuffer = await loadSound('knock_4.mp3');
  gateStuckBuffer = await loadSound('gate_creak.mp3');
  // howler instances for reliable control
  gateLongHowl = new Howl({ src: ['gate_long_creak.mp3'], loop: true, volume: 0.0 });
  gateCreakHowl = new Howl({ src: ['gate_creak.mp3'], volume: 0.7 });
  gateThudHowl  = new Howl({ src: ['knock_4.mp3'], volume: 0.9 });
  gateStuckHowl = new Howl({ src: ['gate_creak.mp3'], volume: 0.7 });
}
export async function unlockAudio(){
  if (audioUnlocked) return;
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  // also resume Howler's internal context where applicable
  try { if (Howler.ctx && Howler.ctx.state === 'suspended') await Howler.ctx.resume(); } catch{}
  audioUnlocked = true;
}
export function setupBackgroundAudio(){
  if (backgroundAudioElement) return;
  const audio = new Audio('Fleshy Decay - Sonauto.ai.ogg'); backgroundAudioElement = audio; audio.loop=false; audio.preload='auto';
  const src = audioCtx.createMediaElementSource(audio); const gain = audioCtx.createGain(); gain.gain.value=0; src.connect(gain).connect(audioCtx.destination);
  const apply=()=>{ const t=audio.currentTime; let g=1; if(t<FADE) g=t/FADE; else if(t>=FADE_OUT_START) g=Math.max(0,(AUDIO_DURATION-t)/FADE); gain.gain.setTargetAtTime(g, audioCtx.currentTime, 0.05); };
  audio.addEventListener('timeupdate', apply); audio.addEventListener('seeked', apply); audio.addEventListener('ended', ()=>{ audio.currentTime=0; audio.play(); });
  audio.play().catch(e=>console.error('BG play failed', e));
}
export function playSound(buffer, volume=1.0, onEnded=null, loop=false, fadeInDuration=0, playbackRate=1){
  if (!audioUnlocked || !buffer) return null;
  try {
    const source = audioCtx.createBufferSource(); source.buffer = buffer; source.loop = loop;
    source.playbackRate.value = playbackRate;
    const gainNode = audioCtx.createGain(); if (fadeInDuration>0){ gainNode.gain.setValueAtTime(0, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + fadeInDuration); } else { gainNode.gain.value = volume; }
    source.connect(gainNode); gainNode.connect(audioCtx.destination); source.start(0);
    if (onEnded && !loop) source.addEventListener('ended', onEnded, { once:true });
    return { source, gainNode };
  } catch(e){ console.error('Could not play sound', e); return null; }
}
export function scheduleNextKnock(){
  knockingActive = true; const randomInterval = Math.random()*(10000-3000)+3000;
  knockTimeoutId = setTimeout(()=>{ if(!knockingActive) return; if(knockBuffers.length){ playSound(knockBuffers[Math.floor(Math.random()*knockBuffers.length)]); } scheduleNextKnock(); }, randomInterval);
}
export function stopKnocks(){ knockingActive=false; if(knockTimeoutId){ clearTimeout(knockTimeoutId); knockTimeoutId=null; } }
export function playPrimaryKnock(){ if(primaryKnockBuffer) playSound(primaryKnockBuffer, 1.0); }
export function playGateCreak(volume=0.7){ if(gateCreakBuffer) playSound(gateCreakBuffer, volume); }
export function playGateThud(volume=0.9, rate=0.85){ if(gateThudBuffer) playSound(gateThudBuffer, volume, null, false, 0, rate); }
export function playGateStuck(volume=0.7, rate=Math.random()*0.15+0.9){ if(gateStuckBuffer) playSound(gateStuckBuffer, volume, null, false, 0, rate); }

/* add long creak controller */
let gateLongHandle = null;
export function startGateLongCreak(volume=0.6){
  if (!audioUnlocked || !gateLongHowl) return;
  gateShortPlayCount = 0;
  if (!gateLongHowl.playing()) { const id = gateLongHowl.play(); gateLongHowl.fade(0.0, volume, 1200, id); }
}
export function stopGateLongCreak(fadeOut=1.2){
  if (!gateLongHowl) return;
  const ids = gateLongHowl._sounds.map(s=>s._id);
  ids.forEach(id=>{
    if (fadeOut>0) { gateLongHowl.fade(gateLongHowl.volume(id), 0.0, fadeOut*1000, id); setTimeout(()=>{ try{ gateLongHowl.stop(id); }catch{} }, fadeOut*1000+20); }
    else { try{ gateLongHowl.stop(id); }catch{} }
  });
}

export function playGateFrameClank(intensity=1){
  if (!audioUnlocked) return;
  gateShortPlayCount++;
  if (gateShortPlayCount === 2) stopGateLongCreak(0); // hard stop on second creak
  // brief scrape/snag
  if (gateStuckHowl) {
    const id = gateStuckHowl.play(); gateStuckHowl.rate(0.9 + Math.random()*0.2, id);
    gateStuckHowl.volume(0.55 * intensity, id);
  }
  // heavy clank
  if (gateThudHowl) {
    const id = gateThudHowl.play(); gateThudHowl.rate(0.78 + Math.random()*0.12, id);
    gateThudHowl.volume(0.9 * intensity, id);
  }
  // brief squeal tail
  if (gateCreakHowl) {
    const id = gateCreakHowl.play(); gateCreakHowl.rate(1.12 + Math.random()*0.12, id);
    gateCreakHowl.volume(0.32 * intensity, id);
  }
}

export function getUIBuffers(){ return { uiHoverBuffer, tvStaticLoopBuffer }; }
export function getBackgroundAudio(){ return backgroundAudioElement; }