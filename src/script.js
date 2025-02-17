import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import testVertexShader from './shaders/vertex.glsl'
import testFragmentShader from './shaders/fragment.glsl'
import { gpgpu, gpgpuInit } from './gpgpu.js'
import { parameters } from './globals.js'



/**
 * Base
 */
// Debug
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
const gui = new GUI();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
// Canvas
const canvas = document.querySelector('canvas.webgl')
// Scene
const scene = new THREE.Scene();
export const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 10000)
camera.position.z = 1000
scene.add(camera)
// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
/**
 * Renderer
 */
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

let geometry = null;
let material = null;
let points = null;
let positionsGeometry = null; 
let positionsMaterial = null;
let velocitiesGeometry = null; 
let velocitiesMaterial = null;
let densitiesGeometry = null; 
let densitiesMaterial = null;
let pressuresGeometry = null; 
let pressuresMaterial = null;
let deltaTime = 0;

const calculateUVs = () => {
    const particlesUvArray = new Float32Array(parameters.count * 2);
    for(let y = 0; y < gpgpu.size; y++) {
        for(let x = 0; x < gpgpu.size; x++) {
            const i = (y * gpgpu.size + x);
            if (i >= parameters.count) break; // Ensure we don't exceed the particle count
            const i2 = i * 2;

            const uvX = (x + .5) / gpgpu.size;
            const uvY = (y + .5) / gpgpu.size;

            particlesUvArray[i2 + 0] = uvX;
            particlesUvArray[i2 + 1] = uvY;
        }
    }
    return particlesUvArray;    
}

const cubeFunction = () => {

    const positions = new Float32Array(parameters.count * 3);
    const cubeRoot = Math.ceil(Math.cbrt(parameters.count));
    const offset = cubeRoot / 2 - 0.5;

    for (let i = 0; i < parameters.count; i++) {
        const z = Math.floor(i / (cubeRoot * cubeRoot));
        const y = Math.floor((i % (cubeRoot * cubeRoot)) / cubeRoot);
        const x = i % cubeRoot;

        positions[i * 3 + 0] = (x - offset) * parameters.scale; // x
        positions[i * 3 + 1] = (y - offset) * parameters.scale; // y
        positions[i * 3 + 2] = (z - offset) * parameters.scale; // z
    }
    
    return positions;
}

//make a function that aligns particles in a 2x2 grid instead with z at 0
const squareFunction = () => {
    const positions = new Float32Array(parameters.count * 3);
    const squareRoot = Math.ceil(Math.sqrt(parameters.count));
    
    const offset = squareRoot / 2 - 0.5;
    for (let i = 0; i < parameters.count; i++) {
        const y = Math.floor(i / squareRoot);
        const x = i % squareRoot;

        positions[i * 3 + 0] = (x - offset) * parameters.scale; // x
        positions[i * 3 + 1] = (y - offset) * parameters.scale; // y
        positions[i * 3 + 2] = 0; // z
    }
    
    return positions;
}

const generateGeometry = () => {
    if(points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }
    if(gpgpu.velocities !== null) {
        velocitiesGeometry.dispose();
        velocitiesMaterial.dispose();
        scene.remove(gpgpu.velocities);
    }
    if(gpgpu.positions !== null) {
        positionsGeometry.dispose();
        positionsMaterial.dispose();
        scene.remove(gpgpu.positions);
    }
    if(gpgpu.densities !== null) {
        densitiesGeometry.dispose();
        densitiesMaterial.dispose();
        scene.remove(gpgpu.densities);
    }
    if(gpgpu.pressures !== null) {
        pressuresGeometry.dispose();
        pressuresMaterial.dispose();
        scene.remove(gpgpu.pressures);
    }

    geometry = new THREE.BufferGeometry();

    const positions = squareFunction();


    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    gpgpuInit(deltaTime, geometry, renderer);
    material = new THREE.ShaderMaterial({
        uniforms: {
            uResolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight)
            },
            uParticlesTexture: new THREE.Uniform(),
            uVelocitiesTexture: new THREE.Uniform(),
            uDensitiesTexture: new THREE.Uniform(),
            uPressuresTexture: new THREE.Uniform(),
            uPredictedTexture: new THREE.Uniform(),
        },   
        vertexShader: testVertexShader,
        fragmentShader: testFragmentShader,
    });
    const particlesUvArray = calculateUVs();
    
    let pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setDrawRange(0, parameters.count);
    pointsGeometry.setAttribute('aParticlesUv', new THREE.BufferAttribute(particlesUvArray, 2))
    pointsGeometry.setAttribute('aVelocitiesUv', new THREE.BufferAttribute(particlesUvArray, 2))
    points = new THREE.Points(pointsGeometry, material);
    scene.add(points);
}

generateGeometry();

let boundsGeometry = new THREE.BoxGeometry(parameters.bounds.x, parameters.bounds.y, parameters.bounds.z);
let boundsEdges = new THREE.EdgesGeometry(boundsGeometry);
let edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const cube = new THREE.Mesh(boundsGeometry, new THREE.MeshBasicMaterial({ visible: false }));
let edgesMesh = new THREE.LineSegments(boundsEdges, edgesMaterial);
scene.add(edgesMesh);
scene.add(cube);

