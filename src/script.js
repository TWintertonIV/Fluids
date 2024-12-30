import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import testVertexShader from './shaders/vertex.glsl'
import testFragmentShader from './shaders/fragment.glsl'
import gpgpuParticlesShader from './shaders/gpgpu/particles.glsl'
import gpgpuVelocitiesShader from './shaders/gpgpu/velocities.glsl'
import gpgpuDensitiesShader from './shaders/gpgpu/densities.glsl'
import gpgpuPressuresShader from './shaders/gpgpu/pressures.glsl'
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js'

/**
 * Base
 */
// Debug
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
const gui = new GUI()

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
const scene = new THREE.Scene()
const parameters = {}
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
});
/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 10000)
camera.position.z = 100
scene.add(camera)
// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
/**
 * Renderer
 */
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

parameters.count = 100;
parameters.scale = 1;
parameters.smoothingRadius = 10.0;

// parameters.gravity = -90;
parameters.gravity = 0;
parameters.bounds = new THREE.Vector3(150.0,150.0,150.0);
// parameters.grid = 10;
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



const gpgpu = {}
gpgpu.positions = null;
gpgpu.velocities = null;
gpgpu.densities = null;
gpgpu.pressures = null;

const gpgpuInit = () => {
    gpgpu.size = Math.ceil(Math.sqrt(parameters.count));
    gpgpu.computation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer)
    gpgpu.positionsTexture = gpgpu.computation.createTexture()
    gpgpu.velocityTexture = gpgpu.computation.createTexture()
    gpgpu.densityTexture = gpgpu.computation.createTexture()
    gpgpu.pressureTexture = gpgpu.computation.createTexture()

    for(let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;
        const i4 = i * 4;

        gpgpu.positionsTexture.image.data[i4 + 0] = geometry.attributes.position.array[i3 + 0]
        gpgpu.positionsTexture.image.data[i4 + 1] = geometry.attributes.position.array[i3 + 1]
        gpgpu.positionsTexture.image.data[i4 + 2] = geometry.attributes.position.array[i3 + 2]
        gpgpu.positionsTexture.image.data[i4 + 3] = 0

        gpgpu.velocityTexture.image.data[i4 + 0] = 0;
        gpgpu.velocityTexture.image.data[i4 + 1] = 0;
        gpgpu.velocityTexture.image.data[i4 + 2] = 0;
        gpgpu.velocityTexture.image.data[i4 + 3] = 0;

        gpgpu.densityTexture.image.data[i4 + 0] = 0;
        gpgpu.densityTexture.image.data[i4 + 1] = 0;
        gpgpu.densityTexture.image.data[i4 + 2] = 0;
        gpgpu.densityTexture.image.data[i4 + 3] = 0;

        gpgpu.pressureTexture.image.data[i4 + 0] = 0;
        gpgpu.pressureTexture.image.data[i4 + 1] = 0;
        gpgpu.pressureTexture.image.data[i4 + 2] = 0;
        gpgpu.pressureTexture.image.data[i4 + 3] = 0;
    }

    gpgpu.particlesVariable = gpgpu.computation.addVariable('uParticles', gpgpuParticlesShader, gpgpu.positionsTexture);
    gpgpu.velocitiesVariable = gpgpu.computation.addVariable('uVelocities', gpgpuVelocitiesShader, gpgpu.velocityTexture);
    gpgpu.densityVariable = gpgpu.computation.addVariable('uDensities', gpgpuDensitiesShader, gpgpu.densityTexture);
    gpgpu.pressureVariable = gpgpu.computation.addVariable('uPressures', gpgpuPressuresShader, gpgpu.pressureTexture);


    gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [gpgpu.particlesVariable, gpgpu.velocitiesVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.velocitiesVariable, [gpgpu.particlesVariable, gpgpu.velocitiesVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.densityVariable, [gpgpu.particlesVariable, gpgpu.densityVariable]);
    gpgpu.computation.setVariableDependencies(gpgpu.pressureVariable, [gpgpu.particlesVariable, gpgpu.densityVariable, gpgpu.pressureVariable]);


    gpgpu.particlesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
    gpgpu.particlesVariable.material.uniforms.uGravity = { value: parameters.gravity };
    gpgpu.particlesVariable.material.uniforms.uBounds = { value: parameters.bounds };

    gpgpu.velocitiesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
    gpgpu.velocitiesVariable.material.uniforms.uGravity = { value: parameters.gravity };
    gpgpu.velocitiesVariable.material.uniforms.uBounds = { value: parameters.bounds };
    gpgpu.velocitiesVariable.material.uniforms.uCount = { value: parameters.count };

    gpgpu.densityVariable.material.uniforms.uSmoothing = { value: parameters.smoothingRadius };
    gpgpu.pressureVariable.material.uniforms.uSmoothing = { value: parameters.smoothingRadius };
    const error = gpgpu.computation.init();

	if ( error !== null ) {
		console.error( error );
	}
    
    
    positionsGpgpuDebug();
    velocitiesGpgpuDebug();
    densitiesGpgpuDebug();
    pressuresGpgpuDebug();
}


