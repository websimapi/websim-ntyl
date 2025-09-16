document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and running.");
    const AUDIO_DURATION = 95, FADE = 15, FADE_OUT_START = 80;

    function setupAudio() {
        const audio = new Audio('Fleshy Decay - Sonauto.ai.ogg');
        audio.loop = false; audio.preload = 'auto';
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx(); const src = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain(); gain.gain.value = 0;
        src.connect(gain).connect(ctx.destination);

        const apply = () => {
            const t = audio.currentTime; let g = 1;
            if (t < FADE) g = t / FADE;
            else if (t >= FADE_OUT_START) g = Math.max(0, (AUDIO_DURATION - t) / FADE);
            gain.gain.setTargetAtTime(g, ctx.currentTime, 0.05);
        };
        audio.addEventListener('timeupdate', apply);
        audio.addEventListener('seeked', apply);

        audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play(); });
        const unlockBtn = document.getElementById('audio-unlock');
        const tryPlay = () => audio.play().catch(() => { unlockBtn.hidden = false; });
        tryPlay();
        unlockBtn?.addEventListener('click', async () => {
            unlockBtn.hidden = true; if (ctx.state === 'suspended') await ctx.resume(); tryPlay();
        });
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

    function initOverlayFlow() {
        const overlay = document.getElementById('ui-overlay');
        const prompt = document.getElementById('overlay-prompt');
        const yesBtn = document.getElementById('overlay-yes');
        const title = document.getElementById('main-title');
        const titleText = title.getAttribute('aria-label') || "NO, I'M NOT A HUMAN";
        typeText(prompt, "Are you a human?").then(() => { yesBtn.disabled = false; });
        yesBtn.addEventListener('click', () => {
            setupAudio(); typeText(title, titleText, 30);
            overlay.classList.add('fade-out');
        }, { once: true });
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
});