import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
varying vec2 vUv;

// 2D Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = vUv;
    float meltBoundary = 0.45; // Start melting higher up

    // Main dripping effect
    if (uv.y < meltBoundary) {
        float dripAmount = 0.0;
        
        // Multiple layers of drips for variation
        for(float i = 1.0; i <= 3.0; i += 1.0) {
            float dripFrequency = 5.0 * i;
            float dripSpeed = 0.1 * (4.0 - i);
            float dripSeed = i * 10.0;

            // Generate a drip pattern using a random function
            float dripPattern = random(vec2(floor(uv.x * dripFrequency), dripSeed));
            
            // Animate the pattern
            float dripTime = uTime * dripSpeed + dripPattern * 100.0;
            float dripY = fract(dripTime) * (meltBoundary + 0.1) - 0.1; // Make drips start off-screen
            
            // Check if current UV is within a drip's path
            if (uv.y < dripY && uv.y > dripY - 0.1) { // 0.1 is the drip length
                 // Stretch the UVs from the top of the drip
                float stretchFactor = (dripY - uv.y) / 0.1;
                dripAmount = max(dripAmount, stretchFactor);
            }
        }
        
        if (dripAmount > 0.0) {
            uv.y = mix(uv.y, meltBoundary, dripAmount);
        }
    }
    
    vec4 color = texture2D(uTexture, uv);

    // Fade out the very bottom
    float fadeStart = 0.1;
    if (vUv.y < fadeStart) {
        color.a *= smoothstep(0.0, fadeStart, vUv.y);
    }

    // Discard transparent pixels from original texture
    if (color.a < 0.1) {
        discard;
    }

    gl_FragColor = color;
}
`;

function initMeltingFigure() {
    const canvas = document.getElementById('humanoid-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    const loader = new THREE.TextureLoader();
    loader.load(
        'humanoid_figure.png',
        (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uTexture: { value: texture },
                },
                vertexShader,
                fragmentShader,
                transparent: true,
            });

            const geometry = new THREE.PlaneGeometry(1, 1);
            const plane = new THREE.Mesh(geometry, material);
            scene.add(plane);

            const clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);
                material.uniforms.uTime.value = clock.getElapsedTime();
                
                const canvas = renderer.domElement;
                const container = canvas.parentElement;
                if(container){
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    if (canvas.width !== width || canvas.height !== height) {
                      renderer.setSize(width, height, false);
                    }
                }
                
                renderer.render(scene, camera);
            }
            animate();
        },
        undefined,
        (err) => {
            console.error('An error happened loading the texture.', err);
        }
    );
     
    function onResize() {
        const container = canvas.parentElement;
        if(container){
             const width = container.clientWidth;
             const height = container.clientHeight;
             renderer.setSize(width, height);
        }
    }
    window.addEventListener('resize', onResize);
    onResize();
}

document.addEventListener('DOMContentLoaded', () => {
    initMeltingFigure();

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

    // Initial adjustment
    adjustLayout();

    // Adjust on window resize
    window.addEventListener('resize', adjustLayout);
});