const positionsGpgpuDebug = () => {
    positionsGeometry = new THREE.PlaneGeometry(3, 3);
    positionsMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture });
    gpgpu.positions = new THREE.Mesh(
        positionsGeometry,
        positionsMaterial
    );

    gpgpu.positions.position.x = 3
    scene.add(gpgpu.positions)
}

const velocitiesGpgpuDebug = () => {
    velocitiesGeometry = new THREE.PlaneGeometry(3, 3);
    velocitiesMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.velocitiesVariable).texture });
    gpgpu.velocities = new THREE.Mesh(
        velocitiesGeometry,
        velocitiesMaterial
    );
    gpgpu.velocities.position.x = -3
    scene.add(gpgpu.velocities)
}

const densitiesGpgpuDebug = () => {
    densitiesGeometry = new THREE.PlaneGeometry(3, 3);
    densitiesMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.densityVariable).texture });
    gpgpu.densities = new THREE.Mesh(
        densitiesGeometry,
        densitiesMaterial
    );
    gpgpu.densities.position.x = 3
    gpgpu.densities.position.y = 3

    scene.add(gpgpu.densities)
}

const pressuresGpgpuDebug = () => {
    pressuresGeometry = new THREE.PlaneGeometry(3, 3);
    pressuresMaterial = new THREE.MeshBasicMaterial({ map: gpgpu.computation.getCurrentRenderTarget(gpgpu.pressureVariable).texture });
    gpgpu.pressures = new THREE.Mesh(
        pressuresGeometry,
        pressuresMaterial
    );
    gpgpu.pressures.position.x = -3
    gpgpu.pressures.position.y = 3

    scene.add(gpgpu.pressures)
}

