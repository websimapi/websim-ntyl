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
    float meltBoundary = 0.15; // Start melting from the bottom 15%

    if (uv.y < meltBoundary) {
        float totalDisplacement = 0.0;
        
        // More layers for more detail
        for(float i = 1.0; i <= 7.0; i += 1.0) {
            float dripFrequency = 8.0 + i * 4.0;
            float dripSpeed = 0.08 + i * 0.03;
            float dripSeed = i * 23.7;

            // Get a unique value for this column
            float columnX = floor(uv.x * dripFrequency);
            float randVal = hash(vec2(columnX, dripSeed));
            
            // Animate drip position over time. Drips now start at the boundary and move down.
            float dripTime = uTime * dripSpeed + randVal * 100.0;
            // The tip of the drip moves from meltBoundary downwards to -0.5 (well off-screen)
            float dripY = meltBoundary - fract(dripTime) * (meltBoundary + 0.5); 
            
            // Vary drip length for more organic look
            float dripLength = mix(0.1, 0.5, hash(vec2(columnX, dripSeed * 2.0)));
            
            // Calculate drip profile (strength)
            float dripProfile = 0.0;
            if (uv.y < meltBoundary && uv.y > dripY) {
                 // Use a smooth curve for the drip shape
                 float progress = (meltBoundary - uv.y) / (meltBoundary - dripY + 0.001); // Avoid division by zero
                 dripProfile = pow(sin(progress * 3.14159 * 0.5), 2.0); // Tapering effect, sharper tip
            }

            // Add to total displacement, modulated by the drip's profile
            totalDisplacement += dripProfile * (dripLength * 0.4);
        }
        
        // Apply the accumulated UPWARD displacement to sample from above, making pixels appear to move down.
        uv.y += totalDisplacement;
        
        // Add some horizontal wobble for a more liquid feel
        float wobbleStrength = totalDisplacement * 20.0;
        float wobble = sin((vUv.y + totalDisplacement) * 40.0 + uTime * 3.0) * 0.008 * wobbleStrength;
        uv.x += wobble;
    }
    
    vec4 color = texture2D(uTexture, uv);

    // Fade out the very bottom to blend into nothing
    float fadeStart = 0.03;
    if (vUv.y < fadeStart) {
        color.a *= smoothstep(0.0, fadeStart, vUv.y);
    }

    // Discard transparent pixels from the original texture to maintain the figure's shape,
    // except in the dripping area where we want to pull pixels down.
    if (texture2D(uTexture, vUv).a < 0.1 && vUv.y > meltBoundary) {
        discard;
    }

    gl_FragColor = color;
}
`;

function initMeltingFigure() {
    const canvas = document.getElementById('humanoid-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    
    // Adjust camera to account for taller canvas
    const container = document.getElementById('figure-container');
    const aspect = container.clientWidth / (container.clientHeight * 1.3); // Match canvas aspect ratio
    const frustumSize = 1.0;
    const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 10);
    camera.position.z = 1;

    // Adjust plane geometry to match camera view
    const geometry = new THREE.PlaneGeometry(frustumSize * aspect, frustumSize);

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

            const plane = new THREE.Mesh(geometry, material);
            scene.add(plane);

            const clock = new THREE.Clock();

            function animate() {
                requestAnimationFrame(animate);
                material.uniforms.uTime.value = clock.getElapsedTime();
                
                const canvas = renderer.domElement;
                const container = canvas.parentElement;
                if(container){
                    // Canvas element has its own size, use that for renderer
                    const width = canvas.clientWidth;
                    const height = canvas.clientHeight;
                    if (canvas.width !== width || canvas.height !== height) {
                      renderer.setSize(width, height, false);
                      
                      // Update camera on resize
                      const aspect = width / height;
                      camera.left = frustumSize * aspect / -2;
                      camera.right = frustumSize * aspect / 2;
                      camera.top = frustumSize / 2;
                      camera.bottom = frustumSize / -2;
                      camera.updateProjectionMatrix();

                      // Update plane geometry to match new aspect ratio
                      plane.geometry.dispose();
                      plane.geometry = new THREE.PlaneGeometry(frustumSize * aspect, frustumSize);
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
        const canvas = renderer.domElement;
        const container = canvas.parentElement;
        if(container){
             const width = canvas.clientWidth;
             const height = canvas.clientHeight;
             renderer.setSize(width, height, false);

             const aspect = width / height;
             camera.left = frustumSize * aspect / -2;
             camera.right = frustumSize * aspect / 2;
             camera.updateProjectionMatrix();

             scene.children[0].geometry.dispose();
             scene.children[0].geometry = new THREE.PlaneGeometry(frustumSize * aspect, frustumSize);
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