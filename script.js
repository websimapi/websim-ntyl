document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and running.");

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

    // Initial adjustment
    adjustLayout();
    updateBackgroundDrip();

    // Adjust on window resize
    window.addEventListener('resize', () => {
        adjustLayout();
        updateBackgroundDrip();
    });
});