const calculateUVs = () => {
    const particlesUvArray = new Float32Array(parameters.count * 2);
    for(let y = 0; y < gpgpu.size; y++)
        {
            for(let x = 0; x < gpgpu.size; x++)
            {
                const i = (y * gpgpu.size + x)
                const i2 = i * 2;

                const uvX = (x + .5) / gpgpu.size
                const uvY = (y + .5) / gpgpu.size

                particlesUvArray[i2 + 0] = uvX;
                particlesUvArray[i2 + 1] = uvY;
            }
    }
    return particlesUvArray;    
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
    const positions = new Float32Array(parameters.count * 3);
    // const velocities = new Float32Array(parameters.count * 3);
    const grid = Math.ceil(Math.sqrt(parameters.count));

    /*
        2x2 : each point should be shifted by .5
        3x3 : each point should be shifted by 1
        4x4: each point should be shifted by 1.5

    */
    const offset = grid / 2 - 0.5;
    for (let i = 0; i < parameters.count; i++) {
        // velocities[i * 3 + 0] = 0;
        // velocities[i * 3 + 1] = 0;
        // velocities[i * 3 + 2] = 0;

        // positions[i * 3 + 0] = ((i % grid) - offset) * parameters.scale;    //x
        // positions[i * 3 + 1] = (Math.floor(i / grid) - offset) * parameters.scale;  //y
        // positions[i * 3 + 2] = 0;   //z

        positions[i * 3 + 0] = Math.random() * 100 - 50;    //x
        positions[i * 3 + 1] = Math.random() * 100 - 50;  //y
        positions[i * 3 + 2] = Math.random() * 100 - 50;   //z
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));


    // positionsGpgpuInit();
    // velocitiesGpgpuInit();
    gpgpuInit();
    material = new THREE.ShaderMaterial(
        {
        uniforms: {
            uResolution: {
                value: new THREE.Vector2(window.innerWidth, window.innerHeight)
            },
            uParticlesTexture: new THREE.Uniform(),
            uVelocitiesTexture: new THREE.Uniform(),
            uDensitiesTexture: new THREE.Uniform(),
            uPressuresTexture: new THREE.Uniform(),
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
let edgesMesh = new THREE.LineSegments(boundsEdges, edgesMaterial);
scene.add(edgesMesh);


gui.add(parameters, 'count').min(1).max(100000).step(1).onFinishChange(generateGeometry);
gui.add(parameters, 'scale').min(.001).max(10).step(.001).onChange(generateGeometry);
gui.add(parameters, 'gravity').min(-60).max(60).step(.1);
gui.add(parameters, 'smoothingRadius').min(0).max(100).step(.1);

gui.add(parameters.bounds, 'x').min(-100).max(100).step(.5).onChange(function () {
    edgesMesh.scale.x = parameters.bounds.x / 15;
});
gui.add(parameters.bounds, 'y').min(-100).max(100).step(.5).onChange(function () {
    edgesMesh.scale.y = parameters.bounds.y / 15;
});
gui.add(parameters.bounds, 'z').min(-100).max(100).step(.5).onChange(function () {
    edgesMesh.scale.z = parameters.bounds.z / 15;
});

// gui.add(parameters, 'grid').min(2).max(1000).step(1).onChange(generateGeometry);


window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const clock = new THREE.Clock()
const tick = () =>
{
    stats.begin();
    deltaTime = clock.getDelta();
    gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
    gpgpu.particlesVariable.material.uniforms.uGravity.value = parameters.gravity;
    gpgpu.particlesVariable.material.uniforms.uBounds.value = parameters.bounds;

    gpgpu.velocitiesVariable.material.uniforms.uDeltaTime.value = deltaTime;
    gpgpu.velocitiesVariable.material.uniforms.uGravity.value = parameters.gravity;
    gpgpu.velocitiesVariable.material.uniforms.uBounds.value = parameters.bounds;
    gpgpu.velocitiesVariable.material.uniforms.uCount.value = parameters.count;

    gpgpu.densityVariable.material.uniforms.uSmoothing.value = parameters.smoothingRadius;
    gpgpu.pressureVariable.material.uniforms.uSmoothing.value = parameters.smoothingRadius;



    // Update controls
    controls.update()
    gpgpu.computation.compute();
    material.uniforms.uParticlesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture
    material.uniforms.uDensitiesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.densityVariable).texture
    material.uniforms.uPressuresTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.pressureVariable).texture
    material.uniforms.uVelocitiesTexture.value = gpgpu.computation.getCurrentRenderTarget(gpgpu.velocitiesVariable).texture

    // Render
    renderer.render(scene, camera)
    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()






// const positionsGpgpuInit = () => {
//     gpgpu.size = Math.ceil(Math.sqrt(parameters.count));
//     gpgpu.positionsComputation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer)
//     gpgpu.positionsTexture = gpgpu.positionsComputation.createTexture()



//     for(let i = 0; i < parameters.count; i++) {
//         const i3 = i * 3;
//         const i4 = i * 4;

//         gpgpu.positionsTexture.image.data[i4 + 0] = geometry.attributes.position.array[i3 + 0]
//         gpgpu.positionsTexture.image.data[i4 + 1] = geometry.attributes.position.array[i3 + 1]
//         gpgpu.positionsTexture.image.data[i4 + 2] = geometry.attributes.position.array[i3 + 2]
//         gpgpu.positionsTexture.image.data[i4 + 3] = 0
//     }


//     gpgpu.particlesVariable = gpgpu.positionsComputation.addVariable('uParticles', gpgpuParticlesShader, gpgpu.positionsTexture);
//     gpgpu.particlesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
//     gpgpu.positionsComputation.setVariableDependencies(gpgpu.particlesVariable, [gpgpu.particlesVariable])
//     gpgpu.positionsComputation.init();

//     positionsGpgpuDebug();
// }

// const velocitiesGpgpuInit = () => {
//     gpgpu.velocitiesComputation = new GPUComputationRenderer(gpgpu.size, gpgpu.size, renderer)
//     gpgpu.velocityTexture = gpgpu.positionsComputation.createTexture()


//     for(let i = 0; i < parameters.count; i++) {
//         const i3 = i * 3;
//         const i4 = i * 4;

//         gpgpu.velocityTexture.image.data[i4 + 0] = 1;
//         gpgpu.velocityTexture.image.data[i4 + 1] = 1;
//         gpgpu.velocityTexture.image.data[i4 + 2] = 1;
//         gpgpu.velocityTexture.image.data[i4 + 3] = 0
//     }


//     gpgpu.velocitiesVariable = gpgpu.velocitiesComputation.addVariable('uVelocities', gpgpuParticlesShader, gpgpu.velocityTexture);
//     gpgpu.velocitiesVariable.material.uniforms.uDeltaTime = { value: deltaTime };
//     gpgpu.velocitiesComputation.setVariableDependencies(gpgpu.velocitiesVariable, [gpgpu.velocitiesVariable])
//     gpgpu.velocitiesComputation.init();

//     velocitiesGpgpuDebug();
// }