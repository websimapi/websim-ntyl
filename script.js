document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and running.");
    const AUDIO_DURATION = 95, FADE = 15, FADE_OUT_START = 80;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioUnlocked = false;
    let backgroundAudioElement;

    const knockSoundUrls = ['knock.mp3', 'knock_2.mp3', 'knock_3.mp3', 'knock_4.mp3'];
    let knockBuffers = [];
    let uiHoverBuffer;

    async function loadSound(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error(`Failed to load or decode sound: ${url}`, e);
            return null;
        }
    }

    async function loadAllSounds() {
        knockBuffers = await Promise.all(knockSoundUrls.map(url => loadSound(url)));
        knockBuffers = knockBuffers.filter(b => b); // remove nulls on failure
        uiHoverBuffer = await loadSound('ui_hover.mp3');
    }

    function setupAudio() {
        if (backgroundAudioElement) return; // Already setup
        const audio = new Audio('Fleshy Decay - Sonauto.ai.ogg');
        backgroundAudioElement = audio;
        audio.loop = false; audio.preload = 'auto';
        
        const src = audioCtx.createMediaElementSource(audio);
        const gain = audioCtx.createGain(); gain.gain.value = 0;
        src.connect(gain).connect(audioCtx.destination);

        const apply = () => {
            const t = audio.currentTime; let g = 1;
            if (t < FADE) g = t / FADE;
            else if (t >= FADE_OUT_START) g = Math.max(0, (AUDIO_DURATION - t) / FADE);
            gain.gain.setTargetAtTime(g, audioCtx.currentTime, 0.05);
        };
        audio.addEventListener('timeupdate', apply);
        audio.addEventListener('seeked', apply);

        audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play(); });
        audio.play().catch(e => console.error("Background audio play failed:", e));
    }

    async function unlockAudio() {
        if (audioUnlocked) return;
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        audioUnlocked = true;
    }

    function adjustLayout() {
        const sidePanels = document.querySelectorAll('.side-panel');
        if (sidePanels.length === 0) return;

        const content = document.querySelector('.content');
        if (!content) return;

        const contentHeight = content.clientHeight;
        const panelWidth = content.clientWidth / 4;

        const gap = parseFloat(getComputedStyle(sidePanels[0]).gap) || 0;
        const boxHeight = (contentHeight - (4 * gap)) / 5;
        const requiredWidth = boxHeight * (16 / 9);

        sidePanels.forEach(panel => {
            if (requiredWidth > panelWidth) {
                panel.classList.add('vertical-aspect');
            } else {
                panel.classList.remove('vertical-aspect');
            }
        });
    }

    function updateBackgroundDrip() {
        const bg = document.querySelector('.background-drip');
        const fig = document.querySelector('.figure-container');
        if (!bg || !fig) return;
        const r = fig.getBoundingClientRect();
        const startY = Math.round(r.top + r.height * 0.85);
        bg.style.clipPath = `inset(${startY}px 0 0 0)`;
    }

    function initSideCarousels() {
        document.querySelectorAll('.side-panel').forEach(panel => {
            if (panel.querySelector('.panel-track')) return;
            const boxes = Array.from(panel.querySelectorAll('.feature-box'));
            const track = document.createElement('div');
            track.className = 'panel-track';
            boxes.forEach(b => track.appendChild(b));
            panel.appendChild(track);
            panel.dataset.direction = panel.classList.contains('left-panel') ? 'down' : 'up';
        });
    }

    function measureStep(panel) {
        const track = panel.querySelector('.panel-track');
        const a = track.children[0], b = track.children[1];
        if (!a || !b) return 0;
        const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
        return Math.max(0, r2.top - r1.top); // height + gap
    }

    function cyclePanel(panel) {
        const track = panel.querySelector('.panel-track');
        if (!track || track.children.length < 2) return;
        const dir = panel.dataset.direction;
        const step = measureStep(panel);
        if (!step) return;

        if (dir === 'up') {
            track.style.transition = 'transform 2.2s ease-in-out';
            track.style.transform = `translateY(${-step}px)`;
            const onEnd = () => {
                track.removeEventListener('transitionend', onEnd);
                track.appendChild(track.firstElementChild);
                track.style.transition = 'none';
                track.style.transform = 'translateY(0)';
                // force reflow
                void track.offsetHeight;
                track.style.transition = 'transform 2.2s ease-in-out';
            };
            track.addEventListener('transitionend', onEnd, { once: true });
        } else {
            track.style.transition = 'none';
            track.insertBefore(track.lastElementChild, track.firstElementChild);
            track.style.transform = `translateY(${-step}px)`;
            // next frame animate down to 0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    track.style.transition = 'transform 2.2s ease-in-out';
                    track.style.transform = 'translateY(0)';
                });
            });
        }
    }

    function startCarousels() {
        const panels = Array.from(document.querySelectorAll('.side-panel'));
        if (!panels.length) return;
        // initial layout pass to ensure sizes set
        setTimeout(() => {
            panels.forEach(p => cyclePanel(p));
        }, 600);
        setInterval(() => {
            panels.forEach(p => cyclePanel(p));
        }, 3000);
    }

    function typeText(el, text, speed = 40) {
        el.textContent = '';
        let i = 0;
        return new Promise(res => {
            const tick = () => { el.textContent += text[i++] || ''; i <= text.length ? setTimeout(tick, speed) : res(); };
            tick();
        });
    }

    function typeTextAppend(el, text, speed = 40) {
        let i = 0;
        return new Promise(res => {
            const tick = () => { el.textContent += text[i++] || ''; i <= text.length ? setTimeout(tick, speed) : res(); };
            tick();
        });
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    function wrapComma(spanEl){
        const t = spanEl.textContent;
        const idx = t.lastIndexOf(',');
        if (idx === -1) return null;
        spanEl.textContent = '';
        spanEl.append(t.slice(0, idx));
        const comma = document.createElement('span');
        comma.className = 'bounce-comma';
        comma.textContent = ',';
        spanEl.appendChild(comma);
        spanEl.append(t.slice(idx+1));
        return comma;
    }

    function pulseNotRandomly(notEl){
        setInterval(() => {
            notEl.classList.add('pulse-red');
            setTimeout(()=>notEl.classList.remove('pulse-red'), 1300);
        }, 12000 + Math.random()*6000);
    }

    function waitForNot(el){
        return new Promise(res=>{
            const id = setInterval(()=>{
                if (el.textContent.includes('NOT')){ clearInterval(id); res(); }
            }, 50);
        });
    }

    function initOverlayFlow() {
        const overlay = document.getElementById('ui-overlay');
        const prompt = document.getElementById('overlay-prompt');
        const yesBtn = document.getElementById('overlay-yes');
        const title = document.getElementById('main-title');
        const titleText = title.getAttribute('aria-label') || "NO, I'M NOT A HUMAN";
        typeText(prompt, "Are you a human?").then(() => { yesBtn.disabled = false; });
        yesBtn.addEventListener('click', async () => {
            yesBtn.style.display = 'none'; // Hide button immediately on click
            prompt.classList.add('fade');
            await unlockAudio();
            setupAudio();
            scheduleNextKnock();
            title.textContent = '';
            const prefix = document.createElement('span');
            const rest = document.createElement('span');
            title.append(prefix, rest);
            await typeText(prefix, "NO,", 180);
            const commaEl = wrapComma(prefix);
            await sleep(900);
            if (commaEl){ commaEl.classList.add('slow'); }
            const typing = typeTextAppend(rest, " I'M NOT A HUMAN", 90);
            await waitForNot(rest);
            // wrap NOT and handle initial red fade to white
            rest.innerHTML = rest.textContent.replace('NOT','<span class="not-word">NOT</span>');
            const notEl = rest.querySelector('.not-word');
            requestAnimationFrame(()=>{ notEl.style.color = '#ddd'; }); // fade to white via CSS transition
            pulseNotRandomly(notEl);
            await typing;
            overlay.classList.add('fade-out');
        }, { once: true });
    }

    function playSound(buffer) {
        if (!audioUnlocked || !buffer) return;
        
        try {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
        } catch (e) {
            console.error("Could not play sound:", e);
        }
    }

    function playKnock() {
        if (knockBuffers.length === 0) return;
        const randomIndex = Math.floor(Math.random() * knockBuffers.length);
        playSound(knockBuffers[randomIndex]);
    }

    function scheduleNextKnock() {
        const randomInterval = Math.random() * (10000 - 3000) + 3000; // between 3 and 10 seconds
        setTimeout(() => {
            playKnock();
            scheduleNextKnock(); // schedule the next one
        }, randomInterval);
    }

    function initButtonHovers() {
        const buttons = document.querySelectorAll('.menu button, .overlay-btn, .credits-btn');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    playSound(uiHoverBuffer);
                }
            });
        });
    }

    // Initial adjustment
    adjustLayout();
    updateBackgroundDrip();
    initSideCarousels();
    startCarousels();

    // Adjust on window resize
    window.addEventListener('resize', () => {
        adjustLayout();
        updateBackgroundDrip();
    });
    initOverlayFlow();
    loadAllSounds();
    initButtonHovers();
});