gui.add(parameters, 'count').min(1).max(100000).step(1).onFinishChange(() => {
    gpgpu.densityVariable.material.uniforms.uCount.value = parameters.count;
    gpgpu.pressureVariable.material.uniforms.uCount.value = parameters.count;
    generateGeometry();
});
gui.add(parameters, 'scale').min(.01).max(100).step(.001).onChange(generateGeometry);
gui.add(parameters, 'gravity').min(-600).max(600).step(1);
gui.add(parameters, 'smoothingRadius').min(0).max(1000).step(1);
gui.add(parameters, 'pressureMultiplier').min(0).max(300).step(1);
gui.add(parameters, 'targetDensity').min(-1000).max(1000).step(.1);

gui.add(parameters.bounds, 'x').min(0).max(3000).step(1).onChange(function () {
    edgesMesh.scale.x = parameters.bounds.x / 1500;
    cube.scale.x = parameters.bounds.x / 1500;
});
gui.add(parameters.bounds, 'y').min(0).max(3000).step(1).onChange(function () {
    edgesMesh.scale.y = parameters.bounds.y / 1500;
    cube.scale.y = parameters.bounds.y / 1500;
});
gui.add(parameters.bounds, 'z').min(0).max(3000).step(1).onChange(function () {
    edgesMesh.scale.z = parameters.bounds.z / 1500;
    cube.scale.z = parameters.bounds.z / 1500;
});

gui.add(parameters.gravityDirection, 'x').min(-1).max(1).step(.1);
gui.add(parameters.gravityDirection, 'y').min(-1).max(1).step(.1);

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const getMousePositionOnCube = () => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(cube);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const point = intersect.point;
        parameters.mouse.x = point.x;
        parameters.mouse.y = point.y;
    }
};

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    getMousePositionOnCube();
});
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        parameters.pressed = 1.0;
    }
    else if(event.code === 'KeyC'){
        parameters.pressed = 2.0;
    }
    else if(event.code === 'KeyP'){
        parameters.pressed = 3.0;
    }
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'KeyC' || event.code === 'KeyP') {
        parameters.pressed = 0.0;
        console.log(parameters.pressed);
    }
});

const clock = new THREE.Clock()
const tick = () => {
    stats.begin();
    deltaTime = clock.getDelta();
    gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
    gpgpu.particlesVariable.material.uniforms.uGravity.value = parameters.gravity;
    gpgpu.particlesVariable.material.uniforms.uBounds.value = parameters.bounds;
    gpgpu.particlesVariable.material.uniforms.resolution.value = new THREE.Vector2(gpgpu.size, gpgpu.size);
    gpgpu.particlesVariable.material.uniforms.uCount.value = parameters.count;


    gpgpu.velocitiesVariable.material.uniforms.uDeltaTime.value = deltaTime;
    gpgpu.velocitiesVariable.material.uniforms.uGravity.value = parameters.gravity;
    gpgpu.velocitiesVariable.material.uniforms.uBounds.value = parameters.bounds;
    gpgpu.velocitiesVariable.material.uniforms.uCount.value = parameters.count;
    gpgpu.velocitiesVariable.material.uniforms.uDirection.value = parameters.gravityDirection;
    gpgpu.velocitiesVariable.material.uniforms.resolution.value = new THREE.Vector2(gpgpu.size, gpgpu.size);
    gpgpu.velocitiesVariable.material.uniforms.uMouse.value = parameters.mouse;
    gpgpu.velocitiesVariable.material.uniforms.uPressed.value = parameters.pressed;


    gpgpu.densityVariable.material.uniforms.uSmoothing.value = parameters.smoothingRadius;
    gpgpu.densityVariable.material.uniforms.resolution.value = new THREE.Vector2(gpgpu.size, gpgpu.size);

    gpgpu.pressureVariable.material.uniforms.uSmoothing.value = parameters.smoothingRadius;
    gpgpu.pressureVariable.material.uniforms.uPressureMultiplier.value = parameters.pressureMultiplier;
    gpgpu.pressureVariable.material.uniforms.uTargetDensity.value = parameters.targetDensity;
    gpgpu.pressureVariable.material.uniforms.uBounds.value = parameters.bounds;
    gpgpu.pressureVariable.material.uniforms.resolution.value = new THREE.Vector2(gpgpu.size, gpgpu.size);
    gpgpu.pressureVariable.material.uniforms.uDirection.value = parameters.gravityDirection;
    gpgpu.pressureVariable.material.uniforms.uGravity.value = parameters.gravity;

    gpgpu.predictedVariable.material.uniforms.resolution.value = new THREE.Vector2(gpgpu.size, gpgpu.size);

    controls.update()
    gpgpu.computation.compute();
    material.uniforms.uParticlesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
    material.uniforms.uDensitiesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.densityVariable).texture
    material.uniforms.uPressuresTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.pressureVariable).texture
    material.uniforms.uVelocitiesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.velocitiesVariable).texture
    material.uniforms.uPredictedTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.predictedVariable).texture

    renderer.render(scene, camera)
    stats.end();

    window.requestAnimationFrame(tick)
}

tick()