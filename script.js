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

// A pseudo-random function
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = vUv;
    float meltBoundary = 0.5; // Start melting a bit higher

    if (uv.y < meltBoundary) {
        float totalDisplacement = 0.0;
        
        // More layers for more detail
        for(float i = 1.0; i <= 5.0; i += 1.0) {
            float dripFrequency = 10.0 + i * 5.0; // Creates more columns of drips
            float dripSpeed = 0.05 + i * 0.02; // Varying speeds for each layer
            float dripSeed = i * 23.7;

            // Get a unique value for this column
            float columnX = floor(uv.x * dripFrequency);
            float randVal = hash(vec2(columnX, dripSeed));
            
            // Animate drip position over time
            float dripTime = uTime * dripSpeed + randVal * 100.0;
            float dripY = fract(dripTime) * (meltBoundary + 0.3) - 0.3; // Drips can start further above the visible area and travel further
            
            // Vary drip length for more organic look
            float dripLength = mix(0.1, 0.4, hash(vec2(columnX, dripSeed * 2.0))); // Much longer drips
            
            // Calculate drip profile (strength)
            float dripProfile = 0.0;
            if (uv.y < dripY && uv.y > dripY - dripLength) {
                 // Use a smooth curve for the drip shape instead of a linear stretch
                 float progress = (dripY - uv.y) / dripLength;
                 dripProfile = sin(progress * 3.14159); // A smooth curve from 0 to 1 to 0
            }

            // Add to total displacement, modulated by the drip's profile
            totalDisplacement += dripProfile * (dripLength * 0.4); // The amount of downward UV shift
        }
        
        // Apply the accumulated downward displacement
        uv.y -= totalDisplacement;
        
        // Add some horizontal wobble for a more liquid feel
        float wobble = sin((vUv.y - totalDisplacement) * 50.0 + uTime * 2.0) * 0.005 * totalDisplacement * 25.0;
        uv.x += wobble;
    }
    
    vec4 color = texture2D(uTexture, uv);

    // Fade out the very bottom to blend into nothing
    float fadeStart = 0.05;
    if (vUv.y < fadeStart) {
        color.a *= smoothstep(0.0, fadeStart, vUv.y);
    }

    // Discard transparent pixels from the original texture to maintain the figure's shape
    if (texture2D(uTexture, vUv).a < 0.1) {
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