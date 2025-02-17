import * as THREE from 'three';

const parameters = {
    count: 4032,
    scale: 10,
    smoothingRadius: 35.0,
    gravity: 0,
    gravityDirection: new THREE.Vector2(0.0, 1.0),
    bounds: new THREE.Vector3(1600.0, 900.0, 1.0),
    targetDensity: 50.0,
    pressureMultiplier: 0.0,
    mouse: new THREE.Vector2(0.0, 0.0),
    pressed: 0.0 
};

export { parameters };