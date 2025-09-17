import { applyPosterizeToImage } from './posterize.js';
import { audioCtx, getBackgroundAudio } from './audio.js';
import { animateBirds, stopBirds } from './birds.js';

export async function startCutscene(){
  const cs=document.getElementById('cutscene'), img=document.createElement('img'); img.id='cutscene-image'; img.alt='Cutscene scene'; cs.prepend(img);
  const canvas=document.getElementById('cutscene-canvas'); const loading=cs.querySelector('.cutscene-loading'); cs.style.display='flex'; loading.style.display='grid';
  let posterizeInstance = null;
  let transitionStarted = false;
  let zoomRafId = null;
  let birdsStopped = false;

  const handleSkip = () => {
      if (transitionStarted) return;
      if (zoomRafId) {
        cancelAnimationFrame(zoomRafId);
        zoomRafId = null;
      }
      if (!birdsStopped) {
        // Don't freeze birds, just fade them with the scene
        stopBirds(false); 
        birdsStopped = true;
      }
      goNext();
  };

  img.onload=()=>{ 
    loading.style.display='none'; 
    posterizeInstance = applyPosterizeToImage(canvas, img, 5.0, 0.12); 
    posterizeInstance.setFogCoverage(0.45); // Set initial fog level for first scene
    canvas.classList.add('reveal', 'fade-in-long'); 
    img.style.display='none'; 
    animateBirds(()=>{
      birdsStopped = true;
      goNext();
    }); 
    cs.addEventListener('click', handleSkip, { once: true });
  };
  img.src='cutscene_landscape.png';
  const bg = getBackgroundAudio(); if(bg){ try{ bg.pause(); }catch(e){} }
  const cutsceneAudio=new Audio('Distant Transmission - Sonauto.ai.ogg'); const src=audioCtx.createMediaElementSource(cutsceneAudio); const g=audioCtx.createGain(); g.gain.value=0; src.connect(g).connect(audioCtx.destination);
  await audioCtx.resume(); await cutsceneAudio.play().catch(()=>{}); g.gain.linearRampToValueAtTime(1, audioCtx.currentTime+7);
  setTimeout(()=>{ g.gain.cancelScheduledValues(audioCtx.currentTime); g.gain.linearRampToValueAtTime(0, audioCtx.currentTime+7); }, (115-7)*1000);

  async function goNext(){
    if (transitionStarted) return;
    transitionStarted = true;
    cs.removeEventListener('click', handleSkip);

    canvas.classList.remove('reveal', 'fade-in-long');
    
    if (!birdsStopped) {
        stopBirds(false);
        birdsStopped = true;
    }
    
    await new Promise(r=>setTimeout(r, 2000)); // Wait for fade out to complete

    const flockContainer = document.getElementById('bird-flock');
    if (flockContainer) {
        flockContainer.innerHTML = '';
    }
    if (zoomRafId) {
        cancelAnimationFrame(zoomRafId);
        zoomRafId = null;
    }

    if (posterizeInstance) { try{ posterizeInstance.cleanup(); }catch{} }
    const img2 = new Image(); img2.alt='Cutscene scene 2 - roadside and distant ruins';
    const canvasWrapper = document.getElementById('cutscene-canvas-wrapper');
    img2.onload = ()=>{ 
      posterizeInstance = applyPosterizeToImage(canvas, img2, 5.0, 0.12); 
      requestAnimationFrame(()=>{ 
        canvas.classList.add('reveal', 'drive-zoom'); 
        
        let scale = 1.0;
        let lastTime = performance.now();
        const zoomSpeed = 0.1; // Adjust this value to control zoom speed (scale increase per second)
        const fogStartTime = performance.now();
        const fogDuration = 30000; // 30 seconds for fog to cover everything

        function zoomLoop(currentTime) {
          const deltaTime = (currentTime - lastTime) / 1000; // time in seconds
          lastTime = currentTime;
          
          scale += zoomSpeed * deltaTime;
          if (canvasWrapper) {
              canvasWrapper.style.transform = `scale(${scale})`;
          }
          
          // Animate fog coverage
          const fogElapsed = currentTime - fogStartTime;
          const fogProgress = Math.min(1.0, fogElapsed / fogDuration);
          const currentFogCoverage = 0.45 + (1.5 - 0.45) * fogProgress;
          if (posterizeInstance) {
              posterizeInstance.setFogCoverage(currentFogCoverage);
          }


          zoomRafId = requestAnimationFrame(zoomLoop);
        }
        zoomRafId = requestAnimationFrame(zoomLoop);
      }); 
    };
    img2.src = 'cutscene_roadside.png';
  }
}