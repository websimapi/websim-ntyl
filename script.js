
```
function adjustLayout() {
    const sidePanels = document.querySelectorAll('.side-panel');
    if (!sidePanels.length) return;

    const content = document.querySelector('.content');
    const contentHeight = content.clientHeight;

    // Calculate available width for a side panel
    // It's 1fr in a 1fr 2fr 1fr grid, so roughly 1/4 of the content width
    const panelWidth = content.clientWidth / 4;

    // Calculate required width for a feature box to maintain 16:9 aspect ratio
    // 5 boxes, 4 gaps
    const gap = parseFloat(getComputedStyle(sidePanels[0]).gap) || 0;
    const boxHeight = (contentHeight - 4 * gap) / 5;
    const requiredWidth = boxHeight * (16 / 9);

    sidePanels.forEach(panel => {
        if (requiredWidth > panelWidth) {
            panel.classList.add('vertical-aspect');
        } else {
            panel.classList.remove('vertical-aspect');
        }
    });
}

window.addEventListener('resize', adjustLayout);
document.addEventListener('DOMContentLoaded', adjustLayout);