import { applyPosterizeToImage } from './posterize.js';
import { audioCtx, getBackgroundAudio } from './audio.js';
import { animateBirds } from './birds.js';

export async function startCutscene(){
  const cs=document.getElementById('cutscene'), img=document.createElement('img'); img.id='cutscene-image'; img.alt='Cutscene scene'; cs.prepend(img);
  const canvas=document.getElementById('cutscene-canvas'); const loading=cs.querySelector('.cutscene-loading'); cs.style.display='flex'; loading.style.display='grid';
  img.onload=()=>{ loading.style.display='none'; applyPosterizeToImage(canvas, img, 5.0, 0.12); canvas.classList.add('reveal'); img.style.display='none'; animateBirds(); };
  img.src='cutscene_landscape.png';
  const bg = getBackgroundAudio(); if(bg){ try{ bg.pause(); }catch(e){} }
  const cutsceneAudio=new Audio('Distant Transmission - Sonauto.ai.ogg'); const src=audioCtx.createMediaElementSource(cutsceneAudio); const g=audioCtx.createGain(); g.gain.value=0; src.connect(g).connect(audioCtx.destination);
  await audioCtx.resume(); await cutsceneAudio.play().catch(()=>{}); g.gain.linearRampToValueAtTime(1, audioCtx.currentTime+7);
  setTimeout(()=>{ g.gain.cancelScheduledValues(audioCtx.currentTime); g.gain.linearRampToValueAtTime(0, audioCtx.currentTime+7); }, (115-7)*1000);
}

