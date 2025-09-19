import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const PI_2 = Math.PI / 2;
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Mobile controls state
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

// Desktop movement state
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

// Desktop controls wrapper
class DesktopControls {
    constructor(camera, domElement) {
        this.controls = new PointerLockControls(camera, domElement);
    }
    getObject() {
        return this.controls.getObject();
    }
    lock() {
        this.controls.lock();
    }
    addEventListener(event, callback) {
        this.controls.addEventListener(event, callback);
    }
    dispose() {
        this.controls.dispose();
    }
}

// Mobile controls wrapper
class MobileControls {
    constructor(camera) {
        this.playerObject = new THREE.Object3D();
        this.playerObject.add(camera);
    }
    getObject() {
        return this.playerObject;
    }
    dispose() {
        // No-op
    }
}

function onTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = false;
}

function onTouchMove(event, controls) {
    event.preventDefault();
    if (event.touches.length === 0) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Mark as dragging if movement is significant
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        isDragging = true;
    }

    if (isDragging && controls) {
        const playerObject = controls.getObject();
        euler.setFromQuaternion(playerObject.quaternion);

        // Standard camera rotation sensitivity
        euler.y -= deltaX * 0.0045;
        euler.x -= deltaY * 0.0045;
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));

        playerObject.quaternion.setFromEuler(euler);
    }

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function onTouchEnd(event, raycaster, camera, walkableObjects, onTargetSet) {
    event.preventDefault();

    if (!isDragging) {
        // It's a tap - handle movement
        const touch = event.changedTouches[0];
        const mouse = new THREE.Vector2();
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(walkableObjects);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const targetPosition = hit.point.clone();
            targetPosition.y = 1.7;
            onTargetSet(targetPosition, hit.point);
        }
    }

    isDragging = false;
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

export function createControls(camera, container, instructions) {
    let controls;
    let raycaster;

    if (isMobile) {
        controls = new MobileControls(camera);
        const player = controls.getObject();
        player.position.set(0, 1.7, 5);

        if (instructions) {
            instructions.querySelector('div').textContent = 'Tap to move, Drag to look';
            instructions.classList.remove('hidden');
        }
        raycaster = new THREE.Raycaster();
    } else {
        controls = new DesktopControls(camera, document.body);
        camera.position.y = 1.7;
    }

    return { controls, raycaster };
}

export function setupControlEventListeners(container, controls, raycaster, camera, walkableObjects, onTargetSet, instructions) {
    if (isMobile) {
        const touchStartHandler = (e) => onTouchStart(e);
        const touchMoveHandler = (e) => onTouchMove(e, controls);
        const touchEndHandler = (e) => onTouchEnd(e, raycaster, camera, walkableObjects, onTargetSet);

        container.addEventListener('touchstart', touchStartHandler, { passive: false });
        container.addEventListener('touchmove', touchMoveHandler, { passive: false });
        container.addEventListener('touchend', touchEndHandler, { passive: false });

        return () => {
            container.removeEventListener('touchstart', touchStartHandler);
            container.removeEventListener('touchmove', touchMoveHandler);
            container.removeEventListener('touchend', touchEndHandler);
        };
    } else {
        const clickHandler = () => {
            if (controls) controls.lock();
        };

        container.addEventListener('click', clickHandler);

        if (controls && instructions) {
            controls.addEventListener('lock', () => {
                instructions.classList.add('hidden');
            });
            controls.addEventListener('unlock', () => {
                instructions.classList.remove('hidden');
            });
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        return () => {
            container.removeEventListener('click', clickHandler);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }
}

export function getMovementState() {
    return { moveForward, moveBackward, moveLeft, moveRight };
}

export { isMobile };