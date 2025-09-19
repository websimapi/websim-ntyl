import * as THREE from 'three';

const barnColliders = [];
const PLAYER_RADIUS = 0.8;

export function initializeColliders(barnGroup) {
    barnColliders.length = 0; // Clear existing colliders
    
    const BARN_WIDTH = 12;
    const BARN_DEPTH = 18;
    const EXT_WIDTH = 5;
    const EXT_DEPTH = 8;
    
    const t = 0.8, yMin = 0, yMax = 3;
    const halfW = BARN_WIDTH/2, halfD = BARN_DEPTH/2;
    const gx = barnGroup.position.x, gz = barnGroup.position.z;

    const mk = (cx, cz, w, d) => {
        const min = new THREE.Vector3(cx - w/2, yMin, cz - d/2);
        const max = new THREE.Vector3(cx + w/2, yMax, cz + d/2);
        barnColliders.push(new THREE.Box3(min, max));
    };
    
    // Main barn perimeter walls
    mk(gx, gz + halfD, BARN_WIDTH, t);     // front
    mk(gx, gz - halfD, BARN_WIDTH, t);     // back
    mk(gx - halfW, gz, t, BARN_DEPTH);     // left
    mk(gx + halfW, gz, t, BARN_DEPTH);     // right

    // Left side extension perimeter
    const extCx = gx - (BARN_WIDTH / 2 + EXT_WIDTH / 2);
    const extCz = gz - 2;
    mk(extCx, extCz + EXT_DEPTH/2, EXT_WIDTH, t);
    mk(extCx, extCz - EXT_DEPTH/2, EXT_WIDTH, t);
    mk(extCx - EXT_WIDTH/2, extCz, t, EXT_DEPTH);
    mk(extCx + EXT_WIDTH/2, extCz, t, EXT_DEPTH);
}

export function resolveCollision(oldPos, delta) {
    const tryMove = (dx, dz) => {
        const p = oldPos.clone().add(new THREE.Vector3(dx, 0, dz));
        for (const box of barnColliders) {
            const b = box.clone(); 
            b.expandByScalar(PLAYER_RADIUS);
            if (b.containsPoint(p)) return null;
        }
        return p;
    };
    
    let p = tryMove(delta.x, delta.z);
    if (p) return p;
    p = tryMove(delta.x, 0);
    if (p) return p;
    p = tryMove(0, delta.z);
    return p || oldPos;
}